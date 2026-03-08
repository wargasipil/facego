import { Box, Flex, Text, VStack, Badge } from '@chakra-ui/react'
import { FiList } from 'react-icons/fi'

export type Recognition = {
  name: string
  studentId: string
  distance: number
  time: string
}

interface Props {
  recognitions: Recognition[]
  running: boolean
  classId: number | null
}

export function AttendanceStream({ recognitions, running }: Props) {
  return (
    <Flex direction="column" h="100%" borderRadius="md" border="1px solid" borderColor="gray.200" overflow="hidden">
      {/* Header */}
      <Flex px={3} py={2} align="center" gap={2} borderBottom="1px solid" borderColor="gray.100" bg="gray.50" flexShrink={0}>
        <FiList size={14} />
        <Text fontSize="sm" fontWeight="semibold" color="gray.700">Detection Log</Text>
      </Flex>

      {/* List */}
      <Box flex={1} overflowY="auto" p={2}>
        {recognitions.length === 0 ? (
          <Flex direction="column" align="center" justify="center" h="100%" gap={2} color="gray.400" minH="120px">
            <FiList size={24} />
            <Text fontSize="xs" textAlign="center">
              {running ? 'No faces recognized yet' : 'Start recognition to see detections'}
            </Text>
          </Flex>
        ) : (
          <VStack gap={1} align="stretch">
            {recognitions.map((r, i) => (
              <Flex
                key={i}
                px={3} py={2}
                borderRadius="md"
                bg={i === 0 ? 'blue.50' : 'white'}
                border="1px solid"
                borderColor={i === 0 ? 'blue.200' : 'gray.100'}
                align="center"
                gap={2}
              >
                <Box w={2} h={2} borderRadius="full" bg="blue.400" flexShrink={0} />
                <Box flex={1} minW={0}>
                  <Text fontSize="sm" fontWeight="medium" lineClamp={1}>{r.name}</Text>
                  <Text fontSize="xs" color="gray.500">{r.studentId}</Text>
                </Box>
                <Flex direction="column" align="flex-end" gap={0.5} flexShrink={0}>
                  <Badge colorPalette="blue" variant="subtle" fontSize="xs">
                    {Math.round((1 - r.distance) * 100)}%
                  </Badge>
                  <Text fontSize="xs" color="gray.400">{r.time}</Text>
                </Flex>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>
    </Flex>
  )
}
