import {
  Box,
  Container,
  Heading,
  Text,
  Input,
  Button,
  Field,
  VStack,
  HStack,
  Separator,
  Grid,
  GridItem,
  NativeSelectRoot,
  NativeSelectField,
} from '@chakra-ui/react'
import {
  FiCamera,
  FiUserPlus,
  FiRefreshCw,
  FiArrowLeft,
  FiUser,
  FiUsers,
  FiUpload,
} from 'react-icons/fi'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userService, dataUrlToBytes } from '../services/user_service'
import { studyProgramService } from '../services/study_program_service'
import { gradeService } from '../services/grade_service'

interface StudyProgramOption { id: number; name: string; code: string }
interface GradeOption { id: number; label: string; level: string }

interface FormState {
  name:             string
  student_id:       string
  email:            string
  parent_name:      string
  parent_phone:     string
  parent_email:     string
  study_program_id: string
  grade_id:         string
}

const EMPTY_FORM: FormState = {
  name: '', student_id: '', email: '',
  parent_name: '', parent_phone: '', parent_email: '',
  study_program_id: '', grade_id: '',
}

type FormErrors = Partial<Record<keyof FormState, string>>
type CamState   = 'idle' | 'active' | 'captured'

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Box bg="white" borderRadius="lg" shadow="sm" overflow="hidden">
      <Box px={6} py={4} borderBottom="1px solid" borderColor="gray.100">
        <HStack gap={2}>
          <Box color="blue.500">{icon}</Box>
          <Heading size="sm">{title}</Heading>
        </HStack>
      </Box>
      <Box p={6}>{children}</Box>
    </Box>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function RegisterStudentPage() {
  const navigate = useNavigate()

  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm]                   = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors]               = useState<FormErrors>({})
  const [camState, setCamState]           = useState<CamState>('idle')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState<string | null>(null)
  const [studyPrograms, setStudyPrograms] = useState<StudyProgramOption[]>([])
  const [grades, setGrades]               = useState<GradeOption[]>([])

  useEffect(() => {
    studyProgramService.listStudyPrograms({})
      .then(r => setStudyPrograms(r.studyPrograms.map(sp => ({ id: Number(sp.id), name: sp.name, code: sp.code }))))
      .catch(() => {})
    gradeService.listGrades({})
      .then(r => setGrades(r.grades.map(g => ({ id: Number(g.id), label: g.label, level: g.level }))))
      .catch(() => {})
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => { return () => { stopCamera() } }, [stopCamera])

  // ── camera ────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamState('active')
      setCapturedPhoto(null)
    } catch {
      alert('Could not access camera. Please allow camera permission.')
    }
  }, [])

  const capturePhoto = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setCapturedPhoto(canvas.toDataURL('image/jpeg'))
    stopCamera()
    setCamState('captured')
  }, [stopCamera])

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null)
    setCamState('idle')
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setCapturedPhoto(ev.target?.result as string)
      stopCamera()
      setCamState('captured')
      setSubmitError(null)
    }
    reader.readAsDataURL(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }, [stopCamera])

  // ── form ──────────────────────────────────────────────────────────────────

  const handleChange = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(er => ({ ...er, [field]: undefined }))
      setSubmitError(null)
    }

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.name.trim())       errs.name       = 'Name is required'
    if (!form.student_id.trim()) errs.student_id = 'Student ID is required'
    setErrors(errs)
    if (!capturedPhoto) {
      setSubmitError('Please take a face photo before registering.')
      return false
    }
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await userService.registerUser({
        name:           form.name.trim(),
        studentId:      form.student_id.trim(),
        email:          form.email.trim(),
        faceImage:      dataUrlToBytes(capturedPhoto!),
        parentName:     form.parent_name.trim(),
        parentPhone:    form.parent_phone.trim(),
        parentEmail:    form.parent_email.trim(),
        studyProgramId: BigInt(form.study_program_id || '0'),
        gradeId:        BigInt(form.grade_id || '0'),
      })
      navigate('/students', { state: { registered: form.name.trim() } })
    } catch (err: unknown) {
      setSubmitError((err as Error).message ?? 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Box py={6}>
      <Container maxW="container.md">

        {/* Header */}
        <HStack mb={6} gap={3}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/students')}>
            <FiArrowLeft />
            Back
          </Button>
          <Separator orientation="vertical" h={5} />
          <Box>
            <Heading size="lg">Register New Student</Heading>
            <Text color="gray.500" fontSize="sm" mt={0.5}>
              Fill in the student details, parent info, and capture a face photo.
            </Text>
          </Box>
        </HStack>

        <form onSubmit={handleSubmit}>
          <VStack gap={5} align="stretch">

            {/* ── Student Information ── */}
            <Section icon={<FiUser size={16} />} title="Student Information">
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                <GridItem>
                  <Field.Root invalid={!!errors.name} required>
                    <Field.Label>Full Name <Field.RequiredIndicator /></Field.Label>
                    <Input
                      placeholder="e.g. Alice Johnson"
                      value={form.name}
                      onChange={handleChange('name')}
                    />
                    {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
                  </Field.Root>
                </GridItem>

                <GridItem>
                  <Field.Root invalid={!!errors.student_id} required>
                    <Field.Label>Student ID <Field.RequiredIndicator /></Field.Label>
                    <Input
                      placeholder="e.g. STU006"
                      value={form.student_id}
                      onChange={handleChange('student_id')}
                    />
                    {errors.student_id && <Field.ErrorText>{errors.student_id}</Field.ErrorText>}
                  </Field.Root>
                </GridItem>

                <GridItem>
                  <Field.Root>
                    <Field.Label>Student Email (optional)</Field.Label>
                    <Input
                      type="email"
                      placeholder="e.g. alice@school.edu"
                      value={form.email}
                      onChange={handleChange('email')}
                    />
                  </Field.Root>
                </GridItem>

                <GridItem>
                  <Field.Root>
                    <Field.Label>Grade (optional)</Field.Label>
                    <NativeSelectRoot>
                      <NativeSelectField
                        value={form.grade_id}
                        onChange={handleChange('grade_id')}
                      >
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
                    <Field.Label>Study Program (optional)</Field.Label>
                    <NativeSelectRoot>
                      <NativeSelectField
                        value={form.study_program_id}
                        onChange={handleChange('study_program_id')}
                      >
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
            </Section>

            {/* ── Parent / Guardian Information ── */}
            <Section icon={<FiUsers size={16} />} title="Parent / Guardian Information">
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Field.Root>
                    <Field.Label>Parent / Guardian Name</Field.Label>
                    <Input
                      placeholder="e.g. Robert Johnson"
                      value={form.parent_name}
                      onChange={handleChange('parent_name')}
                    />
                  </Field.Root>
                </GridItem>

                <GridItem>
                  <Field.Root>
                    <Field.Label>Phone Number</Field.Label>
                    <Input
                      type="tel"
                      placeholder="e.g. +62 812 3456 7890"
                      value={form.parent_phone}
                      onChange={handleChange('parent_phone')}
                    />
                  </Field.Root>
                </GridItem>

                <GridItem>
                  <Field.Root>
                    <Field.Label>Parent Email</Field.Label>
                    <Input
                      type="email"
                      placeholder="e.g. robert@email.com"
                      value={form.parent_email}
                      onChange={handleChange('parent_email')}
                    />
                  </Field.Root>
                </GridItem>
              </Grid>
            </Section>

            {/* ── Face Photo ── */}
            <Section icon={<FiCamera size={16} />} title="Face Photo">
              <Box maxW="340px">
                <Box
                  borderRadius="md"
                  overflow="hidden"
                  border="2px dashed"
                  borderColor={capturedPhoto ? 'green.300' : 'gray.200'}
                  bg="gray.50"
                  h="240px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {camState === 'idle' && (
                    <VStack gap={2}>
                      <FiCamera size={40} color="#a0aec0" />
                      <Text fontSize="sm" color="gray.400">No photo taken</Text>
                    </VStack>
                  )}
                  {camState === 'active' && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  {camState === 'captured' && capturedPhoto && (
                    <img
                      src={capturedPhoto}
                      alt="Captured"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </Box>

                {/* hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                <HStack mt={3} gap={2} flexWrap="wrap">
                  {camState === 'idle' && (
                    <>
                      <Button size="sm" variant="outline" onClick={startCamera}>
                        <FiCamera />
                        Open Camera
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <FiUpload />
                        Upload File
                      </Button>
                    </>
                  )}
                  {camState === 'active' && (
                    <Button size="sm" colorPalette="blue" onClick={capturePhoto}>
                      <FiCamera />
                      Capture
                    </Button>
                  )}
                  {camState === 'captured' && (
                    <Button size="sm" variant="outline" onClick={retakePhoto}>
                      <FiRefreshCw />
                      Retake
                    </Button>
                  )}
                </HStack>
              </Box>
            </Section>

            {/* ── Error & Submit ── */}
            {submitError && (
              <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" px={4} py={3}>
                <Text color="red.600" fontSize="sm">{submitError}</Text>
              </Box>
            )}

            <HStack justify="flex-end" gap={3}>
              <Button variant="outline" onClick={() => navigate('/students')}>
                Cancel
              </Button>
              <Button
                type="submit"
                colorPalette="blue"
                loading={submitting}
                loadingText="Registering…"
              >
                <FiUserPlus />
                Register Student
              </Button>
            </HStack>

          </VStack>
        </form>
      </Container>
    </Box>
  )
}
