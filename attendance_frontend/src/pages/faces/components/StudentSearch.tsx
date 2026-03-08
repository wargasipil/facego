import { Box, Flex, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { FiSearch, FiX } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'
import { type User } from '../../../gen/users/v1/users_pb'
import { userService } from '../../../services/user_service'

interface Props {
  selected: User | null
  onSelect: (u: User) => void
  onClear: () => void
}

export function StudentSearch({ selected, onSelect, onClear }: Props) {
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim() || selected) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await userService.listUsers({ filter: { search: search.trim() }, page: 0, pageSize: 10 })
        setResults(r.users)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
  }, [search, selected])

  if (selected) return (
    <Flex align="center" justify="space-between" px={3} py={2}
      bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="md"
    >
      <Box>
        <Text fontSize="sm" fontWeight="semibold" color="blue.800">{selected.name}</Text>
        <Text fontSize="xs" color="blue.600">{selected.studentId}</Text>
      </Box>
      <Box as="button" color="blue.400" _hover={{ color: 'blue.600' }} cursor="pointer"
        onClick={() => { onClear(); setSearch('') }}
      >
        <FiX size={16} />
      </Box>
    </Flex>
  )

  return (
    <Box>
      <Box position="relative">
        <Input placeholder="Search by name or student ID…" value={search}
          onChange={e => setSearch(e.target.value)} size="sm" pl={8}
        />
        <Box position="absolute" left={2.5} top="50%" transform="translateY(-50%)"
          color="gray.400" pointerEvents="none"
        >
          <FiSearch size={14} />
        </Box>
      </Box>
      {loading && (
        <HStack gap={2} mt={1} color="gray.400">
          <Spinner size="xs" />
          <Text fontSize="xs">Searching…</Text>
        </HStack>
      )}
      {results.length > 0 && (
        <VStack gap={0} align="stretch" mt={1} border="1px solid" borderColor="gray.200"
          borderRadius="md" overflow="hidden" maxH="160px" overflowY="auto"
        >
          {results.map(u => (
            <Flex key={String(u.id)} px={3} py={2} cursor="pointer" _hover={{ bg: 'blue.50' }}
              onClick={() => { onSelect(u); setResults([]) }} justify="space-between" align="center"
            >
              <Text fontSize="sm" fontWeight="medium">{u.name}</Text>
              <Text fontSize="xs" color="gray.500">{u.studentId}</Text>
            </Flex>
          ))}
        </VStack>
      )}
      {!loading && search.trim() && results.length === 0 && (
        <Text fontSize="xs" color="gray.400" mt={1}>No students found.</Text>
      )}
    </Box>
  )
}
