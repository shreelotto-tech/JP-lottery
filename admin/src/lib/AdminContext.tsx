import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

export type AdminRole = 'super_admin' | 'sub_admin'

export type AdminProfile = {
  id: string
  username: string
  display_name: string | null
  role: AdminRole
  parent_id: string | null
}

type AdminContextType = {
  adminProfile: AdminProfile | null
  isSuperAdmin: boolean
  isSubAdmin: boolean
  isLoading: boolean
  signOut: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | null>(null)

export function useAdminContext() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdminContext must be used within AdminProvider')
  return ctx
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, role, parent_id')
      .eq('id', userId)
      .single()

    if (data && (data.role === 'super_admin' || data.role === 'sub_admin')) {
      setAdminProfile(data as AdminProfile)
    } else {
      await supabase.auth.signOut()
      setAdminProfile(null)
    }
    setIsLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAdminProfile(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return  // handled by getSession() above
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setAdminProfile(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AdminContext.Provider value={{
      adminProfile,
      isSuperAdmin: adminProfile?.role === 'super_admin',
      isSubAdmin: adminProfile?.role === 'sub_admin',
      isLoading,
      signOut,
    }}>
      {children}
    </AdminContext.Provider>
  )
}
