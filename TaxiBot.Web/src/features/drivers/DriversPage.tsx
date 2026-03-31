import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchDrivers } from './driversSlice'
import EditDriverModal from './EditDriverModal'
import type { TelegramUser } from '@/types'

const LANGUAGE_LABELS: Record<string, string> = {
  uk: '🇺🇦 UK',
  en: '🇬🇧 EN',
  pl: '🇵🇱 PL',
  ru: '🇷🇺 RU',
}

function DriverRowMenu({ driver, onEdit }: { driver: TelegramUser; onEdit: (d: TelegramUser) => void }) {
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
            onClick={() => { setPos(null); onEdit(driver) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

export default function DriversPage() {
  const dispatch = useAppDispatch()
  const { list, isLoading } = useAppSelector((s) => s.drivers)
  const { operator } = useAppSelector((s) => s.auth)
  const [editDriver, setEditDriver] = useState<TelegramUser | null>(null)
  const isAdmin = operator?.role === 'Administrator'

  useEffect(() => {
    dispatch(fetchDrivers())
  }, [dispatch])

  const handleEditClose = () => {
    setEditDriver(null)
    dispatch(fetchDrivers())
  }

  return (
    <>
      {editDriver && <EditDriverModal driver={editDriver} onClose={handleEditClose} />}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-800">Drivers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{list.length} registered</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No drivers registered yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-400 font-medium">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Telegram</th>
                <th className="px-6 py-3">Language</th>
                <th className="px-6 py-3">Requests</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Registered</th>
                {isAdmin && <th className="px-6 py-3" />}
              </tr>
            </thead>
            <tbody>
              {list.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {user.username ? (
                      <span className="text-blue-500">@{user.username}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {LANGUAGE_LABELS[user.language] ?? user.language}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-medium rounded-full w-6 h-6">
                      {user.requestsCount}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {user.driverStatus === 'Blocked' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Blocked
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-400">
                    {new Date(user.registeredAt).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-3 text-right">
                      <DriverRowMenu driver={user} onEdit={setEditDriver} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
