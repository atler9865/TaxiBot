import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Notification } from '@/types'

interface UiState {
  notifications: Notification[]
}

const initialState: UiState = {
  notifications: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Omit<Notification, 'id'>>) {
      state.notifications.push({
        ...action.payload,
        id: crypto.randomUUID(),
      })
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload)
    },
    clearNotifications(state) {
      state.notifications = []
    },
  },
})

export const { addNotification, removeNotification, clearNotifications } = uiSlice.actions
export default uiSlice.reducer
