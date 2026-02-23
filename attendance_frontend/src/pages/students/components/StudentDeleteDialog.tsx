import { useState } from 'react'
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
import { type User } from '../../../gen/users/v1/users_pb'

interface Props {
  user: User | null
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function StudentDeleteDialog({ user, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogRoot open={!!user} onOpenChange={d => { if (!d.open) { setError(null); onClose() } }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text>
              Are you sure you want to delete{' '}
              <Text as="span" fontWeight="bold">{user?.name}</Text>?
              This action cannot be undone.
            </Text>
            {error && (
              <Text mt={2} fontSize="sm" color="red.500">{error}</Text>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              colorPalette="red"
              size="sm"
              loading={loading}
              loadingText="Deleting…"
              onClick={handleDelete}
            >
              <FiTrash2 />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}
