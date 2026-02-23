import { createClient } from '@connectrpc/connect'
import { TeacherService } from '../gen/teachers/v1/teachers_pb'
import { transport } from '../lib/transport'

export const teacherService = createClient(TeacherService, transport)
