import { createClient } from '@connectrpc/connect'
import { StudyProgramService } from '../gen/study_programs/v1/study_programs_pb'
import { transport } from '../lib/transport'

export const studyProgramService = createClient(StudyProgramService, transport)
