import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Input,
  Flex,
  HStack,
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
  IconButton,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  Spinner,
} from '@chakra-ui/react'
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiBook, FiUsers, FiEye } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Class } from '../gen/classes/v1/classes_pb'
import { classService } from '../services/class_service'
import { gradeService } from '../services/grade_service'
import { teacherService } from '../services/teacher_service'
import { studyProgramService } from '../services/study_program_service'
import { StatCard } from '../components/StatCard'
import {
  ClassFormFields,
  type ClassFormState,
  type ClassFormErrors,
  type GradeOption,
  type TeacherOption,
  type StudyProgramOption,
  EMPTY_CLASS_FORM,
  classFormErrors,
} from '../components/class/ClassFormFields'

// ── Types ─────────────────────────────────────────────────────────────────────

type OnChange = (field: 'name' | 'description') => React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>

// ── Add Dialog ────────────────────────────────────────────────────────────────

interface AddClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: ClassFormState
  errors: ClassFormErrors
  onChange: OnChange
  onGradeChange: (id: number) => void
  onTeacherChange: (id: number) => void
  onStudyProgramChange: (id: number) => void
  grades: GradeOption[]
  teachers: TeacherOption[]
  studyPrograms: StudyProgramOption[]
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
}

function AddClassDialog({ open, onOpenChange, form, errors, onChange, onGradeChange, onTeacherChange, onStudyProgramChange, grades, teachers, studyPrograms, loading, onSubmit }: AddClassDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={d => onOpenChange(d.open)}>
      <DialogTrigger asChild>
        <Button colorPalette="blue" size="sm">
          <FiPlus /> Add Class
        </Button>
      </DialogTrigger>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <ClassFormFields form={form} errors={errors} onChange={onChange} onGradeChange={onGradeChange} onTeacherChange={onTeacherChange} onStudyProgramChange={onStudyProgramChange} grades={grades} teachers={teachers} studyPrograms={studyPrograms} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" colorPalette="blue" size="sm" loading={loading} loadingText="Saving…">
                Save Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

interface EditClassDialogProps {
  target: Class | null
  form: ClassFormState
  errors: ClassFormErrors
  onChange: OnChange
  onGradeChange: (id: number) => void
  onTeacherChange: (id: number) => void
  onStudyProgramChange: (id: number) => void
  grades: GradeOption[]
  teachers: TeacherOption[]
  studyPrograms: StudyProgramOption[]
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

function EditClassDialog({ target, form, errors, onChange, onGradeChange, onTeacherChange, onStudyProgramChange, grades, teachers, studyPrograms, loading, onSubmit, onClose }: EditClassDialogProps) {
  return (
    <DialogRoot open={!!target} onOpenChange={d => { if (!d.open) onClose() }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Class — {target?.name}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <ClassFormFields form={form} errors={errors} onChange={onChange} onGradeChange={onGradeChange} onTeacherChange={onTeacherChange} onStudyProgramChange={onStudyProgramChange} grades={grades} teachers={teachers} studyPrograms={studyPrograms} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" colorPalette="blue" size="sm" loading={loading} loadingText="Saving…">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}

// ── Delete Dialog ─────────────────────────────────────────────────────────────

interface DeleteClassDialogProps {
  target: Class | null
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}

function DeleteClassDialog({ target, loading, onConfirm, onClose }: DeleteClassDialogProps) {
  return (
    <DialogRoot open={!!target} onOpenChange={d => { if (!d.open) onClose() }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text>
              Are you sure you want to delete{' '}
              <Text as="span" fontWeight="bold">{target?.name}</Text>?
              This action cannot be undone.
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button colorPalette="red" size="sm" loading={loading} loadingText="Deleting…" onClick={onConfirm}>
              <FiTrash2 /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}

// ── Class Table ───────────────────────────────────────────────────────────────

interface ClassTableProps {
  classes: Class[]
  onView: (cls: Class) => void
  onEdit: (cls: Class) => void
  onDelete: (cls: Class) => void
}

function ClassTable({ classes, onView, onEdit, onDelete }: ClassTableProps) {
  const formatDate = (ts?: { seconds: bigint }) =>
    ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  return (
    <TableScrollArea>
      <TableRoot size="sm">
        <TableHeader>
          <TableRow>
            <TableColumnHeader>Class</TableColumnHeader>
            <TableColumnHeader>Grade</TableColumnHeader>
            <TableColumnHeader>Teacher</TableColumnHeader>
            <TableColumnHeader>Students</TableColumnHeader>
            <TableColumnHeader>Description</TableColumnHeader>
            <TableColumnHeader>Created</TableColumnHeader>
            <TableColumnHeader textAlign="right">Actions</TableColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map(cls => (
            <TableRow key={String(cls.id)}>
              <TableCell fontWeight="semibold">{cls.name}</TableCell>
              <TableCell>
                <Badge colorPalette="purple" variant="subtle">Grade {cls.grade?.level ?? '—'}</Badge>
              </TableCell>
              <TableCell>{cls.teacher?.name ?? '—'}</TableCell>
              <TableCell>
                <HStack gap={1}>
                  <FiUsers size={12} color="#718096" />
                  <Text fontSize="sm">{cls.studentCount}</Text>
                </HStack>
              </TableCell>
              <TableCell color="gray.500" maxW="180px">
                <Text truncate>{cls.description || '—'}</Text>
              </TableCell>
              <TableCell color="gray.400" fontSize="xs">{formatDate(cls.createdAt)}</TableCell>
              <TableCell>
                <HStack gap={1} justify="flex-end">
                  <IconButton aria-label="View class" variant="ghost" size="sm" colorPalette="teal" onClick={() => onView(cls)}>
                    <FiEye />
                  </IconButton>
                  <IconButton aria-label="Edit class" variant="ghost" size="sm" colorPalette="blue" onClick={() => onEdit(cls)}>
                    <FiEdit2 />
                  </IconButton>
                  <IconButton aria-label="Delete class" variant="ghost" size="sm" colorPalette="red" onClick={() => onDelete(cls)}>
                    <FiTrash2 />
                  </IconButton>
                </HStack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableRoot>
    </TableScrollArea>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClassPage() {
  const navigate = useNavigate()
  const [classes, setClasses]       = useState<Class[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [grades, setGrades]             = useState<GradeOption[]>([])
  const [teachers, setTeachers]         = useState<TeacherOption[]>([])
  const [studyPrograms, setStudyPrograms] = useState<StudyProgramOption[]>([])

  // add dialog state
  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState<ClassFormState>(EMPTY_CLASS_FORM)
  const [addErrors, setAddErrors]   = useState<ClassFormErrors>({})
  const [addLoading, setAddLoading] = useState(false)

  // edit dialog state
  const [editTarget, setEditTarget]   = useState<Class | null>(null)
  const [editForm, setEditForm]       = useState<ClassFormState>(EMPTY_CLASS_FORM)
  const [editErrors, setEditErrors]   = useState<ClassFormErrors>({})
  const [editLoading, setEditLoading] = useState(false)

  // delete dialog state
  const [deleteTarget, setDeleteTarget]   = useState<Class | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    classService.listClasses({})
      .then(r => setClasses(r.classes))
      .catch(err => setFetchError((err as Error).message ?? 'Failed to load classes'))
      .finally(() => setLoading(false))
    gradeService.listGrades({})
      .then(r => setGrades(r.grades.map(g => ({ id: Number(g.id), level: g.level, label: g.label }))))
      .catch(() => {})
    teacherService.listTeachers({})
      .then(r => setTeachers(r.teachers.map(t => ({ id: Number(t.id), name: t.name, teacher_id: t.teacherId, subject: t.subject }))))
      .catch(() => {})
    studyProgramService.listStudyPrograms({})
      .then(r => setStudyPrograms(r.studyPrograms.map(sp => ({ id: Number(sp.id), name: sp.name, code: sp.code }))))
      .catch(() => {})
  }, [])

  const filtered = classes.filter(c => {
    const sl = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(sl) ||
      (c.teacher?.name ?? '').toLowerCase().includes(sl) ||
      (c.grade?.level ?? '').includes(search)
    )
  })

  const makeOnChange = (setter: React.Dispatch<React.SetStateAction<ClassFormState>>, errSetter: React.Dispatch<React.SetStateAction<ClassFormErrors>>): OnChange =>
    field => e => {
      setter(f => ({ ...f, [field]: e.target.value }))
      errSetter(er => ({ ...er, [field]: undefined }))
    }

  const makeOnGradeChange = (setter: React.Dispatch<React.SetStateAction<ClassFormState>>, errSetter: React.Dispatch<React.SetStateAction<ClassFormErrors>>) =>
    (id: number) => {
      setter(f => ({ ...f, gradeId: id }))
      errSetter(er => ({ ...er, gradeId: undefined }))
    }

  const makeOnTeacherChange = (setter: React.Dispatch<React.SetStateAction<ClassFormState>>, errSetter: React.Dispatch<React.SetStateAction<ClassFormErrors>>) =>
    (id: number) => {
      setter(f => ({ ...f, teacherId: id }))
      errSetter(er => ({ ...er, teacherId: undefined }))
    }

  const makeOnStudyProgramChange = (setter: React.Dispatch<React.SetStateAction<ClassFormState>>) =>
    (id: number) => setter(f => ({ ...f, studyProgramId: id }))

  // ── add ──────────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = classFormErrors(addForm)
    if (Object.keys(errs).length) { setAddErrors(errs); return }
    setAddLoading(true)
    try {
      const created = (await classService.createClass({ name: addForm.name.trim(), gradeId: BigInt(addForm.gradeId), teacherId: BigInt(addForm.teacherId), description: addForm.description.trim(), studyProgramId: BigInt(addForm.studyProgramId) })).class!
      setClasses(cs => [created, ...cs])
      setAddForm(EMPTY_CLASS_FORM)
      setAddErrors({})
      setAddOpen(false)
    } catch (err: unknown) {
      setAddErrors({ name: (err as Error).message ?? 'Save failed' })
    } finally {
      setAddLoading(false)
    }
  }

  // ── edit ─────────────────────────────────────────────────────────────────────
  const openEdit = (cls: Class) => {
    setEditTarget(cls)
    setEditForm({ name: cls.name, gradeId: Number(cls.gradeId), teacherId: Number(cls.teacherId), description: cls.description, studyProgramId: Number(cls.studyProgramId) })
    setEditErrors({})
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = classFormErrors(editForm)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setEditLoading(true)
    try {
      const updated = (await classService.updateClass({ id: editTarget!.id, name: editForm.name.trim(), gradeId: BigInt(editForm.gradeId), teacherId: BigInt(editForm.teacherId), description: editForm.description.trim(), studyProgramId: BigInt(editForm.studyProgramId) })).class!
      setClasses(cs => cs.map(c => c.id === updated.id ? updated : c))
      setEditTarget(null)
    } catch (err: unknown) {
      setEditErrors({ name: (err as Error).message ?? 'Save failed' })
    } finally {
      setEditLoading(false)
    }
  }

  // ── delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await classService.deleteClass({ id: deleteTarget.id })
      setClasses(cs => cs.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      console.error('Delete failed:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0)
  const uniqueGrades  = new Set(classes.map(c => c.gradeId)).size

  return (
    <Box py={6}>
      <Container maxW="container.xl">

        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading size="lg">Manage Classes</Heading>
            <Text color="gray.500" mt={1}>Create, edit, and delete class records</Text>
          </Box>
          <AddClassDialog
            open={addOpen}
            onOpenChange={open => { setAddOpen(open); if (!open) { setAddForm(EMPTY_CLASS_FORM); setAddErrors({}) } }}
            form={addForm}
            errors={addErrors}
            onChange={makeOnChange(setAddForm, setAddErrors)}
            onGradeChange={makeOnGradeChange(setAddForm, setAddErrors)}
            onTeacherChange={makeOnTeacherChange(setAddForm, setAddErrors)}
            onStudyProgramChange={makeOnStudyProgramChange(setAddForm)}
            grades={grades}
            teachers={teachers}
            studyPrograms={studyPrograms}
            loading={addLoading}
            onSubmit={handleAdd}
          />
        </Flex>

        {/* Stats */}
        <HStack gap={4} mb={8}>
          <StatCard label="Total Classes"  value={classes.length} color="blue"   />
          <StatCard label="Total Students" value={totalStudents}  color="green"  />
          <StatCard label="Grades"         value={uniqueGrades}   color="purple" />
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
            <Heading size="sm">All Classes</Heading>
            <InputGroup maxW="260px" startElement={<FiSearch color="gray" />}>
              <Input
                placeholder="Search class / teacher…"
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
                <EmptyStateIndicator><FiBook size={32} /></EmptyStateIndicator>
                <EmptyStateTitle>No classes found</EmptyStateTitle>
                <EmptyStateDescription>
                  {search ? 'Try a different search term.' : 'Add your first class using the button above.'}
                </EmptyStateDescription>
              </EmptyStateContent>
            </EmptyStateRoot>
          ) : (
            <ClassTable classes={filtered} onView={cls => navigate(`/classes/${cls.id}`)} onEdit={openEdit} onDelete={setDeleteTarget} />
          )}
        </Box>
      </Container>

      <EditClassDialog
        target={editTarget}
        form={editForm}
        errors={editErrors}
        onChange={makeOnChange(setEditForm, setEditErrors)}
        onGradeChange={makeOnGradeChange(setEditForm, setEditErrors)}
        onTeacherChange={makeOnTeacherChange(setEditForm, setEditErrors)}
        onStudyProgramChange={makeOnStudyProgramChange(setEditForm)}
        grades={grades}
        teachers={teachers}
        studyPrograms={studyPrograms}
        loading={editLoading}
        onSubmit={handleEdit}
        onClose={() => setEditTarget(null)}
      />

      <DeleteClassDialog
        target={deleteTarget}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
