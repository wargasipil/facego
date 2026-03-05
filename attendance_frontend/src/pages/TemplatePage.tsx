import {
  Box,
  Container,
  Text,
  VStack,
  Heading,
  Button,
  Textarea,
  Field,
} from '@chakra-ui/react'
import { FiSave } from 'react-icons/fi'
import { useState, useEffect, useCallback } from 'react'
import { type WhatsappConfig } from '../gen/whatsapp/v1/whatsapp_pb'
import { whatsappService } from '../services/whatsapp_service'

export default function TemplatePage() {
  const [config, setConfig]             = useState<WhatsappConfig | null>(null)
  const [lateTmpl, setLateTmpl]         = useState('')
  const [absentTmpl, setAbsentTmpl]     = useState('')
  const [configSaving, setConfigSaving] = useState(false)
  const [configMsg, setConfigMsg]       = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const r = await whatsappService.getConfig({})
      if (r.config) {
        setConfig(r.config)
        setLateTmpl(r.config.lateMessageTemplate)
        setAbsentTmpl(r.config.absentMessageTemplate)
      }
    } catch {}
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleSave = async () => {
    setConfigSaving(true)
    setConfigMsg(null)
    try {
      await whatsappService.saveConfig({
        config: {
          enabled:               config?.enabled ?? true,
          lateMessageTemplate:   lateTmpl,
          absentMessageTemplate: absentTmpl,
        },
      })
      setConfigMsg('Templates saved.')
    } catch (e: unknown) {
      setConfigMsg('Failed to save: ' + (e as Error).message)
    } finally {
      setConfigSaving(false)
    }
  }

  return (
    <Box py={6}>
      <Container maxW="container.md">
        <VStack gap={6} align="stretch">

          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <Heading size="sm" mb={1}>Message Templates</Heading>
            <Text fontSize="xs" color="gray.500" mb={4}>
              Available variables: <code>{'{{.StudentName}}'}</code>, <code>{'{{.ClassName}}'}</code>, <code>{'{{.Day}}'}</code>
            </Text>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>Late Message Template</Field.Label>
                <Textarea
                  value={lateTmpl}
                  onChange={e => setLateTmpl(e.target.value)}
                  rows={5}
                  placeholder="e.g. Assalamualaikum, ananda {{.StudentName}} dari kelas {{.ClassName}} datang terlambat pada {{.Day}}."
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Absent Message Template</Field.Label>
                <Textarea
                  value={absentTmpl}
                  onChange={e => setAbsentTmpl(e.target.value)}
                  rows={5}
                  placeholder="e.g. Assalamualaikum, ananda {{.StudentName}} dari kelas {{.ClassName}} tidak hadir pada {{.Day}}."
                />
              </Field.Root>
              {configMsg && (
                <Text fontSize="sm" color={configMsg.startsWith('Failed') ? 'red.500' : 'green.600'}>
                  {configMsg}
                </Text>
              )}
              <Box>
                <Button size="sm" colorPalette="blue" loading={configSaving} onClick={handleSave}>
                  <FiSave />
                  Save Templates
                </Button>
              </Box>
            </VStack>
          </Box>

        </VStack>
      </Container>
    </Box>
  )
}
