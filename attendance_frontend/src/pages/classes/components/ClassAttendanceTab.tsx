import {
  Box,
  Flex,
  HStack,
  Badge,
  Heading,
  Text,
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
  Input,
  Separator,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  Spinner,
} from '@chakra-ui/react'
import { FiClipboard } from 'react-icons/fi'
import { useState, useEffect, useCallback } from 'react'
import { type AttendanceRecord, AttendanceStatus } from '../../../gen/attendance/v1/attendance_pb'
import { attendanceService } from '../../../services/attendance_service'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'

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

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const formatTime = (ts?: { seconds: bigint }) =>
  ts ? new Date(Number(ts.seconds) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'

interface Props {
  className: string
  active: boolean
}

export function ClassAttendanceTab({ className, active }: Props) {
  const [attendanceDate, setAttendanceDate] = useState(todayIso())
  const [records, setRecords]               = useState<AttendanceRecord[]>([])
  const [summary, setSummary]               = useState<{ total: number; present: number; absent: number; late: number } | null>(null)
  const [loading, setLoading]               = useState(false)

  const load = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const [y, m, d] = date.split('-').map(Number)
      const r = await attendanceService.getDailyAttendance({
        date:        timestampFromDate(new Date(y, m - 1, d, 0, 0, 0)),
        classFilter: className,
      })
      setRecords(r.records)
      setSummary(r.summary
        ? { total: r.summary.total, present: r.summary.present, absent: r.summary.absent, late: r.summary.late }
        : null
      )
    } catch {
      setRecords([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [className])

  useEffect(() => {
    if (active) load(attendanceDate)
  }, [active, attendanceDate, load])

  return (
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

      {summary && (
        <HStack gap={3} mb={4}>
          <Badge colorPalette="gray"   variant="subtle" px={3} py={1}>Total: {summary.total}</Badge>
          <Badge colorPalette="green"  variant="subtle" px={3} py={1}>Present: {summary.present}</Badge>
          <Badge colorPalette="red"    variant="subtle" px={3} py={1}>Absent: {summary.absent}</Badge>
          <Badge colorPalette="orange" variant="subtle" px={3} py={1}>Late: {summary.late}</Badge>
        </HStack>
      )}

      {loading ? (
        <Flex justify="center" py={12}><Spinner /></Flex>
      ) : records.length === 0 ? (
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
              <TableRow bg="gray.50">
                <TableColumnHeader ps={5} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Student</TableColumnHeader>
                <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Student ID</TableColumnHeader>
                <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Status</TableColumnHeader>
                <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Check-in</TableColumnHeader>
                <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Last Seen</TableColumnHeader>
                <TableColumnHeader pe={5} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Notes</TableColumnHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => (
                <TableRow key={String(r.id)} _hover={{ bg: 'blue.50' }} transition="background 0.1s">
                  <TableCell ps={5} py={3}>
                    <HStack gap={3}>
                      <AvatarRoot size="sm" borderRadius="md">
                        {r.photoUrl && <AvatarImage src={r.photoUrl} />}
                        <AvatarFallback bg="blue.100" color="blue.700" fontWeight="semibold" fontSize="xs">
                          {r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </AvatarRoot>
                      <Text fontWeight="medium" fontSize="sm">{r.name}</Text>
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm" fontFamily="mono">{r.studentId || '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge colorPalette={STATUS_COLOR[r.status] ?? 'gray'} variant="subtle" size="sm">
                      {STATUS_LABEL[r.status] ?? 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell fontSize="xs" color="gray.600">{formatTime(r.timestamp)}</TableCell>
                  <TableCell fontSize="xs" color="gray.400">{r.lastSeen ? formatTime(r.lastSeen) : '—'}</TableCell>
                  <TableCell pe={5} fontSize="xs" color="gray.500">{r.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
        </TableScrollArea>
      )}
    </Box>
  )
}
