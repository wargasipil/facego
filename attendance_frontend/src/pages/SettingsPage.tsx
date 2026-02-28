import {
  Box,
  Container,
  Heading,
  Text,
  Input,
  Button,
  Field,
  VStack,
  HStack,
  Separator,
} from '@chakra-ui/react'
import {
  FiLock,
  FiServer,
  FiSave,
  FiEye,
  FiEyeOff,
  FiInfo,
} from 'react-icons/fi'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Box bg="white" borderRadius="lg" shadow="sm" overflow="hidden">
      <Box px={6} py={4} borderBottom="1px solid" borderColor="gray.100">
        <HStack gap={3}>
          <Box color="blue.500">{icon}</Box>
          <Box>
            <Heading size="sm" color="gray.800">{title}</Heading>
            <Text fontSize="xs" color="gray.400" mt={0.5}>{description}</Text>
          </Box>
        </HStack>
      </Box>
      <Box p={6}>{children}</Box>
    </Box>
  )
}

// ─── Change-password section ──────────────────────────────────────────────────

function PasswordSection() {
  const { changePassword } = useAuth()

  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(er => ({ ...er, [field]: undefined }))
      setSaved(false)
    }

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (!form.current)              e.current = 'Current password is required'
    if (!form.next)                 e.next    = 'New password is required'
    else if (form.next.length < 6)  e.next    = 'Must be at least 6 characters'
    if (form.next !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    const ok = await changePassword(form.current, form.next)
    setLoading(false)
    if (!ok) {
      setErrors({ current: 'Incorrect current password' })
      return
    }
    setForm({ current: '', next: '', confirm: '' })
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch" maxW="420px">
        <Field.Root invalid={!!errors.current} required>
          <Field.Label>Current Password <Field.RequiredIndicator /></Field.Label>
          <Box position="relative">
            <Input
              type={showCurrent ? 'text' : 'password'}
              value={form.current}
              onChange={handleChange('current')}
              pr="40px"
            />
            <Box
              as="button"
              position="absolute"
              right={3}
              top="50%"
              transform="translateY(-50%)"
              color="gray.400"
              _hover={{ color: 'gray.600' }}
              onClick={() => setShowCurrent(v => !v)}
            >
              {showCurrent ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </Box>
          </Box>
          {errors.current && <Field.ErrorText>{errors.current}</Field.ErrorText>}
        </Field.Root>

        <Field.Root invalid={!!errors.next} required>
          <Field.Label>New Password <Field.RequiredIndicator /></Field.Label>
          <Box position="relative">
            <Input
              type={showNext ? 'text' : 'password'}
              value={form.next}
              onChange={handleChange('next')}
              pr="40px"
            />
            <Box
              as="button"
              position="absolute"
              right={3}
              top="50%"
              transform="translateY(-50%)"
              color="gray.400"
              _hover={{ color: 'gray.600' }}
              onClick={() => setShowNext(v => !v)}
            >
              {showNext ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </Box>
          </Box>
          {errors.next && <Field.ErrorText>{errors.next}</Field.ErrorText>}
        </Field.Root>

        <Field.Root invalid={!!errors.confirm} required>
          <Field.Label>Confirm New Password <Field.RequiredIndicator /></Field.Label>
          <Input
            type="password"
            value={form.confirm}
            onChange={handleChange('confirm')}
          />
          {errors.confirm && <Field.ErrorText>{errors.confirm}</Field.ErrorText>}
        </Field.Root>

        <HStack mt={2}>
          <Button type="submit" colorPalette="blue" size="sm" loading={loading} loadingText="Saving…">
            <FiSave />
            Update Password
          </Button>
          {saved && (
            <Text fontSize="sm" color="green.500" fontWeight="medium">
              Password updated.
            </Text>
          )}
        </HStack>
      </VStack>
    </form>
  )
}

// ─── School info section ──────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 4 }, (_, i) => {
  const y = CURRENT_YEAR - 1 + i
  return `${y}/${y + 1}`
})

function SchoolSection() {
  const [form, setForm] = useState({
    school_name:    'FaceGo High School',
    academic_year:  `${CURRENT_YEAR}/${CURRENT_YEAR + 1}`,
    late_threshold: '15',
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setSaved(false)
    }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    setLoading(false)
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch" maxW="420px">
        <Field.Root required>
          <Field.Label>School Name <Field.RequiredIndicator /></Field.Label>
          <Input value={form.school_name} onChange={handleChange('school_name')} />
        </Field.Root>

        <Field.Root>
          <Field.Label>Academic Year</Field.Label>
          <select
            value={form.academic_year}
            onChange={handleChange('academic_year')}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white' }}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field.Root>

        <Field.Root>
          <Field.Label>Late Threshold (minutes)</Field.Label>
          <Input
            type="number"
            min={1}
            max={60}
            value={form.late_threshold}
            onChange={handleChange('late_threshold')}
          />
          <Field.HelperText>
            Students arriving after this many minutes are marked Late.
          </Field.HelperText>
        </Field.Root>

        <HStack mt={2}>
          <Button type="submit" colorPalette="blue" size="sm" loading={loading} loadingText="Saving…">
            <FiSave />
            Save
          </Button>
          {saved && (
            <Text fontSize="sm" color="green.500" fontWeight="medium">
              Saved.
            </Text>
          )}
        </HStack>
      </VStack>
    </form>
  )
}

// ─── API section ──────────────────────────────────────────────────────────────

function ApiSection() {
  const [url, setUrl]     = useState('http://localhost:8080')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    setLoading(false)
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch" maxW="420px">
        <Field.Root required>
          <Field.Label>Backend API URL <Field.RequiredIndicator /></Field.Label>
          <Input
            value={url}
            onChange={e => { setUrl(e.target.value); setSaved(false) }}
            placeholder="http://localhost:8080"
          />
          <Field.HelperText>
            Base URL of the Connect RPC backend server.
          </Field.HelperText>
        </Field.Root>

        <HStack mt={2}>
          <Button type="submit" colorPalette="blue" size="sm" loading={loading} loadingText="Saving…">
            <FiSave />
            Save
          </Button>
          {saved && (
            <Text fontSize="sm" color="green.500" fontWeight="medium">
              Saved.
            </Text>
          )}
        </HStack>
      </VStack>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Box py={6}>
      <Container maxW="container.md">
        <Box mb={6}>
          <Heading size="lg">Settings</Heading>
          <Text color="gray.500" mt={1}>Manage admin credentials and system configuration.</Text>
        </Box>

        <VStack gap={5} align="stretch">
          <SectionCard
            icon={<FiLock size={18} />}
            title="Admin Password"
            description="Change the administrator login password."
          >
            <PasswordSection />
          </SectionCard>

          <SectionCard
            icon={<FiInfo size={18} />}
            title="School Information"
            description="General school details used across the system."
          >
            <SchoolSection />
          </SectionCard>

          <SectionCard
            icon={<FiServer size={18} />}
            title="API Connection"
            description="Configure the backend server endpoint."
          >
            <ApiSection />
          </SectionCard>
        </VStack>

        <Separator mt={8} mb={4} />
        <Text fontSize="xs" color="gray.300" textAlign="center">
          FaceGo Attendance v1.0
        </Text>
      </Container>
    </Box>
  )
}
