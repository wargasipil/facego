import { useState, useMemo, useRef, useEffect } from 'react'
import {
  SelectRoot,
  SelectControl,
  SelectTrigger,
  SelectValueText,
  SelectPositioner,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectIndicatorGroup,
  SelectClearTrigger,
  SelectIndicator,
  Box,
  createListCollection,
} from '@chakra-ui/react'
import { FiSearch } from 'react-icons/fi'

export interface ClassOption {
  id: number
  name: string
}

interface Props {
  classes: ClassOption[]
  value: string           // selected class ID as string; '' = nothing selected
  onChange: (id: string) => void
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  w?: string | number
}

export function ClassSelector({
  classes,
  value,
  onChange,
  placeholder = 'All Classes',
  size = 'sm',
  w = '200px',
}: Props) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const searchRef         = useRef<HTMLInputElement>(null)

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
    else      setQuery('')
  }, [open])

  const filteredItems = useMemo(() =>
    classes
      .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
      .map(c => ({ label: c.name, value: String(c.id) })),
    [classes, query]
  )

  const collection = useMemo(
    () => createListCollection({ items: filteredItems }),
    [filteredItems]
  )

  return (
    <SelectRoot
      collection={collection}
      value={value ? [value] : []}
      onValueChange={({ value: v }) => onChange(v[0] ?? '')}
      open={open}
      onOpenChange={({ open: o }) => setOpen(o)}
      size={size}
      w={w}
    >
      <SelectControl>
        <SelectTrigger>
          <SelectValueText placeholder={placeholder} />
        </SelectTrigger>
        <SelectIndicatorGroup>
          <SelectClearTrigger />
          <SelectIndicator />
        </SelectIndicatorGroup>
      </SelectControl>

      <SelectPositioner>
        <SelectContent>
          {/* Search input */}
          <Box
            px={2}
            py={2}
            borderBottom="1px solid"
            borderColor="gray.100"
            position="sticky"
            top={0}
            bg="white"
            zIndex={1}
          >
            <Box
              position="relative"
              display="flex"
              alignItems="center"
            >
              <Box position="absolute" left={2} color="gray.400" pointerEvents="none" display="flex">
                <FiSearch size={13} />
              </Box>
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  // Prevent Select from handling keyboard navigation while typing
                  if (e.key !== 'Escape') e.stopPropagation()
                }}
                placeholder="Search classes…"
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

          {/* Items */}
          {filteredItems.length === 0 ? (
            <Box py={6} textAlign="center" color="gray.400" fontSize="sm">
              No classes found
            </Box>
          ) : (
            filteredItems.map(item => (
              <SelectItem key={item.value} item={item}>
                <SelectItemText>{item.label}</SelectItemText>
                <SelectItemIndicator />
              </SelectItem>
            ))
          )}
        </SelectContent>
      </SelectPositioner>
    </SelectRoot>
  )
}
