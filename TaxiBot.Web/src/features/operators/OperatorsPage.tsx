import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchOperators } from './operatorsSlice'
import AddUserModal from './AddUserModal'

export default function UsersPage() {
  const dispatch = useAppDispatch()
  const { list, isLoading } = useAppSelector((s) => s.operators)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    dispatch(fetchOperators())
  }, [dispatch])

  return (
    <>
    {showModal && <AddUserModal onClose={() => setShowModal(false)} />}
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{list.length} total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
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
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    op.isAvailable
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${op.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {op.isAvailable ? 'Available' : 'Busy'}
                  </span>
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
