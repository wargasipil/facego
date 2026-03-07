import {
  Box,
  Container,
  Text,
  VStack,
  HStack,
  Heading,
  Badge,
  Button,
  Spinner,
  Center,
  Flex,
} from '@chakra-ui/react'
import { FiZap, FiCamera, FiCameraOff } from 'react-icons/fi'
import { useState, useEffect, useRef, useCallback } from 'react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import type { Detection } from '@mediapipe/tasks-vision'

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

// ── Canvas drawing ─────────────────────────────────────────────────────────────

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  scaleX: number,
  scaleY: number,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  for (const d of detections) {
    const bb = d.boundingBox
    if (!bb) continue

    const x = bb.originX * scaleX
    const y = bb.originY * scaleY
    const w = bb.width  * scaleX
    const h = bb.height * scaleY

    // Bounding box
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)

    // Score label
    const score = d.categories?.[0]?.score ?? 0
    const label = `${Math.round(score * 100)}%`
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(x, y - 18, ctx.measureText(label).width + 8, 18)
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px sans-serif'
    ctx.fillText(label, x + 4, y - 4)

    // Keypoints (eyes, nose, mouth, ears)
    if (d.keypoints) {
      for (const kp of d.keypoints) {
        ctx.beginPath()
        ctx.arc(kp.x * scaleX, kp.y * scaleY, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#22c55e'
        ctx.fill()
      }
    }
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export default function MediaPipeTestPage() {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const detectorRef = useRef<FaceDetector | null>(null)
  const rafRef      = useRef<number | null>(null)
  const lastTsRef   = useRef<number>(0)

  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [running, setRunning]     = useState(false)
  const [faceCount, setFaceCount] = useState(0)
  const [fps, setFps]             = useState(0)
  const [error, setError]         = useState<string | null>(null)

  // ── Load detector ──
  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    ;(async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
          minSuppressionThreshold: 0.3,
        })
        if (!cancelled) {
          detectorRef.current = detector
          setLoadState('ready')
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message)
          setLoadState('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Detection loop ──
  const detect = useCallback(() => {
    const video    = videoRef.current
    const canvas   = canvasRef.current
    const detector = detectorRef.current
    if (!video || !canvas || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect)
      return
    }

    const now = performance.now()
    const result = detector.detectForVideo(video, now)

    // FPS
    if (lastTsRef.current) {
      setFps(Math.round(1000 / (now - lastTsRef.current)))
    }
    lastTsRef.current = now

    // Scale canvas → video display size
    const rect = video.getBoundingClientRect()
    canvas.width  = rect.width
    canvas.height = rect.height
    const scaleX = rect.width  / video.videoWidth
    const scaleY = rect.height / video.videoHeight

    const ctx = canvas.getContext('2d')!
    drawDetections(ctx, result.detections, scaleX, scaleY)
    setFaceCount(result.detections.length)

    rafRef.current = requestAnimationFrame(detect)
  }, [])

  // ── Start camera ──
  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      })
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setRunning(true)
      rafRef.current = requestAnimationFrame(detect)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [detect])

  // ── Stop camera ──
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const video = videoRef.current
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      video.srcObject = null
    }
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setRunning(false)
    setFaceCount(0)
    setFps(0)
  }, [])

  // cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <Box py={6}>
      <Container maxW="container.xl">
        <VStack gap={6} align="stretch">

          {/* ── Header ── */}
          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <Flex align="center" justify="space-between" mb={4}>
              <HStack gap={2}>
                <FiZap size={16} />
                <Heading size="sm">MediaPipe Face Detection</Heading>
                {loadState === 'loading' && <Badge colorPalette="orange" variant="subtle">Loading model…</Badge>}
                {loadState === 'ready'   && <Badge colorPalette="green"  variant="subtle">Model ready</Badge>}
                {loadState === 'error'   && <Badge colorPalette="red"    variant="subtle">Error</Badge>}
              </HStack>
              <HStack gap={2}>
                {running && (
                  <>
                    <Badge colorPalette="blue" variant="subtle">{faceCount} face{faceCount !== 1 ? 's' : ''}</Badge>
                    <Badge colorPalette="gray" variant="subtle">{fps} fps</Badge>
                  </>
                )}
                <Button
                  size="sm"
                  colorPalette={running ? 'red' : 'blue'}
                  disabled={loadState !== 'ready'}
                  onClick={running ? stopCamera : startCamera}
                >
                  {running ? <><FiCameraOff size={14} /> Stop</> : <><FiCamera size={14} /> Start Camera</>}
                </Button>
              </HStack>
            </Flex>

            {error && (
              <Text fontSize="sm" color="red.500" mb={3}>{error}</Text>
            )}

            {/* ── Video + canvas overlay ── */}
            {loadState === 'loading' && (
              <Center py={16}>
                <VStack gap={3}>
                  <Spinner size="lg" color="blue.500" />
                  <Text fontSize="sm" color="gray.500">Loading MediaPipe model…</Text>
                </VStack>
              </Center>
            )}

            {loadState === 'error' && !running && (
              <Center py={16}>
                <Text fontSize="sm" color="red.500">Failed to load model. Check console for details.</Text>
              </Center>
            )}

            {loadState === 'ready' && !running && (
              <Center py={16} flexDirection="column" gap={3}>
                <Box color="gray.300"><FiCamera size={48} /></Box>
                <Text fontSize="sm" color="gray.400">Click "Start Camera" to begin face detection.</Text>
              </Center>
            )}

            <Box
              position="relative"
              display={running ? 'block' : 'none'}
              borderRadius="md"
              overflow="hidden"
              bg="black"
            >
              <video
                ref={videoRef}
                style={{ display: 'block', width: '100%', height: 'auto' }}
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              />
            </Box>
          </Box>

        </VStack>
      </Container>
    </Box>
  )
}
