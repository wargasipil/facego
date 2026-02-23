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
import { FiRefreshCw, FiSave, FiMessageSquare, FiSend } from 'react-icons/fi'
import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { type WhatsappMessage, type WhatsappConfig } from '../gen/whatsapp/v1/whatsapp_pb'
import { whatsappService } from '../services/whatsapp_service'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'

type StreamState = 'connecting' | 'need_login' | 'connected' | 'error'

function fmtSentAt(ts?: { seconds: bigint }) {
  if (!ts) return '—'
  return new Date(Number(ts.seconds) * 1000).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'orange',
  sent:    'green',
  failed:  'red',
}

export default function WhatsappPage() {
  // ── stream / connection ──
  const [streamState, setStreamState] = useState<StreamState>('connecting')
  const [qrCode, setQrCode]           = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const abortRef                      = useRef<AbortController | null>(null)

  // ── config / templates ──
  const [config, setConfig]             = useState<WhatsappConfig | null>(null)
  const [lateTmpl, setLateTmpl]         = useState('')
  const [absentTmpl, setAbsentTmpl]     = useState('')
  const [configSaving, setConfigSaving] = useState(false)
  const [configMsg, setConfigMsg]       = useState<string | null>(null)

  // ── test message ──
  const [testPhone, setTestPhone]         = useState('')
  const [testMsg, setTestMsg]             = useState('')
  const [testSending, setTestSending]     = useState(false)
  const [testResult, setTestResult]       = useState<{ ok: boolean; text: string } | null>(null)

  // ── message log ──
  const [messages, setMessages]           = useState<WhatsappMessage[]>([])
  const [logLoading, setLogLoading]       = useState(true)

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

  // ── load config ──
  const loadConfig = useCallback(async () => {
    try {
      const r = await whatsappService.getConfig({})
      if (r.config) {
        setConfig(r.config)
        setLateTmpl(r.config.lateMessageTemplate)
        setAbsentTmpl(r.config.absentMessageTemplate)
      }
    } catch {}
  }, [])

  // ── load message log ──
  const loadMessages = useCallback(async () => {
    setLogLoading(true)
    try {
      const now = new Date()
      const from = new Date(now)
      from.setDate(now.getDate() - 30)
      const r = await whatsappService.listMessages({
        from: timestampFromDate(from),
        to:   timestampFromDate(now),
      })
      setMessages(r.messages)
    } catch {
      setMessages([])
    } finally {
      setLogLoading(false)
    }
  }, [])

  useEffect(() => {
    connectStream()
    loadConfig()
    loadMessages()
    return () => abortRef.current?.abort()
  }, [connectStream, loadConfig, loadMessages])

  // ── save config ──
  const handleSaveConfig = async () => {
    setConfigSaving(true)
    setConfigMsg(null)
    try {
      await whatsappService.saveConfig({
        config: {
          ...config,
          lateMessageTemplate:   lateTmpl,
          absentMessageTemplate: absentTmpl,
        },
      })
      setConfigMsg('Templates saved.')
    } catch (e: unknown) {
      setConfigMsg('Failed to save: ' + (e as Error).message)
    } finally {
      setConfigSaving(false)
    }
  }

  // ── send test message ──
  const handleSendTest = async () => {
    setTestSending(true)
    setTestResult(null)
    try {
      const r = await whatsappService.sendTestMessage({ phone: testPhone, message: testMsg })
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

          {/* ── Templates Card ── */}
          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <Heading size="sm" mb={1}>Message Templates</Heading>
            <Text fontSize="xs" color="gray.500" mb={4}>
              Available variables: <code>{'{student_name}'}</code>, <code>{'{parent_name}'}</code>, <code>{'{class}'}</code>, <code>{'{date}'}</code>, <code>{'{time}'}</code>
            </Text>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>Late Message Template</Field.Label>
                <Textarea
                  value={lateTmpl}
                  onChange={e => setLateTmpl(e.target.value)}
                  rows={4}
                  placeholder="e.g. Yth. {parent_name}, ananda {student_name} kelas {class} datang terlambat pada {date} pukul {time}."
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Absent Message Template</Field.Label>
                <Textarea
                  value={absentTmpl}
                  onChange={e => setAbsentTmpl(e.target.value)}
                  rows={4}
                  placeholder="e.g. Yth. {parent_name}, ananda {student_name} kelas {class} tidak hadir pada {date}."
                />
              </Field.Root>
              {configMsg && (
                <Text fontSize="sm" color={configMsg.startsWith('Failed') ? 'red.500' : 'green.600'}>
                  {configMsg}
                </Text>
              )}
              <Box>
                <Button size="sm" colorPalette="blue" loading={configSaving} onClick={handleSaveConfig}>
                  <FiSave />
                  Save Templates
                </Button>
              </Box>
            </VStack>
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
                <Heading size="sm">Message Log (last 30 days)</Heading>
              </HStack>
              <Button size="xs" variant="ghost" onClick={loadMessages} disabled={logLoading}>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map(m => (
                      <TableRow key={String(m.id)}>
                        <TableCell fontWeight="medium" fontSize="sm">{m.name}</TableCell>
                        <TableCell fontSize="sm" color="gray.600">{m.parentName}</TableCell>
                        <TableCell fontSize="sm" color="gray.600">{m.phone}</TableCell>
                        <TableCell fontSize="xs" color="gray.500" maxW="280px">
                          <Text truncate>{m.message}</Text>
                        </TableCell>
                        <TableCell>
                          <Badge colorPalette={STATUS_COLOR[m.status] ?? 'gray'} variant="subtle" textTransform="capitalize">
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell fontSize="xs" color="gray.500">{fmtSentAt(m.sentAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </TableScrollArea>
            )}
          </Box>

        </VStack>
      </Container>
    </Box>
  )
}
