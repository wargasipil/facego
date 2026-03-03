import { createClient } from '@connectrpc/connect'
import { NotifierService } from '../gen/notifiers/v1/notifier_pb'
import { transport } from '../lib/transport'

export const notifierService = createClient(NotifierService, transport)
