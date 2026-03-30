import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchRequests, fetchUnassignedCount, setSelectedRequest } from '@/features/requests/requestsSlice'
import RequestCard from './RequestCard'
import RequestDetail from './RequestDetail'
import type { RequestStatus } from '@/types'

const TABS: { label: string; status: RequestStatus }[] = [
  { label: 'New', status: 'New' },
  { label: 'In Progress', status: 'InProgress' },
  { label: 'Completed', status: 'Completed' },
]

export default function RequestsPage() {
  const dispatch = useAppDispatch()
  const [activeTab, setActiveTab] = useState<RequestStatus>('New')
  const selectedId = useAppSelector((s) => s.requests.selectedRequestId)
  const { newRequests, inProgressRequests, completedRequests, unassignedCount, isLoading } =
    useAppSelector((s) => s.requests)

  useEffect(() => {
    dispatch(fetchRequests(undefined))
    dispatch(fetchUnassignedCount())
  }, [dispatch])

  const currentRequests = {
    New: newRequests,
    InProgress: inProgressRequests,
    Completed: completedRequests,
  }[activeTab]

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel — request list */}
      <div className="w-80 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden flex-shrink-0">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.status
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.status === 'New' && unassignedCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unassignedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Request list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
          ) : currentRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No requests</div>
          ) : (
            currentRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                isSelected={req.id === selectedId}
                onClick={() => dispatch(setSelectedRequest(req.id))}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel — request detail */}
      <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
        {selectedId ? (
          <RequestDetail requestId={selectedId} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Select a request to view details
          </div>
        )}
      </div>
    </div>
  )
}
