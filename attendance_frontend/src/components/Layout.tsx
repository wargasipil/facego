import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Heading,
  Badge,
} from '@chakra-ui/react'
import {
  FiClipboard,
  FiUsers,
  FiBook,
  FiLayers,
  FiAward,
  FiMenu,
  FiX,
  FiCamera,
  FiSettings,
  FiLogOut,
  FiUserCheck,
  FiShield,
  FiMessageSquare,
} from 'react-icons/fi'
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth, type RoleStr } from '../context/AuthContext'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  badge?: string
  allowedRoles?: RoleStr[]
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Attendance', path: '/', icon: <FiClipboard size={18} /> },
    ],
  },
  {
    group: 'People',
    items: [
      { label: 'Students', path: '/students', icon: <FiUsers size={18} />,     allowedRoles: ['admin', 'teacher'] },
      { label: 'Teachers', path: '/teachers', icon: <FiUserCheck size={18} />, allowedRoles: ['admin', 'teacher'] },
    ],
  },
  {
    group: 'Academic',
    items: [
      { label: 'Grades',         path: '/grades',         icon: <FiLayers size={18} />, allowedRoles: ['admin', 'teacher'] },
      { label: 'Study Programs', path: '/study-programs', icon: <FiAward size={18} />,  allowedRoles: ['admin', 'teacher'] },
      { label: 'Classes',        path: '/classes',        icon: <FiBook size={18} />,   allowedRoles: ['admin', 'teacher'] },
    ],
  },
  {
    group: 'Notifications',
    items: [
      { label: 'WhatsApp', path: '/whatsapp', icon: <FiMessageSquare size={18} />, allowedRoles: ['admin', 'teacher'] },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Roles',    path: '/roles',    icon: <FiShield size={18} />,   allowedRoles: ['admin'] },
      { label: 'Settings', path: '/settings', icon: <FiSettings size={18} />, allowedRoles: ['admin'] },
    ],
  },
]

const ROLE_COLOR: Record<RoleStr, string> = {
  admin:    'purple',
  teacher:  'blue',
  operator: 'green',
  student:  'teal',
}

const SIDEBAR_W           = '220px'
const SIDEBAR_W_COLLAPSED = '64px'

