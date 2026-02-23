import { createClient } from '@connectrpc/connect'
import { AttendanceService } from '../gen/attendance/v1/attendance_pb'
import { transport } from '../lib/transport'

export const attendanceService = createClient(AttendanceService, transport)
