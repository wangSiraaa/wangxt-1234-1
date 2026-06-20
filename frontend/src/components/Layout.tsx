import { ReactNode } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Button, Avatar,
  Menu, MenuButton, MenuList, MenuItem, useColorModeValue
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { UserRole } from '../types';

interface LayoutProps {
  children: ReactNode;
}

const roleLabels: Record<UserRole, string> = {
  [UserRole.PARTNER]: '合伙人',
  [UserRole.RISK_CONTROL]: '风控律师',
  [UserRole.FINANCE]: '财务',
  [UserRole.LAWYER]: '律师',
};

const navItems = [
  { label: '案件管理', path: '/cases', icon: '📋' },
  { label: '客户管理', path: '/clients', icon: '👥' },
];

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Flex h="100vh" bg={bgColor}>
      <Box
        w="240px"
        bg={sidebarBg}
        borderRight="1px"
        borderColor={borderColor}
        display="flex"
        flexDirection="column"
      >
        <VStack p="6" align="stretch" spacing="1">
          <Text fontSize="xl" fontWeight="bold" color="brand.600" mb="4">
            律案通
          </Text>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Button
                key={item.path}
                variant={isActive ? 'solid' : 'ghost'}
                justifyContent="flex-start"
                leftIcon={<span>{item.icon}</span>}
                bg={isActive ? 'brand.500' : undefined}
                color={isActive ? 'white' : undefined}
                _hover={isActive ? { bg: 'brand.600' } : { bg: 'gray.100' }}
                onClick={() => navigate(item.path)}
                mb="1"
              >
                {item.label}
              </Button>
            );
          })}
        </VStack>
        <Box flex="1" />
        <VStack p="4" borderTop="1px" borderColor={borderColor} spacing="3">
          <Menu>
            <MenuButton as={Button} variant="ghost" w="full">
              <HStack spacing="3">
                <Avatar size="sm" name={user?.name} />
                <VStack align="flex-start" spacing="0">
                  <Text fontSize="sm" fontWeight="medium">{user?.name}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {user?.role ? roleLabels[user.role] : ''}
                  </Text>
                </VStack>
              </HStack>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleLogout}>退出登录</MenuItem>
            </MenuList>
          </Menu>
        </VStack>
      </Box>

      <Box flex="1" overflow="auto">
        <Box p="8">{children}</Box>
      </Box>
    </Flex>
  );
}