export default function Layout() {
  const location      = useLocation()
  const navigate      = useNavigate()
  const { logout, currentUser } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const w = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W

  // Filter nav groups by current user's role
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item =>
      !item.allowedRoles || item.allowedRoles.includes(currentUser!.role)
    ),
  })).filter(group => group.items.length > 0)

  const allVisibleItems = visibleGroups.flatMap(g => g.items)
  const activeLabel     = allVisibleItems.find(n => n.path === location.pathname)?.label ?? 'FaceGo'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Flex h="100vh" overflow="hidden" bg="gray.50">

      {/* ── Sidebar ── */}
      <Box
        w={w}
        h="100vh"
        bg="white"
        borderRight="1px solid"
        borderColor="gray.100"
        shadow="sm"
        flexShrink={0}
        transition="width 0.2s ease"
        overflow="hidden"
        display="flex"
        flexDirection="column"
        position="sticky"
        top={0}
      >
        {/* Logo */}
        <Flex
          align="center"
          justify={collapsed ? 'center' : 'space-between'}
          px={collapsed ? 0 : 4}
          h="64px"
          borderBottom="1px solid"
          borderColor="gray.100"
          flexShrink={0}
        >
          {!collapsed && (
            <HStack gap={2}>
              <Box
                w={8} h={8}
                bg="blue.500"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="white"
                flexShrink={0}
              >
                <FiCamera size={16} />
              </Box>
              <Heading size="sm" color="gray.800" whiteSpace="nowrap">FaceGo</Heading>
            </HStack>
          )}
          <Box
            as="button"
            onClick={() => setCollapsed(c => !c)}
            p={2}
            borderRadius="md"
            color="gray.500"
            _hover={{ bg: 'gray.100', color: 'gray.700' }}
            cursor="pointer"
            flexShrink={0}
          >
            {collapsed ? <FiMenu size={18} /> : <FiX size={18} />}
          </Box>
        </Flex>

        {/* Nav groups */}
        <VStack gap={0} align="stretch" p={2} flex={1} overflowY="auto">
          {visibleGroups.map((group, gi) => (
            <Box key={group.group} mt={gi === 0 ? 1 : 0}>
              {!collapsed && (
                <Text
                  fontSize="10px"
                  color="gray.400"
                  fontWeight="bold"
                  px={3}
                  pt={gi === 0 ? 2 : 4}
                  pb={1}
                  textTransform="uppercase"
                  letterSpacing="wider"
                  whiteSpace="nowrap"
                >
                  {group.group}
                </Text>
              )}
              {collapsed && gi > 0 && (
                <Box mx={3} my={2} h="1px" bg="gray.100" />
              )}
              <VStack gap={0.5} align="stretch">
                {group.items.map(item => (
                  <SidebarLink key={item.path} item={item} collapsed={collapsed} />
                ))}
              </VStack>
            </Box>
          ))}
        </VStack>

        {/* User info + sign out */}
        <Box p={2} borderTop="1px solid" borderColor="gray.100" flexShrink={0}>
          {/* Current user */}
          {!collapsed && currentUser && (
            <Flex
              align="center"
              gap={2}
              px={3}
              py={2}
              mb={1}
              borderRadius="md"
              bg="gray.50"
            >
              <Box
                w={7} h={7}
                bg={`${ROLE_COLOR[currentUser.role]}.100`}
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <Text fontSize="xs" fontWeight="bold" color={`${ROLE_COLOR[currentUser.role]}.700`}>
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </Text>
              </Box>
              <Box minW={0}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.700" truncate>
                  {currentUser.displayName}
                </Text>
                <Badge
                  colorPalette={ROLE_COLOR[currentUser.role]}
                  variant="subtle"
                  size="xs"
                  textTransform="capitalize"
                >
                  {currentUser.role}
                </Badge>
              </Box>
            </Flex>
          )}

          {/* Sign out */}
          <Flex
            as="button"
            w="full"
            align="center"
            gap={3}
            px={collapsed ? 0 : 3}
            py={2}
            borderRadius="md"
            justify={collapsed ? 'center' : 'flex-start'}
            color="gray.500"
            fontSize="sm"
            _hover={{ bg: 'red.50', color: 'red.500' }}
            cursor="pointer"
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
          >
            <FiLogOut size={18} />
            {!collapsed && <Text whiteSpace="nowrap">Sign out</Text>}
          </Flex>
        </Box>
      </Box>

      {/* ── Main ── */}
      <Flex flex={1} direction="column" minW={0} h="100vh" overflow="hidden">
        {/* Top bar */}
        <Flex
          h="64px"
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.100"
          align="center"
          px={6}
          justify="space-between"
          flexShrink={0}
          shadow="xs"
        >
          <Heading size="sm" color="gray.700">{activeLabel}</Heading>
          <HStack gap={3}>
            <Badge colorPalette="green" variant="subtle" size="sm">Live</Badge>
            <Text fontSize="sm" color="gray.500">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </HStack>
        </Flex>

        {/* Page content */}
        <Box flex={1} overflow="auto">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation()
  const isActive = location.pathname === item.path

  return (
    <NavLink to={item.path} style={{ textDecoration: 'none' }}>
      <Flex
        align="center"
        gap={3}
        px={collapsed ? 0 : 3}
        py={2}
        borderRadius="md"
        justify={collapsed ? 'center' : 'flex-start'}
        bg={isActive ? 'blue.50' : 'transparent'}
        color={isActive ? 'blue.600' : 'gray.600'}
        fontWeight={isActive ? 'semibold' : 'normal'}
        fontSize="sm"
        transition="all 0.15s"
        _hover={{ bg: isActive ? 'blue.50' : 'gray.50', color: isActive ? 'blue.600' : 'gray.800' }}
        cursor="pointer"
        position="relative"
        title={collapsed ? item.label : undefined}
      >
        {isActive && (
          <Box
            position="absolute"
            left={0}
            top="20%"
            h="60%"
            w="3px"
            bg="blue.500"
            borderRadius="full"
          />
        )}
        <Box flexShrink={0}>{item.icon}</Box>
        {!collapsed && <Text whiteSpace="nowrap">{item.label}</Text>}
        {!collapsed && item.badge && (
          <Badge colorPalette="blue" variant="solid" size="xs" ml="auto">{item.badge}</Badge>
        )}
      </Flex>
    </NavLink>
  )
}

