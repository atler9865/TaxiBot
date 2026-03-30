import type { Request } from '@/types'

const PROBLEM_LABELS: Record<string, string> = {
  Accident: '🚗 Accident',
  LateDriver: '⏰ Late Driver',
  WrongRoute: '🗺️ Wrong Route',
  PaymentIssue: '💳 Payment Issue',
  DriverBehavior: '😤 Driver Behavior',
  Other: '💬 Other',
}

interface Props {
  request: Request
  isSelected: boolean
  onClick: () => void
}

export default function RequestCard({ request, isSelected, onClick }: Props) {
  const label = PROBLEM_LABELS[request.problemType] ?? request.problemTypeLabel

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-gray-800 leading-snug">{label}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            request.status === 'New'
              ? 'bg-yellow-100 text-yellow-700'
              : request.status === 'InProgress'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {request.status === 'InProgress' ? 'In Progress' : request.status}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1 truncate">{request.initialMessage}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {request.userFirstName} {request.userLastName}
          {request.userUsername && ` (@${request.userUsername})`}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(request.createdAt).toLocaleDateString()}
        </span>
      </div>
      {request.assignedOperatorName && (
        <p className="text-xs text-blue-500 mt-1">→ {request.assignedOperatorName}</p>
      )}
    </button>
  )
}
