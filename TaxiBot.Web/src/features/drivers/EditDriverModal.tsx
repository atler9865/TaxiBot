import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { updateDriverThunk, clearUpdateError } from './driversSlice'
import type { TelegramUser, DriverStatus } from '@/types'

interface Props {
  driver: TelegramUser
  onClose: () => void
}

export default function EditDriverModal({ driver, onClose }: Props) {
  const dispatch = useAppDispatch()
  const { isUpdating, updateError } = useAppSelector((s) => s.drivers)
  const [driverStatus, setDriverStatus] = useState<DriverStatus>(driver.driverStatus)

  useEffect(() => {
    dispatch(clearUpdateError())
  }, [dispatch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(updateDriverThunk({ id: driver.id, driverStatus }))
    if (updateDriverThunk.fulfilled.match(result)) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Edit Driver</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-800 mb-3">
              {driver.firstName} {driver.lastName}
              {driver.username && <span className="text-blue-500 font-normal ml-1">@{driver.username}</span>}
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={driverStatus}
              onChange={(e) => setDriverStatus(e.target.value as DriverStatus)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="None"></option>
              <option value="Blocked">Blocked</option>
            </select>
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
