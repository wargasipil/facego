import { createClient } from '@connectrpc/connect'
import { WhatsappService } from '../gen/whatsapp/v1/whatsapp_pb'
import { transport } from '../lib/transport'

export const whatsappService = createClient(WhatsappService, transport)
