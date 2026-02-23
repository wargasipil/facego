import {
  Box,
  Button,
  Flex,
  HStack,
  VStack,
  Badge,
  Heading,
  Text,
  IconButton,
  Input,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  Separator,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Field,
} from '@chakra-ui/react'
import { FiClock, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useState } from 'react'
import { type ClassSchedule } from '../../../gen/classes/v1/classes_pb'
import { classService } from '../../../services/class_service'

const DAY_LABELS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_COLORS = ['', 'blue', 'teal', 'green', 'orange', 'purple', 'pink', 'red'] as const

const EMPTY_SCHEDULE_FORM = { dayOfWeek: 1, startTime: '', endTime: '', subject: '', room: '' }

interface Props {
  classId: bigint
  schedules: ClassSchedule[]
  onSchedulesChange: (ss: ClassSchedule[]) => void
}

export function ClassScheduleTab({ classId, schedules, onSchedulesChange }: Props) {
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editing, setEditing]             = useState<ClassSchedule | null>(null)
  const [form, setForm]                   = useState(EMPTY_SCHEDULE_FORM)
  const [formLoading, setFormLoading]     = useState(false)
  const [formError, setFormError]         = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<ClassSchedule | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_SCHEDULE_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (sc: ClassSchedule) => {
    setEditing(sc)
    setForm({ dayOfWeek: sc.dayOfWeek, startTime: sc.startTime, endTime: sc.endTime, subject: sc.subject, room: sc.room })
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.startTime || !form.endTime) {
      setFormError('Start time and end time are required.')
      return
    }
    setFormLoading(true)
    setFormError(null)
    try {
      if (editing) {
        const r = await classService.updateSchedule({
          id:        editing.id,
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime,
          endTime:   form.endTime,
          subject:   form.subject,
          room:      form.room,
        })
        onSchedulesChange(schedules.map(s => s.id === r.schedule!.id ? r.schedule! : s))
      } else {
        const r = await classService.createSchedule({
          classId,
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime,
          endTime:   form.endTime,
          subject:   form.subject,
          room:      form.room,
        })
        onSchedulesChange(
          [...schedules, r.schedule!].sort((a, b) =>
            a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startTime.localeCompare(b.startTime)
          )
        )
      }
      setDialogOpen(false)
    } catch (err) {
      setFormError((err as Error).message ?? 'Failed to save schedule.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await classService.deleteSchedule({ id: deleteTarget.id })
      onSchedulesChange(schedules.filter(s => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {}
    finally { setDeleteLoading(false) }
  }

  return (
    <>
      <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
        <Flex align="center" justify="space-between" mb={4}>
          <HStack gap={2}>
            <FiClock size={15} />
            <Heading size="sm">Weekly Schedule</Heading>
            {schedules.length > 0 && (
              <Badge colorPalette="teal" variant="subtle" borderRadius="full" px={2}>{schedules.length}</Badge>
            )}
          </HStack>
          <Button size="sm" colorPalette="teal" onClick={openNew}>
            <FiPlus />
            Add Schedule
          </Button>
        </Flex>
        <Separator mb={4} />

        {schedules.length === 0 ? (
          <EmptyStateRoot>
            <EmptyStateContent py={8}>
              <EmptyStateIndicator><FiClock size={28} /></EmptyStateIndicator>
              <EmptyStateTitle>No schedule yet</EmptyStateTitle>
              <EmptyStateDescription>Click "Add Schedule" to add weekly time slots.</EmptyStateDescription>
            </EmptyStateContent>
          </EmptyStateRoot>
        ) : (
          <VStack gap={2} align="stretch">
            {schedules.map(sc => (
              <Flex
                key={String(sc.id)}
                align="center" gap={3} px={3} py={2}
                borderRadius="md" border="1px solid" borderColor="gray.100"
                _hover={{ bg: 'gray.50' }}
              >
                <Badge
                  colorPalette={DAY_COLORS[sc.dayOfWeek] ?? 'gray'}
                  variant="subtle"
                  minW="90px"
                  textAlign="center"
                  fontSize="xs"
                >
                  {DAY_LABELS[sc.dayOfWeek] ?? `Day ${sc.dayOfWeek}`}
                </Badge>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="120px">
                  {sc.startTime} – {sc.endTime}
                </Text>
                <Box flex={1}>
                  {sc.subject && <Text fontSize="sm" color="gray.700">{sc.subject}</Text>}
                  {sc.room && <Text fontSize="xs" color="gray.400">Room {sc.room}</Text>}
                </Box>
                <HStack gap={1}>
                  <IconButton aria-label="Edit schedule" variant="ghost" size="sm" colorPalette="blue" onClick={() => openEdit(sc)}>
                    <FiEdit2 />
                  </IconButton>
                  <IconButton aria-label="Delete schedule" variant="ghost" size="sm" colorPalette="red" onClick={() => setDeleteTarget(sc)}>
                    <FiTrash2 />
                  </IconButton>
                </HStack>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>

      {/* Add / Edit dialog */}
      <DialogRoot open={dialogOpen} onOpenChange={d => { if (!d.open) setDialogOpen(false) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="420px">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <VStack gap={4}>
                <Field.Root required>
                  <Field.Label>Day of Week <Field.RequiredIndicator /></Field.Label>
                  <select
                    value={form.dayOfWeek}
                    onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white' }}
                  >
                    {DAY_LABELS.slice(1).map((label, i) => (
                      <option key={i + 1} value={i + 1}>{label}</option>
                    ))}
                  </select>
                </Field.Root>

                <HStack gap={3} w="full">
                  <Field.Root required flex={1}>
                    <Field.Label>Start Time <Field.RequiredIndicator /></Field.Label>
                    <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                  </Field.Root>
                  <Field.Root required flex={1}>
                    <Field.Label>End Time <Field.RequiredIndicator /></Field.Label>
                    <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                  </Field.Root>
                </HStack>

                <Field.Root>
                  <Field.Label>Subject</Field.Label>
                  <Input placeholder="e.g. Mathematics" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Room</Field.Label>
                  <Input placeholder="e.g. 101" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
                </Field.Root>

                {formError && (
                  <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" px={3} py={2} w="full">
                    <Text color="red.600" fontSize="sm">{formError}</Text>
                  </Box>
                )}
              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button colorPalette="teal" size="sm" loading={formLoading} onClick={handleSubmit}>
                {editing ? 'Save Changes' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* Delete confirm dialog */}
      <DialogRoot open={!!deleteTarget} onOpenChange={d => { if (!d.open) setDeleteTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Schedule</DialogTitle></DialogHeader>
            <DialogBody>
              <Text>
                Delete the{' '}
                <Text as="span" fontWeight="bold">
                  {deleteTarget ? DAY_LABELS[deleteTarget.dayOfWeek] : ''}{' '}
                  {deleteTarget?.startTime}–{deleteTarget?.endTime}
                </Text>{' '}
                slot?
              </Text>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button colorPalette="red" size="sm" loading={deleteLoading} onClick={handleDelete}>
                <FiTrash2 /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </>
  )
}
