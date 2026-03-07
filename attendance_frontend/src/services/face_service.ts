import { createClient } from '@connectrpc/connect'
import { FaceEmbeddingService } from '../gen/faces/v1/faces_pb'
import { transport } from '../lib/transport'

export const faceService = createClient(FaceEmbeddingService, transport)
