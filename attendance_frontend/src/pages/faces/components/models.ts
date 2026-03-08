import * as faceapi from 'face-api.js'

export const MODEL_URL       = 'https://justadudewhohacks.github.io/face-api.js/models'
export const DESCRIPTOR_SIZE = 128 * 4   // bytes per Float32Array(128) descriptor
export const MATCH_THRESHOLD = 0.5       // lower = stricter

export type Backend = 'webgl' | 'cpu'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tf = () => (faceapi as any).tf as { setBackend: (b: string) => Promise<void>; getBackend: () => string; ready: () => Promise<void> }

export function getBackend(): Backend {
  return (tf().getBackend() ?? 'webgl') as Backend
}

export function descriptorsToBytes(descriptors: Float32Array[]): Uint8Array {
  const out = new Uint8Array(descriptors.length * DESCRIPTOR_SIZE)
  descriptors.forEach((d, i) => out.set(new Uint8Array(d.buffer), i * DESCRIPTOR_SIZE))
  return out
}

export function bytesToDescriptors(bytes: Uint8Array, count: number): Float32Array[] {
  const result: Float32Array[] = []
  for (let i = 0; i < count; i++) {
    const buf = new ArrayBuffer(DESCRIPTOR_SIZE)
    new Uint8Array(buf).set(bytes.slice(i * DESCRIPTOR_SIZE, (i + 1) * DESCRIPTOR_SIZE))
    result.push(new Float32Array(buf))
  }
  return result
}

let modelsLoaded = false

export async function ensureModels(backend?: Backend) {
  if (backend) {
    await tf().setBackend(backend)
    await tf().ready()
    modelsLoaded = false   // force reload after backend switch
  }
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
  modelsLoaded = true
}
