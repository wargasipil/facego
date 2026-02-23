import { createClient } from '@connectrpc/connect'
import { GradeService } from '../gen/grades/v1/grades_pb'
import { transport } from '../lib/transport'

export const gradeService = createClient(GradeService, transport)
