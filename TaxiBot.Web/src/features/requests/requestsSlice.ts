import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import * as api from '@/services/api'
import type { Request, RequestDetail, Message } from '@/types'

export interface RequestsState {
  newRequests: Request[]
  inProgressRequests: Request[]
  completedRequests: Request[]
  selectedRequestId: number | null
  selectedRequestDetail: RequestDetail | null
  messages: Record<number, Message[]>
  unassignedCount: number
  isLoading: boolean
  isDetailLoading: boolean
}

const initialState: RequestsState = {
  newRequests: [],
  inProgressRequests: [],
  completedRequests: [],
  selectedRequestId: null,
  selectedRequestDetail: null,
  messages: {},
  unassignedCount: 0,
  isLoading: false,
  isDetailLoading: false,
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchRequests = createAsyncThunk(
  'requests/fetchAll',
  async (status: string | undefined, { rejectWithValue }) => {
    try {
      return await api.getRequests(status)
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

function removeFromAll(state: RequestsState, id: number) {
  state.newRequests = state.newRequests.filter((r) => r.id !== id)
  state.inProgressRequests = state.inProgressRequests.filter((r) => r.id !== id)
  state.completedRequests = state.completedRequests.filter((r) => r.id !== id)
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
      const exists = state.newRequests.some((r) => r.id === action.payload.id)
      if (!exists) {
        state.newRequests.unshift(action.payload)
        state.unassignedCount += 1
      }
    },
    requestAssigned(state, action: PayloadAction<Request>) {
      removeFromAll(state, action.payload.id)
      state.inProgressRequests.unshift(action.payload)
      if (state.selectedRequestDetail?.id === action.payload.id) {
        state.selectedRequestDetail = { ...state.selectedRequestDetail, ...action.payload }
      }
    },
    requestCompleted(state, action: PayloadAction<Request>) {
      removeFromAll(state, action.payload.id)
      state.completedRequests.unshift(action.payload)
      if (state.selectedRequestDetail?.id === action.payload.id) {
        state.selectedRequestDetail = { ...state.selectedRequestDetail, ...action.payload }
      }
    },
    newMessage(state, action: PayloadAction<Message>) {
      const { requestId } = action.payload
      if (!state.messages[requestId]) state.messages[requestId] = []
      const exists = state.messages[requestId].some((m) => m.id === action.payload.id)
      if (!exists) state.messages[requestId].push(action.payload)

      if (state.selectedRequestDetail?.id === requestId) {
        const detailExists = state.selectedRequestDetail.messages.some(
          (m) => m.id === action.payload.id
        )
        if (!detailExists) state.selectedRequestDetail.messages.push(action.payload)
      }
    },
    setUnassignedCount(state, action: PayloadAction<number>) {
      state.unassignedCount = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRequests
      .addCase(fetchRequests.pending, (state) => { state.isLoading = true })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.isLoading = false
        const reqs = action.payload
        state.newRequests = reqs.filter((r) => r.status === 'New')
        state.inProgressRequests = reqs.filter((r) => r.status === 'InProgress')
        state.completedRequests = reqs.filter((r) => r.status === 'Completed')
      })
      .addCase(fetchRequests.rejected, (state) => { state.isLoading = false })

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
        removeFromAll(state, action.payload.id)
        state.inProgressRequests.unshift(action.payload)
        if (state.selectedRequestDetail?.id === action.payload.id)
          state.selectedRequestDetail = { ...state.selectedRequestDetail, ...action.payload }
      })

      // completeRequest
      .addCase(completeRequestThunk.fulfilled, (state, action) => {
        removeFromAll(state, action.payload.id)
        state.completedRequests.unshift(action.payload)
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
