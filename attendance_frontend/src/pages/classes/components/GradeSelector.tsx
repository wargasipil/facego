import { Box, Text, Badge } from '@chakra-ui/react'
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'

export interface GradeOption {
  id: number
  level: string
  label: string
}

interface Props {
  grades: GradeOption[]
  value: number   // grade DB id, 0 = nothing selected
  onChange: (id: number) => void
  invalid?: boolean
}

export function GradeSelector({ grades, value, onChange, invalid }: Props) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const containerRef        = useRef<HTMLDivElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  const selected = grades.find(g => g.id === value) ?? null
  const filtered = grades.filter(g =>
    g.label.toLowerCase().includes(search.toLowerCase()) ||
    g.level.includes(search)
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
            <Badge colorPalette="purple" variant="solid" fontSize="xs" minW="28px" textAlign="center">
              {selected.level}
            </Badge>
            <Text fontSize="sm" flex={1}>{selected.label}</Text>
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
          <Text fontSize="sm" color="gray.400" flex={1}>Select grade…</Text>
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
          maxH="220px"
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
                placeholder="Search grade…"
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
                <Text fontSize="sm" color="gray.400">No grades found</Text>
              </Box>
            ) : (
              filtered.map(g => {
                const isSelected = g.id === value
                return (
                  <Box
                    key={g.id}
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={isSelected ? 'purple.50' : 'white'}
                    _hover={{ bg: isSelected ? 'purple.50' : 'gray.50' }}
                    onClick={() => handleSelect(g.id)}
                    display="flex"
                    alignItems="center"
                    gap={3}
                    borderBottom="1px solid"
                    borderColor="gray.50"
                  >
                    <Badge colorPalette="purple" variant={isSelected ? 'solid' : 'subtle'} fontSize="xs" minW="28px" textAlign="center">
                      {g.level}
                    </Badge>
                    <Text fontSize="sm" fontWeight={isSelected ? 'semibold' : 'normal'} flex={1}>
                      {g.label}
                    </Text>
                    {isSelected && (
                      <Box w={2} h={2} borderRadius="full" bg="purple.500" flexShrink={0} />
                    )}
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
