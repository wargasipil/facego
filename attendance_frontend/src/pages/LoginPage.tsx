import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  Field,
  VStack,
  HStack,
  Grid,
  GridItem,
} from '@chakra-ui/react'
import {
  FiCamera,
  FiEye,
  FiEyeOff,
  FiLogIn,
  FiShield,
  FiBook,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type RoleStr } from '../context/AuthContext'

// ── Role selector ──────────────────────────────────────────────────────────────

interface RoleOption {
  value:       RoleStr
  label:       string
  icon:        React.ReactNode
  color:       string
  description: string
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value:       'admin',
    label:       'Admin',
    icon:        <FiShield size={20} />,
    color:       'purple',
    description: 'Full system access',
  },
  {
    value:       'teacher',
    label:       'Teacher',
    icon:        <FiBook size={20} />,
    color:       'blue',
    description: 'Class & attendance',
  },
  {
    value:       'student',
    label:       'Student',
    icon:        <FiUser size={20} />,
    color:       'green',
    description: 'View attendance',
  },
  {
    value:       'operator',
    label:       'Operator',
    icon:        <FiUsers size={20} />,
    color:       'orange',
    description: 'Front desk access',
  },
]

const COLOR_STYLES: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  purple: { bg: 'purple.50', border: 'purple.400', text: 'purple.700', iconBg: 'purple.100' },
  blue:   { bg: 'blue.50',   border: 'blue.400',   text: 'blue.700',   iconBg: 'blue.100'   },
  green:  { bg: 'green.50',  border: 'green.400',  text: 'green.700',  iconBg: 'green.100'  },
  orange: { bg: 'orange.50', border: 'orange.400', text: 'orange.700', iconBg: 'orange.100' },
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate  = useNavigate()
  const { login } = useAuth()

  const [selectedRole, setSelectedRole] = useState<RoleStr>('admin')
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [showPwd, setShowPwd]           = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)

  const handleRoleSelect = (role: RoleStr) => {
    setSelectedRole(role)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    const ok = await login(username, password)
    setLoading(false)
    if (!ok) {
      setError('Invalid username or password.')
      return
    }
    navigate('/')
  }

  const active = ROLE_OPTIONS.find(r => r.value === selectedRole)!
  const cs     = COLOR_STYLES[active.color]

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box w="full" maxW="420px" px={4}>

        {/* Logo */}
        <VStack gap={1} mb={8}>
          <Box
            w={12} h={12}
            bg="blue.500"
            borderRadius="xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            shadow="md"
            mb={2}
          >
            <FiCamera size={22} />
          </Box>
          <Heading size="lg" color="gray.800">FaceGo</Heading>
          <Text fontSize="sm" color="gray.500">Attendance Management System</Text>
        </VStack>

        {/* Role selector */}
        <Grid templateColumns="repeat(4, 1fr)" gap={2} mb={5}>
          {ROLE_OPTIONS.map(opt => {
            const isActive = selectedRole === opt.value
            const c        = COLOR_STYLES[opt.color]
            return (
              <GridItem key={opt.value}>
                <Box
                  as="button"
                  type="button"
                  w="full"
                  p={3}
                  borderRadius="lg"
                  border="2px solid"
                  borderColor={isActive ? c.border : 'gray.200'}
                  bg={isActive ? c.bg : 'white'}
                  cursor="pointer"
                  transition="all 0.15s"
                  _hover={{ borderColor: c.border, bg: c.bg }}
                  onClick={() => handleRoleSelect(opt.value)}
                  textAlign="center"
                >
                  <Flex
                    w={8} h={8}
                    borderRadius="md"
                    bg={isActive ? c.iconBg : 'gray.100'}
                    align="center"
                    justify="center"
                    color={isActive ? c.text : 'gray.400'}
                    mx="auto"
                    mb={1.5}
                    transition="all 0.15s"
                  >
                    {opt.icon}
                  </Flex>
                  <Text
                    fontSize="xs"
                    fontWeight={isActive ? 'semibold' : 'medium'}
                    color={isActive ? c.text : 'gray.500'}
                    lineHeight="1"
                  >
                    {opt.label}
                  </Text>
                </Box>
              </GridItem>
            )
          })}
        </Grid>

        {/* Login card */}
        <Box bg="white" borderRadius="xl" shadow="sm" p={8} borderTop="3px solid" borderTopColor={cs.border}>
          <HStack mb={5} gap={2}>
            <Box color={cs.text}>{active.icon}</Box>
            <Box>
              <Heading size="sm" color="gray.700">Sign in as {active.label}</Heading>
              <Text fontSize="xs" color="gray.400" mt={0.5}>{active.description}</Text>
            </Box>
          </HStack>

          {error && (
            <Box
              bg="red.50"
              border="1px solid"
              borderColor="red.200"
              borderRadius="md"
              px={4}
              py={3}
              mb={4}
            >
              <Text fontSize="sm" color="red.600">{error}</Text>
            </Box>
          )}

          <form onSubmit={handleSubmit}>
            <VStack gap={4}>
              <Field.Root required>
                <Field.Label>Username <Field.RequiredIndicator /></Field.Label>
                <Input
                  placeholder={selectedRole === 'admin' ? 'admin' : selectedRole}
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  autoComplete="username"
                  autoFocus
                />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Password <Field.RequiredIndicator /></Field.Label>
                <Box position="relative" w="full">
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    autoComplete="current-password"
                    pr="40px"
                  />
                  <Box
                    as="button"
                    type="button"
                    position="absolute"
                    right={3}
                    top="50%"
                    transform="translateY(-50%)"
                    color="gray.400"
                    _hover={{ color: 'gray.600' }}
                    onClick={() => setShowPwd(v => !v)}
                  >
                    {showPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </Box>
                </Box>
              </Field.Root>

              <Button
                type="submit"
                colorPalette={active.color}
                w="full"
                mt={2}
                loading={loading}
                loadingText="Signing in…"
              >
                <FiLogIn />
                Sign In
              </Button>
            </VStack>
          </form>
        </Box>

        <HStack justify="center" mt={6} gap={1}>
          <Text fontSize="xs" color="gray.400">Default credentials:</Text>
          <Text fontSize="xs" color="gray.500" fontWeight="medium">admin / admin123</Text>
          <Text fontSize="xs" color="gray.400">(change after first login)</Text>
        </HStack>
      </Box>
    </Flex>
  )
}
