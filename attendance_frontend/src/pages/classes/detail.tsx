import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Flex,
  HStack,
  VStack,
  Badge,
  Separator,
  Spinner,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@chakra-ui/react'
import {
  FiArrowLeft,
  FiUsers,
  FiClock,
  FiBook,
  FiClipboard,
} from 'react-icons/fi'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { type Class, type ClassSchedule } from '../../gen/classes/v1/classes_pb'
import { classService } from '../../services/class_service'
import { StudentsTab } from './tabs/students'
import { ScheduleTab } from './tabs/schedule'
import { AttendanceTab } from './tabs/attendance'

const formatDate = (ts?: { seconds: bigint }) =>
  ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Flex gap={3} align="baseline">
      <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" w="100px" flexShrink={0}>
        {label}
      </Text>
      <Text as="div" fontSize="sm" color="gray.700">{value ?? '—'}</Text>
    </Flex>
  )
}

export default function ClassDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cls, setCls]             = useState<Class | null>(null)
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('students')
  const [studentTotal, setStudentTotal] = useState(0)

  const loadClass = useCallback(() => {
    if (!id) return
    const classId = BigInt(id)
    setLoading(true)
    Promise.all([
      classService.getClass({ id: classId }),
      classService.listSchedules({ classId }),
    ])
      .then(([classRes, schedulesRes]) => {
        setCls(classRes.class!)
        setSchedules(schedulesRes.schedules)
      })
      .catch(err => setError((err as Error).message ?? 'Failed to load class'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadClass() }, [loadClass])

  if (loading) {
    return (
      <Box py={6}>
        <Container maxW="container.xl">
          <Flex justify="center" py={20}><Spinner size="lg" color="blue.500" /></Flex>
        </Container>
      </Box>
    )
  }

  if (error || !cls) {
    return (
      <Box py={6}>
        <Container maxW="container.xl">
          <Button variant="ghost" size="sm" mb={4} onClick={() => navigate('/classes')}>
            <FiArrowLeft /> Back to Classes
          </Button>
          <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={4}>
            <Text color="red.600">{error ?? 'Class not found.'}</Text>
          </Box>
        </Container>
      </Box>
    )
  }

  return (
    <Box py={6}>
      <Container maxW="container.xl">

        <Button variant="ghost" size="sm" mb={5} onClick={() => navigate('/classes')}>
          <FiArrowLeft /> Back to Classes
        </Button>

        {/* Page header */}
        <Flex justify="space-between" align="flex-start" mb={6}>
          <Box>
            <HStack gap={3} mb={1}>
              <Heading size="lg">{cls.name}</Heading>
              {cls.grade && (
                <Badge colorPalette="purple" variant="subtle" fontSize="sm">
                  Grade {cls.grade.level}
                </Badge>
              )}
            </HStack>
            {cls.description && (
              <Text color="gray.500" mt={1}>{cls.description}</Text>
            )}
          </Box>
          <Badge colorPalette="blue" variant="subtle" px={3} py={1} borderRadius="full" fontSize="sm">
            <HStack gap={1}>
              <FiUsers size={13} />
              <Text>{studentTotal} Students</Text>
            </HStack>
          </Badge>
        </Flex>

        {/* Class info card */}
        <Box bg="white" borderRadius="lg" shadow="sm" p={5} mb={6}>
          <HStack gap={2} mb={4}>
            <FiBook size={15} />
            <Heading size="sm">Class Information</Heading>
          </HStack>
          <Separator mb={4} />
          <VStack gap={3} align="stretch">
            <InfoRow label="Class Name"  value={cls.name} />
            <InfoRow label="Grade"       value={cls.grade ? `${cls.grade.label} (Level ${cls.grade.level})` : '—'} />
            <InfoRow label="Teacher"     value={
              cls.teacher ? (
                <HStack gap={2}>
                  <Text>{cls.teacher.name}</Text>
                  {cls.teacher.subject && <Badge variant="outline" size="xs">{cls.teacher.subject}</Badge>}
                </HStack>
              ) : '—'
            } />
            <InfoRow label="Created"     value={formatDate(cls.createdAt)} />
            {cls.description && <InfoRow label="Description" value={cls.description} />}
          </VStack>
        </Box>

        {/* Tabs */}
        <TabsRoot value={activeTab} onValueChange={d => setActiveTab(d.value)}>
          <TabsList mb={4}>
            <TabsTrigger value="students">
              <HStack gap={2}>
                <FiUsers size={14} />
                <Text>Students ({studentTotal})</Text>
              </HStack>
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <HStack gap={2}>
                <FiClock size={14} />
                <Text>Weekly Schedule ({schedules.length})</Text>
              </HStack>
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <HStack gap={2}>
                <FiClipboard size={14} />
                <Text>Attendance</Text>
              </HStack>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentsTab
              classId={cls.id}
              className={cls.name}
              onTotalChange={setStudentTotal}
            />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleTab
              classId={cls.id}
              schedules={schedules}
              onSchedulesChange={setSchedules}
            />
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTab
              classId={cls.id}
              className={cls.name}
              active={activeTab === 'attendance'}
              schedules={schedules}
            />
          </TabsContent>
        </TabsRoot>

      </Container>
    </Box>
  )
}
