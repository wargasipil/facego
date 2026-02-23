import { Box, Text } from '@chakra-ui/react'

interface StatCardProps {
  label: string
  value: number
  color?: string
}

export function StatCard({ label, value, color = 'blue' }: StatCardProps) {
  return (
    <Box bg="white" borderRadius="lg" shadow="sm" p={4} flex={1}>
      <Text fontSize="xs" color="gray.500" fontWeight="medium" textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color={`${color}.500`} mt={1}>
        {value}
      </Text>
    </Box>
  )
}
