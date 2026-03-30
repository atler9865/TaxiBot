import * as signalR from '@microsoft/signalr'
import type { AppDispatch } from '@/app/store'
import {
  requestCreated,
  requestAssigned,
  requestCompleted,
  newMessage,
  setUnassignedCount,
} from '@/features/requests/requestsSlice'
import { addNotification } from '@/features/ui/uiSlice'
import type { Request, Message } from '@/types'

let connection: signalR.HubConnection | null = null

export function buildConnection(token: string): signalR.HubConnection {
  connection = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/chat', { accessTokenFactory: () => token })
    .withAutomaticReconnect()
    .build()
  return connection
}

export function getConnection(): signalR.HubConnection | null {
  return connection
}

export async function startSignalR(token: string, dispatch: AppDispatch): Promise<void> {
  if (connection) {
    try { await connection.stop() } catch { /* ignore */ }
  }

  const conn = buildConnection(token)

  conn.on('RequestCreated', (request: Request) => {
    dispatch(requestCreated(request))
    dispatch(addNotification({ type: 'info', message: `New request #${request.id} from ${request.userFirstName}` }))
  })

  conn.on('RequestAssigned', (request: Request) => {
    dispatch(requestAssigned(request))
  })

  conn.on('RequestCompleted', (request: Request) => {
    dispatch(requestCompleted(request))
  })

  conn.on('NewMessage', (message: Message) => {
    dispatch(newMessage(message))
  })

  conn.on('UnassignedCountChanged', (count: number) => {
    dispatch(setUnassignedCount(count))
  })

  await conn.start()
  await conn.invoke('JoinOperatorGroup')
}

export async function joinRequest(requestId: number): Promise<void> {
  if (connection?.state === signalR.HubConnectionState.Connected)
    await connection.invoke('JoinRequestGroup', requestId)
}

export async function leaveRequest(requestId: number): Promise<void> {
  if (connection?.state === signalR.HubConnectionState.Connected)
    await connection.invoke('LeaveRequestGroup', requestId)
}

export async function stopSignalR(): Promise<void> {
  if (connection) {
    await connection.stop()
    connection = null
  }
}
