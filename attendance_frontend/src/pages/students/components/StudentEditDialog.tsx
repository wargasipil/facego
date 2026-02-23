import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  Grid,
  GridItem,
  Field,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  NativeSelectRoot,
  NativeSelectField,
} from '@chakra-ui/react'
import { type User } from '../../../gen/users/v1/users_pb'
import { userService } from '../../../services/user_service'
import type { StudyProgramOption, GradeOption } from './types'

// ─── Form types ───────────────────────────────────────────────────────────────

interface EditForm {
  name:             string
  student_id:       string
  email:            string
  parent_name:      string
  parent_phone:     string
  parent_email:     string
  study_program_id: string
  grade_id:         string
}

const EMPTY_FORM: EditForm = {
  name: '', student_id: '', email: '',
  parent_name: '', parent_phone: '', parent_email: '',
  study_program_id: '', grade_id: '',
}

function toEditForm(s: User): EditForm {
  return {
    name:             s.name,
    student_id:       s.studentId,
    email:            s.email,
    parent_name:      s.parentName,
    parent_phone:     s.parentPhone,
    parent_email:     s.parentEmail,
    study_program_id: s.studyProgramId ? String(s.studyProgramId) : '',
    grade_id:         s.gradeId ? String(s.gradeId) : '',
  }
}

function validate(f: EditForm): Partial<EditForm> {
  const e: Partial<EditForm> = {}
  if (!f.name.trim())       e.name       = 'Name is required'
  if (!f.student_id.trim()) e.student_id = 'Student ID is required'
  return e
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  user: User | null
  studyPrograms: StudyProgramOption[]
  grades: GradeOption[]
  onSave: (updated: User) => void
  onClose: () => void
}

export function StudentEditDialog({ user, studyPrograms, grades, onSave, onClose }: Props) {
  const [form, setForm]       = useState<EditForm>(EMPTY_FORM)
  const [errors, setErrors]   = useState<Partial<EditForm>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setForm(toEditForm(user))
      setErrors({})
    }
  }, [user])

  const handleChange = (field: keyof EditForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(er => ({ ...er, [field]: undefined }))
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const updated = (await userService.updateUser({
        id:             user!.id,
        name:           form.name.trim(),
        studentId:      form.student_id.trim(),
        email:          form.email.trim(),
        parentName:     form.parent_name.trim(),
        parentPhone:    form.parent_phone.trim(),
        parentEmail:    form.parent_email.trim(),
        studyProgramId: BigInt(form.study_program_id || '0'),
        gradeId:        BigInt(form.grade_id || '0'),
      })).user!
      onSave(updated)
    } catch (err: unknown) {
      setErrors({ name: (err as Error).message ?? 'Save failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogRoot open={!!user} onOpenChange={d => { if (!d.open) onClose() }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent maxW="560px">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <VStack gap={5}>

                {/* Student info */}
                <Box w="full">
                  <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={3}>
                    Student Information
                  </Text>
                  <Grid templateColumns="1fr 1fr" gap={3}>
                    <GridItem colSpan={2}>
                      <Field.Root invalid={!!errors.name} required>
                        <Field.Label>Full Name <Field.RequiredIndicator /></Field.Label>
                        <Input value={form.name} onChange={handleChange('name')} placeholder="e.g. Alice Johnson" />
                        {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
                      </Field.Root>
                    </GridItem>
                    <GridItem>
                      <Field.Root invalid={!!errors.student_id} required>
                        <Field.Label>Student ID <Field.RequiredIndicator /></Field.Label>
                        <Input value={form.student_id} onChange={handleChange('student_id')} placeholder="e.g. STU006" />
                        {errors.student_id && <Field.ErrorText>{errors.student_id}</Field.ErrorText>}
                      </Field.Root>
                    </GridItem>
                    <GridItem>
                      <Field.Root>
                        <Field.Label>Student Email</Field.Label>
                        <Input type="email" value={form.email} onChange={handleChange('email')} placeholder="alice@school.edu" />
                      </Field.Root>
                    </GridItem>
                  </Grid>
                </Box>

                {/* Parent info */}
                <Box w="full">
                  <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={3}>
                    Parent / Guardian
                  </Text>
                  <Grid templateColumns="1fr 1fr" gap={3}>
                    <GridItem colSpan={2}>
                      <Field.Root>
                        <Field.Label>Parent Name</Field.Label>
                        <Input value={form.parent_name} onChange={handleChange('parent_name')} placeholder="e.g. Robert Johnson" />
                      </Field.Root>
                    </GridItem>
                    <GridItem>
                      <Field.Root>
                        <Field.Label>Phone</Field.Label>
                        <Input type="tel" value={form.parent_phone} onChange={handleChange('parent_phone')} placeholder="+62 812 …" />
                      </Field.Root>
                    </GridItem>
                    <GridItem>
                      <Field.Root>
                        <Field.Label>Parent Email</Field.Label>
                        <Input type="email" value={form.parent_email} onChange={handleChange('parent_email')} />
                      </Field.Root>
                    </GridItem>
                  </Grid>
                </Box>

                {/* Academic */}
                <Box w="full">
                  <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={3}>
                    Academic
                  </Text>
                  <Grid templateColumns="1fr 1fr" gap={3}>
                    <GridItem>
                      <Field.Root>
                        <Field.Label>Grade</Field.Label>
                        <NativeSelectRoot>
                          <NativeSelectField value={form.grade_id} onChange={handleChange('grade_id')}>
                            <option value="">— None —</option>
                            {grades.map(g => (
                              <option key={g.id} value={g.id}>{g.label}</option>
                            ))}
                          </NativeSelectField>
                        </NativeSelectRoot>
                      </Field.Root>
                    </GridItem>
                    <GridItem>
                      <Field.Root>
                        <Field.Label>Study Program</Field.Label>
                        <NativeSelectRoot>
                          <NativeSelectField value={form.study_program_id} onChange={handleChange('study_program_id')}>
                            <option value="">— None —</option>
                            {studyPrograms.map(sp => (
                              <option key={sp.id} value={sp.id}>
                                {sp.code ? `${sp.code} — ${sp.name}` : sp.name}
                              </option>
                            ))}
                          </NativeSelectField>
                        </NativeSelectRoot>
                      </Field.Root>
                    </GridItem>
                  </Grid>
                </Box>

              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" colorPalette="blue" size="sm" loading={loading} loadingText="Saving…">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}
