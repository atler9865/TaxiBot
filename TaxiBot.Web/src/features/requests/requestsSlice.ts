import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import * as api from '@/services/api'
import type { Request, RequestDetail, Message, RequestStatus, FetchRequestsParams, PagedResult } from '@/types'

const PAGE_SIZE = 50

// ── Per-tab state ─────────────────────────────────────────────────────────────

interface TabState {
  items: Request[]
  page: number
  totalCount: number
  totalPages: number
  isLoading: boolean
}

function emptyTab(): TabState {
  return { items: [], page: 1, totalCount: 0, totalPages: 0, isLoading: false }
}

// ── Root state ────────────────────────────────────────────────────────────────

export interface RequestsState {
  tabs: Record<RequestStatus, TabState>
  selectedRequestId: number | null
  selectedRequestDetail: RequestDetail | null
  messages: Record<number, Message[]>
  unassignedCount: number
  isDetailLoading: boolean
}

const initialState: RequestsState = {
  tabs: {
    New: emptyTab(),
    InProgress: emptyTab(),
    Completed: emptyTab(),
  },
  selectedRequestId: null,
  selectedRequestDetail: null,
  messages: {},
  unassignedCount: 0,
  isDetailLoading: false,
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchRequests = createAsyncThunk(
  'requests/fetchAll',
  async (params: FetchRequestsParams, { rejectWithValue }) => {
    try {
      const result: PagedResult<Request> = await api.getRequests(params)
      return { result, status: params.status }
    } catch {
      return rejectWithValue('Failed to load requests')
    }
  }
)

export const fetchRequestDetail = createAsyncThunk(
  'requests/fetchDetail',
  async (id: number, { rejectWithValue }) => {
    try {
      return await api.getRequest(id)
    } catch {
      return rejectWithValue('Failed to load request')
    }
  }
)

export const assignRequestThunk = createAsyncThunk(
  'requests/assign',
  async (id: number, { rejectWithValue }) => {
    try {
      return await api.assignRequest(id)
    } catch {
      return rejectWithValue('Failed to assign request')
    }
  }
)

export const completeRequestThunk = createAsyncThunk(
  'requests/complete',
  async (id: number, { rejectWithValue }) => {
    try {
      return await api.completeRequest(id)
    } catch {
      return rejectWithValue('Failed to complete request')
    }
  }
)

export const sendMessageThunk = createAsyncThunk(
  'requests/sendMessage',
  async ({ requestId, text }: { requestId: number; text: string }, { rejectWithValue }) => {
    try {
      return await api.sendMessage(requestId, text)
    } catch {
      return rejectWithValue('Failed to send message')
    }
  }
)

export const fetchUnassignedCount = createAsyncThunk(
  'requests/fetchCount',
  async () => {
    const res = await api.getUnassignedCount()
    return res.count
  }
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function removeFromTab(tab: TabState, id: number): boolean {
  const idx = tab.items.findIndex((r) => r.id === id)
  if (idx === -1) return false
  tab.items.splice(idx, 1)
  tab.totalCount = Math.max(0, tab.totalCount - 1)
  tab.totalPages = Math.max(1, Math.ceil(tab.totalCount / PAGE_SIZE))
  return true
}

function prependToTab(tab: TabState, item: Request) {
  if (tab.items.some((r) => r.id === item.id)) return
  tab.totalCount += 1
  tab.totalPages = Math.max(1, Math.ceil(tab.totalCount / PAGE_SIZE))
  if (tab.page === 1) {
    tab.items.unshift(item)
    if (tab.items.length > PAGE_SIZE) tab.items.pop()
  }
}

// ── Slice ─────────────────────────────────────────────────────────────────────

const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    setSelectedRequest(state, action: PayloadAction<number | null>) {
      state.selectedRequestId = action.payload
      if (action.payload === null) state.selectedRequestDetail = null
    },
    // SignalR events
    requestCreated(state, action: PayloadAction<Request>) {
      prependToTab(state.tabs.New, action.payload)
      state.unassignedCount += 1
    },
    requestAssigned(state, action: PayloadAction<Request>) {
      removeFromTab(state.tabs.New, action.payload.id)
      prependToTab(state.tabs.InProgress, action.payload)
      if (state.selectedRequestDetail?.id === action.payload.id)
        state.selectedRequestDetail = { ...state.selectedRequestDetail, ...action.payload }
    },
    requestCompleted(state, action: PayloadAction<Request>) {
      removeFromTab(state.tabs.New, action.payload.id)
      removeFromTab(state.tabs.InProgress, action.payload.id)
      prependToTab(state.tabs.Completed, action.payload)
      if (state.selectedRequestDetail?.id === action.payload.id)
        state.selectedRequestDetail = { ...state.selectedRequestDetail, ...action.payload }
    },
    newMessage(state, action: PayloadAction<Message>) {
      const { requestId } = action.payload
      if (!state.messages[requestId]) state.messages[requestId] = []
      if (!state.messages[requestId].some((m) => m.id === action.payload.id))
        state.messages[requestId].push(action.payload)
      if (state.selectedRequestDetail?.id === requestId &&
          !state.selectedRequestDetail.messages.some((m) => m.id === action.payload.id))
        state.selectedRequestDetail.messages.push(action.payload)
    },
    setUnassignedCount(state, action: PayloadAction<number>) {
      state.unassignedCount = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRequests
      .addCase(fetchRequests.pending, (state, action) => {
        const status = action.meta.arg.status
        if (status) state.tabs[status].isLoading = true
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        const { result, status } = action.payload
        if (!status) return
        const tab = state.tabs[status]
        tab.isLoading = false
        tab.items = result.items
        tab.page = result.page
        tab.totalCount = result.totalCount
        tab.totalPages = result.totalPages
      })
      .addCase(fetchRequests.rejected, (state, action) => {
        const status = action.meta.arg.status
        if (status) state.tabs[status].isLoading = false
      })

      // fetchRequestDetail
      .addCase(fetchRequestDetail.pending, (state) => { state.isDetailLoading = true })
      .addCase(fetchRequestDetail.fulfilled, (state, action) => {
        state.isDetailLoading = false
        state.selectedRequestDetail = action.payload
        state.selectedRequestId = action.payload.id
        state.messages[action.payload.id] = action.payload.messages
      })
      .addCase(fetchRequestDetail.rejected, (state) => { state.isDetailLoading = false })

      // assignRequest
      .addCase(assignRequestThunk.fulfilled, (state, action) => {
        removeFromTab(state.tabs.New, action.payload.id)
        prependToTab(state.tabs.InProgress, action.payload)
        if (state.selectedRequestDetail?.id === action.payload.id)
          state.selectedRequestDetail = { ...state.selectedRequestDetail, ...action.payload }
      })

      // completeRequest
      .addCase(completeRequestThunk.fulfilled, (state, action) => {
        removeFromTab(state.tabs.New, action.payload.id)
        removeFromTab(state.tabs.InProgress, action.payload.id)
        prependToTab(state.tabs.Completed, action.payload)
        if (state.selectedRequestDetail?.id === action.payload.id)
          state.selectedRequestDetail = { ...state.selectedRequestDetail, ...action.payload }
      })

      // sendMessage
      .addCase(sendMessageThunk.fulfilled, (state, action) => {
        const msg = action.payload
        if (!state.messages[msg.requestId]) state.messages[msg.requestId] = []
        if (!state.messages[msg.requestId].some((m) => m.id === msg.id))
          state.messages[msg.requestId].push(msg)
        if (state.selectedRequestDetail?.id === msg.requestId &&
            !state.selectedRequestDetail.messages.some((m) => m.id === msg.id))
          state.selectedRequestDetail.messages.push(msg)
      })

      // fetchUnassignedCount
      .addCase(fetchUnassignedCount.fulfilled, (state, action) => {
        state.unassignedCount = action.payload
      })
  },
})

export const {
  setSelectedRequest,
  requestCreated,
  requestAssigned,
  requestCompleted,
  newMessage,
  setUnassignedCount,
} = requestsSlice.actions

export default requestsSlice.reducer
