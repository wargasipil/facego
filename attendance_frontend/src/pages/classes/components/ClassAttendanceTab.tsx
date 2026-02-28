import {
  Box,
  Button,
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
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@chakra-ui/react'
import { FiClipboard, FiDownload, FiUpload } from 'react-icons/fi'
import { useState, useEffect, useCallback, useRef } from 'react'
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

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n'))
    return '"' + val.replace(/"/g, '""') + '"'
  return val
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase())
  return lines.slice(1)
    .map(line => {
      const vals = splitCSVLine(line)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim() })
      return obj
    })
    .filter(r => Object.values(r).some(v => v !== ''))
}

function parseStatus(s: string): AttendanceStatus {
  switch (s.toLowerCase()) {
    case 'present': return AttendanceStatus.PRESENT
    case 'absent':  return AttendanceStatus.ABSENT
    case 'late':    return AttendanceStatus.LATE
    default:        return AttendanceStatus.PRESENT
  }
}

interface ImportRow { name: string; studentId: string; userId: string; status: string; notes: string; valid: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export function ClassAttendanceTab({ className, active }: Props) {
  const [attendanceDate, setAttendanceDate] = useState(todayIso())
  const [records, setRecords]               = useState<AttendanceRecord[]>([])
  const [summary, setSummary]               = useState<{ total: number; present: number; absent: number; late: number } | null>(null)
  const [loading, setLoading]               = useState(false)

  // ── import / export ──
  const fileInputRef                          = useRef<HTMLInputElement>(null)
  const [importOpen, setImportOpen]           = useState(false)
  const [importRows, setImportRows]           = useState<ImportRow[]>([])
  const [importLoading, setImportLoading]     = useState(false)
  const [importError, setImportError]         = useState<string | null>(null)

  const handleExport = () => {
    if (records.length === 0) return
    const header = 'Name,Student ID,User ID,Status,Notes'
    const rows = records.map(r =>
      [r.name, r.studentId, String(r.userId), STATUS_LABEL[r.status] ?? 'Present', r.notes]
        .map(escapeCSV).join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `attendance_${className}_${attendanceDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      const rows: ImportRow[] = parsed.map(r => ({
        name:      r['name']       ?? '',
        studentId: r['student id'] ?? '',
        userId:    r['user id']    ?? '',
        status:    r['status']     ?? 'Present',
        notes:     r['notes']      ?? '',
        valid:     !!r['user id'] && r['user id'] !== '0',
      }))
      setImportRows(rows)
      setImportError(null)
      setImportOpen(true)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    const valid = importRows.filter(r => r.valid)
    if (valid.length === 0) { setImportError('No valid rows to import.'); return }
    setImportLoading(true)
    setImportError(null)
    try {
      const [y, m, d] = attendanceDate.split('-').map(Number)
      const checkIn = timestampFromDate(new Date(y, m - 1, d, 8, 0, 0))
      await Promise.all(valid.map(r =>
        attendanceService.createAttendance({
          userId:       BigInt(r.userId),
          status:       parseStatus(r.status),
          notes:        r.notes,
          checkInTime:  checkIn,
        })
      ))
      setImportOpen(false)
      load(attendanceDate)
    } catch (err) {
      setImportError((err as Error).message ?? 'Import failed.')
    } finally {
      setImportLoading(false)
    }
  }

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
    <>
    <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
      <Flex align="center" justify="space-between" mb={4}>
        <HStack gap={2}>
          <FiClipboard size={15} />
          <Heading size="sm">Attendance Log</Heading>
        </HStack>
        <HStack gap={2}>
          <Input
            type="date"
            size="sm"
            w="160px"
            value={attendanceDate}
            onChange={e => setAttendanceDate(e.target.value)}
          />
          <Button
            size="sm" variant="outline" colorPalette="gray"
            disabled={records.length === 0}
            onClick={handleExport}
          >
            <FiDownload /> Export
          </Button>
          <Button
            size="sm" variant="outline" colorPalette="teal"
            onClick={() => fileInputRef.current?.click()}
          >
            <FiUpload /> Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </HStack>
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

    {/* Import preview dialog */}
    <DialogRoot open={importOpen} onOpenChange={d => { if (!d.open) setImportOpen(false) }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent maxW="640px">
          <DialogHeader>
            <DialogTitle>Import Attendance — {attendanceDate}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {importRows.length === 0 ? (
              <Text fontSize="sm" color="gray.500">No rows found in the file.</Text>
            ) : (
              <>
                <Text fontSize="sm" color="gray.500" mb={3}>
                  {importRows.filter(r => r.valid).length} of {importRows.length} row(s) will be imported.
                  Rows without a valid User ID are skipped.
                </Text>
                <Box maxH="320px" overflowY="auto" border="1px solid" borderColor="gray.100" borderRadius="md">
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow bg="gray.50">
                        <TableColumnHeader ps={3} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Name</TableColumnHeader>
                        <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Student ID</TableColumnHeader>
                        <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Status</TableColumnHeader>
                        <TableColumnHeader pe={3} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Notes</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((r, i) => (
                        <TableRow key={i} opacity={r.valid ? 1 : 0.4}>
                          <TableCell ps={3} fontSize="sm">{r.name || '—'}</TableCell>
                          <TableCell fontSize="xs" fontFamily="mono">{r.studentId || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              colorPalette={STATUS_COLOR[parseStatus(r.status)] ?? 'gray'}
                              variant="subtle" size="sm"
                            >
                              {r.status || 'Present'}
                            </Badge>
                          </TableCell>
                          <TableCell pe={3} fontSize="xs" color="gray.500">{r.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableRoot>
                </Box>
              </>
            )}
            {importError && (
              <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" px={3} py={2} mt={3}>
                <Text color="red.600" fontSize="sm">{importError}</Text>
              </Box>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button
              colorPalette="teal" size="sm"
              disabled={importRows.filter(r => r.valid).length === 0}
              loading={importLoading}
              onClick={handleImport}
            >
              <FiUpload />
              Import ({importRows.filter(r => r.valid).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
    </>
  )
}
