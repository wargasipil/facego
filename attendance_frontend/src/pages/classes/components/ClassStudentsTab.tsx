import {
  Box,
  Button,
  Flex,
  HStack,
  VStack,
  Badge,
  Heading,
  Text,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  TableScrollArea,
  AvatarRoot,
  AvatarFallback,
  AvatarImage,
  IconButton,
  Input,
  InputGroup,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  Spinner,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Checkbox,
} from '@chakra-ui/react'
import {
  FiUsers,
  FiCalendar,
  FiUser,
  FiUserPlus,
  FiUserMinus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { type User } from '../../../gen/users/v1/users_pb'
import { classService } from '../../../services/class_service'
import { userService } from '../../../services/user_service'
import { ClassPagination } from './ClassPagination'

const formatDate = (ts?: { seconds: bigint }) =>
  ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

interface Props {
  classId: bigint
  className: string
  onTotalChange: (n: number) => void
}

export function ClassStudentsTab({ classId, className, onTotalChange }: Props) {
  const navigate = useNavigate()

  // ── pagination ──
  const [students, setStudents]               = useState<User[]>([])
  const [studentTotal, setStudentTotal]       = useState(0)
  const [studentPage, setStudentPage]         = useState(1)
  const [studentPageSize, setStudentPageSize] = useState(10)
  const [studentLoading, setStudentLoading]   = useState(false)
  const [pendingSearch, setPendingSearch]     = useState('')
  const [appliedSearch, setAppliedSearch]     = useState('')

  // ── remove ──
  const [removeTarget, setRemoveTarget]   = useState<User | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // ── add dialog ──
  const [addOpen, setAddOpen]         = useState(false)
  const [allStudents, setAllStudents] = useState<User[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [addSearch, setAddSearch]     = useState('')
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [addLoading, setAddLoading]   = useState(false)
  const [addFetching, setAddFetching] = useState(false)

  const loadStudents = useCallback(async (p: number, ps: number, search: string) => {
    setStudentLoading(true)
    try {
      const r = await classService.listClassStudents({ id: classId, search, page: p, pageSize: ps })
      setStudents(r.students)
      setStudentTotal(r.total)
      onTotalChange(r.total)
    } catch {}
    finally { setStudentLoading(false) }
  }, [classId, onTotalChange])

  useEffect(() => {
    loadStudents(studentPage, studentPageSize, appliedSearch)
  }, [appliedSearch, studentPage, studentPageSize, loadStudents])

  // ── pagination derived ──
  const studentTotalPages  = Math.max(1, Math.ceil(studentTotal / studentPageSize))
  const studentRangeStart  = studentTotal === 0 ? 0 : (studentPage - 1) * studentPageSize + 1
  const studentRangeEnd    = Math.min(studentPage * studentPageSize, studentTotal)
  const studentPageNumbers = useMemo(() => {
    const delta = 2
    const start = Math.max(1, studentPage - delta)
    const end   = Math.min(studentTotalPages, studentPage + delta)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [studentPage, studentTotalPages])

  const hasChangedSearch = pendingSearch !== appliedSearch
  const hasActiveSearch  = !!appliedSearch

  const handleApply = () => { setAppliedSearch(pendingSearch); setStudentPage(1) }
  const handleClear = () => { setPendingSearch(''); setAppliedSearch(''); setStudentPage(1) }

  // ── remove ──
  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      await classService.unenrollStudent({ classId, userId: removeTarget.id })
      setRemoveTarget(null)
      const newTotal = studentTotal - 1
      const maxPage  = Math.max(1, Math.ceil(newTotal / studentPageSize))
      const nextPage = Math.min(studentPage, maxPage)
      if (nextPage !== studentPage) setStudentPage(nextPage)
      else loadStudents(nextPage, studentPageSize, appliedSearch)
    } catch {}
    finally { setRemoveLoading(false) }
  }

  // ── add dialog ──
  const openAddDialog = async () => {
    setAddOpen(true); setAddSearch(''); setSelected(new Set()); setAddFetching(true)
    try {
      const [allR, enrolledR] = await Promise.all([
        userService.listUsers({ filter: {}, pageSize: 200 }),
        classService.listClassStudents({ id: classId, pageSize: 1000 }),
      ])
      setAllStudents(allR.users)
      setEnrolledIds(new Set(enrolledR.students.map(s => String(s.id))))
    } catch {}
    finally { setAddFetching(false) }
  }

  const candidates = allStudents.filter(s =>
    !enrolledIds.has(String(s.id)) &&
    (s.name.toLowerCase().includes(addSearch.toLowerCase()) ||
     s.studentId.toLowerCase().includes(addSearch.toLowerCase()) ||
     (s.className && s.className.toLowerCase().includes(addSearch.toLowerCase())))
  )

  const toggleSelect = (sid: string) =>
    setSelected(prev => { const next = new Set(prev); next.has(sid) ? next.delete(sid) : next.add(sid); return next })

  const handleAdd = async () => {
    if (selected.size === 0) return
    setAddLoading(true)
    try {
      const toAdd = allStudents.filter(s => selected.has(String(s.id)))
      await Promise.all(toAdd.map(s => classService.enrollStudent({ classId, userId: s.id })))
      setAddOpen(false)
      setStudentPage(1)
      loadStudents(1, studentPageSize, appliedSearch)
    } catch {}
    finally { setAddLoading(false) }
  }

  return (
    <>
      <Box bg="white" borderRadius="lg" shadow="sm" overflow="hidden">

        {/* Header */}
        <Flex px={5} py={4} borderBottom="1px solid" borderColor="gray.100" justify="space-between" align="center">
          <HStack gap={2}>
            <FiUsers size={15} />
            <Heading size="sm">Students</Heading>
            {studentTotal > 0 && (
              <Badge colorPalette="blue" variant="subtle" borderRadius="full" px={2}>{studentTotal}</Badge>
            )}
          </HStack>
          <Button size="sm" colorPalette="blue" onClick={openAddDialog}>
            <FiUserPlus />
            Add Student
          </Button>
        </Flex>

        {/* Filter bar */}
        <Box px={5} py={3} borderBottom="1px solid" borderColor="gray.50">
          <HStack gap={2}>
            <InputGroup flex={1} startElement={<FiSearch color="gray" />}>
              <Input
                placeholder="Search by name or ID…"
                value={pendingSearch}
                onChange={e => setPendingSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleApply() }}
                size="sm"
                borderRadius="md"
              />
            </InputGroup>
            <Button size="sm" colorPalette="blue" variant={hasChangedSearch ? 'solid' : 'outline'} flexShrink={0} onClick={handleApply}>
              Filter
            </Button>
            {hasActiveSearch && (
              <Button size="sm" variant="ghost" colorPalette="gray" flexShrink={0} onClick={handleClear}>
                <FiX />
                Clear
              </Button>
            )}
          </HStack>
        </Box>

        {/* Table */}
        {studentLoading ? (
          <Flex justify="center" py={12}><Spinner /></Flex>
        ) : students.length === 0 ? (
          <EmptyStateRoot>
            <EmptyStateContent py={10}>
              <EmptyStateIndicator><FiUser size={32} /></EmptyStateIndicator>
              <EmptyStateTitle>No students</EmptyStateTitle>
              <EmptyStateDescription>
                {appliedSearch ? 'Try a different search.' : 'Click "Add Student" to assign students to this class.'}
              </EmptyStateDescription>
            </EmptyStateContent>
          </EmptyStateRoot>
        ) : (
          <TableScrollArea>
            <TableRoot size="sm">
              <TableHeader>
                <TableRow bg="gray.50">
                  <TableColumnHeader ps={5} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Student</TableColumnHeader>
                  <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Student ID</TableColumnHeader>
                  <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Parent / Guardian</TableColumnHeader>
                  <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Registered</TableColumnHeader>
                  <TableColumnHeader textAlign="right" pe={5} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Actions</TableColumnHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={String(s.id)} _hover={{ bg: 'blue.50' }} transition="background 0.1s">
                    <TableCell ps={5} py={3}>
                      <HStack gap={3}>
                        <AvatarRoot size="sm" borderRadius="md">
                          {s.photoUrl && <AvatarImage src={s.photoUrl} />}
                          <AvatarFallback bg="blue.100" color="blue.700" fontWeight="semibold" fontSize="xs">
                            {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </AvatarRoot>
                        <Box>
                          <Text fontWeight="medium" fontSize="sm">{s.name}</Text>
                          {s.email && <Text fontSize="xs" color="gray.400">{s.email}</Text>}
                        </Box>
                      </HStack>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" size="sm" fontFamily="mono">{s.studentId}</Badge>
                    </TableCell>
                    <TableCell>
                      {s.parentName ? (
                        <Box>
                          <Text fontSize="sm">{s.parentName}</Text>
                          {s.parentPhone && <Text fontSize="xs" color="gray.400">{s.parentPhone}</Text>}
                        </Box>
                      ) : (
                        <Text fontSize="xs" color="gray.300">—</Text>
                      )}
                    </TableCell>
                    <TableCell color="gray.400" fontSize="xs">{formatDate(s.registeredAt)}</TableCell>
                    <TableCell pe={5}>
                      <HStack gap={1} justify="flex-end">
                        <IconButton
                          aria-label="View attendance"
                          variant="ghost" size="sm" colorPalette="teal"
                          onClick={() => navigate(`/students/${s.id}/attendance`)}
                        >
                          <FiCalendar />
                        </IconButton>
                        <IconButton
                          aria-label="Remove from class"
                          variant="ghost" size="sm" colorPalette="red"
                          onClick={() => setRemoveTarget(s)}
                        >
                          <FiUserMinus />
                        </IconButton>
                      </HStack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableRoot>
          </TableScrollArea>
        )}

        {/* Pagination */}
        <ClassPagination
          page={studentPage}
          pageSize={studentPageSize}
          total={studentTotal}
          totalPages={studentTotalPages}
          rangeStart={studentRangeStart}
          rangeEnd={studentRangeEnd}
          pageNumbers={studentPageNumbers}
          onPageChange={setStudentPage}
          onPageSizeChange={s => { setStudentPageSize(s); setStudentPage(1) }}
        />
      </Box>

      {/* Remove confirm dialog */}
      <DialogRoot open={!!removeTarget} onOpenChange={d => { if (!d.open) setRemoveTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader><DialogTitle>Remove Student from Class</DialogTitle></DialogHeader>
            <DialogBody>
              <Text>
                Remove <Text as="span" fontWeight="bold">{removeTarget?.name}</Text> from{' '}
                <Text as="span" fontWeight="bold">{className}</Text>?
              </Text>
              <Text fontSize="sm" color="gray.500" mt={2}>
                The student's record is kept — they just won't be assigned to this class anymore.
              </Text>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button colorPalette="red" size="sm" loading={removeLoading} onClick={handleRemove}>
                <FiUserMinus /> Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* Add students dialog */}
      <DialogRoot open={addOpen} onOpenChange={d => { if (!d.open) setAddOpen(false) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="520px">
            <DialogHeader><DialogTitle>Add Students to {className}</DialogTitle></DialogHeader>
            <DialogBody>
              <InputGroup mb={3} startElement={<FiSearch color="gray" />}>
                <Input
                  placeholder="Search by name, ID or current class…"
                  size="sm"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                />
              </InputGroup>

              {addFetching ? (
                <Flex justify="center" py={8}><Spinner /></Flex>
              ) : candidates.length === 0 ? (
                <Flex justify="center" py={8}>
                  <Text fontSize="sm" color="gray.400">
                    {addSearch ? 'No matches.' : 'All students are already in this class.'}
                  </Text>
                </Flex>
              ) : (
                <Box maxH="340px" overflowY="auto">
                  <VStack gap={0} align="stretch">
                    {candidates.map(s => (
                      <Flex
                        key={String(s.id)}
                        align="center" gap={3} px={3} py={2}
                        borderRadius="md" cursor="pointer"
                        _hover={{ bg: 'gray.50' }}
                        onClick={() => toggleSelect(String(s.id))}
                      >
                        <Checkbox.Root
                          checked={selected.has(String(s.id))}
                          onCheckedChange={() => toggleSelect(String(s.id))}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                        <AvatarRoot size="sm">
                          {s.photoUrl && <AvatarImage src={s.photoUrl} />}
                          <AvatarFallback>{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                        </AvatarRoot>
                        <Box flex={1} minW={0}>
                          <Text fontWeight="medium" fontSize="sm">{s.name}</Text>
                          <HStack gap={2}>
                            <Text fontSize="xs" color="gray.400">{s.studentId}</Text>
                            {s.className && (
                              <Badge variant="outline" size="xs" colorPalette="gray">{s.className}</Badge>
                            )}
                          </HStack>
                        </Box>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              )}

              {selected.size > 0 && (
                <Text fontSize="xs" color="blue.600" mt={2}>
                  {selected.size} student{selected.size > 1 ? 's' : ''} selected
                </Text>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                colorPalette="blue" size="sm"
                disabled={selected.size === 0}
                loading={addLoading}
                onClick={handleAdd}
              >
                <FiUserPlus />
                Add {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </>
  )
}
