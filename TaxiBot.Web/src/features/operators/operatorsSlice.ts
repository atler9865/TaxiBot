import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getOperators, createOperator } from '@/services/api'
import type { Operator, OperatorRole } from '@/types'

interface OperatorsState {
  list: Operator[]
  isLoading: boolean
  isCreating: boolean
  createError: string | null
}

const initialState: OperatorsState = {
  list: [],
  isLoading: false,
  isCreating: false,
  createError: null,
}

export const fetchOperators = createAsyncThunk('operators/fetchAll', async () => {
  return await getOperators()
})

export const createUserThunk = createAsyncThunk(
  'operators/create',
  async (
    data: { login: string; password: string; firstName: string; lastName: string; role: OperatorRole },
    { rejectWithValue }
  ) => {
    try {
      return await createOperator(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to create user'
      return rejectWithValue(msg)
    }
  }
)

const operatorsSlice = createSlice({
  name: 'operators',
  initialState,
  reducers: {
    clearCreateError(state) {
      state.createError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOperators.pending, (state) => { state.isLoading = true })
      .addCase(fetchOperators.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload
      })
      .addCase(fetchOperators.rejected, (state) => { state.isLoading = false })
      .addCase(createUserThunk.pending, (state) => {
        state.isCreating = true
        state.createError = null
      })
      .addCase(createUserThunk.fulfilled, (state, action) => {
        state.isCreating = false
        state.list.push(action.payload)
      })
      .addCase(createUserThunk.rejected, (state, action) => {
        state.isCreating = false
        state.createError = action.payload as string
      })
  },
})

export const { clearCreateError } = operatorsSlice.actions
export default operatorsSlice.reducer
