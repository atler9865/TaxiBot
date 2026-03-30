import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchDrivers } from './driversSlice'

const LANGUAGE_LABELS: Record<string, string> = {
  uk: '🇺🇦 UK',
  en: '🇬🇧 EN',
  pl: '🇵🇱 PL',
  ru: '🇷🇺 RU',
}

export default function DriversPage() {
  const dispatch = useAppDispatch()
  const { list, isLoading } = useAppSelector((s) => s.drivers)

  useEffect(() => {
    dispatch(fetchDrivers())
  }, [dispatch])

  return (
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
              <th className="px-6 py-3">Registered</th>
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
                <td className="px-6 py-3 text-gray-400">
                  {new Date(user.registeredAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
