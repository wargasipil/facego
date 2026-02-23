import {
  Box,
  Badge,
  Button,
  Container,
  Heading,
  Text,
  Input,
  Flex,
  HStack,
  InputGroup,
  NativeSelectRoot,
  NativeSelectField,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  Spinner,
} from '@chakra-ui/react'
import { FiSearch, FiBook, FiX } from 'react-icons/fi'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Class } from '../../gen/classes/v1/classes_pb'
import { classService } from '../../services/class_service'
import { gradeService } from '../../services/grade_service'
import { teacherService } from '../../services/teacher_service'
import { studyProgramService } from '../../services/study_program_service'
import { StatCard } from '../../components/StatCard'
import {
  type ClassFormState,
  type ClassFormErrors,
  type GradeOption,
  type TeacherOption,
  type StudyProgramOption,
  EMPTY_CLASS_FORM,
  classFormErrors,
} from './components/ClassFormFields'
import { ClassAddDialog } from './components/ClassAddDialog'
import { ClassEditDialog } from './components/ClassEditDialog'
import { ClassDeleteDialog } from './components/ClassDeleteDialog'
import { ClassTable } from './components/ClassTable'
import { ClassPagination } from './components/ClassPagination'

type OnChange = (field: 'name' | 'description') => React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>

export default function ClassListPage() {
  const navigate = useNavigate()

  // ── server data ──
  const [classes, setClasses]       = useState<Class[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── filters (pending = in UI, applied = sent to server) ──
  const [pendingSearch, setPendingSearch]           = useState('')
  const [pendingGradeFilter, setPendingGradeFilter] = useState(0) // grade DB id, 0 = all
  const [appliedSearch, setAppliedSearch]           = useState('')
  const [appliedGradeFilter, setAppliedGradeFilter] = useState(0)

  // ── pagination ──
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ── reference data ──
  const [grades, setGrades]               = useState<GradeOption[]>([])
  const [teachers, setTeachers]           = useState<TeacherOption[]>([])
  const [studyPrograms, setStudyPrograms] = useState<StudyProgramOption[]>([])

  // ── add dialog ──
  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState<ClassFormState>(EMPTY_CLASS_FORM)
  const [addErrors, setAddErrors]   = useState<ClassFormErrors>({})
  const [addLoading, setAddLoading] = useState(false)

  // ── edit dialog ──
  const [editTarget, setEditTarget]   = useState<Class | null>(null)
  const [editForm, setEditForm]       = useState<ClassFormState>(EMPTY_CLASS_FORM)
  const [editErrors, setEditErrors]   = useState<ClassFormErrors>({})
  const [editLoading, setEditLoading] = useState(false)

  // ── delete dialog ──
  const [deleteTarget, setDeleteTarget]   = useState<Class | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── fetch classes (server-side) ──
  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    classService.listClasses({
      search: appliedSearch,
      gradeIdFilter: BigInt(appliedGradeFilter),
      page,
      pageSize,
    })
      .then(r => { setClasses(r.classes); setTotal(r.total) })
      .catch(err => setFetchError((err as Error).message ?? 'Failed to load classes'))
      .finally(() => setLoading(false))
  }, [appliedSearch, appliedGradeFilter, page, pageSize])

  // ── fetch reference data once ──
  useEffect(() => {
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

  // ── pagination derived ──
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd   = Math.min(page * pageSize, total)

  const pageNumbers = useMemo(() => {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end   = Math.min(totalPages, page + delta)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  // ── filter handlers ──
  const hasChangedFilter = pendingSearch !== appliedSearch || pendingGradeFilter !== appliedGradeFilter
  const hasActiveFilter  = !!appliedSearch || appliedGradeFilter > 0

  const handleApplyFilter = () => {
    setAppliedSearch(pendingSearch)
    setAppliedGradeFilter(pendingGradeFilter)
    setPage(1)
  }

  const handleClearFilter = () => {
    setPendingSearch('')
    setPendingGradeFilter(0)
    setAppliedSearch('')
    setAppliedGradeFilter(0)
    setPage(1)
  }

  const makeOnChange = (
    setter: React.Dispatch<React.SetStateAction<ClassFormState>>,
    errSetter: React.Dispatch<React.SetStateAction<ClassFormErrors>>,
  ): OnChange =>
    field => e => {
      setter(f => ({ ...f, [field]: e.target.value }))
      errSetter(er => ({ ...er, [field]: undefined }))
    }

  const makeOnGradeChange = (
    setter: React.Dispatch<React.SetStateAction<ClassFormState>>,
    errSetter: React.Dispatch<React.SetStateAction<ClassFormErrors>>,
  ) =>
    (id: number) => {
      setter(f => ({ ...f, gradeId: id }))
      errSetter(er => ({ ...er, gradeId: undefined }))
    }

  const makeOnTeacherChange = (
    setter: React.Dispatch<React.SetStateAction<ClassFormState>>,
    errSetter: React.Dispatch<React.SetStateAction<ClassFormErrors>>,
  ) =>
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
      await classService.createClass({
        name: addForm.name.trim(),
        gradeId: BigInt(addForm.gradeId),
        teacherId: BigInt(addForm.teacherId),
        description: addForm.description.trim(),
        studyProgramId: BigInt(addForm.studyProgramId),
      })
      setAddForm(EMPTY_CLASS_FORM)
      setAddErrors({})
      setAddOpen(false)
      // refresh current page
      setLoading(true)
      classService.listClasses({ search: appliedSearch, gradeIdFilter: BigInt(appliedGradeFilter), page, pageSize })
        .then(r => { setClasses(r.classes); setTotal(r.total) })
        .catch(() => {})
        .finally(() => setLoading(false))
    } catch (err: unknown) {
      setAddErrors({ name: (err as Error).message ?? 'Save failed' })
    } finally {
      setAddLoading(false)
    }
  }

  // ── edit ─────────────────────────────────────────────────────────────────────
  const openEdit = (cls: Class) => {
    setEditTarget(cls)
    setEditForm({
      name: cls.name,
      gradeId: Number(cls.gradeId),
      teacherId: Number(cls.teacherId),
      description: cls.description,
      studyProgramId: Number(cls.studyProgramId),
    })
    setEditErrors({})
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = classFormErrors(editForm)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setEditLoading(true)
    try {
      const updated = (await classService.updateClass({
        id: editTarget!.id,
        name: editForm.name.trim(),
        gradeId: BigInt(editForm.gradeId),
        teacherId: BigInt(editForm.teacherId),
        description: editForm.description.trim(),
        studyProgramId: BigInt(editForm.studyProgramId),
      })).class!
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
      setDeleteTarget(null)
      const newTotal = total - 1
      const maxPage  = Math.max(1, Math.ceil(newTotal / pageSize))
      const nextPage = Math.min(page, maxPage)
      if (nextPage !== page) {
        setPage(nextPage)
      } else {
        setLoading(true)
        classService.listClasses({ search: appliedSearch, gradeIdFilter: BigInt(appliedGradeFilter), page: nextPage, pageSize })
          .then(r => { setClasses(r.classes); setTotal(r.total) })
          .catch(() => {})
          .finally(() => setLoading(false))
      }
    } catch (err: unknown) {
      console.error('Delete failed:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Box bg="gray.50" minH="100vh" py={6}>
      <Container maxW="container.xl">

        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading size="lg">Manage Classes</Heading>
            <Text color="gray.500" mt={1}>Create, edit, and delete class records</Text>
          </Box>
          <ClassAddDialog
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
          <StatCard label="Total Classes"  value={total}                                      color="blue"   />
          <StatCard label="Total Students" value={classes.reduce((s, c) => s + c.studentCount, 0)} color="green"  />
          <StatCard label="Grades"         value={new Set(classes.map(c => c.gradeId)).size}  color="purple" />
        </HStack>

        {/* Error banner */}
        {fetchError && (
          <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
            <Text color="red.600" fontSize="sm">{fetchError}</Text>
          </Box>
        )}

        {/* Table card */}
        <Box bg="white" borderRadius="xl" shadow="sm" border="1px solid" borderColor="gray.100" overflow="hidden">

          {/* Card header */}
          <Flex px={5} py={4} borderBottom="1px solid" borderColor="gray.100" justify="space-between" align="center">
            <Heading size="sm">All Classes</Heading>
            {total > 0 && (
              <Badge colorPalette="blue" variant="subtle" borderRadius="full" px={2}>{total}</Badge>
            )}
          </Flex>

          {/* Filters */}
          <Box px={5} py={3} borderBottom="1px solid" borderColor="gray.50">
            <HStack gap={2}>
              <NativeSelectRoot size="sm" w="160px">
                <NativeSelectField
                  value={pendingGradeFilter}
                  onChange={e => setPendingGradeFilter(Number(e.target.value))}
                >
                  <option value={0}>All Grades</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </NativeSelectField>
              </NativeSelectRoot>
              <InputGroup flex={1} startElement={<FiSearch color="gray" />}>
                <Input
                  placeholder="Search class / teacher…"
                  value={pendingSearch}
                  onChange={e => setPendingSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleApplyFilter() }}
                  size="sm"
                  borderRadius="md"
                />
              </InputGroup>
              <Button
                size="sm"
                colorPalette="blue"
                variant={hasChangedFilter ? 'solid' : 'outline'}
                flexShrink={0}
                onClick={handleApplyFilter}
              >
                Filter
              </Button>
              {hasActiveFilter && (
                <Button size="sm" variant="ghost" colorPalette="gray" flexShrink={0} onClick={handleClearFilter}>
                  <FiX />
                  Clear
                </Button>
              )}
            </HStack>
          </Box>

          {/* Table body */}
          {loading ? (
            <Flex justify="center" py={12}><Spinner /></Flex>
          ) : classes.length === 0 ? (
            <EmptyStateRoot>
              <EmptyStateContent py={12}>
                <EmptyStateIndicator><FiBook size={32} /></EmptyStateIndicator>
                <EmptyStateTitle>No classes found</EmptyStateTitle>
                <EmptyStateDescription>
                  {hasActiveFilter ? 'Try a different search or grade filter.' : 'Add your first class using the button above.'}
                </EmptyStateDescription>
              </EmptyStateContent>
            </EmptyStateRoot>
          ) : (
            <ClassTable
              classes={classes}
              onView={cls => navigate(`/classes/${cls.id}`)}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          )}

          {/* Pagination */}
          <ClassPagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            pageNumbers={pageNumbers}
            onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1) }}
          />
        </Box>
      </Container>

      <ClassEditDialog
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

      <ClassDeleteDialog
        target={deleteTarget}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
