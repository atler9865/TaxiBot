import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { updateUserThunk, clearUpdateError } from './operatorsSlice'
import type { Operator, OperatorRole, UserStatus } from '@/types'

interface Props {
  operator: Operator
  onClose: () => void
}

export default function EditUserModal({ operator, onClose }: Props) {
  const dispatch = useAppDispatch()
  const { isUpdating, updateError } = useAppSelector((s) => s.operators)
  const [form, setForm] = useState({
    login: operator.login,
    firstName: operator.firstName,
    lastName: operator.lastName,
    role: operator.role as OperatorRole,
    status: operator.status as UserStatus,
    password: '',
  })

  useEffect(() => {
    dispatch(clearUpdateError())
  }, [dispatch])

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      login: form.login,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role,
      status: form.status,
      ...(form.password ? { password: form.password } : {}),
    }
    const result = await dispatch(updateUserThunk({ id: operator.id, data: payload }))
    if (updateUserThunk.fulfilled.match(result)) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input
                required
                value={form.firstName}
                onChange={set('firstName')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input
                required
                value={form.lastName}
                onChange={set('lastName')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Login</label>
            <input
              required
              value={form.login}
              onChange={set('login')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john.doe"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Password <span className="text-gray-400 font-normal">(leave empty to keep current)</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select
                value={form.role}
                onChange={set('role')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Operator">Operator</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={set('status')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Available">Available</option>
                <option value="NotAvailable">Not Available</option>
                <option value="Blocked">Blocked</option>
                <option value="InVacation">On Vacation</option>
              </select>
            </div>
          </div>

          {updateError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{updateError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
