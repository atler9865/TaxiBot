import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchOperators } from './operatorsSlice'
import AddUserModal from './AddUserModal'
import EditUserModal from './EditUserModal'
import type { Operator, OperatorRole, UserStatus } from '@/types'

const STATUS_STYLES: Record<UserStatus, { dot: string; badge: string; label: string }> = {
  Available:    { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700',   label: 'Available' },
  NotAvailable: { dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-500',    label: 'Not Available' },
  Blocked:      { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700',       label: 'Blocked' },
  InVacation:   { dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700', label: 'On Vacation' },
}

function StatusBadge({ status }: { status: UserStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.NotAvailable
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function RowMenu({ operator, onEdit }: { operator: Operator; onEdit: (op: Operator) => void }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pos) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!btnRef.current?.contains(target) && !dropdownRef.current?.contains(target)) setPos(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pos])

  const handleOpen = () => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        onClick={pos ? () => setPos(null) : handleOpen}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {pos && (
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-36 bg-white border border-gray-100 rounded-lg shadow-lg py-1"
        >
          <button
            onClick={() => { setPos(null); onEdit(operator) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  const dispatch = useAppDispatch()
  const { list, isLoading } = useAppSelector((s) => s.operators)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editOperator, setEditOperator] = useState<Operator | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<OperatorRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')

  useEffect(() => {
    dispatch(fetchOperators())
  }, [dispatch])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return list.filter((op) => {
      if (q && !`${op.firstName} ${op.lastName} ${op.login}`.toLowerCase().includes(q)) return false
      if (roleFilter && op.role !== roleFilter) return false
      if (statusFilter && op.status !== statusFilter) return false
      return true
    })
  }, [list, search, roleFilter, statusFilter])

  const hasFilters = search !== '' || roleFilter !== '' || statusFilter !== ''

  const handleEditClose = () => {
    setEditOperator(null)
    dispatch(fetchOperators())
  }

  const selectCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700'

  return (
    <>
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
      {editOperator && <EditUserModal operator={editOperator} onClose={handleEditClose} />}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Users</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {hasFilters ? `${filtered.length} of ${list.length}` : `${list.length} total`}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6.5" cy="6.5" r="5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or login..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as OperatorRole | '')} className={selectCls}>
            <option value="">All roles</option>
            <option value="Operator">Operator</option>
            <option value="Administrator">Administrator</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')} className={selectCls}>
            <option value="">All statuses</option>
            <option value="Available">Available</option>
            <option value="NotAvailable">Not Available</option>
            <option value="Blocked">Blocked</option>
            <option value="InVacation">On Vacation</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('') }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {hasFilters ? 'No users match the filters' : 'No users found'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-400 font-medium">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Login</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((op) => (
                <tr key={op.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {op.firstName} {op.lastName}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{op.login}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      op.role === 'Administrator' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {op.role}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={op.status} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <RowMenu operator={op} onEdit={setEditOperator} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
