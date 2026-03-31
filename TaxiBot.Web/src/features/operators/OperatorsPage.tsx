import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchOperators } from './operatorsSlice'
import AddUserModal from './AddUserModal'
import EditUserModal from './EditUserModal'
import type { Operator, UserStatus } from '@/types'

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
      const insideBtn = btnRef.current?.contains(target)
      const insideDropdown = dropdownRef.current?.contains(target)
      if (!insideBtn && !insideDropdown) setPos(null)
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

  useEffect(() => {
    dispatch(fetchOperators())
  }, [dispatch])

  const handleEditClose = () => {
    setEditOperator(null)
    dispatch(fetchOperators())
  }

  return (
    <>
    {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
    {editOperator && <EditUserModal operator={editOperator} onClose={handleEditClose} />}
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{list.length} total</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Add User
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No users found</div>
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
            {list.map((op) => (
              <tr key={op.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-800">
                  {op.firstName} {op.lastName}
                </td>
                <td className="px-6 py-3 text-gray-500">{op.login}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    op.role === 'Administrator'
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-blue-50 text-blue-700'
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
