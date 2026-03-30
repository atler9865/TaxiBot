import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { initSignalR } from '@/features/auth/authSlice'
import LoginPage from '@/features/auth/LoginPage'
import RequestsPage from '@/features/requests/RequestsPage'
import UsersPage from '@/features/operators/OperatorsPage'
import DriversPage from '@/features/drivers/DriversPage'
import PrivateRoute from '@/components/PrivateRoute'
import AdminRoute from '@/components/AdminRoute'
import Layout from '@/components/Layout'

export default function App() {
  const dispatch = useAppDispatch()

  // Re-connect SignalR on page reload if already logged in
  useEffect(() => {
    dispatch(initSignalR())
  }, [dispatch])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/requests"
          element={
            <PrivateRoute>
              <Layout>
                <RequestsPage />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <Layout>
                <UsersPage />
              </Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/drivers"
          element={
            <PrivateRoute>
              <Layout>
                <DriversPage />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/requests" replace />} />
        <Route path="*" element={<Navigate to="/requests" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
