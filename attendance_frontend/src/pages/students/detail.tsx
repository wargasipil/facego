import {
  Box,
  Container,
  Heading,
  Text,
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
  Button,
  Separator,
  AvatarRoot,
  AvatarFallback,
  AvatarImage,
  SimpleGrid,
  StatRoot,
  StatLabel,
  StatValueText,
  StatHelpText,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { FiArrowLeft, FiCalendar } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { type AttendanceRecord, AttendanceStatus } from '../../gen/attendance/v1/attendance_pb'
import { type User } from '../../gen/users/v1/users_pb'
import { attendanceService } from '../../services/attendance_service'
import { userService } from '../../services/user_service'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<number, string> = {
  [AttendanceStatus.PRESENT]: 'green',
  [AttendanceStatus.ABSENT]:  'red',
}
const STATUS_LABEL: Record<number, string> = {
  [AttendanceStatus.PRESENT]: 'Present',
  [AttendanceStatus.ABSENT]:  'Absent',
}

function formatDate(ts?: { seconds: bigint }) {
  if (!ts) return '—'
  return new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatTime(ts?: { seconds: bigint }) {
  if (!ts) return '—'
  return new Date(Number(ts.seconds) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function monthStart(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function monthEnd(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset + 1, 1)
  d.setHours(0, 0, 0, 0)
  return d
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [student, setStudent]           = useState<User | null>(null)
  const [records, setRecords]           = useState<AttendanceRecord[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [monthOffset, setMonthOffset]   = useState(0)

  useEffect(() => {
    if (!id) return
    userService.listUsers({ filter: {} })
      .then(r => setStudent(r.users.find(u => String(u.id) === id) ?? null))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    const from = monthStart(monthOffset)
    const to   = monthEnd(monthOffset)
    attendanceService.listAttendance({
      userId: BigInt(id),
      from:   timestampFromDate(from),
      to:     timestampFromDate(to),
    })
      .then(r => setRecords(r.records))
      .catch(err => setError((err as Error).message ?? 'Failed to load attendance'))
      .finally(() => setLoading(false))
  }, [id, monthOffset])

  const summary = {
    total:   records.length,
    present: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
    absent:  records.filter(r => r.status === AttendanceStatus.ABSENT).length,
  }

  const pct = (n: number) =>
    summary.total === 0 ? '0%' : `${Math.round((n / summary.total) * 100)}%`

  const monthLabel = () => {
    const d = new Date()
    d.setMonth(d.getMonth() + monthOffset)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <Box py={6}>
      <Container maxW="container.lg">

        {/* Header */}
        <HStack mb={6} gap={3}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/students')}>
            <FiArrowLeft />
            Back
          </Button>
          <Separator orientation="vertical" h={5} />
          {student ? (
            <HStack gap={3}>
              <AvatarRoot size="md">
                {student.photoUrl && <AvatarImage src={student.photoUrl} />}
                <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </AvatarRoot>
              <Box>
                <Heading size="lg">{student.name}</Heading>
                <HStack gap={2} mt={0.5}>
                  <Badge variant="outline" size="sm">{student.studentId}</Badge>
                  <Badge colorPalette="purple" variant="subtle" size="sm">{student.className}</Badge>
                  <Text fontSize="sm" color="gray.400">Attendance Log</Text>
                </HStack>
              </Box>
            </HStack>
          ) : (
            <Heading size="lg">Attendance Log</Heading>
          )}
        </HStack>

        {/* Month navigation */}
        <HStack justify="space-between" align="center" mb={5}>
          <HStack gap={2}>
            <FiCalendar size={16} color="#718096" />
            <Heading size="sm" color="gray.700">{monthLabel()}</Heading>
          </HStack>
          <HStack gap={2}>
            <Button size="sm" variant="outline" onClick={() => setMonthOffset(o => o - 1)}>
              ← Prev
            </Button>
            {monthOffset !== 0 && (
              <Button size="sm" variant="ghost" onClick={() => setMonthOffset(0)}>
                This Month
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setMonthOffset(o => o + 1)} disabled={monthOffset >= 0}>
              Next →
            </Button>
          </HStack>
        </HStack>

        {/* Summary cards */}
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={5}>
          <Box bg="white" p={4} borderRadius="lg" shadow="sm">
            <StatRoot>
              <StatLabel color="gray.500">Total Days</StatLabel>
              <StatValueText>{summary.total}</StatValueText>
              <StatHelpText>recorded</StatHelpText>
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

        {/* Error */}
        {error && (
          <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" px={4} py={3} mb={4}>
            <Text fontSize="sm" color="red.600">{error}</Text>
          </Box>
        )}

        {/* Records table */}
        <Box bg="white" borderRadius="lg" shadow="sm" p={4}>
          <Heading size="sm" mb={4}>Records</Heading>

          {loading ? (
            <Center py={12}><Spinner size="lg" color="blue.500" /></Center>
          ) : records.length === 0 ? (
            <Center py={10}>
              <VStack gap={2}>
                <Text color="gray.400">No attendance records for this month.</Text>
              </VStack>
            </Center>
          ) : (
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Date</TableColumnHeader>
                    <TableColumnHeader>Status</TableColumnHeader>
                    <TableColumnHeader>Check-in Time</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(r => (
                    <TableRow key={String(r.id)}>
                      <TableCell fontWeight="medium" fontSize="sm">{formatDate(r.checkInTime)}</TableCell>
                      <TableCell>
                        <Badge colorPalette={STATUS_COLOR[r.status] ?? 'gray'}>
                          {STATUS_LABEL[r.status] ?? 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell color="gray.500" fontSize="sm">{formatTime(r.checkInTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
          )}
        </Box>
      </Container>
    </Box>
  )
}
