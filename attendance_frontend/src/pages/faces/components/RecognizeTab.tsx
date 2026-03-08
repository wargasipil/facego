import {
  Box, Button, Flex, HStack, Text, VStack, Badge, Center,
} from '@chakra-ui/react'
import { FiCamera, FiCameraOff, FiEye, FiMaximize, FiMinimize } from 'react-icons/fi'
import { useState, useEffect, useRef, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { type FaceRecord } from '../../../gen/faces/v1/faces_pb'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'
import { faceService } from '../../../services/face_service'
import { userService } from '../../../services/user_service'
import { classService } from '../../../services/class_service'
import { attendanceService } from '../../../services/attendance_service'
import { bytesToDescriptors, MATCH_THRESHOLD } from './models'
import { ClassSelector, type ClassOption } from '../../../components/ClassSelector'

interface Props {
  modelsReady: boolean
  active: boolean
}

type Recognition = { name: string; studentId: string; distance: number; time: string }

export function RecognizeTab({ modelsReady, active }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef       = useRef<number | null>(null)
  const matcherRef  = useRef<faceapi.FaceMatcher | null>(null)
  const sessionRef  = useRef<string>('')
  const classRef    = useRef<ClassOption | null>(null)
  const pushedRef   = useRef<Map<string, number>>(new Map()) // studentId → last push ms

  const [running, setRunning]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [faceCount, setFaceCount]       = useState(0)
  const [fps, setFps]                   = useState(0)
  const [recognitions, setRecognitions] = useState<Recognition[]>([])
  const [error, setError]               = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const lastTsRef                       = useRef(0)

  const [classes, setClasses]             = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null)

  useEffect(() => {
    classService.listClasses({ gradeIdFilter: 0n, search: '', page: 0, pageSize: 6 })
      .then(r => setClasses(r.classes.map(c => ({ id: Number(c.id), name: c.name }))))
      .catch(() => {})
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const video = videoRef.current
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      video.srcObject = null
    }
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setRunning(false)
    setFaceCount(0)
    setFps(0)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])
  useEffect(() => { if (!active) stopCamera() }, [active, stopCamera])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const { records } = await faceService.loadFaceEmbeddings({})
      const { users }   = await userService.listUsers({ filter: {}, page: 0, pageSize: 200 })
      const userMap     = new Map(users.map(u => [String(u.id), u]))

      if (records.length === 0) {
        setError('No registered faces found. Register some faces first.')
        setLoading(false)
        return
      }

      const labeled = records
        .map((r: FaceRecord) => {
          const u     = userMap.get(String(r.studentId))
          const label = u ? `${u.name}||${u.studentId}||${u.id}` : String(r.studentId)
          const descs = bytesToDescriptors(r.embeddings, r.embeddingCount)
          if (descs.length === 0) return null
          return new faceapi.LabeledFaceDescriptors(label, descs)
        })
        .filter(Boolean) as faceapi.LabeledFaceDescriptors[]

      matcherRef.current = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD)
      sessionRef.current = crypto.randomUUID()
      classRef.current   = selectedClass
      pushedRef.current.clear()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      })
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setRunning(true)

      const loop = async () => {
        if (!videoRef.current?.srcObject) return
        const now = performance.now()

        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors()

        if (lastTsRef.current) setFps(Math.round(1000 / (now - lastTsRef.current)))
        lastTsRef.current = now
        setFaceCount(detections.length)

        const canvas = canvasRef.current!
        const rect   = videoRef.current!.getBoundingClientRect()
        canvas.width  = rect.width
        canvas.height = rect.height
        const displaySize = { width: rect.width, height: rect.height }
        const resized = faceapi.resizeResults(detections, displaySize)
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const matcher = matcherRef.current!
        for (const det of resized) {
          const match     = matcher.findBestMatch(det.descriptor)
          const isUnknown = match.label === 'unknown'
          const color     = isUnknown ? '#ef4444' : '#22c55e'
          const box       = det.detection.box

          ctx.strokeStyle = color
          ctx.lineWidth   = 2
          ctx.strokeRect(box.x, box.y, box.width, box.height)

          const parts    = match.label.split('||')
          const name     = isUnknown ? 'Unknown' : parts[0]
          const pct      = isUnknown ? '' : ` (${Math.round((1 - match.distance) * 100)}%)`
          const labelTxt = name + pct
          const textW    = ctx.measureText(labelTxt).width + 8
          ctx.fillStyle  = color
          ctx.fillRect(box.x, box.y - 20, textW, 20)
          ctx.fillStyle  = '#fff'
          ctx.font       = '13px sans-serif'
          ctx.fillText(labelTxt, box.x + 4, box.y - 5)

          if (!isUnknown) {
            const studentId = parts[1] ?? ''
            const userId    = BigInt(parts[2] ?? '0')
            const seenAt    = new Date()
            const lastPush  = pushedRef.current.get(studentId) ?? 0

            if (seenAt.getTime() - lastPush >= 5000) {
              pushedRef.current.set(studentId, seenAt.getTime())

              // Push to backend
              const cls = classRef.current
              if (cls && userId > 0n) {
                attendanceService.attendancePushLog({
                  sessionId:   sessionRef.current,
                  userId:      userId,
                  studentId:   studentId,
                  studentName: parts[0],
                  classId:     BigInt(cls.id),
                  className:   cls.name,
                  seenAt:      timestampFromDate(seenAt),
                }).catch(() => {})
              }

              setRecognitions(prev => {
                const entry: Recognition = {
                  name:      parts[0],
                  studentId: studentId,
                  distance:  match.distance,
                  time:      seenAt.toLocaleTimeString(),
                }
                return [entry, ...prev].slice(0, 200)
              })
            }
          }
        }

        rafRef.current = requestAnimationFrame(loop)
      }

      rafRef.current = requestAnimationFrame(loop)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [selectedClass])

  const canStart = modelsReady && !loading && !!selectedClass

  return (
    <VStack ref={containerRef} gap={4} align="stretch"
      bg={isFullscreen ? 'white' : undefined}
      p={isFullscreen ? 6 : undefined}
      h={isFullscreen ? '100vh' : undefined}
      overflowY={isFullscreen ? 'auto' : undefined}
    >
      <Flex align="center" justify="space-between" gap={3}>
        <HStack gap={2} flex={1}>
          {!running && (
            <>
              <Text fontSize="sm" fontWeight="medium" color="gray.600" whiteSpace="nowrap">Class</Text>
              <ClassSelector
                classes={classes}
                value={selectedClass ? String(selectedClass.id) : ''}
                onChange={id => setSelectedClass(classes.find(c => String(c.id) === id) ?? null)}
                placeholder="Select a class"
                w="100%"
                size="sm"
              />
            </>
          )}
          {running && <Badge colorPalette="green" variant="subtle">Live</Badge>}
          {running && selectedClass && <Badge colorPalette="blue" variant="subtle">{selectedClass.name}</Badge>}
          {running && <Badge colorPalette="blue"  variant="subtle">{faceCount} face{faceCount !== 1 ? 's' : ''}</Badge>}
          {running && <Badge colorPalette="gray"  variant="subtle">{fps} fps</Badge>}
        </HStack>
        <HStack gap={2}>
          <Box
            as="button"
            p="6px"
            borderRadius="md"
            bg="gray.100"
            color="gray.600"
            _hover={{ bg: 'gray.200' }}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
          </Box>
          <Button size="sm" colorPalette={running ? 'red' : 'blue'}
            disabled={!running && !canStart}
            loading={loading} loadingText="Loading…"
            onClick={running ? stopCamera : startCamera}
          >
            {running
              ? <><FiCameraOff size={14} /> Stop</>
              : <><FiCamera size={14} /> Start Recognition</>
            }
          </Button>
        </HStack>
      </Flex>

      {error && <Text fontSize="sm" color="red.500">{error}</Text>}

      <Box borderRadius="md" overflow="hidden" bg="black" position="relative">
        <video ref={videoRef} style={{ display: 'block', width: '100%', height: isFullscreen ? 'calc(100vh - 200px)' : 'auto' }} muted playsInline />
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {!running && (
          <Center position="absolute" inset={0} bg="gray.900" color="gray.500" flexDirection="column" gap={2} minH="200px">
            <FiEye size={32} />
            {selectedClass ? 'Start recognition to identify faces' : 'Select a class first'}
          </Center>
        )}
      </Box>

      {recognitions.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">Recognition Log</Text>
          <VStack gap={1} align="stretch" maxH={isFullscreen ? '400px' : '200px'} overflowY="auto">
            {recognitions.map((r, i) => (
              <Flex key={i} px={3} py={2} borderRadius="md" bg="green.50"
                border="1px solid" borderColor="green.100" align="center" justify="space-between"
              >
                <HStack gap={2}>
                  <Box w={2} h={2} borderRadius="full" bg="green.400" />
                  <Text fontSize="sm" fontWeight="medium">{r.name}</Text>
                  <Text fontSize="xs" color="gray.500">{r.studentId}</Text>
                </HStack>
                <HStack gap={2}>
                  <Badge colorPalette="green" variant="subtle" fontSize="xs">
                    {Math.round((1 - r.distance) * 100)}%
                  </Badge>
                  <Text fontSize="xs" color="gray.400">{r.time}</Text>
                </HStack>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}
