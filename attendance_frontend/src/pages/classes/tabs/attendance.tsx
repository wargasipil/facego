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
import { FiClipboard, FiDownload, FiUpload, FiSearch, FiBell } from 'react-icons/fi'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { type AttendanceRecord, AttendanceStatus, NotifyStatus } from '../../../gen/attendance/v1/attendance_pb'
import { type ClassSchedule } from '../../../gen/classes/v1/classes_pb'
import { attendanceService } from '../../../services/attendance_service'
import { notifierService } from '../../../services/notifier_service'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'
import { ScheduleSelector } from '../../../components/ScheduleSelector'
import { ClassPagination } from '../components/ClassPagination'

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  [AttendanceStatus.UNSPECIFIED]: 'Unknown',
  [AttendanceStatus.PRESENT]:     'Present',
  [AttendanceStatus.ABSENT]:      'Absent',
}
const STATUS_COLOR: Record<AttendanceStatus, string> = {
  [AttendanceStatus.UNSPECIFIED]: 'gray',
  [AttendanceStatus.PRESENT]:     'green',
  [AttendanceStatus.ABSENT]:      'red',
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const formatTime = (ts?: { seconds: bigint }) =>
  ts ? new Date(Number(ts.seconds) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'

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
    default:        return AttendanceStatus.PRESENT
  }
}

interface ImportRow { name: string; studentId: string; userId: string; status: string; notes: string; valid: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  classId: bigint
  className: string
  active: boolean
  schedules?: ClassSchedule[]
}

