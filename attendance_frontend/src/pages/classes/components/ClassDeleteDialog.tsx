import {
  Button,
  Text,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@chakra-ui/react'
import { FiTrash2 } from 'react-icons/fi'
import { type Class } from '../../../gen/classes/v1/classes_pb'

interface Props {
  target: Class | null
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ClassDeleteDialog({ target, loading, onConfirm, onClose }: Props) {
  return (
    <DialogRoot open={!!target} onOpenChange={d => { if (!d.open) onClose() }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text>
              Are you sure you want to delete{' '}
              <Text as="span" fontWeight="bold">{target?.name}</Text>?
              This action cannot be undone.
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button colorPalette="red" size="sm" loading={loading} loadingText="Deleting…" onClick={onConfirm}>
              <FiTrash2 /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}
