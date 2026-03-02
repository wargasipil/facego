import {
  Box,
  Container,
  Text,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  TableScrollArea,
  Badge,
  HStack,
  VStack,
  StatRoot,
  StatLabel,
  StatValueText,
  StatHelpText,
  SimpleGrid,
  Input,
  InputGroup,
  Heading,
  AvatarRoot,
  AvatarFallback,
  AvatarImage,
  Spinner,
  Center,
  Button,
  Flex,
  IconButton,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Field,
} from '@chakra-ui/react'
import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiFilter,
  FiMessageSquare,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import { useState, useEffect, useCallback } from 'react'
import { type AttendanceRecord, AttendanceStatus } from '../gen/attendance/v1/attendance_pb'
import { attendanceService } from '../services/attendance_service'
import { classService } from '../services/class_service'
import { userService } from '../services/user_service'
import { whatsappService } from '../services/whatsapp_service'
import { type User } from '../gen/users/v1/users_pb'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'

// ── helpers ────────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<number, string> = {
  [AttendanceStatus.PRESENT]: 'green',
  [AttendanceStatus.ABSENT]:  'red',
}
const STATUS_LABEL: Record<number, string> = {
  [AttendanceStatus.PRESENT]: 'Present',
  [AttendanceStatus.ABSENT]:  'Absent',
}

