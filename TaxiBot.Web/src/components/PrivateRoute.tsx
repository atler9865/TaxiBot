import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

interface Props {
  children: React.ReactNode
}

export default function PrivateRoute({ children }: Props) {
  const token = useAppSelector((s) => s.auth.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}
