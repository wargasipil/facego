import { createClient } from '@connectrpc/connect'
import { ClassService } from '../gen/classes/v1/classes_pb'
import { transport } from '../lib/transport'

export const classService = createClient(ClassService, transport)