export function AttendanceTab({ classId, className, active, schedules = [] }: Props) {
  const [attendanceDate, setAttendanceDate] = useState(todayIso())
  const [scheduleFilter, setScheduleFilter] = useState<bigint>(0n)
  const [search, setSearch]                 = useState('')
  const [records, setRecords]               = useState<AttendanceRecord[]>([])
  const [loading, setLoading]               = useState(false)

  // ── pagination ──
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal]       = useState(0)

  // ── notify ──
  const [notifyAllOpen, setNotifyAllOpen]     = useState(false)
  const [notifying, setNotifying]             = useState(false)
  const [notifyingOne, setNotifyingOne]       = useState<bigint | null>(null)
  const [notifyMsg, setNotifyMsg]             = useState<string | null>(null)

  const absentRecords = useMemo(
    () => records.filter(r => r.status === AttendanceStatus.ABSENT),
    [records]
  )

  const handleNotifyAll = async () => {
    setNotifyAllOpen(false)
    setNotifying(true)
    setNotifyMsg(null)
    try {
      const [y, m, d] = attendanceDate.split('-').map(Number)
      await notifierService.notifyParent({
        meta: {
          classId:         classId,
          classScheduleId: scheduleFilter,
          day:             timestampFromDate(new Date(y, m - 1, d, 0, 0, 0)),
        },
        type: { case: 'all', value: {} },
      })
      setNotifyMsg(`Notification sent to all absent parents.`)
    } catch (err) {
      setNotifyMsg((err as Error).message ?? 'Failed to send notifications.')
    } finally {
      setNotifying(false)
    }
  }

  const handleNotifyOne = async (userId: bigint) => {
    setNotifyingOne(userId)
    setNotifyMsg(null)
    try {
      const [y, m, d] = attendanceDate.split('-').map(Number)
      await notifierService.notifyParent({
        meta: {
          classId:         classId,
          classScheduleId: scheduleFilter,
          day:             timestampFromDate(new Date(y, m - 1, d, 0, 0, 0)),
        },
        type: { case: 'student', value: { studentIds: [userId] } },
      })
      setRecords(prev => prev.map(r =>
        r.userId === userId ? { ...r, notifyStatus: NotifyStatus.PENDING } : r
      ))
      setNotifyMsg(`Notification sent to parent.`)
    } catch (err) {
      setNotifyMsg((err as Error).message ?? 'Failed to send notification.')
    } finally {
      setNotifyingOne(null)
    }
  }

  // ── import / export ──
  const fileInputRef                          = useRef<HTMLInputElement>(null)
  const [importOpen, setImportOpen]           = useState(false)
  const [importRows, setImportRows]           = useState<ImportRow[]>([])
  const [importLoading, setImportLoading]     = useState(false)
  const [importError, setImportError]         = useState<string | null>(null)

  const totalPages  = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart  = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd    = Math.min(page * pageSize, total)
  const pageNumbers = useMemo(() => {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end   = Math.min(totalPages, page + delta)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  const handleExport = () => {
    if (records.length === 0) return
    const header = 'Name,Student ID,User ID,Status'
    const rows = records.map(r =>
      [r.student?.name ?? '', r.student?.studentId ?? '', String(r.userId), STATUS_LABEL[r.status] ?? 'Present']
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
      load(attendanceDate, scheduleFilter, search, 1, pageSize)
    } catch (err) {
      setImportError((err as Error).message ?? 'Import failed.')
    } finally {
      setImportLoading(false)
    }
  }

  const load = useCallback(async (date: string, schedId: bigint, q: string, p: number, ps: number) => {
    setLoading(true)
    try {
      const [y, m, d] = date.split('-').map(Number)
      const r = await attendanceService.getDailyAttendance({
        filter: {
          classId:    classId,
          scheduleId: schedId,
          date:       timestampFromDate(new Date(y, m - 1, d, 0, 0, 0)),
          q,
        },
        page:     p,
        pageSize: ps,
      })
      setRecords(r.records)
      setTotal(r.total)
    } catch {
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    if (active) load(attendanceDate, scheduleFilter, search, page, pageSize)
  }, [active, attendanceDate, scheduleFilter, search, page, pageSize, load])

  const handleDateChange     = (d: string)  => { setAttendanceDate(d); setPage(1) }
  const handleScheduleChange = (id: bigint) => { setScheduleFilter(id); setPage(1) }
  const handleSearchChange   = (q: string)  => { setSearch(q); setPage(1) }

  return (
    <>
    <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
      <Flex align="center" justify="space-between" mb={4}>
        <HStack gap={2}>
          <FiClipboard size={15} />
          <Heading size="sm">Attendance</Heading>
        </HStack>
        <HStack gap={2}>
          <Input
            type="date"
            size="sm"
            w="160px"
            value={attendanceDate}
            onChange={e => handleDateChange(e.target.value)}
          />
          {schedules.length > 0 && (
            <ScheduleSelector
              schedules={schedules}
              value={scheduleFilter}
              onChange={handleScheduleChange}
            />
          )}
          <Box position="relative" display="flex" alignItems="center">
            <Box position="absolute" left={2} color="gray.400" pointerEvents="none" zIndex={1}>
              <FiSearch size={13} />
            </Box>
            <Input
              size="sm"
              pl="28px"
              w="180px"
              placeholder="Search student…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </Box>
          {absentRecords.length > 0 && (
            <Button
              size="sm" variant="solid" colorPalette="orange"
              loading={notifying}
              onClick={() => setNotifyAllOpen(true)}
            >
              <FiBell /> Notify All Absent ({absentRecords.length})
            </Button>
          )}
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

      {total > 0 && (
        <HStack gap={3} mb={notifyMsg ? 2 : 4}>
          <Badge colorPalette="gray" variant="subtle" px={3} py={1}>Total: {total}</Badge>
        </HStack>
      )}
      {notifyMsg && (
        <Box
          bg="green.50" border="1px solid" borderColor="green.200"
          borderRadius="md" px={3} py={2} mb={4}
        >
          <Text color="green.700" fontSize="sm">{notifyMsg}</Text>
        </Box>
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
                <TableColumnHeader pe={5} w="1px" whiteSpace="nowrap"></TableColumnHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => (
                <TableRow key={String(r.id)} _hover={{ bg: 'blue.50' }} transition="background 0.1s">
                  <TableCell ps={5} py={3}>
                    <HStack gap={3}>
                      <AvatarRoot size="sm" borderRadius="md">
                        {r.student?.photoUrl && <AvatarImage src={r.student.photoUrl} />}
                        <AvatarFallback bg="blue.100" color="blue.700" fontWeight="semibold" fontSize="xs">
                          {(r.student?.name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </AvatarRoot>
                      <Text fontWeight="medium" fontSize="sm">{r.student?.name ?? '—'}</Text>
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm" fontFamily="mono">{r.student?.studentId || '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge colorPalette={STATUS_COLOR[r.status] ?? 'gray'} variant="subtle" size="sm">
                      {STATUS_LABEL[r.status] ?? 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell fontSize="xs" color="gray.600">{formatTime(r.checkInTime)}</TableCell>
                  <TableCell pe={5} py={2} w="1px" whiteSpace="nowrap" textAlign="right">
                    {r.status === AttendanceStatus.ABSENT && (
                      r.notifyStatus === NotifyStatus.NOTIFIED ? (
                        <Badge colorPalette="green" variant="subtle" size="sm" gap={1}>
                          <FiBell size={10} /> Notified
                        </Badge>
                      ) : r.notifyStatus === NotifyStatus.PENDING ? (
                        <Badge colorPalette="yellow" variant="subtle" size="sm" gap={1}>
                          <FiBell size={10} /> Pending
                        </Badge>
                      ) : (
                        <Button
                          size="xs" variant="outline" colorPalette="orange"
                          loading={notifyingOne === r.userId}
                          onClick={() => handleNotifyOne(r.userId)}
                        >
                          <FiBell /> Notify Parent
                        </Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
        </TableScrollArea>
      )}

      <ClassPagination
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

    {/* Notify All confirm dialog */}
    <DialogRoot open={notifyAllOpen} onOpenChange={d => { if (!d.open) setNotifyAllOpen(false) }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent maxW="400px">
          <DialogHeader>
            <DialogTitle>Notify All Absent Parents</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text fontSize="sm">
              Send WhatsApp notifications to parents of{' '}
              <Text as="span" fontWeight="semibold">{absentRecords.length} absent student(s)</Text>
              {' '}on <Text as="span" fontWeight="semibold">{attendanceDate}</Text>?
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotifyAllOpen(false)}>Cancel</Button>
            <Button colorPalette="orange" size="sm" onClick={handleNotifyAll}>
              <FiBell /> Yes, Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>

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
                        <TableColumnHeader pe={3} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Status</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((r, i) => (
                        <TableRow key={i} opacity={r.valid ? 1 : 0.4}>
                          <TableCell ps={3} fontSize="sm">{r.name || '—'}</TableCell>
                          <TableCell fontSize="xs" fontFamily="mono">{r.studentId || '—'}</TableCell>
                          <TableCell pe={3}>
                            <Badge
                              colorPalette={STATUS_COLOR[parseStatus(r.status)] ?? 'gray'}
                              variant="subtle" size="sm"
                            >
                              {r.status || 'Present'}
                            </Badge>
                          </TableCell>
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
