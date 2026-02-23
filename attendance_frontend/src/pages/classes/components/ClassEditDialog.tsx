import {
  Button,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@chakra-ui/react'
import { type Class } from '../../../gen/classes/v1/classes_pb'
import {
  ClassFormFields,
  type ClassFormState,
  type ClassFormErrors,
  type GradeOption,
  type TeacherOption,
  type StudyProgramOption,
} from './ClassFormFields'

type OnChange = (field: 'name' | 'description') => React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>

interface Props {
  target: Class | null
  form: ClassFormState
  errors: ClassFormErrors
  onChange: OnChange
  onGradeChange: (id: number) => void
  onTeacherChange: (id: number) => void
  onStudyProgramChange: (id: number) => void
  grades: GradeOption[]
  teachers: TeacherOption[]
  studyPrograms: StudyProgramOption[]
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function ClassEditDialog({
  target, form, errors, onChange,
  onGradeChange, onTeacherChange, onStudyProgramChange,
  grades, teachers, studyPrograms, loading, onSubmit, onClose,
}: Props) {
  return (
    <DialogRoot open={!!target} onOpenChange={d => { if (!d.open) onClose() }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Class — {target?.name}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <ClassFormFields
                form={form} errors={errors} onChange={onChange}
                onGradeChange={onGradeChange} onTeacherChange={onTeacherChange}
                onStudyProgramChange={onStudyProgramChange}
                grades={grades} teachers={teachers} studyPrograms={studyPrograms}
              />
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
