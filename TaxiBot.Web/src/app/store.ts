import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/features/auth/authSlice'
import requestsReducer from '@/features/requests/requestsSlice'
import operatorsReducer from '@/features/operators/operatorsSlice'
import driversReducer from '@/features/drivers/driversSlice'
import uiReducer from '@/features/ui/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    requests: requestsReducer,
    operators: operatorsReducer,
    drivers: driversReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
