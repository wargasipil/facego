import {
  Box, Button, Badge, Center, Flex, HStack, Input, InputGroup, Spinner, Text,
  TableRoot, TableHeader, TableBody, TableRow,
  TableColumnHeader, TableCell, TableScrollArea,
} from '@chakra-ui/react'
import { FiEye, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useState, useEffect, useCallback } from 'react'
import { type FaceRecord } from '../../../gen/faces/v1/faces_pb'
import { type User } from '../../../gen/users/v1/users_pb'
import { faceService } from '../../../services/face_service'
import { userService } from '../../../services/user_service'

const PAGE_SIZE = 20

interface Props { active: boolean }

export function RegisteredTab({ active }: Props) {
  const [records, setRecords]       = useState<FaceRecord[]>([])
  const [users, setUsers]           = useState<Map<string, User>>(new Map())
  const [loading, setLoading]       = useState(true)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(0)
  const [pendingSearch, setPendingSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const [{ records: recs, total: t }, { users: us }] = await Promise.all([
        faceService.listFaceEmbeddings({ q, page: p, pageSize: PAGE_SIZE }),
        userService.listUsers({ filter: {}, page: 0, pageSize: 200 }),
      ])
      setRecords(recs)
      setTotal(t)
      setUsers(new Map(us.map(u => [String(u.id), u])))
    } catch { setRecords([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page, appliedSearch) }, [load, page, appliedSearch])
  useEffect(() => { if (active) load(page, appliedSearch) }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplySearch = () => { setAppliedSearch(pendingSearch); setPage(0) }
  const handleClearSearch = () => { setPendingSearch(''); setAppliedSearch(''); setPage(0) }

  const handleDelete = async (studentId: bigint) => {
    setDeleting(String(studentId))
    try {
      await faceService.deleteFaceEmbeddings({ studentId })
      await load(page, appliedSearch)
    } finally { setDeleting(null) }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Box>
      {/* Search bar */}
      <HStack mb={3} gap={2}>
        <InputGroup flex={1} startElement={<FiSearch size={14} color="gray" />}>
          <Input
            placeholder="Search by name or student ID…"
            size="sm"
            value={pendingSearch}
            onChange={e => setPendingSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApplySearch()}
          />
        </InputGroup>
        <Button size="sm" colorPalette="blue" onClick={handleApplySearch}
          disabled={pendingSearch === appliedSearch}
        >
          Search
        </Button>
        {appliedSearch && (
          <Button size="sm" variant="outline" colorPalette="gray" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
      </HStack>

      {/* Table */}
      {loading ? (
        <Center py={10}><Spinner color="blue.500" /></Center>
      ) : records.length === 0 ? (
        <Center py={10} flexDirection="column" gap={2}>
          <Box color="gray.300"><FiEye size={36} /></Box>
          <Text fontSize="sm" color="gray.400">
            {appliedSearch ? 'No results found.' : 'No registered faces yet.'}
          </Text>
        </Center>
      ) : (
        <TableScrollArea>
          <TableRoot size="sm">
            <TableHeader>
              <TableRow>
                <TableColumnHeader>Student</TableColumnHeader>
                <TableColumnHeader>Student ID</TableColumnHeader>
                <TableColumnHeader>Samples</TableColumnHeader>
                <TableColumnHeader />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => {
                const u = users.get(String(r.studentId))
                return (
                  <TableRow key={String(r.studentId)}>
                    <TableCell fontWeight="medium">{u?.name ?? `User #${String(r.studentId)}`}</TableCell>
                    <TableCell color="gray.500">{u?.studentId ?? '—'}</TableCell>
                    <TableCell>
                      <Badge colorPalette="blue" variant="subtle">{r.embeddingCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="xs" colorPalette="red" variant="ghost"
                        loading={deleting === String(r.studentId)}
                        onClick={() => handleDelete(r.studentId)}
                      >
                        <FiTrash2 size={12} />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </TableRoot>
        </TableScrollArea>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <Flex align="center" justify="space-between" mt={3} px={1}>
          <Text fontSize="xs" color="gray.500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </Text>
          <HStack gap={1}>
            <Button size="xs" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <FiChevronLeft size={14} />
            </Button>
            <Text fontSize="xs" color="gray.600">{page + 1} / {totalPages}</Text>
            <Button size="xs" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <FiChevronRight size={14} />
            </Button>
          </HStack>
        </Flex>
      )}
    </Box>
  )
}
