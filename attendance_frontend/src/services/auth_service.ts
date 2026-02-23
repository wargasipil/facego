import { createClient } from '@connectrpc/connect'
import { AuthService } from '../gen/auth/v1/auth_pb'
import { transport } from '../lib/transport'

export const authService = createClient(AuthService, transport)
