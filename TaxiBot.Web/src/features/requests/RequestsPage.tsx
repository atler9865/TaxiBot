import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchRequests, fetchUnassignedCount, setSelectedRequest } from '@/features/requests/requestsSlice'
import { fetchOperators } from '@/features/operators/operatorsSlice'
import { fetchDrivers } from '@/features/drivers/driversSlice'
import RequestCard from './RequestCard'
import RequestDetail from './RequestDetail'
import type { FetchRequestsParams, RequestStatus, SortBy } from '@/types'

const TABS: { label: string; status: RequestStatus }[] = [
  { label: 'New',         status: 'New' },
  { label: 'In Progress', status: 'InProgress' },
  { label: 'Completed',   status: 'Completed' },
]

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'createdAt',    label: 'Created date' },
  { value: 'assignedAt',   label: 'Assigned date' },
  { value: 'completedAt',  label: 'Completed date' },
  { value: 'driverName',   label: 'Driver name' },
  { value: 'operatorName', label: 'Operator name' },
]

interface Filters {
  operatorId: number | ''
  driverId: number | ''
  dateFrom: string
  dateTo: string
  sortBy: SortBy
  sortDesc: boolean
}

const DEFAULT_FILTERS: Filters = {
  operatorId: '',
  driverId:   '',
  dateFrom:   '',
  dateTo:     '',
  sortBy:     'createdAt',
  sortDesc:   true,
}

function hasActiveFilters(f: Filters) {
  return f.operatorId !== '' || f.driverId !== '' || f.dateFrom !== '' || f.dateTo !== '' ||
    f.sortBy !== 'createdAt' || !f.sortDesc
}

export default function RequestsPage() {
  const dispatch   = useAppDispatch()
  const [activeTab, setActiveTab] = useState<RequestStatus>('New')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const tabs           = useAppSelector((s) => s.requests.tabs)
  const unassignedCount = useAppSelector((s) => s.requests.unassignedCount)
  const selectedId     = useAppSelector((s) => s.requests.selectedRequestId)
  const operators      = useAppSelector((s) => s.operators.list)
  const drivers        = useAppSelector((s) => s.drivers.list)
  const currentTab     = tabs[activeTab]

  const doFetch = useCallback((tab: RequestStatus, page: number, f: Filters) => {
    const params: FetchRequestsParams = {
      status:  tab,
      page,
      sortBy:  f.sortBy,
      sortDesc: f.sortDesc,
      ...(f.operatorId !== '' && { operatorId: f.operatorId as number }),
      ...(f.driverId   !== '' && { driverId:   f.driverId   as number }),
      ...(f.dateFrom   && { dateFrom: f.dateFrom }),
      ...(f.dateTo     && { dateTo: f.dateTo }),
    }
    dispatch(fetchRequests(params))
  }, [dispatch])

  useEffect(() => {
    doFetch('New', 1, DEFAULT_FILTERS)
    dispatch(fetchUnassignedCount())
    if (operators.length === 0) dispatch(fetchOperators())
    if (drivers.length === 0) dispatch(fetchDrivers())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (tab: RequestStatus) => {
    setActiveTab(tab)
    doFetch(tab, 1, filters)
    dispatch(setSelectedRequest(null))
  }

  const handleFilterChange = (next: Filters) => {
    setFilters(next)
    doFetch(activeTab, 1, next)
  }

  const handlePage = (page: number) => doFetch(activeTab, page, filters)

  const inputCls  = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const selectCls = `${inputCls} bg-white`

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Filter / sort bar */}
      <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Driver */}
        <select
          value={filters.driverId}
          onChange={(e) => handleFilterChange({ ...filters, driverId: e.target.value === '' ? '' : Number(e.target.value) })}
          className={`${selectCls} w-44`}
        >
          <option value="">All drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.firstName} {d.lastName}
            </option>
          ))}
        </select>

        {/* Operator */}
        <select
          value={filters.operatorId}
          onChange={(e) => handleFilterChange({ ...filters, operatorId: e.target.value === '' ? '' : Number(e.target.value) })}
          className={`${selectCls} w-44`}
        >
          <option value="">All operators</option>
          {operators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.firstName} {op.lastName}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange({ ...filters, dateFrom: e.target.value })}
            className={inputCls}
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange({ ...filters, dateTo: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* Sort by */}
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value as SortBy })}
          className={`${selectCls} w-44`}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Sort direction */}
        <button
          onClick={() => handleFilterChange({ ...filters, sortDesc: !filters.sortDesc })}
          title={filters.sortDesc ? 'Descending' : 'Ascending'}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {filters.sortDesc ? '↓' : '↑'}
        </button>

        {/* Clear */}
        {hasActiveFilters(filters) && (
          <button
            onClick={() => handleFilterChange(DEFAULT_FILTERS)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Split panels */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left panel — list */}
        <div className="w-80 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden flex-shrink-0">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.status}
                onClick={() => handleTabChange(tab.status)}
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
            {currentTab.isLoading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : currentTab.items.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No requests</div>
            ) : (
              currentTab.items.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  isSelected={req.id === selectedId}
                  onClick={() => dispatch(setSelectedRequest(req.id))}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {currentTab.totalPages > 1 && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-100">
              <button
                disabled={currentTab.page <= 1 || currentTab.isLoading}
                onClick={() => handlePage(currentTab.page - 1)}
                className="p-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ←
              </button>
              <span className="text-xs text-gray-400">
                {currentTab.page} / {currentTab.totalPages}
                <span className="ml-1 text-gray-300">({currentTab.totalCount})</span>
              </span>
              <button
                disabled={currentTab.page >= currentTab.totalPages || currentTab.isLoading}
                onClick={() => handlePage(currentTab.page + 1)}
                className="p-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden min-h-0">
          {selectedId ? (
            <RequestDetail requestId={selectedId} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select a request to view details
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
