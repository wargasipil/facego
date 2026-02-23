import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Input,
  Textarea,
  Flex,
  HStack,
  VStack,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  TableScrollArea,
  InputGroup,
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
  FiAward,
  FiBook,
  FiUsers,
} from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { type StudyProgram } from '../gen/study_programs/v1/study_programs_pb'
import { studyProgramService } from '../services/study_program_service'
import { StatCard } from '../components/StatCard'

interface FormState {
  name:        string
  code:        string
  description: string
}

const EMPTY_FORM: FormState = { name: '', code: '', description: '' }

function formToErrors(f: FormState): Partial<FormState> {
  const e: Partial<FormState> = {}
  if (!f.name.trim()) e.name = 'Name is required'
  return e
}

function StudyProgramFormFields({
  form,
  errors,
  onChange,
}: {
  form:     FormState
  errors:   Partial<FormState>
  onChange: (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
  return (
    <VStack gap={4}>
      <Field.Root invalid={!!errors.name} required>
        <Field.Label>Name <Field.RequiredIndicator /></Field.Label>
        <Input
          placeholder="e.g. Teknik Informatika"
          value={form.name}
          onChange={onChange('name')}
        />
        {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
      </Field.Root>

      <Field.Root>
        <Field.Label>Code</Field.Label>
        <Input
          placeholder="e.g. TI"
          value={form.code}
          onChange={onChange('code')}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Description</Field.Label>
        <Textarea
          placeholder="Optional description…"
          value={form.description}
          onChange={onChange('description')}
        />
      </Field.Root>
    </VStack>
  )
}

export default function StudyProgramPage() {
  const [programs, setPrograms]     = useState<StudyProgram[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch]         = useState('')

  // add
  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState<FormState>(EMPTY_FORM)
  const [addErrors, setAddErrors]   = useState<Partial<FormState>>({})
  const [addLoading, setAddLoading] = useState(false)

  // edit
  const [editTarget, setEditTarget]   = useState<StudyProgram | null>(null)
  const [editForm, setEditForm]       = useState<FormState>(EMPTY_FORM)
  const [editErrors, setEditErrors]   = useState<Partial<FormState>>({})
  const [editLoading, setEditLoading] = useState(false)

  // delete
  const [deleteTarget, setDeleteTarget]   = useState<StudyProgram | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    studyProgramService.listStudyPrograms({})
      .then(r => setPrograms(r.studyPrograms))
      .catch(err => setFetchError((err as Error).message ?? 'Failed to load study programs'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = programs.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  )

  const totalClasses  = programs.reduce((s, p) => s + p.classCount, 0)
  const totalStudents = programs.reduce((s, p) => s + p.studentCount, 0)

  const handleAddChange = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setAddForm(f => ({ ...f, [field]: e.target.value }))
      setAddErrors(er => ({ ...er, [field]: undefined }))
    }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = formToErrors(addForm)
    if (Object.keys(errs).length) { setAddErrors(errs); return }
    setAddLoading(true)
    try {
      const created = (await studyProgramService.createStudyProgram({
        name:        addForm.name.trim(),
        code:        addForm.code.trim(),
        description: addForm.description.trim(),
      })).studyProgram!
      setPrograms(ps => [created, ...ps])
      setAddForm(EMPTY_FORM)
      setAddErrors({})
      setAddOpen(false)
    } catch (err: unknown) {
      setAddErrors({ name: (err as Error).message ?? 'Save failed' })
    } finally {
      setAddLoading(false)
    }
  }

  const openEdit = (p: StudyProgram) => {
    setEditTarget(p)
    setEditForm({ name: p.name, code: p.code, description: p.description })
    setEditErrors({})
  }

  const handleEditChange = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setEditForm(f => ({ ...f, [field]: e.target.value }))
      setEditErrors(er => ({ ...er, [field]: undefined }))
    }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = formToErrors(editForm)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setEditLoading(true)
    try {
      const updated = (await studyProgramService.updateStudyProgram({
        id:          editTarget!.id,
        name:        editForm.name.trim(),
        code:        editForm.code.trim(),
        description: editForm.description.trim(),
      })).studyProgram!
      setPrograms(ps => ps.map(p => p.id === updated.id ? updated : p))
      setEditTarget(null)
    } catch (err: unknown) {
      setEditErrors({ name: (err as Error).message ?? 'Save failed' })
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await studyProgramService.deleteStudyProgram({ id: deleteTarget.id })
      setPrograms(ps => ps.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      console.error('Delete failed:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatDate = (ts?: { seconds: bigint }) =>
    ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  return (
    <Box py={6}>
      <Container maxW="container.xl">

        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading size="lg">Study Programs</Heading>
            <Text color="gray.500" mt={1}>Create, edit, and delete study programs</Text>
          </Box>

          <DialogRoot open={addOpen} onOpenChange={d => setAddOpen(d.open)}>
            <DialogTrigger asChild>
              <Button colorPalette="blue" size="sm">
                <FiPlus />
                Add Program
              </Button>
            </DialogTrigger>
            <DialogBackdrop />
            <DialogPositioner>
              <DialogContent>
                <form onSubmit={handleAdd}>
                  <DialogHeader>
                    <DialogTitle>Add New Study Program</DialogTitle>
                  </DialogHeader>
                  <DialogBody>
                    <StudyProgramFormFields form={addForm} errors={addErrors} onChange={handleAddChange} />
                  </DialogBody>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button type="submit" colorPalette="blue" size="sm" loading={addLoading} loadingText="Saving…">
                      Save Program
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </DialogPositioner>
          </DialogRoot>
        </Flex>

        {/* Stats */}
        <HStack gap={4} mb={8}>
          <StatCard label="Total Programs" value={programs.length} color="blue"   />
          <StatCard label="Total Classes"  value={totalClasses}    color="purple" />
          <StatCard label="Total Students" value={totalStudents}   color="green"  />
        </HStack>

        {/* Error banner */}
        {fetchError && (
          <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
            <Text color="red.600" fontSize="sm">{fetchError}</Text>
          </Box>
        )}

        {/* Table */}
        <Box bg="white" borderRadius="lg" shadow="sm" p={4}>
          <HStack mb={4} justify="space-between">
            <Heading size="sm">All Study Programs</Heading>
            <InputGroup maxW="260px" startElement={<FiSearch color="gray" />}>
              <Input
                placeholder="Search program…"
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
                <EmptyStateIndicator><FiAward size={32} /></EmptyStateIndicator>
                <EmptyStateTitle>No study programs found</EmptyStateTitle>
                <EmptyStateDescription>
                  {search ? 'Try a different search term.' : 'Add your first study program using the button above.'}
                </EmptyStateDescription>
              </EmptyStateContent>
            </EmptyStateRoot>
          ) : (
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Name</TableColumnHeader>
                    <TableColumnHeader>Code</TableColumnHeader>
                    <TableColumnHeader>Description</TableColumnHeader>
                    <TableColumnHeader>Classes</TableColumnHeader>
                    <TableColumnHeader>Students</TableColumnHeader>
                    <TableColumnHeader>Created</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={String(p.id)}>
                      <TableCell fontWeight="semibold">{p.name}</TableCell>
                      <TableCell color="gray.500">{p.code || '—'}</TableCell>
                      <TableCell color="gray.500" maxW="220px">
                        <Text truncate>{p.description || '—'}</Text>
                      </TableCell>
                      <TableCell>
                        <HStack gap={1}>
                          <FiBook size={12} color="#718096" />
                          <Text fontSize="sm">{p.classCount}</Text>
                        </HStack>
                      </TableCell>
                      <TableCell>
                        <HStack gap={1}>
                          <FiUsers size={12} color="#718096" />
                          <Text fontSize="sm">{p.studentCount}</Text>
                        </HStack>
                      </TableCell>
                      <TableCell color="gray.400" fontSize="xs">{formatDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <HStack gap={1} justify="flex-end">
                          <IconButton
                            aria-label="Edit program"
                            variant="ghost"
                            size="sm"
                            colorPalette="blue"
                            onClick={() => openEdit(p)}
                          >
                            <FiEdit2 />
                          </IconButton>
                          <IconButton
                            aria-label="Delete program"
                            variant="ghost"
                            size="sm"
                            colorPalette="red"
                            onClick={() => setDeleteTarget(p)}
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

      {/* Edit Dialog */}
      <DialogRoot open={!!editTarget} onOpenChange={d => { if (!d.open) setEditTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <form onSubmit={handleEdit}>
              <DialogHeader>
                <DialogTitle>Edit — {editTarget?.name}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <StudyProgramFormFields form={editForm} errors={editErrors} onChange={handleEditChange} />
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

      {/* Delete Confirm Dialog */}
      <DialogRoot open={!!deleteTarget} onOpenChange={d => { if (!d.open) setDeleteTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Study Program</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text>
                Are you sure you want to delete{' '}
                <Text as="span" fontWeight="bold">{deleteTarget?.name}</Text>?
                All associated classes and students will be unlinked. This cannot be undone.
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
