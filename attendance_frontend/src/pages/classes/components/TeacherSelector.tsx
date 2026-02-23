import { Box, Input, Text, HStack, Badge, AvatarRoot, AvatarFallback } from '@chakra-ui/react'
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'

export interface TeacherOption {
  id: number
  name: string
  teacher_id: string
  subject: string
}

interface Props {
  teachers: TeacherOption[]
  value: number
  onChange: (id: number) => void
  invalid?: boolean
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = ['blue', 'teal', 'purple', 'orange', 'pink', 'cyan', 'green']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function TeacherSelector({ teachers, value, onChange, invalid }: Props) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const containerRef        = useRef<HTMLDivElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  const selected = teachers.find(t => t.id === value) ?? null
  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.teacher_id.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setSearch('') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const handleSelect = (id: number) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(0)
  }

  const borderColor = invalid ? '#e53e3e' : open ? '#3182ce' : '#e2e8f0'

  return (
    <Box ref={containerRef} position="relative" w="full">
      <Box
        onClick={() => setOpen(o => !o)}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        px={3}
        py="7px"
        cursor="pointer"
        bg="white"
        display="flex"
        alignItems="center"
        gap={2}
        minH="38px"
        _hover={{ borderColor: open ? '#3182ce' : '#cbd5e0' }}
        transition="border-color 0.15s"
      >
        {selected ? (
          <>
            <AvatarRoot size="xs" colorPalette={avatarColor(selected.name)}>
              <AvatarFallback fontSize="10px">{initials(selected.name)}</AvatarFallback>
            </AvatarRoot>
            <Box flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="medium" lineClamp={1}>{selected.name}</Text>
              <Text fontSize="xs" color="gray.500" lineClamp={1}>{selected.subject} · {selected.teacher_id}</Text>
            </Box>
            <Box
              as="span"
              onClick={handleClear}
              color="gray.400"
              _hover={{ color: 'gray.600' }}
              display="flex"
              alignItems="center"
            >
              <FiX size={14} />
            </Box>
          </>
        ) : (
          <Text fontSize="sm" color="gray.400" flex={1}>Select teacher…</Text>
        )}
        <Box color="gray.400" display="flex" alignItems="center" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <FiChevronDown size={14} />
        </Box>
      </Box>

      {open && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          shadow="lg"
          zIndex={1500}
          display="flex"
          flexDirection="column"
          maxH="260px"
          overflow="hidden"
        >
          <Box px={2} py={2} borderBottom="1px solid" borderColor="gray.100">
            <Box position="relative" display="flex" alignItems="center">
              <Box position="absolute" left={2} color="gray.400" pointerEvents="none">
                <FiSearch size={13} />
              </Box>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, subject or ID…"
                style={{
                  width: '100%',
                  paddingLeft: '28px',
                  paddingRight: '8px',
                  paddingTop: '5px',
                  paddingBottom: '5px',
                  fontSize: '13px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  background: '#f7fafc',
                }}
              />
            </Box>
          </Box>

          <Box overflowY="auto" flex={1}>
            {filtered.length === 0 ? (
              <Box py={6} textAlign="center">
                <Text fontSize="sm" color="gray.400">No teachers found</Text>
              </Box>
            ) : (
              filtered.map(t => {
                const isSelected = t.id === value
                const color = avatarColor(t.name)
                return (
                  <Box
                    key={t.id}
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={isSelected ? 'blue.50' : 'white'}
                    _hover={{ bg: isSelected ? 'blue.50' : 'gray.50' }}
                    onClick={() => handleSelect(t.id)}
                    display="flex"
                    alignItems="center"
                    gap={3}
                    borderBottom="1px solid"
                    borderColor="gray.50"
                  >
                    <AvatarRoot size="sm" colorPalette={color}>
                      <AvatarFallback fontSize="11px">{initials(t.name)}</AvatarFallback>
                    </AvatarRoot>
                    <Box flex={1} minW={0}>
                      <HStack gap={2} align="center">
                        <Text fontSize="sm" fontWeight={isSelected ? 'semibold' : 'medium'} lineClamp={1}>
                          {t.name}
                        </Text>
                        {isSelected && (
                          <Box w={2} h={2} borderRadius="full" bg="blue.500" flexShrink={0} />
                        )}
                      </HStack>
                      <HStack gap={2} mt="1px">
                        <Badge colorPalette="teal" variant="subtle" size="sm">{t.subject}</Badge>
                        <Text fontSize="xs" color="gray.400">{t.teacher_id}</Text>
                      </HStack>
                    </Box>
                  </Box>
                )
              })
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
