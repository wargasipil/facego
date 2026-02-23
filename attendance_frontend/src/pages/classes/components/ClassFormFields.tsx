import { Input, Textarea, VStack, Field, NativeSelectRoot, NativeSelectField } from '@chakra-ui/react'
import { TeacherSelector, type TeacherOption } from './TeacherSelector'
import { GradeSelector, type GradeOption } from './GradeSelector'

export type { TeacherOption, GradeOption }

export interface StudyProgramOption {
  id: number
  name: string
  code: string
}

export interface ClassFormState {
  name:           string
  gradeId:        number
  teacherId:      number
  description:    string
  studyProgramId: number
}

export interface ClassFormErrors {
  name?: string
  gradeId?: string
  teacherId?: string
}

export const EMPTY_CLASS_FORM: ClassFormState = { name: '', gradeId: 0, teacherId: 0, description: '', studyProgramId: 0 }

export function classFormErrors(f: ClassFormState): ClassFormErrors {
  const e: ClassFormErrors = {}
  if (!f.name.trim()) e.name      = 'Class name is required'
  if (!f.gradeId)     e.gradeId   = 'Grade is required'
  if (!f.teacherId)   e.teacherId = 'Teacher is required'
  return e
}

interface Props {
  form:                 ClassFormState
  errors:               ClassFormErrors
  onChange:             (field: 'name' | 'description') => React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
  onGradeChange:        (id: number) => void
  onTeacherChange:      (id: number) => void
  onStudyProgramChange: (id: number) => void
  grades:               GradeOption[]
  teachers:             TeacherOption[]
  studyPrograms:        StudyProgramOption[]
}

export function ClassFormFields({ form, errors, onChange, onGradeChange, onTeacherChange, onStudyProgramChange, grades, teachers, studyPrograms }: Props) {
  return (
    <VStack gap={4}>
      <Field.Root invalid={!!errors.name} required>
        <Field.Label>Class Name <Field.RequiredIndicator /></Field.Label>
        <Input placeholder="e.g. 10-A" value={form.name} onChange={onChange('name')} />
        {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!errors.gradeId} required>
        <Field.Label>Grade <Field.RequiredIndicator /></Field.Label>
        <GradeSelector grades={grades} value={form.gradeId} onChange={onGradeChange} invalid={!!errors.gradeId} />
        {errors.gradeId && <Field.ErrorText>{errors.gradeId}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!errors.teacherId} required>
        <Field.Label>Teacher <Field.RequiredIndicator /></Field.Label>
        <TeacherSelector teachers={teachers} value={form.teacherId} onChange={onTeacherChange} invalid={!!errors.teacherId} />
        {errors.teacherId && <Field.ErrorText>{errors.teacherId}</Field.ErrorText>}
      </Field.Root>

      <Field.Root>
        <Field.Label>Study Program</Field.Label>
        <NativeSelectRoot>
          <NativeSelectField
            value={form.studyProgramId}
            onChange={e => onStudyProgramChange(Number(e.target.value))}
          >
            <option value={0}>— None —</option>
            {studyPrograms.map(sp => (
              <option key={sp.id} value={sp.id}>
                {sp.code ? `${sp.code} — ${sp.name}` : sp.name}
              </option>
            ))}
          </NativeSelectField>
        </NativeSelectRoot>
      </Field.Root>

      <Field.Root>
        <Field.Label>Description</Field.Label>
        <Textarea placeholder="Optional notes…" value={form.description} onChange={onChange('description')} />
      </Field.Root>
    </VStack>
  )
}
