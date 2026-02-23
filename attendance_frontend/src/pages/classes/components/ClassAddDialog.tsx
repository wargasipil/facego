import {
  Button,
  DialogRoot,
  DialogTrigger,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@chakra-ui/react'
import { FiPlus } from 'react-icons/fi'
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
  open: boolean
  onOpenChange: (open: boolean) => void
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
}

export function ClassAddDialog({
  open, onOpenChange, form, errors, onChange,
  onGradeChange, onTeacherChange, onStudyProgramChange,
  grades, teachers, studyPrograms, loading, onSubmit,
}: Props) {
  return (
    <DialogRoot open={open} onOpenChange={d => onOpenChange(d.open)}>
      <DialogTrigger asChild>
        <Button colorPalette="blue" size="sm">
          <FiPlus /> Add Class
        </Button>
      </DialogTrigger>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
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
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" colorPalette="blue" size="sm" loading={loading} loadingText="Saving…">
                Save Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}
