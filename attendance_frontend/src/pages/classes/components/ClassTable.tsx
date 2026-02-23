import {
  HStack,
  Text,
  Badge,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  TableScrollArea,
  IconButton,
} from '@chakra-ui/react'
import { FiEye, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi'
import { type Class } from '../../../gen/classes/v1/classes_pb'

interface Props {
  classes: Class[]
  onView: (cls: Class) => void
  onEdit: (cls: Class) => void
  onDelete: (cls: Class) => void
}

export function ClassTable({ classes, onView, onEdit, onDelete }: Props) {
  const formatDate = (ts?: { seconds: bigint }) =>
    ts ? new Date(Number(ts.seconds) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  return (
    <TableScrollArea>
      <TableRoot size="sm">
        <TableHeader>
          <TableRow bg="gray.50">
            <TableColumnHeader ps={5} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Class</TableColumnHeader>
            <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Grade</TableColumnHeader>
            <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Teacher</TableColumnHeader>
            <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Students</TableColumnHeader>
            <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Description</TableColumnHeader>
            <TableColumnHeader fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Created</TableColumnHeader>
            <TableColumnHeader textAlign="right" pe={5} fontWeight="semibold" color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Actions</TableColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map(cls => (
            <TableRow key={String(cls.id)} _hover={{ bg: 'blue.50' }} transition="background 0.1s">
              <TableCell ps={5} fontWeight="semibold">{cls.name}</TableCell>
              <TableCell>
                <Badge colorPalette="purple" variant="subtle">Grade {cls.grade?.level ?? '—'}</Badge>
              </TableCell>
              <TableCell>{cls.teacher?.name ?? '—'}</TableCell>
              <TableCell>
                <HStack gap={1}>
                  <FiUsers size={12} color="#718096" />
                  <Text fontSize="sm">{cls.studentCount}</Text>
                </HStack>
              </TableCell>
              <TableCell color="gray.500" maxW="180px">
                <Text truncate>{cls.description || '—'}</Text>
              </TableCell>
              <TableCell color="gray.400" fontSize="xs">{formatDate(cls.createdAt)}</TableCell>
              <TableCell pe={5}>
                <HStack gap={1} justify="flex-end">
                  <IconButton aria-label="View class" variant="ghost" size="sm" colorPalette="teal" onClick={() => onView(cls)}>
                    <FiEye />
                  </IconButton>
                  <IconButton aria-label="Edit class" variant="ghost" size="sm" colorPalette="blue" onClick={() => onEdit(cls)}>
                    <FiEdit2 />
                  </IconButton>
                  <IconButton aria-label="Delete class" variant="ghost" size="sm" colorPalette="red" onClick={() => onDelete(cls)}>
                    <FiTrash2 />
                  </IconButton>
                </HStack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableRoot>
    </TableScrollArea>
  )
}
