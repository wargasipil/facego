import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Flex,
  HStack,
  VStack,
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
  Input,
  InputGroup,
  Field,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  Spinner,
  Separator,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Checkbox,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@chakra-ui/react'
import {
  FiArrowLeft,
  FiUsers,
  FiCalendar,
  FiBook,
  FiUser,
  FiUserPlus,
  FiUserMinus,
  FiSearch,
  FiClock,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiClipboard,
} from 'react-icons/fi'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { type Class, type ClassSchedule } from '../gen/classes/v1/classes_pb'
import { type User } from '../gen/users/v1/users_pb'
import { type AttendanceRecord, AttendanceStatus } from '../gen/attendance/v1/attendance_pb'
import { classService } from '../services/class_service'
import { userService } from '../services/user_service'
import { attendanceService } from '../services/attendance_service'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'

const DAY_LABELS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_COLORS = ['', 'blue', 'teal', 'green', 'orange', 'purple', 'pink', 'red'] as const

const EMPTY_SCHEDULE_FORM = { dayOfWeek: 1, startTime: '', endTime: '', subject: '', room: '' }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Flex gap={3} align="baseline">
      <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" w="100px" flexShrink={0}>
        {label}
      </Text>
      <Text as="div" fontSize="sm" color="gray.700">{value ?? '—'}</Text>
    </Flex>
  )
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  [AttendanceStatus.UNSPECIFIED]: 'Unknown',
  [AttendanceStatus.PRESENT]:     'Present',
  [AttendanceStatus.ABSENT]:      'Absent',
  [AttendanceStatus.LATE]:        'Late',
}
const STATUS_COLOR: Record<AttendanceStatus, string> = {
  [AttendanceStatus.UNSPECIFIED]: 'gray',
  [AttendanceStatus.PRESENT]:     'green',
  [AttendanceStatus.ABSENT]:      'red',
  [AttendanceStatus.LATE]:        'orange',
}

