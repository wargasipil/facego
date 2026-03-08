import {
  Box, Button, Flex, HStack, Text, VStack, Badge, Center,
} from '@chakra-ui/react'
import { FiCamera, FiCameraOff, FiUserPlus, FiX, FiCheck } from 'react-icons/fi'
import { useState, useEffect, useRef, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { type User } from '../../../gen/users/v1/users_pb'
import { faceService } from '../../../services/face_service'
import { descriptorsToBytes } from './models'
import { StudentSearch } from './StudentSearch'

interface Props {
  modelsReady: boolean
  active: boolean
}

interface Sample {
  descriptor: Float32Array
  dataUrl: string
}

const MAX_SAMPLES = 15

export function RegisterTab({ modelsReady, active }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  const overlayRef   = useRef<HTMLCanvasElement>(null)   // live bounding box overlay
  const capturingRef = useRef(false)                     // pause loop during capture

  const [running, setRunning]           = useState(false)
  const [selected, setSelected]         = useState<User | null>(null)
  const [samples, setSamples]           = useState<Sample[]>([])
  const [capturing, setCapturing]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [status, setStatus]             = useState<{ ok: boolean; text: string } | null>(null)
  const [faceDetected, setFaceDetected] = useState(false)
  const detectLoopRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopCamera = useCallback(() => {
    if (detectLoopRef.current) clearTimeout(detectLoopRef.current)
    const video = videoRef.current
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      video.srcObject = null
    }
    const ov = overlayRef.current
    if (ov) ov.getContext('2d')?.clearRect(0, 0, ov.width, ov.height)
    setRunning(false)
    setFaceDetected(false)
  }, [])

  const startCamera = useCallback(async () => {
    setStatus(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setRunning(true)

      const loop = async () => {
        const video = videoRef.current
        if (!video?.srcObject) return
        if (video.readyState >= 2 && !capturingRef.current) {
          const det = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
          setFaceDetected(!!det)
          const ov = overlayRef.current
          if (ov) {
            const rect = video.getBoundingClientRect()
            ov.width  = rect.width
            ov.height = rect.height
            const ctx = ov.getContext('2d')!
            ctx.clearRect(0, 0, ov.width, ov.height)
            if (det) {
              const resized = faceapi.resizeResults(det, { width: rect.width, height: rect.height })
              const bb = resized.box
              ctx.strokeStyle = '#22c55e'
              ctx.lineWidth = 2
              ctx.strokeRect(bb.x, bb.y, bb.width, bb.height)
            }
          }
        }
        detectLoopRef.current = setTimeout(loop, 400)
      }
      loop()
    } catch (e) {
      setStatus({ ok: false, text: (e as Error).message })
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])
  useEffect(() => { if (!active) stopCamera() }, [active, stopCamera])

  const handleCapture = async () => {
    if (!videoRef.current) return
    capturingRef.current = true
    setCapturing(true)
    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!det) { setStatus({ ok: false, text: 'No face detected. Adjust position and try again.' }); return }

      // Draw to off-screen canvas → dataUrl thumbnail
      const tmp = document.createElement('canvas')
      tmp.width  = videoRef.current.videoWidth
      tmp.height = videoRef.current.videoHeight
      const ctx = tmp.getContext('2d')!
      ctx.drawImage(videoRef.current, 0, 0)
      const bb = det.detection.box
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 3
      ctx.strokeRect(bb.x, bb.y, bb.width, bb.height)
      const dataUrl = tmp.toDataURL('image/jpeg', 0.7)

      setSamples(prev => {
        if (prev.length >= MAX_SAMPLES) return prev
        setStatus({ ok: true, text: `Sample ${prev.length + 1} captured.` })
        return [...prev, { descriptor: det.descriptor, dataUrl }]
      })
    } catch (e) {
      console.error('Capture error:', e)
      setStatus({ ok: false, text: (e as Error).message })
    } finally {
      capturingRef.current = false
      setCapturing(false)
    }
  }

  const handleSave = async () => {
    if (!selected || samples.length === 0) return
    setSaving(true)
    setStatus(null)
    try {
      await faceService.upsertFaceEmbeddings({
        record: {
          studentId: selected.id,
          embeddings: descriptorsToBytes(samples.map(s => s.descriptor)),
          embeddingCount: samples.length,
        },
      })
      setStatus({ ok: true, text: `Saved ${samples.length} sample(s) for ${selected.name}.` })
      setSamples([])
    } catch (e) {
      console.error('Save face error:', e)
      setStatus({ ok: false, text: String(e) })
    } finally {
      setSaving(false)
    }
  }

  const clearAll = () => { setSamples([]); setStatus(null) }

  return (
    <VStack gap={4} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">Student</Text>
        <StudentSearch
          selected={selected}
          onSelect={s => { setSelected(s); clearAll() }}
          onClear={() => { setSelected(null); clearAll() }}
        />
      </Box>

      <Box>
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="medium" color="gray.700">Camera</Text>
          <HStack gap={2}>
            {running && faceDetected  && <Badge colorPalette="green"  variant="subtle">Face detected</Badge>}
            {running && !faceDetected && <Badge colorPalette="orange" variant="subtle">No face</Badge>}
          </HStack>
        </Flex>

        <Box borderRadius="md" overflow="hidden" bg="black" position="relative" mb={2}>
          <video ref={videoRef} style={{ display: 'block', width: '100%', height: 'auto' }} muted playsInline />
          <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
          {!running && (
            <Center position="absolute" inset={0} bg="gray.900" color="gray.500" flexDirection="column" gap={2} minH="200px">
              <FiCamera size={32} />
              <Text fontSize="sm">Camera off</Text>
            </Center>
          )}
        </Box>

        <HStack gap={2} wrap="wrap">
          <Button size="sm" colorPalette={running ? 'red' : 'blue'}
            onClick={running ? stopCamera : startCamera} disabled={!modelsReady}
          >
            {running
              ? <><FiCameraOff size={14} /> Stop</>
              : <><FiCamera size={14} /> Start Camera</>
            }
          </Button>
          {running && (
            <Button size="sm" colorPalette="green"
              disabled={capturing || samples.length >= MAX_SAMPLES} loading={capturing} loadingText="Capturing…"
              onClick={handleCapture}
            >
              <FiUserPlus size={14} /> Capture Sample
            </Button>
          )}
          {samples.length > 0 && (
            <Button size="sm" variant="outline" colorPalette="gray" onClick={clearAll}>
              <FiX size={14} /> Clear All
            </Button>
          )}
        </HStack>
      </Box>

      {/* Sample thumbnails */}
      {samples.length > 0 && (
        <Box>
          <Flex align="center" justify="space-between" mb={1.5}>
            <Text fontSize="xs" fontWeight="medium" color="gray.500">
              Samples captured
            </Text>
            <Badge colorPalette={samples.length >= MAX_SAMPLES ? 'orange' : 'green'} variant="subtle" size="sm">
              {samples.length} / {MAX_SAMPLES}
            </Badge>
          </Flex>
          <HStack gap={2} overflowX="auto" px={1} pt={1} pb={2}>
            {samples.map((s, i) => (
              <Box key={i} position="relative" flexShrink={0}>
                <img
                  src={s.dataUrl}
                  style={{ width: '128px', height: '96px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #86efac', display: 'block' }}
                />
                <Box
                  as="button"
                  position="absolute"
                  top="2px"
                  right="2px"
                  w="16px"
                  h="16px"
                  borderRadius="full"
                  bg="blackAlpha.700"
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  onClick={() => setSamples(prev => prev.filter((_, j) => j !== i))}
                  _hover={{ bg: 'red.500' }}
                >
                  <FiX size={9} />
                </Box>
              </Box>
            ))}
          </HStack>
        </Box>
      )}

      {status && (
        <Text fontSize="sm" color={status.ok ? 'green.600' : 'red.500'}>{status.text}</Text>
      )}

      <Button
        colorPalette="blue"
        disabled={!selected || samples.length === 0 || saving}
        loading={saving} loadingText="Saving…"
        onClick={handleSave}
      >
        <FiCheck size={14} /> Save Face Data ({samples.length} sample{samples.length !== 1 ? 's' : ''})
      </Button>
    </VStack>
  )
}
