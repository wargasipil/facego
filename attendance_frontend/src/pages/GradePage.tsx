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
  Badge,
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
  FiLayers,
  FiBook,
  FiUsers,
} from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { type Grade } from '../gen/grades/v1/grades_pb'
import { gradeService } from '../services/grade_service'
import { StatCard } from '../components/StatCard'

interface FormState {
  level: string
  label: string
  description: string
}

const EMPTY_FORM: FormState = { level: '', label: '', description: '' }

function formToErrors(f: FormState): Partial<FormState> {
  const e: Partial<FormState> = {}
  if (!f.level.trim()) e.level = 'Grade level is required'
  if (!f.label.trim()) e.label = 'Grade label is required'
  return e
}

// ---- grade form fields (reused in add & edit) ----
function GradeFormFields({
  form,
  errors,
  onChange,
}: {
  form: FormState
  errors: Partial<FormState>
  onChange: (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
  return (
    <VStack gap={4}>
      <Field.Root invalid={!!errors.level} required>
        <Field.Label>Grade Level <Field.RequiredIndicator /></Field.Label>
        <Input
          placeholder="e.g. 10"
          value={form.level}
          onChange={onChange('level')}
          type="number"
          min={1}
          max={13}
        />
        {errors.level && <Field.ErrorText>{errors.level}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!errors.label} required>
        <Field.Label>Display Label <Field.RequiredIndicator /></Field.Label>
        <Input
          placeholder="e.g. Grade 10"
          value={form.label}
          onChange={onChange('label')}
        />
        {errors.label && <Field.ErrorText>{errors.label}</Field.ErrorText>}
      </Field.Root>

      <Field.Root>
        <Field.Label>Description</Field.Label>
        <Textarea
          placeholder="Optional notes about this grade…"
          value={form.description}
          onChange={onChange('description')}
        />
      </Field.Root>
    </VStack>
  )
}

// ---- main page ----
export default function GradePage() {
  const [grades, setGrades]         = useState<Grade[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch]         = useState('')

  // add
  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState<FormState>(EMPTY_FORM)
  const [addErrors, setAddErrors]   = useState<Partial<FormState>>({})
  const [addLoading, setAddLoading] = useState(false)

  // edit
  const [editTarget, setEditTarget]   = useState<Grade | null>(null)
  const [editForm, setEditForm]       = useState<FormState>(EMPTY_FORM)
  const [editErrors, setEditErrors]   = useState<Partial<FormState>>({})
  const [editLoading, setEditLoading] = useState(false)

  // delete
  const [deleteTarget, setDeleteTarget]   = useState<Grade | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ---- initial load ----
  useEffect(() => {
    gradeService.listGrades({})
      .then(r => setGrades(r.grades))
      .catch(err => setFetchError((err as Error).message ?? 'Failed to load grades'))
      .finally(() => setLoading(false))
  }, [])

  // ---- derived ----
  const filtered = grades.filter(g =>
    g.label.toLowerCase().includes(search.toLowerCase()) ||
    g.level.includes(search) ||
    (g.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalClasses  = grades.reduce((s, g) => s + g.classCount, 0)
  const totalStudents = grades.reduce((s, g) => s + g.studentCount, 0)

  // ---- add ----
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
      const created = (await gradeService.createGrade({
        level: addForm.level.trim(),
        label: addForm.label.trim(),
        description: addForm.description.trim(),
      })).grade!
      setGrades(gs => [created, ...gs])
      setAddForm(EMPTY_FORM)
      setAddErrors({})
      setAddOpen(false)
    } catch (err: unknown) {
      setAddErrors({ level: (err as Error).message ?? 'Save failed' })
    } finally {
      setAddLoading(false)
    }
  }

  // ---- edit ----
  const openEdit = (g: Grade) => {
    setEditTarget(g)
    setEditForm({ level: g.level, label: g.label, description: g.description ?? '' })
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
      const updated = (await gradeService.updateGrade({
        id: editTarget!.id,
        level: editForm.level.trim(),
        label: editForm.label.trim(),
        description: editForm.description.trim(),
      })).grade!
      setGrades(gs => gs.map(g => g.id === updated.id ? updated : g))
      setEditTarget(null)
    } catch (err: unknown) {
      setEditErrors({ level: (err as Error).message ?? 'Save failed' })
    } finally {
      setEditLoading(false)
    }
  }

  // ---- delete ----
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await gradeService.deleteGrade({ id: deleteTarget.id })
      setGrades(gs => gs.filter(g => g.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      console.error('Delete failed:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatDate = (ts?: { seconds: bigint }) =>
    ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  // ---- render ----
  return (
    <Box py={6}>
      <Container maxW="container.xl">

        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading size="lg">Manage Grades</Heading>
            <Text color="gray.500" mt={1}>Create, edit, and delete grade levels</Text>
          </Box>

          {/* Add Dialog */}
          <DialogRoot open={addOpen} onOpenChange={d => setAddOpen(d.open)}>
            <DialogTrigger asChild>
              <Button colorPalette="blue" size="sm">
                <FiPlus />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogBackdrop />
            <DialogPositioner>
              <DialogContent>
                <form onSubmit={handleAdd}>
                  <DialogHeader>
                    <DialogTitle>Add New Grade</DialogTitle>
                  </DialogHeader>
                  <DialogBody>
                    <GradeFormFields form={addForm} errors={addErrors} onChange={handleAddChange} />
                  </DialogBody>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button type="submit" colorPalette="blue" size="sm" loading={addLoading} loadingText="Saving…">
                      Save Grade
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </DialogPositioner>
          </DialogRoot>
        </Flex>

        {/* Stats */}
        <HStack gap={4} mb={8}>
          <StatCard label="Total Grades"   value={grades.length}  color="blue"   />
          <StatCard label="Total Classes"  value={totalClasses}   color="purple" />
          <StatCard label="Total Students" value={totalStudents}  color="green"  />
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
            <Heading size="sm">All Grades</Heading>
            <InputGroup maxW="260px" startElement={<FiSearch color="gray" />}>
              <Input
                placeholder="Search grade…"
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
                <EmptyStateIndicator><FiLayers size={32} /></EmptyStateIndicator>
                <EmptyStateTitle>No grades found</EmptyStateTitle>
                <EmptyStateDescription>
                  {search ? 'Try a different search term.' : 'Add your first grade using the button above.'}
                </EmptyStateDescription>
              </EmptyStateContent>
            </EmptyStateRoot>
          ) : (
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Level</TableColumnHeader>
                    <TableColumnHeader>Label</TableColumnHeader>
                    <TableColumnHeader>Description</TableColumnHeader>
                    <TableColumnHeader>Classes</TableColumnHeader>
                    <TableColumnHeader>Students</TableColumnHeader>
                    <TableColumnHeader>Created</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered
                    .slice()
                    .sort((a, b) => Number(a.level) - Number(b.level))
                    .map(g => (
                      <TableRow key={String(g.id)}>
                        <TableCell>
                          <Badge colorPalette="blue" variant="solid" size="sm">
                            {g.level}
                          </Badge>
                        </TableCell>
                        <TableCell fontWeight="semibold">{g.label}</TableCell>
                        <TableCell color="gray.500" maxW="220px">
                          <Text truncate>{g.description || '—'}</Text>
                        </TableCell>
                        <TableCell>
                          <HStack gap={1}>
                            <FiBook size={12} color="#718096" />
                            <Text fontSize="sm">{g.classCount}</Text>
                          </HStack>
                        </TableCell>
                        <TableCell>
                          <HStack gap={1}>
                            <FiUsers size={12} color="#718096" />
                            <Text fontSize="sm">{g.studentCount}</Text>
                          </HStack>
                        </TableCell>
                        <TableCell color="gray.400" fontSize="xs">{formatDate(g.createdAt)}</TableCell>
                        <TableCell>
                          <HStack gap={1} justify="flex-end">
                            <IconButton
                              aria-label="Edit grade"
                              variant="ghost"
                              size="sm"
                              colorPalette="blue"
                              onClick={() => openEdit(g)}
                            >
                              <FiEdit2 />
                            </IconButton>
                            <IconButton
                              aria-label="Delete grade"
                              variant="ghost"
                              size="sm"
                              colorPalette="red"
                              onClick={() => setDeleteTarget(g)}
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
                <DialogTitle>Edit — {editTarget?.label}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <GradeFormFields form={editForm} errors={editErrors} onChange={handleEditChange} />
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
              <DialogTitle>Delete Grade</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text>
                Are you sure you want to delete{' '}
                <Text as="span" fontWeight="bold">{deleteTarget?.label}</Text>?
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
