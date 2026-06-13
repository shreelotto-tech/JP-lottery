import { Navigate } from 'react-router-dom'
import { useAdminContext } from '../lib/AdminContext'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  requireSuperAdmin?: boolean
}

export default function ProtectedRoute({ children, requireSuperAdmin = false }: Props) {
  const { adminProfile, isLoading } = useAdminContext()

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: '#666' }}>Loading...</div>
      </div>
    )
  }

  if (!adminProfile) return <Navigate to="/signin" replace />
  if (requireSuperAdmin && adminProfile.role !== 'super_admin') return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
