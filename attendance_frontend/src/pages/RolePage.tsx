import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Input,
  Flex,
  HStack,
  VStack,
  Badge,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  TableScrollArea,
  InputGroup,
  DialogRoot,
  DialogTrigger,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Field,
  IconButton,
  EmptyStateRoot,
  EmptyStateContent,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateIndicator,
  NativeSelectRoot,
  NativeSelectField,
} from '@chakra-ui/react'
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiShield,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi'
import { useState } from 'react'
import { useAuth, type RoleStr as Role, type UserAccount } from '../context/AuthContext'

// ── helpers ────────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'admin',    label: 'Admin'    },
  { value: 'teacher',  label: 'Teacher'  },
  { value: 'operator', label: 'Operator' },
  { value: 'student',  label: 'Student'  },
]

const ROLE_COLOR: Record<Role, string> = {
  admin:    'purple',
  teacher:  'blue',
  operator: 'green',
  student:  'orange',
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge colorPalette={ROLE_COLOR[role]} variant="subtle" size="sm" textTransform="capitalize">
      {role}
    </Badge>
  )
}

// ── stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'blue' }: { label: string; value: number; color?: string }) {
  return (
    <Box bg="white" borderRadius="lg" shadow="sm" p={4} flex={1}>
      <Text fontSize="xs" color="gray.500" fontWeight="medium" textTransform="uppercase" letterSpacing="wide">{label}</Text>
      <Text fontSize="2xl" fontWeight="bold" color={`${color}.500`} mt={1}>{value}</Text>
    </Box>
  )
}

// ── add form state ─────────────────────────────────────────────────────────────

interface AddForm {
  displayName: string
  username: string
  password: string
  role: Role
}

interface AddErrors {
  displayName?: string
  username?: string
  password?: string
}

const EMPTY_ADD: AddForm = { displayName: '', username: '', password: '', role: 'teacher' }

function validateAdd(f: AddForm): AddErrors {
  const e: AddErrors = {}
  if (!f.displayName.trim()) e.displayName = 'Display name is required'
  if (!f.username.trim())    e.username    = 'Username is required'
  if (f.password.length < 6) e.password   = 'Password must be at least 6 characters'
  return e
}

// ── edit form state ────────────────────────────────────────────────────────────

interface EditForm {
  displayName: string
  role: Role
  newPassword: string
}

interface EditErrors {
  displayName?: string
  newPassword?: string
}

