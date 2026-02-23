import { createContext, useContext, useEffect, useState } from 'react'
import { type Account, Role } from '../gen/auth/v1/auth_pb'
import { authService } from '../services/auth_service'
import { clearToken, getToken, setToken } from '../lib/transport'

export type { Role }
export type { Account }

// Map proto Role enum → UI string for backwards compat
export type RoleStr = 'admin' | 'teacher' | 'operator' | 'student'

export function roleToStr(r: Role): RoleStr {
  switch (r) {
    case Role.ADMIN:    return 'admin'
    case Role.TEACHER:  return 'teacher'
    case Role.OPERATOR: return 'operator'
    case Role.STUDENT:  return 'student'
    default:            return 'operator'
  }
}

export function strToRole(s: RoleStr): Role {
  switch (s) {
    case 'admin':    return Role.ADMIN
    case 'teacher':  return Role.TEACHER
    case 'operator': return Role.OPERATOR
    case 'student':  return Role.STUDENT
  }
}

// Shape used by RolePage / UI components
export interface UserAccount {
  id: string
  username: string
  role: RoleStr
  displayName: string
}

function accountToUser(a: Account): UserAccount {
  return {
    id:          String(a.id),
    username:    a.username,
    role:        roleToStr(a.role),
    displayName: a.displayName,
  }
}

interface AuthContextValue {
  hydrated:       boolean
  isLoggedIn:     boolean
  currentUser:    UserAccount | null
  users:          UserAccount[]
  loadUsers:      () => Promise<void>
  login:          (username: string, password: string) => Promise<boolean>
  logout:         () => void
  changePassword: (current: string, next: string) => Promise<boolean>
  addUser:        (username: string, password: string, role: RoleStr, displayName: string) => Promise<boolean>
  updateUser:     (id: string, updates: { displayName?: string; role?: RoleStr; newPassword?: string }) => Promise<void>
  deleteUser:     (id: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Decode JWT payload (no crypto verification — server handles that)
function jwtAccountId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.aid ? String(payload.aid) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [users, setUsers]             = useState<UserAccount[]>([])
  const [hydrated, setHydrated]       = useState(false)

  const isLoggedIn = currentUser !== null

  // Re-hydrate session from localStorage on mount
  useEffect(() => {
    const token = getToken()
    if (!token) { setHydrated(true); return }
    authService.listAccounts({}).then(res => {
      const accountId = jwtAccountId(token)
      const me = res.accounts.find(a => String(a.id) === accountId)
      if (me) setCurrentUser(accountToUser(me))
      setUsers(res.accounts.map(accountToUser))
    }).catch(() => {
      clearToken()
    }).finally(() => {
      setHydrated(true)
    })
  }, [])

  const loadUsers = async () => {
    const res = await authService.listAccounts({})
    setUsers(res.accounts.map(accountToUser))
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await authService.login({ username, password })
      setToken(res.token)
      if (res.account) {
        setCurrentUser(accountToUser(res.account))
      }
      await loadUsers()
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    clearToken()
    setCurrentUser(null)
    setUsers([])
  }

  const changePassword = async (current: string, next: string): Promise<boolean> => {
    try {
      await authService.changePassword({ currentPassword: current, newPassword: next })
      return true
    } catch {
      return false
    }
  }

  const addUser = async (username: string, password: string, role: RoleStr, displayName: string): Promise<boolean> => {
    try {
      const res = await authService.createAccount({
        username,
        password,
        role: strToRole(role),
        displayName,
      })
      if (res.account) {
        setUsers(us => [...us, accountToUser(res.account!)])
      }
      return true
    } catch {
      return false
    }
  }

  const updateUser = async (id: string, updates: { displayName?: string; role?: RoleStr; newPassword?: string }) => {
    const existing = users.find(u => u.id === id)
    const res = await authService.updateAccount({
      id:          BigInt(id),
      displayName: updates.displayName ?? existing?.displayName ?? '',
      role:        strToRole(updates.role ?? existing?.role ?? 'operator'),
      newPassword: updates.newPassword ?? '',
    })
    if (res.account) {
      const updated = accountToUser(res.account)
      setUsers(us => us.map(u => u.id === id ? updated : u))
      if (currentUser?.id === id) setCurrentUser(updated)
    }
  }

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      await authService.deleteAccount({ id: BigInt(id) })
      setUsers(us => us.filter(u => u.id !== id))
      return true
    } catch {
      return false
    }
  }

  return (
    <AuthContext.Provider value={{
      hydrated, isLoggedIn, currentUser, users,
      loadUsers, login, logout, changePassword,
      addUser, updateUser, deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
