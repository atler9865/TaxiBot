import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getDrivers, updateDriver } from '@/services/api'
import type { TelegramUser } from '@/types'

interface DriversState {
  list: TelegramUser[]
  isLoading: boolean
  isUpdating: boolean
  updateError: string | null
}

const initialState: DriversState = {
  list: [],
  isLoading: false,
  isUpdating: false,
  updateError: null,
}

export const fetchDrivers = createAsyncThunk('drivers/fetchAll', async () => {
  return await getDrivers()
})

export const updateDriverThunk = createAsyncThunk(
  'drivers/update',
  async ({ id, driverStatus }: { id: number; driverStatus: string }, { rejectWithValue }) => {
    try {
      return await updateDriver(id, driverStatus)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to update driver'
      return rejectWithValue(msg)
    }
  }
)

const driversSlice = createSlice({
  name: 'drivers',
  initialState,
  reducers: {
    clearUpdateError(state) {
      state.updateError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDrivers.pending, (state) => { state.isLoading = true })
      .addCase(fetchDrivers.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload
      })
      .addCase(fetchDrivers.rejected, (state) => { state.isLoading = false })
      .addCase(updateDriverThunk.pending, (state) => {
        state.isUpdating = true
        state.updateError = null
      })
      .addCase(updateDriverThunk.fulfilled, (state, action) => {
        state.isUpdating = false
        const idx = state.list.findIndex((d) => d.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
      })
      .addCase(updateDriverThunk.rejected, (state, action) => {
        state.isUpdating = false
        state.updateError = action.payload as string
      })
  },
})

export const { clearUpdateError } = driversSlice.actions
export default driversSlice.reducer