function validateEdit(f: EditForm): EditErrors {
  const e: EditErrors = {}
  if (!f.displayName.trim()) e.displayName = 'Display name is required'
  if (f.newPassword && f.newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters'
  return e
}

// ── main page ──────────────────────────────────────────────────────────────────

export default function RolePage() {
  const { users, currentUser, addUser, updateUser, deleteUser } = useAuth()
  const [search, setSearch] = useState('')

  // add
  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState<AddForm>(EMPTY_ADD)
  const [addErrors, setAddErrors]   = useState<AddErrors>({})
  const [addLoading, setAddLoading] = useState(false)
  const [showAddPwd, setShowAddPwd] = useState(false)

  // edit
  const [editTarget, setEditTarget]   = useState<UserAccount | null>(null)
  const [editForm, setEditForm]       = useState<EditForm>({ displayName: '', role: 'teacher', newPassword: '' })
  const [editErrors, setEditErrors]   = useState<EditErrors>({})
  const [editLoading, setEditLoading] = useState(false)
  const [showEditPwd, setShowEditPwd] = useState(false)

  // delete
  const [deleteTarget, setDeleteTarget]   = useState<UserAccount | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError]     = useState('')

  // ── derived ──────────────────────────────────────────────────────────────────

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.includes(search.toLowerCase())
  )

  const adminCount    = users.filter(u => u.role === 'admin').length
  const teacherCount  = users.filter(u => u.role === 'teacher').length
  const operatorCount = users.filter(u => u.role === 'operator').length

  // ── add ───────────────────────────────────────────────────────────────────────

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateAdd(addForm)
    if (Object.keys(errs).length) { setAddErrors(errs); return }
    setAddLoading(true)
    const ok = await addUser(addForm.username.trim(), addForm.password, addForm.role, addForm.displayName.trim())
    setAddLoading(false)
    if (!ok) { setAddErrors({ username: 'Username already taken' }); return }
    setAddForm(EMPTY_ADD)
    setAddErrors({})
    setAddOpen(false)
  }

  // ── edit ──────────────────────────────────────────────────────────────────────

  const openEdit = (u: UserAccount) => {
    setEditTarget(u)
    setEditForm({ displayName: u.displayName, role: u.role, newPassword: '' })
    setEditErrors({})
    setShowEditPwd(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateEdit(editForm)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setEditLoading(true)
    await updateUser(editTarget!.id, {
      displayName: editForm.displayName.trim(),
      role:        editForm.role,
      newPassword: editForm.newPassword || undefined,
    })
    setEditLoading(false)
    setEditTarget(null)
  }

  // ── delete ────────────────────────────────────────────────────────────────────

  const openDelete = (u: UserAccount) => {
    setDeleteTarget(u)
    setDeleteError('')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const ok = await deleteUser(deleteTarget.id)
    setDeleteLoading(false)
    if (!ok) {
      setDeleteError('Failed to delete account. You cannot delete your own account or the last admin.')
      return
    }
    setDeleteTarget(null)
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <Box py={6}>
      <Container maxW="container.xl">

        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading size="lg">Role Management</Heading>
            <Text color="gray.500" mt={1}>Manage system users and their access roles</Text>
          </Box>

          {/* Add dialog */}
          <DialogRoot open={addOpen} onOpenChange={d => setAddOpen(d.open)}>
            <DialogTrigger asChild>
              <Button colorPalette="blue" size="sm">
                <FiPlus />
                Add User
              </Button>
            </DialogTrigger>
            <DialogBackdrop />
            <DialogPositioner>
              <DialogContent>
                <form onSubmit={handleAdd}>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <DialogBody>
                    <VStack gap={4}>
                      <Field.Root invalid={!!addErrors.displayName} required>
                        <Field.Label>Display Name <Field.RequiredIndicator /></Field.Label>
                        <Input
                          placeholder="e.g. Ms. Johnson"
                          value={addForm.displayName}
                          onChange={e => { setAddForm(f => ({ ...f, displayName: e.target.value })); setAddErrors(er => ({ ...er, displayName: undefined })) }}
                        />
                        {addErrors.displayName && <Field.ErrorText>{addErrors.displayName}</Field.ErrorText>}
                      </Field.Root>

                      <Field.Root invalid={!!addErrors.username} required>
                        <Field.Label>Username <Field.RequiredIndicator /></Field.Label>
                        <Input
                          placeholder="e.g. johnson"
                          value={addForm.username}
                          onChange={e => { setAddForm(f => ({ ...f, username: e.target.value })); setAddErrors(er => ({ ...er, username: undefined })) }}
                          autoComplete="off"
                        />
                        {addErrors.username && <Field.ErrorText>{addErrors.username}</Field.ErrorText>}
                      </Field.Root>

                      <Field.Root invalid={!!addErrors.password} required>
                        <Field.Label>Password <Field.RequiredIndicator /></Field.Label>
                        <Box position="relative" w="full">
                          <Input
                            type={showAddPwd ? 'text' : 'password'}
                            placeholder="Min. 6 characters"
                            value={addForm.password}
                            onChange={e => { setAddForm(f => ({ ...f, password: e.target.value })); setAddErrors(er => ({ ...er, password: undefined })) }}
                            autoComplete="new-password"
                            pr="40px"
                          />
                          <Box
                            as="button"
                            position="absolute" right={3} top="50%" transform="translateY(-50%)"
                            color="gray.400" _hover={{ color: 'gray.600' }}
                            onClick={() => setShowAddPwd(v => !v)}
                          >
                            {showAddPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                          </Box>
                        </Box>
                        {addErrors.password && <Field.ErrorText>{addErrors.password}</Field.ErrorText>}
                      </Field.Root>

                      <Field.Root required>
                        <Field.Label>Role <Field.RequiredIndicator /></Field.Label>
                        <NativeSelectRoot>
                          <NativeSelectField
                            value={addForm.role}
                            onChange={e => setAddForm(f => ({ ...f, role: e.target.value as Role }))}
                          >
                            {ROLE_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </NativeSelectField>
                        </NativeSelectRoot>
                      </Field.Root>
                    </VStack>
                  </DialogBody>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button type="submit" colorPalette="blue" size="sm" loading={addLoading} loadingText="Creating…">
                      Create User
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </DialogPositioner>
          </DialogRoot>
        </Flex>

        {/* Stats */}
        <HStack gap={4} mb={8}>
          <StatCard label="Total Users"  value={users.length}   color="blue"   />
          <StatCard label="Admins"       value={adminCount}     color="purple" />
          <StatCard label="Teachers"     value={teacherCount}   color="blue"   />
          <StatCard label="Operators"    value={operatorCount}  color="green"  />
        </HStack>

        {/* Table */}
        <Box bg="white" borderRadius="lg" shadow="sm" p={4}>
          <HStack mb={4} justify="space-between">
            <Heading size="sm">All Users</Heading>
            <InputGroup maxW="260px" startElement={<FiSearch color="gray" />}>
              <Input
                placeholder="Search user…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="sm"
                borderRadius="md"
              />
            </InputGroup>
          </HStack>

          {filtered.length === 0 ? (
            <EmptyStateRoot>
              <EmptyStateContent py={12}>
                <EmptyStateIndicator><FiShield size={32} /></EmptyStateIndicator>
                <EmptyStateTitle>No users found</EmptyStateTitle>
                <EmptyStateDescription>
                  {search ? 'Try a different search term.' : 'Add your first user using the button above.'}
                </EmptyStateDescription>
              </EmptyStateContent>
            </EmptyStateRoot>
          ) : (
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Display Name</TableColumnHeader>
                    <TableColumnHeader>Username</TableColumnHeader>
                    <TableColumnHeader>Role</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.id}>
                      <TableCell fontWeight="semibold">
                        <HStack gap={2}>
                          {u.id === currentUser?.id && (
                            <Badge colorPalette="gray" variant="outline" size="xs">You</Badge>
                          )}
                          {u.displayName}
                        </HStack>
                      </TableCell>
                      <TableCell color="gray.500" fontFamily="mono" fontSize="sm">
                        {u.username}
                      </TableCell>
                      <TableCell><RoleBadge role={u.role} /></TableCell>
                      <TableCell>
                        <HStack gap={1} justify="flex-end">
                          <IconButton
                            aria-label="Edit user"
                            variant="ghost" size="sm" colorPalette="blue"
                            onClick={() => openEdit(u)}
                          >
                            <FiEdit2 />
                          </IconButton>
                          <IconButton
                            aria-label="Delete user"
                            variant="ghost" size="sm" colorPalette="red"
                            disabled={u.id === currentUser?.id}
                            onClick={() => openDelete(u)}
                          >
                            <FiTrash2 />
                          </IconButton>
                        </HStack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
          )}
        </Box>
      </Container>

      {/* Edit dialog */}
      <DialogRoot open={!!editTarget} onOpenChange={d => { if (!d.open) setEditTarget(null) }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <form onSubmit={handleEdit}>
              <DialogHeader>
                <DialogTitle>Edit — {editTarget?.displayName}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack gap={4}>
                  <Field.Root invalid={!!editErrors.displayName} required>
                    <Field.Label>Display Name <Field.RequiredIndicator /></Field.Label>
                    <Input
                      value={editForm.displayName}
                      onChange={e => { setEditForm(f => ({ ...f, displayName: e.target.value })); setEditErrors(er => ({ ...er, displayName: undefined })) }}
                    />
                    {editErrors.displayName && <Field.ErrorText>{editErrors.displayName}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label>Role <Field.RequiredIndicator /></Field.Label>
                    <NativeSelectRoot>
                      <NativeSelectField
                        value={editForm.role}
                        onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                      >
                        {ROLE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </NativeSelectField>
                    </NativeSelectRoot>
                  </Field.Root>

                  <Field.Root invalid={!!editErrors.newPassword}>
                    <Field.Label>New Password <Text as="span" fontSize="xs" color="gray.400">(leave blank to keep current)</Text></Field.Label>
                    <Box position="relative" w="full">
                      <Input
                        type={showEditPwd ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={editForm.newPassword}
                        onChange={e => { setEditForm(f => ({ ...f, newPassword: e.target.value })); setEditErrors(er => ({ ...er, newPassword: undefined })) }}
                        autoComplete="new-password"
                        pr="40px"
                      />
                      <Box
                        as="button"
                        position="absolute" right={3} top="50%" transform="translateY(-50%)"
                        color="gray.400" _hover={{ color: 'gray.600' }}
                        onClick={() => setShowEditPwd(v => !v)}
                      >
                        {showEditPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                      </Box>
                    </Box>
                    {editErrors.newPassword && <Field.ErrorText>{editErrors.newPassword}</Field.ErrorText>}
                  </Field.Root>
                </VStack>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
                <Button type="submit" colorPalette="blue" size="sm" loading={editLoading} loadingText="Saving…">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* Delete confirm */}
      <DialogRoot open={!!deleteTarget} onOpenChange={d => { if (!d.open) { setDeleteTarget(null); setDeleteError('') } }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text>
                Are you sure you want to remove{' '}
                <Text as="span" fontWeight="bold">{deleteTarget?.displayName}</Text>
                {' '}({deleteTarget?.username})?
              </Text>
              {deleteError && (
                <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mt={3}>
                  <Text color="red.600" fontSize="sm">{deleteError}</Text>
                </Box>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setDeleteTarget(null); setDeleteError('') }}>Cancel</Button>
              <Button
                colorPalette="red" size="sm"
                loading={deleteLoading} loadingText="Deleting…"
                onClick={handleDelete}
              >
                <FiTrash2 />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Box>
  )
}
