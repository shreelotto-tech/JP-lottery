import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminProvider } from './lib/AdminContext'
import ProtectedRoute from './components/ProtectedRoute'
import SignInPage from './SignInPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CreateUser from './pages/retailer/CreateUser'
import ListUsers from './pages/retailer/ListUsers'
import AddPoints from './pages/retailer/AddPoints'
import TransactionHistory from './pages/TransactionHistory'
import CreateSubAdmin from './pages/subadmin/CreateSubAdmin'
import ListSubAdmins from './pages/subadmin/ListSubAdmins'

function AppLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AdminProvider>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
          } />
          <Route path="/retailer/create" element={
            <ProtectedRoute><AppLayout><CreateUser /></AppLayout></ProtectedRoute>
          } />
          <Route path="/retailer/list" element={
            <ProtectedRoute><AppLayout><ListUsers /></AppLayout></ProtectedRoute>
          } />
          <Route path="/retailer/debit-credit" element={
            <ProtectedRoute><AppLayout><AddPoints /></AppLayout></ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute><AppLayout><TransactionHistory /></AppLayout></ProtectedRoute>
          } />

          {/* Super-admin only */}
          <Route path="/subadmin/create" element={
            <ProtectedRoute requireSuperAdmin><AppLayout><CreateSubAdmin /></AppLayout></ProtectedRoute>
          } />
          <Route path="/subadmin/list" element={
            <ProtectedRoute requireSuperAdmin><AppLayout><ListSubAdmins /></AppLayout></ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </AdminProvider>
    </BrowserRouter>
  </StrictMode>,
)
