import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  fetchRequestDetail,
  assignRequestThunk,
  completeRequestThunk,
  sendMessageThunk,
} from '@/features/requests/requestsSlice'
import { joinRequest, leaveRequest } from '@/services/signalr'

interface Props {
  requestId: number
}

const PROBLEM_LABELS: Record<string, string> = {
  Accident: '🚗 Accident',
  LateDriver: '⏰ Late Driver',
  WrongRoute: '🗺️ Wrong Route',
  PaymentIssue: '💳 Payment Issue',
  DriverBehavior: '😤 Driver Behavior',
  Other: '💬 Other',
}

export default function RequestDetail({ requestId }: Props) {
  const dispatch = useAppDispatch()
  const operator = useAppSelector((s) => s.auth.operator)
  const { selectedRequestDetail, isDetailLoading } = useAppSelector((s) => s.requests)
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dispatch(fetchRequestDetail(requestId))
    joinRequest(requestId)
    return () => { leaveRequest(requestId) }
  }, [dispatch, requestId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedRequestDetail?.messages.length])

  const handleAssign = () => dispatch(assignRequestThunk(requestId))

  const handleComplete = () => {
    if (confirm('Complete this request?')) dispatch(completeRequestThunk(requestId))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || isSending) return
    setIsSending(true)
    await dispatch(sendMessageThunk({ requestId, text: messageText.trim() }))
    setMessageText('')
    setIsSending(false)
  }

  if (isDetailLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">Loading...</div>
    )
  }

  if (!selectedRequestDetail) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">Not found</div>
    )
  }

  const req = selectedRequestDetail
  const isMyRequest = req.assignedOperatorId === operator?.id
  const canAssign = req.status === 'New'
  const canSend = req.status === 'InProgress' && isMyRequest
  const canComplete = req.status === 'InProgress' && isMyRequest
  const isCompleted = req.status === 'Completed'

  const label = PROBLEM_LABELS[req.problemType] ?? req.problemTypeLabel

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">{label}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {req.userFirstName} {req.userLastName}
            {req.userUsername && ` (@${req.userUsername})`}
            {' · '}
            {new Date(req.createdAt).toLocaleString()}
          </p>
          {req.assignedOperatorName && (
            <p className="text-xs text-blue-500 mt-0.5">Operator: {req.assignedOperatorName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              req.status === 'New'
                ? 'bg-yellow-100 text-yellow-700'
                : req.status === 'InProgress'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {req.status === 'InProgress' ? 'In Progress' : req.status}
          </span>
          {canAssign && (
            <button
              onClick={handleAssign}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
            >
              Assign to me
            </button>
          )}
          {canComplete && (
            <button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
            >
              Complete Request
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {req.messages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-4">No messages yet</p>
        ) : (
          req.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isFromOperator ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                  msg.isFromOperator
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.senderName && (
                  <p className={`text-xs mb-1 font-medium ${msg.isFromOperator ? 'text-blue-200' : 'text-gray-500'}`}>
                    {msg.senderName}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.isFromOperator ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {canSend && (
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            Send
          </button>
        </form>
      )}
      {isCompleted && (
        <div className="px-4 py-3 border-t border-gray-100 text-center text-xs text-gray-400">
          Request completed {req.completedAt ? `· ${new Date(req.completedAt).toLocaleString()}` : ''}
        </div>
      )}
    </div>
  )
}
