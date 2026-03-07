import {
  Box,
  Container,
  Text,
  VStack,
  HStack,
  Heading,
  Badge,
  Spinner,
  Flex,
  Separator,
  Button,
  Input,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@chakra-ui/react'
import { FiCamera, FiRefreshCw, FiUserPlus, FiSearch, FiX } from 'react-icons/fi'
import { useState, useEffect, useRef, useCallback } from 'react'
import { type AttendanceRecord, AttendanceStatus } from '../gen/attendance/v1/attendance_pb'
import { type User } from '../gen/users/v1/users_pb'
import { attendanceService } from '../services/attendance_service'
import { userService } from '../services/user_service'
import { faceService } from '../services/face_service'

const MAX_EVENTS = 50

function fmtTime(ts?: { seconds: bigint }) {
  if (!ts) return '—'
  return new Date(Number(ts.seconds) * 1000).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function statusColor(s: AttendanceStatus) {
  switch (s) {
    case AttendanceStatus.PRESENT: return 'green'
    case AttendanceStatus.ABSENT:  return 'red'
    default:                        return 'gray'
  }
}

function statusLabel(s: AttendanceStatus) {
  switch (s) {
    case AttendanceStatus.PRESENT: return 'Present'
    case AttendanceStatus.ABSENT:  return 'Absent'
    default:                        return 'Unknown'
  }
}

// ── Register Face Dialog ───────────────────────────────────────────────────────

function RegisterFaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch]           = useState('')
  const [results, setResults]         = useState<User[]>([])
  const [searching, setSearching]     = useState(false)
  const [selected, setSelected]       = useState<User | null>(null)
  const [registering, setRegistering] = useState(false)
  const [status, setStatus]           = useState<{ ok: boolean; text: string } | null>(null)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setSearch('')
      setResults([])
      setSelected(null)
      setStatus(null)
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim() || selected) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await userService.listUsers({
          filter: { search: search.trim() },
          page: 0,
          pageSize: 10,
        })
        setResults(r.users)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [search, selected])

  const handleSelect = (u: User) => {
    setSelected(u)
    setSearch('')
    setResults([])
    setStatus(null)
  }

  const handleRegister = async () => {
    if (!selected) return
    setRegistering(true)
    setStatus(null)
    try {
      await faceService.upsertFaceEmbeddings({
        record: {
          studentId: selected.id,
          embeddings: new Uint8Array(),
          embeddingCount: 0,
        },
      })
      setStatus({ ok: true, text: `Face registered for ${selected.name}.` })
    } catch (e: unknown) {
      setStatus({ ok: false, text: (e as Error).message })
    } finally {
      setRegistering(false)
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={e => { if (!e.open) onClose() }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent maxW="md">
          <DialogHeader>
            <DialogTitle>Register Face</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4} align="stretch">

              {!selected ? (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                    Search student
                  </Text>
                  <Box position="relative">
                    <Input
                      placeholder="Name or student ID…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      size="sm"
                      pl={8}
                    />
                    <Box
                      position="absolute" left={2.5} top="50%" transform="translateY(-50%)"
                      color="gray.400" pointerEvents="none"
                    >
                      <FiSearch size={14} />
                    </Box>
                  </Box>

                  {searching && (
                    <HStack gap={2} mt={2} color="gray.400">
                      <Spinner size="xs" />
                      <Text fontSize="xs">Searching…</Text>
                    </HStack>
                  )}

                  {results.length > 0 && (
                    <VStack
                      gap={0} align="stretch" mt={1}
                      border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden"
                    >
                      {results.map(u => (
                        <Flex
                          key={String(u.id)}
                          px={3} py={2}
                          cursor="pointer"
                          _hover={{ bg: 'blue.50' }}
                          onClick={() => handleSelect(u)}
                          justify="space-between"
                          align="center"
                        >
                          <Text fontSize="sm" fontWeight="medium">{u.name}</Text>
                          <Text fontSize="xs" color="gray.500">{u.studentId}</Text>
                        </Flex>
                      ))}
                    </VStack>
                  )}

                  {!searching && search.trim() && results.length === 0 && (
                    <Text fontSize="xs" color="gray.400" mt={2}>No students found.</Text>
                  )}
                </Box>
              ) : (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                    Selected student
                  </Text>
                  <Flex
                    align="center" justify="space-between"
                    px={3} py={2}
                    bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="md"
                  >
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="blue.800">{selected.name}</Text>
                      <Text fontSize="xs" color="blue.600">{selected.studentId}</Text>
                    </Box>
                    <Box
                      as="button" color="blue.400" _hover={{ color: 'blue.600' }}
                      cursor="pointer" onClick={() => { setSelected(null); setStatus(null) }}
                    >
                      <FiX size={16} />
                    </Box>
                  </Flex>
                </Box>
              )}

              {status && (
                <Text fontSize="sm" color={status.ok ? 'green.600' : 'red.500'}>
                  {status.text}
                </Text>
              )}

            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              size="sm" colorPalette="blue"
              disabled={!selected || registering}
              loading={registering}
              loadingText="Registering…"
              onClick={handleRegister}
            >
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DetectionPage() {
  const [events, setEvents]             = useState<AttendanceRecord[]>([])
  const [streaming, setStreaming]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [showRegister, setShowRegister] = useState(false)
  const abortRef                        = useRef<AbortController | null>(null)

  const connect = useCallback(() => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setStreaming(true)
    setError(null)

    const run = async () => {
      try {
        const stream = attendanceService.watchAttendance({}, { signal: ac.signal })
        for await (const msg of stream) {
          if (!msg.record) continue
          setEvents(prev => [msg.record!, ...prev].slice(0, MAX_EVENTS))
        }
      } catch {
        if (!ac.signal.aborted) setError('Stream disconnected.')
      } finally {
        if (!ac.signal.aborted) setStreaming(false)
      }
    }
    run()
  }, [])

  useEffect(() => {
    connect()
    return () => abortRef.current?.abort()
  }, [connect])

  return (
    <Box py={6}>
      <Container maxW="container.xl">
        <VStack gap={6} align="stretch">

          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <Flex align="center" justify="space-between" mb={4}>
              <HStack gap={2}>
                <FiCamera size={16} />
                <Heading size="sm">Live Detection Feed</Heading>
                {streaming
                  ? <Badge colorPalette="green" variant="subtle">Live</Badge>
                  : <Badge colorPalette="gray"  variant="subtle">Offline</Badge>
                }
              </HStack>
              <HStack gap={2}>
                <Button size="xs" variant="ghost" onClick={connect} disabled={streaming}>
                  <FiRefreshCw size={14} /> Reconnect
                </Button>
                <Button size="xs" colorPalette="blue" onClick={() => setShowRegister(true)}>
                  <FiUserPlus size={14} /> Register Face
                </Button>
              </HStack>
            </Flex>

            {error && (
              <Text fontSize="sm" color="red.500" mb={3}>{error}</Text>
            )}

            <Separator mb={4} />

            {streaming && events.length === 0 && (
              <HStack gap={3} color="gray.400" py={6} justify="center">
                <Spinner size="sm" />
                <Text fontSize="sm">Waiting for detections…</Text>
              </HStack>
            )}

            {events.length > 0 && (
              <VStack gap={2} align="stretch">
                {events.map((e, i) => (
                  <Flex
                    key={`${String(e.id)}-${i}`}
                    align="center" justify="space-between"
                    px={4} py={3} borderRadius="md"
                    bg={i === 0 ? 'blue.50' : 'gray.50'}
                    border="1px solid"
                    borderColor={i === 0 ? 'blue.100' : 'gray.100'}
                  >
                    <HStack gap={3}>
                      <Box
                        w={8} h={8} bg="gray.200" borderRadius="full"
                        display="flex" alignItems="center" justifyContent="center"
                        fontSize="xs" fontWeight="bold" color="gray.600" flexShrink={0}
                      >
                        {e.student?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </Box>
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                          {e.student?.name ?? `User #${String(e.userId)}`}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Check-in: {fmtTime(e.checkInTime)}
                        </Text>
                      </Box>
                    </HStack>
                    <HStack gap={3}>
                      <Badge colorPalette={statusColor(e.status)} variant="subtle">
                        {statusLabel(e.status)}
                      </Badge>
                      <Text fontSize="xs" color="gray.400" minW="60px" textAlign="right">
                        {fmtTime(e.checkInTime)}
                      </Text>
                    </HStack>
                  </Flex>
                ))}
              </VStack>
            )}

            {!streaming && events.length === 0 && !error && (
              <Text fontSize="sm" color="gray.400" textAlign="center" py={6}>
                No detections yet.
              </Text>
            )}
          </Box>

        </VStack>
      </Container>

      <RegisterFaceDialog open={showRegister} onClose={() => setShowRegister(false)} />
    </Box>
  )
}
