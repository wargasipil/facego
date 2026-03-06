import {
  Box,
  Container,
  Text,
  VStack,
  HStack,
  Heading,
  SimpleGrid,
  Spinner,
  Center,
  Flex,
  Badge,
} from '@chakra-ui/react'
import { FiUsers, FiBook, FiMessageSquare, FiCheckCircle, FiXCircle, FiList } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { attendanceService } from '../services/attendance_service'

interface SummaryState {
  total: number
  present: number
  absent: number
}

const QUICK_LINKS = [
  { label: 'Attendance',  path: '/attendance', icon: <FiList size={22} />,         color: 'blue'   },
  { label: 'Classes',     path: '/classes',    icon: <FiBook size={22} />,          color: 'purple' },
  { label: 'Students',    path: '/students',   icon: <FiUsers size={22} />,         color: 'teal'   },
  { label: 'WhatsApp',    path: '/whatsapp',   icon: <FiMessageSquare size={22} />, color: 'green'  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<SummaryState | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    attendanceService
      .getDailyAttendance({ filter: {}, page: 0, pageSize: 0 })
      .then(r => {
        const s = r.summary
        setSummary({ total: s?.total ?? 0, present: s?.present ?? 0, absent: s?.absent ?? 0 })
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box py={6}>
      <Container maxW="container.xl">
        <VStack gap={6} align="stretch">

          {/* ── Header ── */}
          <Box>
            <Heading size="md" color="gray.800">Welcome to FaceGo</Heading>
            <Text fontSize="sm" color="gray.500" mt={1}>{today}</Text>
          </Box>

          {/* ── Today's Summary ── */}
          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <Heading size="sm" mb={4}>Today's Attendance</Heading>
            {loading ? (
              <Center py={6}><Spinner size="md" color="blue.500" /></Center>
            ) : summary === null ? (
              <Center py={6} color="gray.400">Could not load attendance data.</Center>
            ) : (
              <SimpleGrid columns={3} gap={4}>
                <SummaryCard label="Total" value={summary.total} color="blue" />
                <SummaryCard
                  label="Present"
                  value={summary.present}
                  color="green"
                  icon={<FiCheckCircle size={18} />}
                  pct={summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0}
                />
                <SummaryCard
                  label="Absent"
                  value={summary.absent}
                  color="red"
                  icon={<FiXCircle size={18} />}
                  pct={summary.total > 0 ? Math.round((summary.absent / summary.total) * 100) : 0}
                />
              </SimpleGrid>
            )}
          </Box>

          {/* ── Quick Links ── */}
          <Box>
            <Heading size="sm" mb={3} color="gray.600">Quick Access</Heading>
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
              {QUICK_LINKS.map(link => (
                <Box
                  key={link.path}
                  bg="white"
                  borderRadius="lg"
                  shadow="sm"
                  p={5}
                  cursor="pointer"
                  onClick={() => navigate(link.path)}
                  _hover={{ shadow: 'md', transform: 'translateY(-1px)' }}
                  transition="all 0.15s"
                >
                  <Flex
                    w={10} h={10}
                    bg={`${link.color}.50`}
                    color={`${link.color}.500`}
                    borderRadius="md"
                    align="center"
                    justify="center"
                    mb={3}
                  >
                    {link.icon}
                  </Flex>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.700">{link.label}</Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

        </VStack>
      </Container>
    </Box>
  )
}

function SummaryCard({
  label, value, color, icon, pct,
}: {
  label: string
  value: number
  color: string
  icon?: React.ReactNode
  pct?: number
}) {
  return (
    <Box bg={`${color}.50`} borderRadius="lg" p={4}>
      <HStack justify="space-between" mb={1}>
        <Text fontSize="xs" color={`${color}.600`} fontWeight="semibold" textTransform="uppercase" letterSpacing="wide">
          {label}
        </Text>
        {icon && <Box color={`${color}.400`}>{icon}</Box>}
      </HStack>
      <Text fontSize="3xl" fontWeight="bold" color={`${color}.600`}>{value}</Text>
      {pct !== undefined && (
        <Badge colorPalette={color} variant="subtle" mt={1} fontSize="xs">{pct}%</Badge>
      )}
    </Box>
  )
}
