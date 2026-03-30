import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { login as loginApi } from '@/services/api'
import { startSignalR, stopSignalR } from '@/services/signalr'
import type { Operator, LoginRequest } from '@/types'
import type { AppDispatch, RootState } from '@/app/store'

export interface AuthState {
  operator: Operator | null
  token: string | null
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  operator: JSON.parse(localStorage.getItem('operator') ?? 'null'),
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
}

export const loginThunk = createAsyncThunk<
  { operator: Operator; token: string },
  LoginRequest,
  { dispatch: AppDispatch }
>('auth/login', async (credentials, { dispatch, rejectWithValue }) => {
  try {
    const res = await loginApi(credentials)
    localStorage.setItem('token', res.token)
    localStorage.setItem('operator', JSON.stringify(res.operator))
    await startSignalR(res.token, dispatch)
    return { operator: res.operator, token: res.token }
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message ?? 'Login failed'
    return rejectWithValue(msg)
  }
})

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token')
  localStorage.removeItem('operator')
  await stopSignalR()
})

export const initSignalR = createAsyncThunk<void, void, { state: RootState; dispatch: AppDispatch }>(
  'auth/initSignalR',
  async (_, { getState, dispatch }) => {
    const token = getState().auth.token
    if (token) await startSignalR(token, dispatch)
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<{ operator: Operator; token: string }>) => {
        state.isLoading = false
        state.operator = action.payload.operator
        state.token = action.payload.token
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.operator = null
        state.token = null
      })
  },
})

export default authSlice.reducer
