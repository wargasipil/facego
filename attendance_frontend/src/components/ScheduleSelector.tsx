import { Box, Text, Badge } from '@chakra-ui/react'
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'
import { type ClassSchedule } from '../gen/classes/v1/classes_pb'

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_COLORS = ['', 'blue', 'teal', 'green', 'orange', 'purple', 'pink', 'red'] as const

function scheduleLabel(s: ClassSchedule): string {
  const day = DAY_NAMES[s.dayOfWeek] ?? `Day ${s.dayOfWeek}`
  return `${day} ${s.startTime}–${s.endTime}${s.subject ? ` (${s.subject})` : ''}`
}

interface Props {
  schedules: ClassSchedule[]
  value: bigint
  onChange: (id: bigint) => void
  placeholder?: string
}

export function ScheduleSelector({ schedules, value, onChange, placeholder = 'All Schedules' }: Props) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const containerRef        = useRef<HTMLDivElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  const selected = schedules.find(s => s.id === value) ?? null
  const filtered = schedules.filter(s =>
    scheduleLabel(s).toLowerCase().includes(search.toLowerCase()) ||
    (s.subject && s.subject.toLowerCase().includes(search.toLowerCase())) ||
    (s.room && s.room.toLowerCase().includes(search.toLowerCase()))
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

  const handleSelect = (id: bigint) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(0n)
  }

  const borderColor = open ? '#3182ce' : '#e2e8f0'

  return (
    <Box ref={containerRef} position="relative" minW="200px">
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
        minH="32px"
        _hover={{ borderColor: open ? '#3182ce' : '#cbd5e0' }}
        transition="border-color 0.15s"
        fontSize="sm"
      >
        {selected ? (
          <>
            <Badge
              colorPalette={DAY_COLORS[selected.dayOfWeek] ?? 'gray'}
              variant="subtle"
              size="sm"
              flexShrink={0}
            >
              {DAY_NAMES[selected.dayOfWeek] ?? `Day ${selected.dayOfWeek}`}
            </Badge>
            <Box flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                {selected.startTime}–{selected.endTime}
                {selected.subject ? ` · ${selected.subject}` : ''}
              </Text>
            </Box>
            <Box
              as="span"
              onClick={handleClear}
              color="gray.400"
              _hover={{ color: 'gray.600' }}
              display="flex"
              alignItems="center"
            >
              <FiX size={13} />
            </Box>
          </>
        ) : (
          <Text fontSize="sm" color="gray.400" flex={1}>{placeholder}</Text>
        )}
        <Box
          color="gray.400"
          display="flex"
          alignItems="center"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <FiChevronDown size={13} />
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
          minW="240px"
        >
          {/* All Schedules option */}
          <Box
            px={3}
            py={2}
            cursor="pointer"
            bg={value === 0n ? 'blue.50' : 'white'}
            _hover={{ bg: value === 0n ? 'blue.50' : 'gray.50' }}
            onClick={() => handleSelect(0n)}
            display="flex"
            alignItems="center"
            gap={2}
            borderBottom="1px solid"
            borderColor="gray.100"
          >
            <Text fontSize="sm" color={value === 0n ? 'blue.600' : 'gray.500'} fontWeight={value === 0n ? 'semibold' : 'normal'}>
              All Schedules
            </Text>
            {value === 0n && <Box w={2} h={2} borderRadius="full" bg="blue.500" flexShrink={0} />}
          </Box>

          {/* Search */}
          <Box px={2} py={2} borderBottom="1px solid" borderColor="gray.100">
            <Box position="relative" display="flex" alignItems="center">
              <Box position="absolute" left={2} color="gray.400" pointerEvents="none">
                <FiSearch size={13} />
              </Box>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search schedules…"
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

          {/* Schedule list */}
          <Box overflowY="auto" flex={1}>
            {filtered.length === 0 ? (
              <Box py={6} textAlign="center">
                <Text fontSize="sm" color="gray.400">No schedules found</Text>
              </Box>
            ) : (
              filtered.map(s => {
                const isSelected = s.id === value
                return (
                  <Box
                    key={String(s.id)}
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={isSelected ? 'blue.50' : 'white'}
                    _hover={{ bg: isSelected ? 'blue.50' : 'gray.50' }}
                    onClick={() => handleSelect(s.id)}
                    display="flex"
                    alignItems="center"
                    gap={3}
                    borderBottom="1px solid"
                    borderColor="gray.50"
                  >
                    <Badge
                      colorPalette={DAY_COLORS[s.dayOfWeek] ?? 'gray'}
                      variant="subtle"
                      size="sm"
                      flexShrink={0}
                      minW="42px"
                      textAlign="center"
                    >
                      {DAY_NAMES[s.dayOfWeek] ?? `Day ${s.dayOfWeek}`}
                    </Badge>
                    <Box flex={1} minW={0}>
                      <Text
                        fontSize="sm"
                        fontWeight={isSelected ? 'semibold' : 'medium'}
                        color={isSelected ? 'blue.700' : 'gray.700'}
                        lineClamp={1}
                      >
                        {s.startTime}–{s.endTime}
                      </Text>
                      {(s.subject || s.room) && (
                        <Text fontSize="xs" color="gray.400" lineClamp={1}>
                          {s.subject}{s.subject && s.room ? ' · ' : ''}{s.room ? `Room ${s.room}` : ''}
                        </Text>
                      )}
                    </Box>
                    {isSelected && <Box w={2} h={2} borderRadius="full" bg="blue.500" flexShrink={0} />}
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
