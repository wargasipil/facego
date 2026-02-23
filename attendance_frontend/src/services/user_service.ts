import { createClient } from '@connectrpc/connect'
import { UserService } from '../gen/users/v1/users_pb'
import { transport } from '../lib/transport'

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export const userService = createClient(UserService, transport)
