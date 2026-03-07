import {
  Box, Button, Flex, HStack, Text, VStack, Badge, Center,
} from '@chakra-ui/react'
import { FiCamera, FiCameraOff, FiEye } from 'react-icons/fi'
import { useState, useEffect, useRef, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { type FaceRecord } from '../../../gen/faces/v1/faces_pb'
import { faceService } from '../../../services/face_service'
import { userService } from '../../../services/user_service'
import { bytesToDescriptors, MATCH_THRESHOLD } from './models'

interface Props {
  modelsReady: boolean
  active: boolean
}

type Recognition = { name: string; studentId: string; distance: number; time: string }

export function RecognizeTab({ modelsReady, active }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number | null>(null)
  const matcherRef = useRef<faceapi.FaceMatcher | null>(null)

  const [running, setRunning]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [faceCount, setFaceCount]       = useState(0)
  const [fps, setFps]                   = useState(0)
  const [recognitions, setRecognitions] = useState<Recognition[]>([])
  const [error, setError]               = useState<string | null>(null)
  const lastTsRef                       = useRef(0)

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
          const label = u ? `${u.name}||${u.studentId}` : String(r.studentId)
          const descs = bytesToDescriptors(r.embeddings, r.embeddingCount)
          if (descs.length === 0) return null
          return new faceapi.LabeledFaceDescriptors(label, descs)
        })
        .filter(Boolean) as faceapi.LabeledFaceDescriptors[]

      matcherRef.current = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD)

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
            setRecognitions(prev => {
              const last = prev.find(r => r.studentId === studentId)
              const now  = new Date()
              if (last && (now.getTime() - new Date(last.time).getTime()) < 5000) return prev
              const entry: Recognition = {
                name:      parts[0],
                studentId: studentId,
                distance:  match.distance,
                time:      now.toLocaleTimeString(),
              }
              return [entry, ...prev].slice(0, 200)
            })
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
  }, [])

  return (
    <VStack gap={4} align="stretch">
      <Flex align="center" justify="space-between">
        <HStack gap={2}>
          {running && <Badge colorPalette="green" variant="subtle">Live</Badge>}
          {running && <Badge colorPalette="blue"  variant="subtle">{faceCount} face{faceCount !== 1 ? 's' : ''}</Badge>}
          {running && <Badge colorPalette="gray"  variant="subtle">{fps} fps</Badge>}
        </HStack>
        <Button size="sm" colorPalette={running ? 'red' : 'blue'}
          disabled={!modelsReady || loading}
          loading={loading} loadingText="Loading…"
          onClick={running ? stopCamera : startCamera}
        >
          {running
            ? <><FiCameraOff size={14} /> Stop</>
            : <><FiCamera size={14} /> Start Recognition</>
          }
        </Button>
      </Flex>

      {error && <Text fontSize="sm" color="red.500">{error}</Text>}

      <Box borderRadius="md" overflow="hidden" bg="black" position="relative">
        <video ref={videoRef} style={{ display: 'block', width: '100%', height: 'auto' }} muted playsInline />
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {!running && (
          <Center position="absolute" inset={0} bg="gray.900" color="gray.500" flexDirection="column" gap={2} minH="200px">
            <FiEye size={32} />
            <Text fontSize="sm">Start recognition to identify faces</Text>
          </Center>
        )}
      </Box>

      {recognitions.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">Recognition Log</Text>
          <VStack gap={1} align="stretch" maxH="200px" overflowY="auto">
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
