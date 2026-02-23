import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Input,
  Flex,
  HStack,
  VStack,
  Badge,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  TableScrollArea,
  InputGroup,
  AvatarRoot,
  AvatarFallback,
  DialogRoot,
  DialogTrigger,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Field,
  IconButton,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  Spinner,
} from '@chakra-ui/react'
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUserCheck,
  FiMail,
  FiPhone,
} from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { type Teacher } from '../gen/teachers/v1/teachers_pb'
import { teacherService } from '../services/teacher_service'
import { StatCard } from '../components/StatCard'

const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'History', 'Social Studies',
  'Art', 'Music', 'Physical Education', 'Computer Science', 'Other',
]

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  teacher_id: string
  subject: string
  email: string
  phone: string
}

const EMPTY_FORM: FormState = { name: '', teacher_id: '', subject: '', email: '', phone: '' }

function formToErrors(f: FormState): Partial<FormState> {
  const e: Partial<FormState> = {}
  if (!f.name.trim())       e.name       = 'Name is required'
  if (!f.teacher_id.trim()) e.teacher_id = 'Teacher ID is required'
  if (!f.subject.trim())    e.subject    = 'Subject is required'
  if (!f.email.trim())      e.email      = 'Email is required'
  return e
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeacherFormFields({
  form, errors, onChange,
}: {
  form: FormState
  errors: Partial<FormState>
  onChange: (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
}) {
  return (
    <VStack gap={4}>
      <Field.Root invalid={!!errors.name} required>
        <Field.Label>Full Name <Field.RequiredIndicator /></Field.Label>
        <Input placeholder="e.g. Mr. Anderson" value={form.name} onChange={onChange('name')} />
        {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!errors.teacher_id} required>
        <Field.Label>Teacher ID <Field.RequiredIndicator /></Field.Label>
        <Input placeholder="e.g. TCH007" value={form.teacher_id} onChange={onChange('teacher_id')} />
        {errors.teacher_id && <Field.ErrorText>{errors.teacher_id}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!errors.subject} required>
        <Field.Label>Subject <Field.RequiredIndicator /></Field.Label>
        <select
          value={form.subject}
          onChange={onChange('subject')}
          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: errors.subject ? '1px solid #e53e3e' : '1px solid #e2e8f0', fontSize: '14px', background: 'white' }}
        >
          <option value="">Select subject…</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors.subject && <Field.ErrorText>{errors.subject}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!errors.email} required>
        <Field.Label>Email <Field.RequiredIndicator /></Field.Label>
        <Input type="email" placeholder="e.g. teacher@school.edu" value={form.email} onChange={onChange('email')} />
        {errors.email && <Field.ErrorText>{errors.email}</Field.ErrorText>}
      </Field.Root>

      <Field.Root>
        <Field.Label>Phone (optional)</Field.Label>
        <Input type="tel" placeholder="e.g. 555-0100" value={form.phone} onChange={onChange('phone')} />
      </Field.Root>
    </VStack>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherPage() {
  const [teachers, setTeachers]     = useState<Teacher[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch]         = useState('')

  // add
  const [addOpen,    setAddOpen]    = useState(false)
  const [addForm,    setAddForm]    = useState<FormState>(EMPTY_FORM)
  const [addErrors,  setAddErrors]  = useState<Partial<FormState>>({})
  const [addLoading, setAddLoading] = useState(false)

  // edit
  const [editTarget,  setEditTarget]  = useState<Teacher | null>(null)
  const [editForm,    setEditForm]    = useState<FormState>(EMPTY_FORM)
  const [editErrors,  setEditErrors]  = useState<Partial<FormState>>({})
  const [editLoading, setEditLoading] = useState(false)

  // delete
  const [deleteTarget,  setDeleteTarget]  = useState<Teacher | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ─── initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    teacherService.listTeachers({})
      .then(r => setTeachers(r.teachers))
      .catch(err => setFetchError((err as Error).message ?? 'Failed to load teachers'))
      .finally(() => setLoading(false))
  }, [])

  // ─── derived ───────────────────────────────────────────────────────────────
  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.teacherId.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalClasses = teachers.reduce((s, t) => s + t.classCount, 0)
  const subjects     = new Set(teachers.map(t => t.subject)).size

  // ─── add ───────────────────────────────────────────────────────────────────
  const handleAddChange = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setAddForm(f => ({ ...f, [field]: e.target.value }))
      setAddErrors(er => ({ ...er, [field]: undefined }))
    }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = formToErrors(addForm)
    if (Object.keys(errs).length) { setAddErrors(errs); return }
    setAddLoading(true)
    try {
      const created = (await teacherService.createTeacher({
        name: addForm.name.trim(),
        teacherId: addForm.teacher_id.trim(),
        subject: addForm.subject,
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
      })).teacher!
      setTeachers(ts => [created, ...ts])
      setAddForm(EMPTY_FORM)
      setAddErrors({})
      setAddOpen(false)
    } catch (err: unknown) {
      setAddErrors({ name: (err as Error).message ?? 'Save failed' })
    } finally {
      setAddLoading(false)
    }
  }

  // ─── edit ──────────────────────────────────────────────────────────────────
  const openEdit = (t: Teacher) => {
    setEditTarget(t)
    setEditForm({ name: t.name, teacher_id: t.teacherId, subject: t.subject, email: t.email, phone: t.phone })
    setEditErrors({})
  }

  const handleEditChange = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setEditForm(f => ({ ...f, [field]: e.target.value }))
      setEditErrors(er => ({ ...er, [field]: undefined }))
    }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = formToErrors(editForm)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setEditLoading(true)
    try {
      const updated = (await teacherService.updateTeacher({
        id: editTarget!.id,
        name: editForm.name.trim(),
        teacherId: editForm.teacher_id.trim(),
        subject: editForm.subject,
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
      })).teacher!
      setTeachers(ts => ts.map(t => t.id === updated.id ? updated : t))
      setEditTarget(null)
    } catch (err: unknown) {
      setEditErrors({ name: (err as Error).message ?? 'Save failed' })
    } finally {
      setEditLoading(false)
    }
  }

  // ─── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await teacherService.deleteTeacher({ id: deleteTarget.id })
      setTeachers(ts => ts.filter(t => t.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      console.error('Delete failed:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatDate = (ts?: { seconds: bigint }) =>
    ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <Box py={6}>
      <Container maxW="container.xl">

        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading size="lg">Manage Teachers</Heading>
            <Text color="gray.500" mt={1}>Add, edit, and remove teacher records</Text>
          </Box>

          {/* Add dialog */}
          <DialogRoot open={addOpen} onOpenChange={d => setAddOpen(d.open)}>
            <DialogTrigger asChild>
              <Button colorPalette="blue" size="sm">
                <FiPlus />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogBackdrop />
            <DialogPositioner>
              <DialogContent>
                <form onSubmit={handleAdd}>
                  <DialogHeader>
                    <DialogTitle>Add New Teacher</DialogTitle>
                  </DialogHeader>
                  <DialogBody>
                    <TeacherFormFields form={addForm} errors={addErrors} onChange={handleAddChange} />
                  </DialogBody>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button type="submit" colorPalette="blue" size="sm" loading={addLoading} loadingText="Saving…">
                      Save Teacher
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </DialogPositioner>
          </DialogRoot>
        </Flex>

        {/* Stats */}
        <HStack gap={4} mb={8}>
          <StatCard label="Total Teachers" value={teachers.length}  color="blue"   />
          <StatCard label="Total Classes"  value={totalClasses}     color="green"  />
          <StatCard label="Subjects"       value={subjects}         color="purple" />
        </HStack>

        {/* Error banner */}
        {fetchError && (
          <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
            <Text color="red.600" fontSize="sm">{fetchError}</Text>
          </Box>
        )}

        {/* Table card */}
        <Box bg="white" borderRadius="lg" shadow="sm" p={4}>
          <HStack mb={4} justify="space-between">
            <Heading size="sm">All Teachers</Heading>
            <InputGroup maxW="260px" startElement={<FiSearch color="gray" />}>
              <Input
                placeholder="Search name / ID / subject…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="sm"
                borderRadius="md"
              />
            </InputGroup>
          </HStack>

          {loading ? (
            <Flex justify="center" py={12}><Spinner /></Flex>
          ) : filtered.length === 0 ? (
            <EmptyStateRoot>
              <EmptyStateContent py={12}>
                <EmptyStateIndicator><FiUserCheck size={32} /></EmptyStateIndicator>
                <EmptyStateTitle>No teachers found</EmptyStateTitle>
                <EmptyStateDescription>
                  {search ? 'Try a different search term.' : 'Add your first teacher using the button above.'}
                </EmptyStateDescription>
              </EmptyStateContent>
            </EmptyStateRoot>
          ) : (
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Teacher</TableColumnHeader>
                    <TableColumnHeader>ID</TableColumnHeader>
                    <TableColumnHeader>Subject</TableColumnHeader>
                    <TableColumnHeader>Contact</TableColumnHeader>
                    <TableColumnHeader>Classes</TableColumnHeader>
                    <TableColumnHeader>Joined</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(t => (
                    <TableRow key={String(t.id)}>
                      <TableCell>
                        <HStack gap={3}>
                          <AvatarRoot size="sm">
                            <AvatarFallback>{t.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </AvatarRoot>
                          <Text fontWeight="medium" fontSize="sm">{t.name}</Text>
                        </HStack>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" size="sm">{t.teacherId}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge colorPalette="teal" variant="subtle" size="sm">{t.subject}</Badge>
                      </TableCell>
                      <TableCell>
                        <VStack gap={0.5} align="start">
                          <HStack gap={1}>
                            <FiMail size={11} color="#718096" />
                            <Text fontSize="xs" color="gray.500">{t.email}</Text>
                          </HStack>
                          {t.phone && (
                            <HStack gap={1}>
                              <FiPhone size={11} color="#718096" />
                              <Text fontSize="xs" color="gray.500">{t.phone}</Text>
                            </HStack>
                          )}
                        </VStack>
                      </TableCell>
                      <TableCell>
                        <Text fontSize="sm">{t.classCount}</Text>
                      </TableCell>
                      <TableCell color="gray.400" fontSize="xs">{formatDate(t.createdAt)}</TableCell>
                      <TableCell>
                        <HStack gap={1} justify="flex-end">
                          <IconButton
                            aria-label="Edit teacher"
                            variant="ghost"
                            size="sm"
                            colorPalette="blue"
                            onClick={() => openEdit(t)}
                          >
                            <FiEdit2 />
                          </IconButton>
                          <IconButton
                            aria-label="Delete teacher"
                            variant="ghost"
                            size="sm"
                            colorPalette="red"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <FiTrash2 />
                          </IconButton>
                        </HStack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
          )}
        </Box>
      </Container>

      {/* ── Edit Dialog ── */}
      <DialogRoot open={!!editTarget} onOpenChange={d => { if (!d.open) setEditTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <form onSubmit={handleEdit}>
              <DialogHeader>
                <DialogTitle>Edit Teacher — {editTarget?.name}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <TeacherFormFields form={editForm} errors={editErrors} onChange={handleEditChange} />
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
                <Button type="submit" colorPalette="blue" size="sm" loading={editLoading} loadingText="Saving…">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* ── Delete Dialog ── */}
      <DialogRoot open={!!deleteTarget} onOpenChange={d => { if (!d.open) setDeleteTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Teacher</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text>
                Are you sure you want to delete{' '}
                <Text as="span" fontWeight="bold">{deleteTarget?.name}</Text>?
                This action cannot be undone.
              </Text>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                colorPalette="red"
                size="sm"
                loading={deleteLoading}
                loadingText="Deleting…"
                onClick={handleDelete}
              >
                <FiTrash2 />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Box>
  )
}
