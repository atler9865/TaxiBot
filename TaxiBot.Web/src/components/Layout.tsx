import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logoutThunk } from '@/features/auth/authSlice'
import { removeNotification } from '@/features/ui/uiSlice'

interface Props {
  children: React.ReactNode
}

const NAV_ITEMS = [
  { to: '/requests', label: 'Requests', icon: '📋', adminOnly: false },
  { to: '/users', label: 'Users', icon: '👥', adminOnly: true },
  { to: '/drivers', label: 'Drivers', icon: '🚗', adminOnly: false },
]

export default function Layout({ children }: Props) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const operator = useAppSelector((s) => s.auth.operator)
  const unassignedCount = useAppSelector((s) => s.requests.unassignedCount)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isAdmin = operator?.role === 'Administrator'

  const handleLogout = async () => {
    await dispatch(logoutThunk())
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-lg text-blue-600">🚖 TaxiBot Admin</span>
        </div>
        <div className="flex items-center gap-3">
          {operator && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {operator.firstName} {operator.lastName}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                operator.role === 'Administrator'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {operator.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden ${
            sidebarOpen ? 'w-56' : 'w-0'
          }`}
        >
          <nav className="flex-1 py-3 w-56">
            {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.to === '/requests' && unassignedCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                    {unassignedCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto min-h-0">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}

function ToastContainer() {
  const dispatch = useAppDispatch()
  const notifications = useAppSelector((s) => s.ui.notifications)

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-center justify-between p-3 rounded-lg shadow-md text-sm text-white ${
            n.type === 'error'
              ? 'bg-red-500'
              : n.type === 'success'
              ? 'bg-green-500'
              : 'bg-blue-500'
          }`}
        >
          <span>{n.message}</span>
          <button
            onClick={() => dispatch(removeNotification(n.id))}
            className="ml-3 text-white hover:text-gray-200 leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
