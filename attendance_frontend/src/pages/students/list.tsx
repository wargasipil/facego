import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Flex,
  HStack,
  Badge,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  TableScrollArea,
  AvatarRoot,
  AvatarFallback,
  AvatarImage,
  IconButton,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  Spinner,
} from '@chakra-ui/react'
import {
  FiCalendar,
  FiCheckCircle,
  FiEdit2,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { type User } from '../../gen/users/v1/users_pb'
import { userService } from '../../services/user_service'
import { classService } from '../../services/class_service'
import { studyProgramService } from '../../services/study_program_service'
import { gradeService } from '../../services/grade_service'
import { StudentFilterBar } from './components/StudentFilterBar'
import { StudentEditDialog } from './components/StudentEditDialog'
import { StudentDeleteDialog } from './components/StudentDeleteDialog'
import { StudentPagination } from './components/StudentPagination'
import type { ClassOption, StudyProgramOption, GradeOption } from './components/types'

export default function StudentListPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // ── server data ──
  const [students, setStudents]     = useState<User[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── search / filter (pending = in UI, applied = sent to server) ──
  // classFilter values are class ID strings ('' = no filter)
  const [pendingSearch, setPendingSearch]           = useState('')
  const [pendingClassFilter, setPendingClassFilter] = useState('')
  const [appliedSearch, setAppliedSearch]           = useState('')
  const [appliedClassFilter, setAppliedClassFilter] = useState('')
  const [classes, setClasses]                       = useState<ClassOption[]>([])

  // ── pagination ──
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ── success banner after navigating back from register ──
  const [justRegistered, setJustRegistered] = useState<string | null>(
    (location.state as { registered?: string } | null)?.registered ?? null
  )

  // ── dialog state ──
  const [studyPrograms, setStudyPrograms] = useState<StudyProgramOption[]>([])
  const [grades, setGrades]               = useState<GradeOption[]>([])
  const [editTarget, setEditTarget]       = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<User | null>(null)

  // ── data fetching ──
  useEffect(() => {
    classService.listClasses({})
      .then(r => setClasses(r.classes.map(c => ({ id: Number(c.id), name: c.name }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    userService.listUsers({
      filter: { search: appliedSearch, classId: BigInt(appliedClassFilter || '0') },
      page,
      pageSize,
    })
      .then(r => { setStudents(r.users); setTotal(r.total) })
      .catch(err => setFetchError((err as Error).message ?? 'Failed to load students'))
      .finally(() => setLoading(false))
  }, [appliedSearch, appliedClassFilter, page, pageSize])

  useEffect(() => {
    studyProgramService.listStudyPrograms({})
      .then(r => setStudyPrograms(r.studyPrograms.map(sp => ({ id: Number(sp.id), name: sp.name, code: sp.code }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    gradeService.listGrades({})
      .then(r => setGrades(r.grades.map(g => ({ id: Number(g.id), label: g.label, level: g.level }))))
      .catch(() => {})
  }, [])

  // ── pagination derived ──
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd   = Math.min(page * pageSize, total)

  const pageNumbers = useMemo(() => {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end   = Math.min(totalPages, page + delta)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  // ── filter handlers ──
  const hasActiveFilter  = !!(appliedSearch || appliedClassFilter)
  const hasChangedFilter = pendingSearch !== appliedSearch || pendingClassFilter !== appliedClassFilter

  const handleApplyFilter = () => {
    setAppliedSearch(pendingSearch)
    setAppliedClassFilter(pendingClassFilter)
    setPage(1)
  }

  const handleClearFilter = () => {
    setPendingSearch('')
    setPendingClassFilter('')
    setAppliedSearch('')
    setAppliedClassFilter('')
    setPage(1)
  }

  // ── delete handler ──
  const handleDelete = async () => {
    if (!deleteTarget) return
    await userService.deleteUser({ id: deleteTarget.id })
    setDeleteTarget(null)
    const newTotal = total - 1
    const maxPage  = Math.max(1, Math.ceil(newTotal / pageSize))
    const nextPage = Math.min(page, maxPage)
    if (nextPage !== page) {
      setPage(nextPage)
    } else {
      setLoading(true)
      userService.listUsers({
        filter: { search: appliedSearch, classId: BigInt(appliedClassFilter || '0') },
        page: nextPage,
        pageSize,
      })
        .then(r => { setStudents(r.users); setTotal(r.total) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }

  const formatDate = (ts?: { seconds: bigint }) =>
    ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  // ── render ──
  return (
    <Box py={6} bg="gray.50" minH="100vh">
      <Container maxW="container.xl">

        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg">Students</Heading>
            <Text color="gray.500" mt={1} fontSize="sm">{total} registered students</Text>
          </Box>
          <Button colorPalette="blue" size="sm" onClick={() => navigate('/students/register')}>
            <FiUserPlus />
            Register New
          </Button>
        </Flex>

        {/* Success banner */}
        {justRegistered && (
          <HStack bg="green.50" border="1px solid" borderColor="green.200" borderRadius="md" px={4} py={3} mb={4} gap={2}>
            <FiCheckCircle color="#38a169" />
            <Text fontSize="sm" color="green.700" flex={1}>
              <Text as="span" fontWeight="semibold">{justRegistered}</Text> has been registered successfully.
            </Text>
            <Button size="xs" variant="ghost" colorPalette="green" onClick={() => setJustRegistered(null)}>
              Dismiss
            </Button>
          </HStack>
        )}

        {/* Error banner */}
        {fetchError && (
          <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
            <Text color="red.600" fontSize="sm">{fetchError}</Text>
          </Box>
        )}

        {/* Table card */}
        <Box bg="white" borderRadius="xl" shadow="sm" border="1px solid" borderColor="gray.100">

          {/* Card header */}
          <Flex px={5} py={4} borderBottom="1px solid" borderColor="gray.100" justify="space-between" align="center">
            <Heading size="sm">All Students</Heading>
            {total > 0 && (
              <Badge colorPalette="blue" variant="subtle" borderRadius="full" px={2}>{total}</Badge>
            )}
          </Flex>

          {/* Filters */}
          <Box px={5} py={3} borderBottom="1px solid" borderColor="gray.50">
            <StudentFilterBar
              classes={classes}
              pendingSearch={pendingSearch}
              pendingClassFilter={pendingClassFilter}
              hasActiveFilter={hasActiveFilter}
              hasChangedFilter={hasChangedFilter}
              onSearchChange={setPendingSearch}
              onClassFilterChange={setPendingClassFilter}
              onApply={handleApplyFilter}
              onClear={handleClearFilter}
            />
          </Box>

          {loading ? (
            <Flex justify="center" py={16}><Spinner color="blue.500" /></Flex>
          ) : students.length === 0 ? (
            <EmptyStateRoot>
              <EmptyStateContent py={16}>
                <EmptyStateIndicator><FiUsers size={32} /></EmptyStateIndicator>
                <EmptyStateTitle>No students found</EmptyStateTitle>
                <EmptyStateDescription>
                  {appliedSearch || appliedClassFilter
                    ? 'Try a different search term or class filter.'
                    : 'Register the first student using the button above.'}
                </EmptyStateDescription>
              </EmptyStateContent>
            </EmptyStateRoot>
          ) : (
            <TableScrollArea overflowX="auto">
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow bg="gray.50">
                    <TableColumnHeader ps={5} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Student</TableColumnHeader>
                    <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">ID</TableColumnHeader>
                    <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Academic</TableColumnHeader>
                    <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Parent / Guardian</TableColumnHeader>
                    <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Registered</TableColumnHeader>
                    <TableColumnHeader textAlign="right" pe={5} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow
                      key={String(s.id)}
                      _hover={{ bg: 'blue.50' }}
                      transition="background 0.1s"
                    >
                      {/* Student */}
                      <TableCell ps={5} py={3}>
                        <HStack gap={3}>
                          <AvatarRoot size="sm" borderRadius="md">
                            {s.photoUrl && <AvatarImage src={s.photoUrl} />}
                            <AvatarFallback bg="blue.100" color="blue.700" fontWeight="semibold" fontSize="xs">
                              {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </AvatarRoot>
                          <Box>
                            <Text fontWeight="medium" fontSize="sm">{s.name}</Text>
                            {s.email && <Text fontSize="xs" color="gray.400">{s.email}</Text>}
                          </Box>
                        </HStack>
                      </TableCell>

                      {/* ID */}
                      <TableCell>
                        <Badge variant="outline" size="sm" fontFamily="mono">{s.studentId}</Badge>
                      </TableCell>

                      {/* Academic: grade + class + study program */}
                      <TableCell>
                        <HStack gap={1} flexWrap="wrap">
                          {s.gradeLabel && (
                            <Badge colorPalette="blue" variant="subtle" size="sm">{s.gradeLabel}</Badge>
                          )}
                          {s.className ? (
                            <Badge colorPalette="purple" variant="subtle" size="sm">{s.className}</Badge>
                          ) : (
                            <Badge colorPalette="gray" variant="outline" size="sm">No Class</Badge>
                          )}
                          {s.studyProgramName && (
                            <Badge colorPalette="teal" variant="subtle" size="sm">{s.studyProgramName}</Badge>
                          )}
                        </HStack>
                      </TableCell>

                      {/* Parent */}
                      <TableCell>
                        {s.parentName ? (
                          <Box>
                            <Text fontSize="sm">{s.parentName}</Text>
                            {s.parentPhone && <Text fontSize="xs" color="gray.400">{s.parentPhone}</Text>}
                          </Box>
                        ) : (
                          <Text fontSize="xs" color="gray.300">—</Text>
                        )}
                      </TableCell>

                      {/* Registered */}
                      <TableCell color="gray.400" fontSize="xs">{formatDate(s.registeredAt)}</TableCell>

                      {/* Actions */}
                      <TableCell pe={5}>
                        <HStack gap={1} justify="flex-end">
                          <IconButton
                            aria-label="View attendance"
                            variant="ghost" size="sm" colorPalette="teal"
                            onClick={() => navigate(`/students/${s.id}/attendance`)}
                          >
                            <FiCalendar />
                          </IconButton>
                          <IconButton
                            aria-label="Edit student"
                            variant="ghost" size="sm" colorPalette="blue"
                            onClick={() => setEditTarget(s)}
                          >
                            <FiEdit2 />
                          </IconButton>
                          <IconButton
                            aria-label="Delete student"
                            variant="ghost" size="sm" colorPalette="red"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <FiTrash2 />
                          </IconButton>
                        </HStack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
          )}

          <StudentPagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            pageNumbers={pageNumbers}
            onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1) }}
          />
        </Box>
      </Container>

      <StudentEditDialog
        user={editTarget}
        studyPrograms={studyPrograms}
        grades={grades}
        onSave={updated => {
          setStudents(ss => ss.map(s => s.id === updated.id ? updated : s))
          setEditTarget(null)
        }}
        onClose={() => setEditTarget(null)}
      />

      <StudentDeleteDialog
        user={deleteTarget}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