function formatTime(ts?: { seconds: bigint }) {
  if (!ts) return '—'
  return new Date(Number(ts.seconds) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Shift a YYYY-MM-DD string by delta days
function stepDate(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

// Returns Mon-based index: 0=Mon … 6=Sun
function weekdayIndex(iso: string): number {
  const jsDow = new Date(iso + 'T00:00:00').getDay() // 0=Sun…6=Sat
  return jsDow === 0 ? 6 : jsDow - 1
}

// Jump to targetIdx (0=Mon…6=Sun) within the same Mon-based week
function jumpToWeekday(iso: string, targetIdx: number): string {
  return stepDate(iso, targetIdx - weekdayIndex(iso))
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [records, setRecords]         = useState<AttendanceRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [dateFilter, setDateFilter]   = useState(todayIso())
  const [classFilter, setClassFilter] = useState('')
  const [classes, setClasses]         = useState<string[]>([])

  // ── selection ──
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── notify parent ──
  const [notifying, setNotifying]     = useState(false)
  const [notifyResult, setNotifyResult] = useState<{ queued: number; skipped: number } | null>(null)

  // ── add-record dialog state ──
  const [addOpen, setAddOpen]       = useState(false)
  const [students, setStudents]     = useState<User[]>([])
  const [addStudentId, setAddStudentId] = useState('')
  const [addStatus, setAddStatus]   = useState<AttendanceStatus>(AttendanceStatus.PRESENT)
  const [addNotes, setAddNotes]     = useState('')
  const [addTime, setAddTime]       = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError]     = useState<string | null>(null)

  // ── delete confirm ──
  const [deleteTarget, setDeleteTarget]   = useState<AttendanceRecord | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── load classes + students once ──
  useEffect(() => {
    classService.listClasses({})
      .then(r => setClasses(r.classes.map(c => c.name)))
      .catch(() => {})
    userService.listUsers({ filter: {} })
      .then(r => setStudents(r.users))
      .catch(() => {})
  }, [])

  // ── fetch attendance when date or class filter changes ──
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    setNotifyResult(null)
    try {
      const [y, m, d] = dateFilter.split('-').map(Number)
      const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
      const resp = await attendanceService.getDailyAttendance({
        date:        timestampFromDate(dayStart),
        classFilter: classFilter,
      })
      setRecords(resp.records)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [dateFilter, classFilter])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // ── derived ──
  const filtered = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.studentId.toLowerCase().includes(search.toLowerCase())
  )

  // Only absent records can be notified
  const notifiableInView = filtered.filter(
    r => r.status === AttendanceStatus.ABSENT
  )
  const allNotifiableSelected =
    notifiableInView.length > 0 &&
    notifiableInView.every(r => selected.has(String(r.userId)))

  const summary = {
    total:   records.length,
    present: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
    absent:  records.filter(r => r.status === AttendanceStatus.ABSENT).length,
  }

  const pct = (n: number) =>
    summary.total === 0 ? '0%' : `${Math.round((n / summary.total) * 100)}%`

  // ── selection helpers ──
  const toggleRow = (r: AttendanceRecord) => {
    if (r.status === AttendanceStatus.PRESENT) return // present can't be notified
    const key = String(r.userId)
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setNotifyResult(null)
  }

  const toggleAllNotifiable = () => {
    if (allNotifiableSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(notifiableInView.map(r => String(r.userId))))
    }
    setNotifyResult(null)
  }

  // ── notify parent ──
  const handleNotify = async () => {
    if (selected.size === 0) return
    setNotifying(true)
    setNotifyResult(null)
    try {
      const [y, m, d] = dateFilter.split('-').map(Number)
      const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
      const r = await whatsappService.sendAttendanceAlerts({
        date:         timestampFromDate(dayStart),
        notifyAbsent: true,
        classFilter,
        userIds:      [...selected].map(id => BigInt(id)),
      })
      setNotifyResult({ queued: r.queued, skipped: r.skipped })
      setSelected(new Set())
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to send notifications')
    } finally {
      setNotifying(false)
    }
  }

  // ── add record ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addStudentId) { setAddError('Select a student'); return }
    setAddLoading(true)
    setAddError(null)
    try {
      const req: {
        userId: bigint
        status: AttendanceStatus
        notes: string
        checkInTime?: ReturnType<typeof timestampFromDate>
      } = {
        userId: BigInt(addStudentId),
        status: addStatus,
        notes:  addNotes,
      }
      if (addTime) {
        req.checkInTime = timestampFromDate(new Date(dateFilter + 'T' + addTime + ':00Z'))
      }
      await attendanceService.createAttendance(req)
      setAddOpen(false)
      setAddStudentId('')
      setAddNotes('')
      setAddTime('')
      setAddStatus(AttendanceStatus.PRESENT)
      fetchRecords()
    } catch (err: unknown) {
      setAddError((err as Error).message ?? 'Failed to create record')
    } finally {
      setAddLoading(false)
    }
  }

  // ── delete record ──
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await attendanceService.deleteAttendance({ id: deleteTarget.id })
      setDeleteTarget(null)
      fetchRecords()
    } catch {
      // silent
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Box py={6}>
      <Container maxW="container.xl">

        {/* Summary Cards */}
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
          <Box bg="white" p={4} borderRadius="lg" shadow="sm">
            <StatRoot>
              <StatLabel color="gray.500">Total</StatLabel>
              <StatValueText>{summary.total}</StatValueText>
              <StatHelpText>for the day</StatHelpText>
            </StatRoot>
          </Box>
          <Box bg="white" p={4} borderRadius="lg" shadow="sm">
            <StatRoot>
              <StatLabel color="green.600">Present</StatLabel>
              <StatValueText color="green.600">{summary.present}</StatValueText>
              <StatHelpText>{pct(summary.present)}</StatHelpText>
            </StatRoot>
          </Box>
          <Box bg="white" p={4} borderRadius="lg" shadow="sm">
            <StatRoot>
              <StatLabel color="red.500">Absent</StatLabel>
              <StatValueText color="red.500">{summary.absent}</StatValueText>
              <StatHelpText>{pct(summary.absent)}</StatHelpText>
            </StatRoot>
          </Box>
        </SimpleGrid>

        {/* Table card */}
        <Box bg="white" borderRadius="lg" shadow="sm" p={4}>
          {/* Toolbar */}
          <Flex mb={4} gap={2} flexWrap="wrap" align="center">
            <Heading size="sm" flex={1}>Daily Records</Heading>

            {/* Date navigation */}
            <HStack gap={1} flexWrap="wrap">
              <IconButton
                aria-label="Previous day"
                variant="ghost"
                size="sm"
                onClick={() => setDateFilter(stepDate(dateFilter, -1))}
              >
                <FiChevronLeft />
              </IconButton>

              {DAY_SHORT.map((label, i) => {
                const active = weekdayIndex(dateFilter) === i
                return (
                  <Button
                    key={i}
                    size="xs"
                    variant={active ? 'solid' : 'ghost'}
                    colorPalette={active ? 'blue' : 'gray'}
                    minW="36px"
                    onClick={() => setDateFilter(jumpToWeekday(dateFilter, i))}
                  >
                    {label}
                  </Button>
                )
              })}

              <IconButton
                aria-label="Next day"
                variant="ghost"
                size="sm"
                onClick={() => setDateFilter(stepDate(dateFilter, 1))}
              >
                <FiChevronRight />
              </IconButton>

              <HStack gap={1}>
                <Box color="gray.400"><FiCalendar size={14} /></Box>
                <Input
                  type="date"
                  size="sm"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  w="140px"
                  borderRadius="md"
                />
              </HStack>
            </HStack>

            {/* Class filter */}
            <HStack gap={1}>
              <Box color="gray.400"><FiFilter size={14} /></Box>
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  background: 'white',
                  height: '32px',
                }}
              >
                <option value="">All classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </HStack>

            {/* Search */}
            <InputGroup maxW="200px" startElement={<FiSearch color="gray" />}>
              <Input
                placeholder="Search name / ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="sm"
                borderRadius="md"
              />
            </InputGroup>

            {/* Notify parent */}
            {selected.size > 0 && (
              <Button
                size="sm"
                colorPalette="green"
                loading={notifying}
                loadingText="Sending…"
                onClick={handleNotify}
              >
                <FiMessageSquare />
                Notify Parent ({selected.size})
              </Button>
            )}

            <Button size="sm" colorPalette="blue" onClick={() => setAddOpen(true)}>
              <FiPlus />
              Add Record
            </Button>
          </Flex>

          {error && (
            <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" px={4} py={2} mb={4}>
              <Text fontSize="sm" color="red.600">{error}</Text>
            </Box>
          )}

          {notifyResult && (
            <Box bg="green.50" border="1px solid" borderColor="green.200" borderRadius="md" px={4} py={2} mb={4}>
              <Text fontSize="sm" color="green.700">
                Queued <strong>{notifyResult.queued}</strong> notification(s).
                {notifyResult.skipped > 0 && ` Skipped ${notifyResult.skipped} (no parent phone).`}
              </Text>
            </Box>
          )}

          {loading ? (
            <Center py={12}><Spinner size="lg" color="blue.500" /></Center>
          ) : (
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader w="40px">
                      {notifiableInView.length > 0 && (
                        <input
                          type="checkbox"
                          checked={allNotifiableSelected}
                          onChange={toggleAllNotifiable}
                          title="Select all absent"
                          style={{ cursor: 'pointer' }}
                        />
                      )}
                    </TableColumnHeader>
                    <TableColumnHeader>Student</TableColumnHeader>
                    <TableColumnHeader>ID</TableColumnHeader>
                    <TableColumnHeader>Class</TableColumnHeader>
                    <TableColumnHeader>Status</TableColumnHeader>
                    <TableColumnHeader>First Seen</TableColumnHeader>
                    <TableColumnHeader>Last Seen</TableColumnHeader>
                    <TableColumnHeader>Notes</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Center py={8} color="gray.400">
                          {search ? 'No matching records.' : 'No attendance records for this day.'}
                        </Center>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(r => {
                    const isNotifiable = r.status === AttendanceStatus.ABSENT
                    const isChecked    = selected.has(String(r.userId))
                    return (
                      <TableRow
                        key={String(r.id)}
                        bg={isChecked ? 'green.50' : undefined}
                        cursor={isNotifiable ? 'pointer' : undefined}
                        onClick={() => toggleRow(r)}
                        _hover={isNotifiable ? { bg: isChecked ? 'green.100' : 'gray.50' } : undefined}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          {isNotifiable && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRow(r)}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <HStack gap={3}>
                            <AvatarRoot size="sm">
                              {r.photoUrl && <AvatarImage src={r.photoUrl} />}
                              <AvatarFallback>{r.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </AvatarRoot>
                            <Text fontWeight="medium" fontSize="sm">{r.name}</Text>
                          </HStack>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" size="sm">{r.studentId}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge colorPalette="purple" variant="subtle" size="sm">{r.className}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge colorPalette={STATUS_COLOR[r.status] ?? 'gray'} textTransform="capitalize">
                            {STATUS_LABEL[r.status] ?? 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell color="gray.500" fontSize="sm">{formatTime(r.timestamp)}</TableCell>
                        <TableCell color="gray.500" fontSize="sm">{formatTime(r.lastSeen)}</TableCell>
                        <TableCell color="gray.400" fontSize="xs">{r.notes || '—'}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <HStack justify="flex-end">
                            <IconButton
                              aria-label="Delete record"
                              variant="ghost"
                              size="sm"
                              colorPalette="red"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <FiTrash2 />
                            </IconButton>
                          </HStack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
          )}
        </Box>
      </Container>

      {/* ── Add Record Dialog ── */}
      <DialogRoot open={addOpen} onOpenChange={d => { if (!d.open) setAddOpen(false) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="420px">
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Add Attendance Record</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack gap={4}>
                  <Field.Root required>
                    <Field.Label>Student <Field.RequiredIndicator /></Field.Label>
                    <select
                      value={addStudentId}
                      onChange={e => setAddStudentId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white' }}
                    >
                      <option value="">Select student…</option>
                      {students.map(s => (
                        <option key={String(s.id)} value={String(s.id)}>
                          {s.name} ({s.studentId}) — {s.className}
                        </option>
                      ))}
                    </select>
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label>Status <Field.RequiredIndicator /></Field.Label>
                    <select
                      value={String(addStatus)}
                      onChange={e => setAddStatus(Number(e.target.value) as AttendanceStatus)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white' }}
                    >
                      <option value={String(AttendanceStatus.PRESENT)}>Present</option>
                      <option value={String(AttendanceStatus.ABSENT)}>Absent</option>
                    </select>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Check-in Time (optional)</Field.Label>
                    <Input
                      type="time"
                      value={addTime}
                      onChange={e => setAddTime(e.target.value)}
                      placeholder="defaults to now"
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Notes (optional)</Field.Label>
                    <Input
                      placeholder="e.g. Doctor's appointment"
                      value={addNotes}
                      onChange={e => setAddNotes(e.target.value)}
                    />
                  </Field.Root>

                  {addError && (
                    <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" px={3} py={2} w="full">
                      <Text fontSize="sm" color="red.600">{addError}</Text>
                    </Box>
                  )}
                </VStack>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" colorPalette="blue" size="sm" loading={addLoading} loadingText="Adding…">
                  Add Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* ── Delete Confirm Dialog ── */}
      <DialogRoot open={!!deleteTarget} onOpenChange={d => { if (!d.open) setDeleteTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Record</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text>
                Delete the attendance record for{' '}
                <Text as="span" fontWeight="bold">{deleteTarget?.name}</Text>? This cannot be undone.
              </Text>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button colorPalette="red" size="sm" loading={deleteLoading} loadingText="Deleting…" onClick={handleDelete}>
                <FiTrash2 />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Box>
  )
}