export default function ClassDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cls, setCls]           = useState<Class | null>(null)
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // ── tabs ──
  const [activeTab, setActiveTab] = useState('students')

  // ── remove student ──
  const [removeTarget, setRemoveTarget]   = useState<User | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // ── add students dialog ──
  const [addOpen, setAddOpen]         = useState(false)
  const [allStudents, setAllStudents] = useState<User[]>([])
  const [addSearch, setAddSearch]     = useState('')
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [addLoading, setAddLoading]   = useState(false)
  const [addFetching, setAddFetching] = useState(false)

  // ── schedules ──
  const [schedules, setSchedules]                   = useState<ClassSchedule[]>([])
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule]       = useState<ClassSchedule | null>(null)
  const [scheduleForm, setScheduleForm]             = useState(EMPTY_SCHEDULE_FORM)
  const [scheduleFormLoading, setScheduleFormLoading] = useState(false)
  const [scheduleFormError, setScheduleFormError]   = useState<string | null>(null)
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<ClassSchedule | null>(null)
  const [deleteScheduleLoading, setDeleteScheduleLoading] = useState(false)

  // ── attendance log ──
  const [attendanceDate, setAttendanceDate]     = useState(todayIso())
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceSummary, setAttendanceSummary] = useState<{ total: number; present: number; absent: number; late: number } | null>(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  const loadClass = useCallback(() => {
    if (!id) return
    const classId = BigInt(id)
    setLoading(true)
    classService.getClass({ id: classId })
      .then(r => {
        const c = r.class!
        setCls(c)
        return Promise.all([
          classService.listClassStudents({ id: classId }),
          classService.listSchedules({ classId }),
        ])
      })
      .then(([studentsRes, schedulesRes]) => {
        setStudents(studentsRes.students)
        setSchedules(schedulesRes.schedules)
      })
      .catch(err => setError((err as Error).message ?? 'Failed to load class'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadClass() }, [loadClass])

  const loadAttendance = useCallback(async (className: string, date: string) => {
    setAttendanceLoading(true)
    try {
      const [y, m, d] = date.split('-').map(Number)
      const dayStart = new Date(y, m - 1, d, 0, 0, 0)
      const r = await attendanceService.getDailyAttendance({
        date:        timestampFromDate(dayStart),
        classFilter: className,
      })
      setAttendanceRecords(r.records)
      if (r.summary) {
        setAttendanceSummary({
          total:   r.summary.total,
          present: r.summary.present,
          absent:  r.summary.absent,
          late:    r.summary.late,
        })
      } else {
        setAttendanceSummary(null)
      }
    } catch {
      setAttendanceRecords([])
      setAttendanceSummary(null)
    } finally {
      setAttendanceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'attendance' && cls) {
      loadAttendance(cls.name, attendanceDate)
    }
  }, [activeTab, attendanceDate, cls, loadAttendance])

  const formatDate = (ts?: { seconds: bigint }) =>
    ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  const formatTime = (ts?: { seconds: bigint }) =>
    ts ? new Date(Number(ts.seconds) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'

  // ── remove student ────────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!removeTarget || !cls) return
    setRemoveLoading(true)
    try {
      await classService.unenrollStudent({ classId: cls.id, userId: removeTarget.id })
      setStudents(ss => ss.filter(s => s.id !== removeTarget.id))
      setRemoveTarget(null)
    } catch {}
    finally { setRemoveLoading(false) }
  }

  // ── add dialog ────────────────────────────────────────────────────────────────
  const openAddDialog = async () => {
    setAddOpen(true)
    setAddSearch('')
    setSelected(new Set())
    setAddFetching(true)
    try {
      const r = await userService.listUsers({ filter: {} })
      setAllStudents(r.users)
    } catch {}
    finally { setAddFetching(false) }
  }

  const currentIds = new Set(students.map(s => String(s.id)))
  const candidates = allStudents.filter(s =>
    !currentIds.has(String(s.id)) &&
    (s.name.toLowerCase().includes(addSearch.toLowerCase()) ||
     s.studentId.toLowerCase().includes(addSearch.toLowerCase()) ||
     (s.className && s.className.toLowerCase().includes(addSearch.toLowerCase())))
  )

  const toggleSelect = (id: string) =>
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const handleAdd = async () => {
    if (!cls || selected.size === 0) return
    setAddLoading(true)
    try {
      const toAdd = allStudents.filter(s => selected.has(String(s.id)))
      await Promise.all(toAdd.map(s => classService.enrollStudent({ classId: cls.id, userId: s.id })))
      const r = await classService.listClassStudents({ id: BigInt(id!) })
      setStudents(r.students)
      setAddOpen(false)
    } catch {}
    finally { setAddLoading(false) }
  }

  // ── schedule CRUD ─────────────────────────────────────────────────────────────
  const openNewSchedule = () => {
    setEditingSchedule(null)
    setScheduleForm(EMPTY_SCHEDULE_FORM)
    setScheduleFormError(null)
    setScheduleDialogOpen(true)
  }

  const openEditSchedule = (sc: ClassSchedule) => {
    setEditingSchedule(sc)
    setScheduleForm({
      dayOfWeek: sc.dayOfWeek,
      startTime: sc.startTime,
      endTime:   sc.endTime,
      subject:   sc.subject,
      room:      sc.room,
    })
    setScheduleFormError(null)
    setScheduleDialogOpen(true)
  }

  const handleScheduleSubmit = async () => {
    if (!scheduleForm.startTime || !scheduleForm.endTime) {
      setScheduleFormError('Start time and end time are required.')
      return
    }
    setScheduleFormLoading(true)
    setScheduleFormError(null)
    try {
      if (editingSchedule) {
        const r = await classService.updateSchedule({
          id:        editingSchedule.id,
          dayOfWeek: scheduleForm.dayOfWeek,
          startTime: scheduleForm.startTime,
          endTime:   scheduleForm.endTime,
          subject:   scheduleForm.subject,
          room:      scheduleForm.room,
        })
        setSchedules(ss => ss.map(s => s.id === r.schedule!.id ? r.schedule! : s))
      } else {
        const r = await classService.createSchedule({
          classId:   BigInt(id!),
          dayOfWeek: scheduleForm.dayOfWeek,
          startTime: scheduleForm.startTime,
          endTime:   scheduleForm.endTime,
          subject:   scheduleForm.subject,
          room:      scheduleForm.room,
        })
        setSchedules(ss =>
          [...ss, r.schedule!].sort((a, b) =>
            a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startTime.localeCompare(b.startTime)
          )
        )
      }
      setScheduleDialogOpen(false)
    } catch (err) {
      setScheduleFormError((err as Error).message ?? 'Failed to save schedule.')
    } finally {
      setScheduleFormLoading(false)
    }
  }

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleTarget) return
    setDeleteScheduleLoading(true)
    try {
      await classService.deleteSchedule({ id: deleteScheduleTarget.id })
      setSchedules(ss => ss.filter(s => s.id !== deleteScheduleTarget.id))
      setDeleteScheduleTarget(null)
    } catch {}
    finally { setDeleteScheduleLoading(false) }
  }

  // ── loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <Box py={6}>
        <Container maxW="container.xl">
          <Flex justify="center" py={20}><Spinner size="lg" color="blue.500" /></Flex>
        </Container>
      </Box>
    )
  }

  if (error || !cls) {
    return (
      <Box py={6}>
        <Container maxW="container.xl">
          <Button variant="ghost" size="sm" mb={4} onClick={() => navigate('/classes')}>
            <FiArrowLeft /> Back to Classes
          </Button>
          <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={4}>
            <Text color="red.600">{error ?? 'Class not found.'}</Text>
          </Box>
        </Container>
      </Box>
    )
  }

  return (
    <Box py={6}>
      <Container maxW="container.xl">

        {/* ── Header ── */}
        <Button variant="ghost" size="sm" mb={5} onClick={() => navigate('/classes')}>
          <FiArrowLeft /> Back to Classes
        </Button>

        <Flex justify="space-between" align="flex-start" mb={6}>
          <Box>
            <HStack gap={3} mb={1}>
              <Heading size="lg">{cls.name}</Heading>
              {cls.grade && (
                <Badge colorPalette="purple" variant="subtle" fontSize="sm">
                  Grade {cls.grade.level}
                </Badge>
              )}
            </HStack>
            {cls.description && (
              <Text color="gray.500" mt={1}>{cls.description}</Text>
            )}
          </Box>
          <Badge colorPalette="blue" variant="subtle" px={3} py={1} borderRadius="full" fontSize="sm">
            <HStack gap={1}>
              <FiUsers size={13} />
              <Text>{students.length} Students</Text>
            </HStack>
          </Badge>
        </Flex>

        {/* ── Class Info Card ── */}
        <Box bg="white" borderRadius="lg" shadow="sm" p={5} mb={6}>
          <HStack gap={2} mb={4}>
            <FiBook size={15} />
            <Heading size="sm">Class Information</Heading>
          </HStack>
          <Separator mb={4} />
          <VStack gap={3} align="stretch">
            <InfoRow label="Class Name"  value={cls.name} />
            <InfoRow label="Grade"       value={cls.grade ? `${cls.grade.label} (Level ${cls.grade.level})` : '—'} />
            <InfoRow label="Teacher"     value={
              cls.teacher ? (
                <HStack gap={2}>
                  <Text>{cls.teacher.name}</Text>
                  {cls.teacher.subject && <Badge variant="outline" size="xs">{cls.teacher.subject}</Badge>}
                </HStack>
              ) : '—'
            } />
            <InfoRow label="Created"     value={formatDate(cls.createdAt)} />
            {cls.description && <InfoRow label="Description" value={cls.description} />}
          </VStack>
        </Box>

        {/* ── Tabs ── */}
        <TabsRoot value={activeTab} onValueChange={d => setActiveTab(d.value)}>
          <TabsList mb={4}>
            <TabsTrigger value="students">
              <HStack gap={2}>
                <FiUsers size={14} />
                <Text>Students ({students.length})</Text>
              </HStack>
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <HStack gap={2}>
                <FiClock size={14} />
                <Text>Weekly Schedule ({schedules.length})</Text>
              </HStack>
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <HStack gap={2}>
                <FiClipboard size={14} />
                <Text>Attendance Log</Text>
              </HStack>
            </TabsTrigger>
          </TabsList>

          {/* ── Students Tab ── */}
          <TabsContent value="students">
            <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
              <Flex align="center" justify="space-between" mb={4}>
                <HStack gap={2}>
                  <FiUsers size={15} />
                  <Heading size="sm">Students ({students.length})</Heading>
                </HStack>
                <Button size="sm" colorPalette="blue" onClick={openAddDialog}>
                  <FiUserPlus />
                  Add Student
                </Button>
              </Flex>
              <Separator mb={4} />

              {students.length === 0 ? (
                <EmptyStateRoot>
                  <EmptyStateContent py={10}>
                    <EmptyStateIndicator><FiUser size={32} /></EmptyStateIndicator>
                    <EmptyStateTitle>No students</EmptyStateTitle>
                    <EmptyStateDescription>Click "Add Student" to assign students to this class.</EmptyStateDescription>
                  </EmptyStateContent>
                </EmptyStateRoot>
              ) : (
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>Student</TableColumnHeader>
                        <TableColumnHeader>Student ID</TableColumnHeader>
                        <TableColumnHeader>Parent / Guardian</TableColumnHeader>
                        <TableColumnHeader>Registered</TableColumnHeader>
                        <TableColumnHeader textAlign="right">Actions</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map(s => (
                        <TableRow key={String(s.id)}>
                          <TableCell>
                            <HStack gap={3}>
                              <AvatarRoot size="sm">
                                {s.photoUrl && <AvatarImage src={s.photoUrl} />}
                                <AvatarFallback>{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                              </AvatarRoot>
                              <Box>
                                <Text fontWeight="medium" fontSize="sm">{s.name}</Text>
                                {s.email && <Text fontSize="xs" color="gray.400">{s.email}</Text>}
                              </Box>
                            </HStack>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" size="sm">{s.studentId}</Badge>
                          </TableCell>
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
                          <TableCell color="gray.400" fontSize="xs">{formatDate(s.registeredAt)}</TableCell>
                          <TableCell>
                            <HStack gap={1} justify="flex-end">
                              <IconButton
                                aria-label="View attendance"
                                variant="ghost"
                                size="sm"
                                colorPalette="teal"
                                onClick={() => navigate(`/students/${s.id}/attendance`)}
                              >
                                <FiCalendar />
                              </IconButton>
                              <IconButton
                                aria-label="Remove from class"
                                variant="ghost"
                                size="sm"
                                colorPalette="red"
                                onClick={() => setRemoveTarget(s)}
                              >
                                <FiUserMinus />
                              </IconButton>
                            </HStack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableRoot>
                </TableScrollArea>
              )}
            </Box>
          </TabsContent>

          {/* ── Weekly Schedule Tab ── */}
          <TabsContent value="schedule">
            <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
              <Flex align="center" justify="space-between" mb={4}>
                <HStack gap={2}>
                  <FiClock size={15} />
                  <Heading size="sm">Weekly Schedule ({schedules.length})</Heading>
                </HStack>
                <Button size="sm" colorPalette="teal" onClick={openNewSchedule}>
                  <FiPlus />
                  Add Schedule
                </Button>
              </Flex>
              <Separator mb={4} />

              {schedules.length === 0 ? (
                <EmptyStateRoot>
                  <EmptyStateContent py={8}>
                    <EmptyStateIndicator><FiClock size={28} /></EmptyStateIndicator>
                    <EmptyStateTitle>No schedule yet</EmptyStateTitle>
                    <EmptyStateDescription>Click "Add Schedule" to add weekly time slots.</EmptyStateDescription>
                  </EmptyStateContent>
                </EmptyStateRoot>
              ) : (
                <VStack gap={2} align="stretch">
                  {schedules.map(sc => (
                    <Flex
                      key={String(sc.id)}
                      align="center"
                      gap={3}
                      px={3}
                      py={2}
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.100"
                      _hover={{ bg: 'gray.50' }}
                    >
                      <Badge
                        colorPalette={DAY_COLORS[sc.dayOfWeek] ?? 'gray'}
                        variant="subtle"
                        minW="90px"
                        textAlign="center"
                        fontSize="xs"
                      >
                        {DAY_LABELS[sc.dayOfWeek] ?? `Day ${sc.dayOfWeek}`}
                      </Badge>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="120px">
                        {sc.startTime} – {sc.endTime}
                      </Text>
                      <Box flex={1}>
                        {sc.subject && (
                          <Text fontSize="sm" color="gray.700">{sc.subject}</Text>
                        )}
                        {sc.room && (
                          <Text fontSize="xs" color="gray.400">Room {sc.room}</Text>
                        )}
                      </Box>
                      <HStack gap={1}>
                        <IconButton
                          aria-label="Edit schedule"
                          variant="ghost"
                          size="sm"
                          colorPalette="blue"
                          onClick={() => openEditSchedule(sc)}
                        >
                          <FiEdit2 />
                        </IconButton>
                        <IconButton
                          aria-label="Delete schedule"
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          onClick={() => setDeleteScheduleTarget(sc)}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>
          </TabsContent>

          {/* ── Attendance Log Tab ── */}
          <TabsContent value="attendance">
            <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
              <Flex align="center" justify="space-between" mb={4}>
                <HStack gap={2}>
                  <FiClipboard size={15} />
                  <Heading size="sm">Attendance Log</Heading>
                </HStack>
                <Input
                  type="date"
                  size="sm"
                  w="160px"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                />
              </Flex>
              <Separator mb={4} />

              {/* Summary */}
              {attendanceSummary && (
                <HStack gap={3} mb={4}>
                  <Badge colorPalette="gray"  variant="subtle" px={3} py={1}>Total: {attendanceSummary.total}</Badge>
                  <Badge colorPalette="green" variant="subtle" px={3} py={1}>Present: {attendanceSummary.present}</Badge>
                  <Badge colorPalette="red"   variant="subtle" px={3} py={1}>Absent: {attendanceSummary.absent}</Badge>
                  <Badge colorPalette="orange" variant="subtle" px={3} py={1}>Late: {attendanceSummary.late}</Badge>
                </HStack>
              )}

              {attendanceLoading ? (
                <Flex justify="center" py={12}><Spinner /></Flex>
              ) : attendanceRecords.length === 0 ? (
                <EmptyStateRoot>
                  <EmptyStateContent py={10}>
                    <EmptyStateIndicator><FiClipboard size={32} /></EmptyStateIndicator>
                    <EmptyStateTitle>No attendance records</EmptyStateTitle>
                    <EmptyStateDescription>No attendance was recorded for this class on the selected date.</EmptyStateDescription>
                  </EmptyStateContent>
                </EmptyStateRoot>
              ) : (
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>Student</TableColumnHeader>
                        <TableColumnHeader>Student ID</TableColumnHeader>
                        <TableColumnHeader>Status</TableColumnHeader>
                        <TableColumnHeader>Check-in</TableColumnHeader>
                        <TableColumnHeader>Last Seen</TableColumnHeader>
                        <TableColumnHeader>Notes</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map(r => (
                        <TableRow key={String(r.id)}>
                          <TableCell>
                            <HStack gap={3}>
                              <AvatarRoot size="sm">
                                {r.photoUrl && <AvatarImage src={r.photoUrl} />}
                                <AvatarFallback>{r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                              </AvatarRoot>
                              <Text fontWeight="medium" fontSize="sm">{r.name}</Text>
                            </HStack>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" size="sm">{r.studentId || '—'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              colorPalette={STATUS_COLOR[r.status] ?? 'gray'}
                              variant="subtle"
                              size="sm"
                            >
                              {STATUS_LABEL[r.status] ?? 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell fontSize="xs" color="gray.600">{formatTime(r.timestamp)}</TableCell>
                          <TableCell fontSize="xs" color="gray.400">{r.lastSeen ? formatTime(r.lastSeen) : '—'}</TableCell>
                          <TableCell fontSize="xs" color="gray.500">{r.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableRoot>
                </TableScrollArea>
              )}
            </Box>
          </TabsContent>
        </TabsRoot>

      </Container>

      {/* ── Schedule Add / Edit Dialog ── */}
      <DialogRoot open={scheduleDialogOpen} onOpenChange={d => { if (!d.open) setScheduleDialogOpen(false) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="420px">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <VStack gap={4}>
                <Field.Root required>
                  <Field.Label>Day of Week <Field.RequiredIndicator /></Field.Label>
                  <select
                    value={scheduleForm.dayOfWeek}
                    onChange={e => setScheduleForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white' }}
                  >
                    {DAY_LABELS.slice(1).map((label, i) => (
                      <option key={i + 1} value={i + 1}>{label}</option>
                    ))}
                  </select>
                </Field.Root>

                <HStack gap={3} w="full">
                  <Field.Root required flex={1}>
                    <Field.Label>Start Time <Field.RequiredIndicator /></Field.Label>
                    <Input
                      type="time"
                      value={scheduleForm.startTime}
                      onChange={e => setScheduleForm(f => ({ ...f, startTime: e.target.value }))}
                    />
                  </Field.Root>
                  <Field.Root required flex={1}>
                    <Field.Label>End Time <Field.RequiredIndicator /></Field.Label>
                    <Input
                      type="time"
                      value={scheduleForm.endTime}
                      onChange={e => setScheduleForm(f => ({ ...f, endTime: e.target.value }))}
                    />
                  </Field.Root>
                </HStack>

                <Field.Root>
                  <Field.Label>Subject</Field.Label>
                  <Input
                    placeholder="e.g. Mathematics"
                    value={scheduleForm.subject}
                    onChange={e => setScheduleForm(f => ({ ...f, subject: e.target.value }))}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Room</Field.Label>
                  <Input
                    placeholder="e.g. 101"
                    value={scheduleForm.room}
                    onChange={e => setScheduleForm(f => ({ ...f, room: e.target.value }))}
                  />
                </Field.Root>

                {scheduleFormError && (
                  <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" px={3} py={2} w="full">
                    <Text color="red.600" fontSize="sm">{scheduleFormError}</Text>
                  </Box>
                )}
              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
              <Button
                colorPalette="teal"
                size="sm"
                loading={scheduleFormLoading}
                onClick={handleScheduleSubmit}
              >
                {editingSchedule ? 'Save Changes' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* ── Delete Schedule Confirm Dialog ── */}
      <DialogRoot open={!!deleteScheduleTarget} onOpenChange={d => { if (!d.open) setDeleteScheduleTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Schedule</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text>
                Delete the{' '}
                <Text as="span" fontWeight="bold">
                  {deleteScheduleTarget ? DAY_LABELS[deleteScheduleTarget.dayOfWeek] : ''}{' '}
                  {deleteScheduleTarget?.startTime}–{deleteScheduleTarget?.endTime}
                </Text>{' '}
                slot?
              </Text>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteScheduleTarget(null)}>Cancel</Button>
              <Button colorPalette="red" size="sm" loading={deleteScheduleLoading} onClick={handleDeleteSchedule}>
                <FiTrash2 /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* ── Remove Student Confirm Dialog ── */}
      <DialogRoot open={!!removeTarget} onOpenChange={d => { if (!d.open) setRemoveTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Student from Class</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text>
                Remove <Text as="span" fontWeight="bold">{removeTarget?.name}</Text> from{' '}
                <Text as="span" fontWeight="bold">{cls?.name}</Text>?
              </Text>
              <Text fontSize="sm" color="gray.500" mt={2}>
                The student's record is kept — they just won't be assigned to this class anymore.
              </Text>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button colorPalette="red" size="sm" loading={removeLoading} onClick={handleRemove}>
                <FiUserMinus /> Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* ── Add Students Dialog ── */}
      <DialogRoot open={addOpen} onOpenChange={d => { if (!d.open) setAddOpen(false) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="520px">
            <DialogHeader>
              <DialogTitle>Add Students to {cls?.name}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <InputGroup mb={3} startElement={<FiSearch color="gray" />}>
                <Input
                  placeholder="Search by name, ID or current class…"
                  size="sm"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                />
              </InputGroup>

              {addFetching ? (
                <Flex justify="center" py={8}><Spinner /></Flex>
              ) : candidates.length === 0 ? (
                <Flex justify="center" py={8}>
                  <Text fontSize="sm" color="gray.400">
                    {addSearch ? 'No matches.' : 'All students are already in this class.'}
                  </Text>
                </Flex>
              ) : (
                <Box maxH="340px" overflowY="auto">
                  <VStack gap={0} align="stretch">
                    {candidates.map(s => (
                      <Flex
                        key={String(s.id)}
                        align="center"
                        gap={3}
                        px={3}
                        py={2}
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: 'gray.50' }}
                        onClick={() => toggleSelect(String(s.id))}
                      >
                        <Checkbox.Root
                          checked={selected.has(String(s.id))}
                          onCheckedChange={() => toggleSelect(String(s.id))}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                        <AvatarRoot size="sm">
                          {s.photoUrl && <AvatarImage src={s.photoUrl} />}
                          <AvatarFallback>{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                        </AvatarRoot>
                        <Box flex={1} minW={0}>
                          <Text fontWeight="medium" fontSize="sm">{s.name}</Text>
                          <HStack gap={2}>
                            <Text fontSize="xs" color="gray.400">{s.studentId}</Text>
                            {s.className && (
                              <Badge variant="outline" size="xs" colorPalette="gray">{s.className}</Badge>
                            )}
                          </HStack>
                        </Box>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              )}

              {selected.size > 0 && (
                <Text fontSize="xs" color="blue.600" mt={2}>
                  {selected.size} student{selected.size > 1 ? 's' : ''} selected
                </Text>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                colorPalette="blue"
                size="sm"
                disabled={selected.size === 0}
                loading={addLoading}
                onClick={handleAdd}
              >
                <FiUserPlus />
                Add {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

    </Box>
  )
}
