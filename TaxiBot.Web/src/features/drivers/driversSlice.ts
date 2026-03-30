import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getDrivers } from '@/services/api'
import type { TelegramUser } from '@/types'

interface DriversState {
  list: TelegramUser[]
  isLoading: boolean
}

const initialState: DriversState = {
  list: [],
  isLoading: false,
}

export const fetchDrivers = createAsyncThunk('drivers/fetchAll', async () => {
  return await getDrivers()
})

const driversSlice = createSlice({
  name: 'drivers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDrivers.pending, (state) => { state.isLoading = true })
      .addCase(fetchDrivers.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload
      })
      .addCase(fetchDrivers.rejected, (state) => { state.isLoading = false })
  },
})

export default driversSlice.reducer
