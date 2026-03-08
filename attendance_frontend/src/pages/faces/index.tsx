import {
  Box, Container, Flex, HStack, Heading, Badge, Spinner, Text, VStack, Button,
  TabsRoot, TabsList, TabsTrigger, TabsContent,
} from '@chakra-ui/react'
import { FiEye } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { ensureModels, getBackend, type Backend } from './components/models'
import { RegisterTab } from './components/RegisterTab'
import { RecognizeTab } from './components/RecognizeTab'
import { RegisteredTab } from './components/RegisteredTab'

export default function FacesPage() {
  const [modelsReady, setModelsReady] = useState(false)
  const [modelError, setModelError]   = useState<string | null>(null)
  const [modelLoading, setModelLoading] = useState(true)
  const [activeTab, setActiveTab]     = useState('register')
  const [backend, setBackendState]    = useState<Backend>('webgl')

  const loadModels = async (b?: Backend) => {
    setModelLoading(true)
    setModelsReady(false)
    setModelError(null)
    try {
      await ensureModels(b)
      setBackendState(getBackend())
      setModelsReady(true)
    } catch (e) {
      setModelError((e as Error).message)
    } finally {
      setModelLoading(false)
    }
  }

  useEffect(() => { loadModels() }, [])

  const handleBackend = (b: Backend) => {
    if (b === backend && modelsReady) return
    loadModels(b)
  }

  return (
    <Box py={6}>
      <Container maxW="container.lg">
        <VStack gap={6} align="stretch">
          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <Flex align="center" justify="space-between" mb={4}>
              <HStack gap={2}>
                <FiEye size={16} />
                <Heading size="sm">Face Recognition</Heading>
              </HStack>

              <HStack gap={3}>
                {/* Backend toggle */}
                <HStack gap={0} border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden">
                  {(['webgl', 'cpu'] as Backend[]).map(b => (
                    <Button
                      key={b}
                      size="xs"
                      variant={backend === b && modelsReady ? 'solid' : 'ghost'}
                      colorPalette={backend === b && modelsReady ? 'blue' : 'gray'}
                      borderRadius={0}
                      disabled={modelLoading}
                      onClick={() => handleBackend(b)}
                      px={3}
                    >
                      {b === 'webgl' ? 'GPU' : 'CPU'}
                    </Button>
                  ))}
                </HStack>

                {/* Model status */}
                {modelLoading && (
                  <HStack gap={2} color="gray.400">
                    <Spinner size="xs" />
                    <Text fontSize="xs">Loading models…</Text>
                  </HStack>
                )}
                {modelsReady && <Badge colorPalette="green" variant="subtle">Models ready</Badge>}
                {modelError  && <Badge colorPalette="red"   variant="subtle">Model error</Badge>}
              </HStack>
            </Flex>

            {modelError && <Text fontSize="sm" color="red.500" mb={4}>{modelError}</Text>}

            <TabsRoot value={activeTab} onValueChange={d => setActiveTab(d.value)}>
              <TabsList mb={4}>
                <TabsTrigger value="register">Register</TabsTrigger>
                <TabsTrigger value="recognize">Recognize</TabsTrigger>
                <TabsTrigger value="registered">Registered</TabsTrigger>
              </TabsList>
              <TabsContent value="register">
                <RegisterTab modelsReady={modelsReady} active={activeTab === 'register'} />
              </TabsContent>
              <TabsContent value="recognize">
                <RecognizeTab modelsReady={modelsReady} active={activeTab === 'recognize'} />
              </TabsContent>
              <TabsContent value="registered">
                <RegisteredTab active={activeTab === 'registered'} />
              </TabsContent>
            </TabsRoot>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
