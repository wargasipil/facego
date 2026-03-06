import {
  Box,
  Container,
  Text,
  VStack,
  HStack,
  Heading,
  Badge,
  Button,
  Textarea,
  Input,
  Field,
  Spinner,
  Center,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  TableScrollArea,
  Separator,
  Flex,
} from '@chakra-ui/react'
import { FiRefreshCw, FiMessageSquare, FiSend, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { type WhatsappMessage, WhatsappMessageStatus } from '../gen/whatsapp/v1/whatsapp_pb'
import { whatsappService } from '../services/whatsapp_service'

type StreamState = 'connecting' | 'need_login' | 'connected' | 'error'

function fmtTs(ts?: { seconds: bigint }) {
  if (!ts) return '—'
  return new Date(Number(ts.seconds) * 1000).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function statusColor(s: WhatsappMessageStatus): string {
  switch (s) {
    case WhatsappMessageStatus.PENDING: return 'orange'
    case WhatsappMessageStatus.SENT:    return 'green'
    default: return 'gray'
  }
}

function statusLabel(s: WhatsappMessageStatus): string {
  switch (s) {
    case WhatsappMessageStatus.PENDING: return 'Pending'
    case WhatsappMessageStatus.SENT:    return 'Sent'
    default: return 'Unknown'
  }
}

export default function WhatsappPage() {
  // ── stream / connection ──
  const [streamState, setStreamState] = useState<StreamState>('connecting')
  const [qrCode, setQrCode]           = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const abortRef                      = useRef<AbortController | null>(null)

  // ── test message ──
  const [testPhone, setTestPhone]         = useState('')
  const [testMsg, setTestMsg]             = useState('')
  const [testSending, setTestSending]     = useState(false)
  const [testResult, setTestResult]       = useState<{ ok: boolean; text: string } | null>(null)

  // ── message log ──
  const PAGE_SIZE = 20
  const [messages, setMessages]           = useState<WhatsappMessage[]>([])
  const [logLoading, setLogLoading]       = useState(true)
  const [page, setPage]                   = useState(0)
  const [total, setTotal]                 = useState(0)

  // ── WStream: connect on mount, abort on unmount ──
  const connectStream = useCallback(() => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setStreamState('connecting')
    setQrCode(null)

    const run = async () => {
      try {
        const stream = whatsappService.wStream({}, { signal: ac.signal })
        for await (const msg of stream) {
          if (msg.e.case === 'needLogin') {
            setStreamState('need_login')
            setQrCode(msg.e.value.code)
          } else if (msg.e.case === 'syncCompleted' && msg.e.value) {
            setStreamState('connected')
            setQrCode(null)
            // fetch phone number once connected
            whatsappService.status({}).then(r => setPhoneNumber(r.phoneNumber)).catch(() => {})
          }
        }
      } catch {
        if (!ac.signal.aborted) setStreamState('error')
      }
    }
    run()
  }, [])

  // ── load message log ──
  const loadMessages = useCallback(async (p: number) => {
    setLogLoading(true)
    try {
      const r = await whatsappService.listMessages({ page: p, pageSize: PAGE_SIZE })
      setMessages(r.messages)
      setTotal(r.total)
    } catch {
      setMessages([])
      setTotal(0)
    } finally {
      setLogLoading(false)
    }
  }, [PAGE_SIZE])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    loadMessages(newPage)
  }

  useEffect(() => {
    connectStream()
    loadMessages(0)
    return () => abortRef.current?.abort()
  }, [connectStream, loadMessages])

  // ── send test message ──
  const handleSendTest = async () => {
    setTestSending(true)
    setTestResult(null)
    try {
      const r = await whatsappService.sendMessage({ phone: testPhone, message: testMsg })
      if (r.success) {
        setTestResult({ ok: true, text: 'Message sent successfully.' })
      } else {
        setTestResult({ ok: false, text: r.error || 'Send failed.' })
      }
    } catch (e: unknown) {
      setTestResult({ ok: false, text: (e as Error).message })
    } finally {
      setTestSending(false)
    }
  }

  return (
    <Box py={6}>
      <Container maxW="container.xl">
        <VStack gap={6} align="stretch">

          {/* ── Status Card ── */}
          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <Flex align="center" justify="space-between" mb={4}>
              <Heading size="sm">WhatsApp Connection</Heading>
              {streamState === 'error' && (
                <Button size="xs" variant="ghost" onClick={connectStream}>
                  <FiRefreshCw size={14} />
                  Reconnect
                </Button>
              )}
            </Flex>

            {streamState === 'connecting' && (
              <HStack gap={3} color="gray.500">
                <Spinner size="sm" />
                <Text fontSize="sm">Connecting to WhatsApp stream…</Text>
              </HStack>
            )}

            {streamState === 'connected' && (
              <HStack gap={4}>
                <Badge colorPalette="green" variant="subtle" px={3} py={1} borderRadius="full" fontSize="sm">
                  Connected
                </Badge>
                {phoneNumber && (
                  <Text fontSize="sm" color="gray.600">
                    Phone: <Text as="span" fontWeight="medium">{phoneNumber}</Text>
                  </Text>
                )}
              </HStack>
            )}

            {streamState === 'need_login' && (
              <VStack gap={4} align="start">
                <Badge colorPalette="orange" variant="subtle" px={3} py={1} borderRadius="full" fontSize="sm">
                  Scan QR to Login
                </Badge>
                <Text fontSize="sm" color="gray.500">
                  Open WhatsApp on your phone → Linked Devices → Link a Device, then scan:
                </Text>
                {qrCode ? (
                  <Box p={4} bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" display="inline-block">
                    <QRCodeSVG value={qrCode} size={200} />
                  </Box>
                ) : (
                  <Center py={6}><Spinner size="lg" /></Center>
                )}
              </VStack>
            )}

            {streamState === 'error' && (
              <HStack gap={3} color="red.500">
                <Badge colorPalette="red" variant="subtle" px={3} py={1} borderRadius="full" fontSize="sm">
                  Disconnected
                </Badge>
                <Text fontSize="sm">Stream lost. Make sure the backend is running.</Text>
              </HStack>
            )}
          </Box>

          {/* ── Test Message Card ── */}
          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <HStack gap={2} mb={4}>
              <FiSend size={16} />
              <Heading size="sm">Send Test Message</Heading>
            </HStack>
            <Text fontSize="xs" color="gray.500" mb={4}>
              Send a test WhatsApp message to verify the connection is working.
            </Text>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>Phone Number</Field.Label>
                <Input
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="628xxxxxxxxxx (without +)"
                  size="sm"
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Message</Field.Label>
                <Textarea
                  value={testMsg}
                  onChange={e => setTestMsg(e.target.value)}
                  rows={3}
                  placeholder="Hello, this is a test message from FaceGo."
                  size="sm"
                />
              </Field.Root>
              {testResult && (
                <Text fontSize="sm" color={testResult.ok ? 'green.600' : 'red.500'}>
                  {testResult.text}
                </Text>
              )}
              <Box>
                <Button
                  size="sm"
                  colorPalette="green"
                  loading={testSending}
                  disabled={!testPhone || !testMsg || streamState !== 'connected'}
                  onClick={handleSendTest}
                >
                  <FiSend />
                  Send Test
                </Button>
                {streamState !== 'connected' && (
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    WhatsApp must be connected to send messages.
                  </Text>
                )}
              </Box>
            </VStack>
          </Box>

          {/* ── Message Log ── */}
          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <Flex align="center" justify="space-between" mb={4}>
              <HStack gap={2}>
                <FiMessageSquare size={16} />
                <Heading size="sm">Message Log</Heading>
              </HStack>
              <Button size="xs" variant="ghost" onClick={() => loadMessages(page)} disabled={logLoading}>
                <FiRefreshCw size={14} />
                Refresh
              </Button>
            </Flex>
            <Separator mb={4} />
            {logLoading ? (
              <Center py={8}><Spinner size="lg" color="blue.500" /></Center>
            ) : messages.length === 0 ? (
              <Center py={8} color="gray.400">No messages sent yet.</Center>
            ) : (
              <>
              <TableScrollArea>
                <TableRoot size="sm">
                  <TableHeader>
                    <TableRow>
                      <TableColumnHeader>Student</TableColumnHeader>
                      <TableColumnHeader>Parent</TableColumnHeader>
                      <TableColumnHeader>Phone</TableColumnHeader>
                      <TableColumnHeader>Message</TableColumnHeader>
                      <TableColumnHeader>Status</TableColumnHeader>
                      <TableColumnHeader>Sent At</TableColumnHeader>
                      <TableColumnHeader>Created At</TableColumnHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map(m => (
                      <TableRow key={String(m.id)}>
                        <TableCell fontWeight="medium" fontSize="sm">{m.studentName}</TableCell>
                        <TableCell fontSize="sm" color="gray.600">{m.parentName}</TableCell>
                        <TableCell fontSize="sm" color="gray.600">{m.phone}</TableCell>
                        <TableCell fontSize="xs" color="gray.500">
                          <Text whiteSpace="pre-line">{m.message}</Text>
                        </TableCell>
                        <TableCell>
                          <Badge colorPalette={statusColor(m.status)} variant="subtle">
                            {statusLabel(m.status)}
                          </Badge>
                        </TableCell>
                        <TableCell fontSize="xs" color="gray.500">{fmtTs(m.sentAt)}</TableCell>
                        <TableCell fontSize="xs" color="gray.500">{fmtTs(m.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </TableScrollArea>
              <Flex align="center" justify="space-between" mt={3}>
                <Text fontSize="xs" color="gray.500">
                  {total} message{total !== 1 ? 's' : ''} · Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                </Text>
                <HStack gap={1}>
                  <Button
                    size="xs" variant="outline"
                    disabled={page === 0 || logLoading}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <FiChevronLeft size={12} /> Prev
                  </Button>
                  <Button
                    size="xs" variant="outline"
                    disabled={page >= Math.ceil(total / PAGE_SIZE) - 1 || logLoading}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Next <FiChevronRight size={12} />
                  </Button>
                </HStack>
              </Flex>
              </>
            )}
          </Box>

        </VStack>
      </Container>
    </Box>
  )
}
