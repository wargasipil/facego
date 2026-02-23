import {
  Flex,
  HStack,
  Text,
  Button,
  NativeSelectRoot,
  NativeSelectField,
} from '@chakra-ui/react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface Props {
  page: number
  pageSize: number
  total: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  pageNumbers: number[]
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}

export function ClassPagination({
  page, pageSize, total, totalPages, rangeStart, rangeEnd, pageNumbers,
  onPageChange, onPageSizeChange,
}: Props) {
  if (total === 0) return null

  return (
    <Flex
      px={5} py={3}
      borderTop="1px solid" borderColor="gray.100"
      align="center"
      justify="space-between"
      gap={3}
      flexWrap="wrap"
    >
      {/* Left: row range */}
      <Text fontSize="sm" color="gray.500" flexShrink={0}>
        {rangeStart}–{rangeEnd} of {total}
      </Text>

      {/* Center: page buttons */}
      <HStack gap={1}>
        <Button
          size="xs" variant="ghost" colorPalette="gray"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          px={1.5}
        >
          <FiChevronLeft />
        </Button>

        {pageNumbers[0] > 1 && (
          <>
            <Button size="xs" variant="ghost" colorPalette="gray" onClick={() => onPageChange(1)}>1</Button>
            {pageNumbers[0] > 2 && <Text fontSize="xs" color="gray.400" px={0.5}>…</Text>}
          </>
        )}

        {pageNumbers.map(n => (
          <Button
            key={n}
            size="xs"
            variant={n === page ? 'solid' : 'ghost'}
            colorPalette={n === page ? 'blue' : 'gray'}
            onClick={() => onPageChange(n)}
            minW="28px"
          >
            {n}
          </Button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <Text fontSize="xs" color="gray.400" px={0.5}>…</Text>
            )}
            <Button size="xs" variant="ghost" colorPalette="gray" onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </Button>
          </>
        )}

        <Button
          size="xs" variant="ghost" colorPalette="gray"
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          px={1.5}
        >
          <FiChevronRight />
        </Button>
      </HStack>

      {/* Right: rows per page */}
      <HStack gap={2} flexShrink={0}>
        <Text fontSize="sm" color="gray.400" whiteSpace="nowrap">Rows</Text>
        <NativeSelectRoot size="xs" w="64px">
          <NativeSelectField
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </NativeSelectField>
        </NativeSelectRoot>
      </HStack>
    </Flex>
  )
}
