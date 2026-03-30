import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

interface Props {
  children: React.ReactNode
}

export default function AdminRoute({ children }: Props) {
  const operator = useAppSelector((s) => s.auth.operator)
  if (!operator) return <Navigate to="/login" replace />
  if (operator.role !== 'Administrator') return <Navigate to="/requests" replace />
  return <>{children}</>
}
