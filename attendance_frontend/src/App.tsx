import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Flex, Spinner } from '@chakra-ui/react'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'
import AttendancePage          from './pages/AttendancePage'
import StudentListPage         from './pages/students/list'
import RegisterStudentPage     from './pages/RegisterStudentPage'
import StudentAttendancePage   from './pages/students/detail'
import GradePage           from './pages/GradePage'
import StudyProgramPage   from './pages/StudyProgramPage'
import ClassPage       from './pages/ClassPage'
import ClassDetailPage from './pages/ClassDetailPage'
import TeacherPage     from './pages/TeacherPage'
import SettingsPage    from './pages/SettingsPage'
import RolePage        from './pages/RolePage'
import WhatsappPage   from './pages/WhatsappPage'
import LoginPage       from './pages/LoginPage'

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  if (currentUser?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function ProtectedRoutes() {
  const { hydrated, isLoggedIn } = useAuth()

  // Wait for session restore before deciding where to redirect
  if (!hydrated) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    )
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"                              element={<AttendancePage />} />
        <Route path="/students"                      element={<StudentListPage />} />
        <Route path="/students/register"             element={<RegisterStudentPage />} />
        <Route path="/students/:id/attendance"       element={<StudentAttendancePage />} />
        <Route path="/grades"          element={<GradePage />} />
        <Route path="/study-programs" element={<StudyProgramPage />} />
        <Route path="/classes"          element={<ClassPage />} />
        <Route path="/classes/:id"      element={<ClassDetailPage />} />
        <Route path="/teachers" element={<TeacherPage />} />
        <Route path="/whatsapp" element={<WhatsappPage />} />
        <Route path="/roles"    element={<AdminOnly><RolePage /></AdminOnly>} />
        <Route path="/settings" element={<AdminOnly><SettingsPage /></AdminOnly>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*"     element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
