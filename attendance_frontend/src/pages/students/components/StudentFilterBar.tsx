import {
  HStack,
  Button,
  Input,
  InputGroup,
} from '@chakra-ui/react'
import { FiSearch, FiX } from 'react-icons/fi'
import { ClassSelector } from '../../../components/ClassSelector'
import type { ClassOption } from './types'

interface Props {
  classes: ClassOption[]
  pendingSearch: string
  pendingClassFilter: string
  hasActiveFilter: boolean
  hasChangedFilter: boolean
  onSearchChange: (v: string) => void
  onClassFilterChange: (v: string) => void
  onApply: () => void
  onClear: () => void
}

export function StudentFilterBar({
  classes,
  pendingSearch,
  pendingClassFilter,
  hasActiveFilter,
  hasChangedFilter,
  onSearchChange,
  onClassFilterChange,
  onApply,
  onClear,
}: Props) {
  return (
    <HStack gap={2}>
      <ClassSelector
        classes={classes}
        value={pendingClassFilter}
        onChange={onClassFilterChange}
        placeholder="All Classes"
        size="sm"
        w="200px"
      />

      <InputGroup flex={1} startElement={<FiSearch color="gray" />}>
        <Input
          placeholder="Search by name or student ID…"
          value={pendingSearch}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onApply() }}
          size="sm"
          borderRadius="md"
        />
      </InputGroup>

      <Button
        size="sm"
        colorPalette="blue"
        variant={hasChangedFilter ? 'solid' : 'outline'}
        flexShrink={0}
        onClick={onApply}
      >
        Filter
      </Button>

      {hasActiveFilter && (
        <Button size="sm" variant="ghost" colorPalette="gray" flexShrink={0} onClick={onClear}>
          <FiX />
          Clear
        </Button>
      )}
    </HStack>
  )
}
