import { useState } from 'react';
import {
  Box, Flex, VStack, Heading, FormControl, FormLabel,
  Input, Button, useToast, Text, Link, Card, CardBody
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast({ title: '登录成功', status: 'success', duration: 2000 });
      navigate('/cases');
    } catch (err: any) {
      toast({
        title: '登录失败',
        description: err.response?.data?.detail || '请检查用户名和密码',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { username: 'partner', label: '合伙人' },
    { username: 'risk', label: '风控律师' },
    { username: 'finance', label: '财务' },
    { username: 'lawyer1', label: '律师' },
  ];

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box w="full" maxW="md" px="6">
        <VStack spacing="8" mb="8">
          <Heading size="xl" color="brand.600">律案通</Heading>
          <Text color="gray.500">律所案件承接管理系统</Text>
        </VStack>

        <Card>
          <CardBody p="8">
            <form onSubmit={handleSubmit}>
              <VStack spacing="4">
                <FormControl isRequired>
                  <FormLabel>用户名</FormLabel>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    size="lg"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>密码</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    size="lg"
                  />
                </FormControl>
                <Button
                  type="submit"
                  colorScheme="brand"
                  size="lg"
                  w="full"
                  isLoading={loading}
                  loadingText="登录中"
                >
                  登录
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>

        <Box mt="6" p="4" bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200">
          <Text fontSize="sm" color="gray.500" mb="3">演示账号（密码均为 123456）：</Text>
          <Flex wrap="wrap" gap="2">
            {demoAccounts.map((acc) => (
              <Button
                key={acc.username}
                size="sm"
                variant="outline"
                onClick={() => {
                  setUsername(acc.username);
                  setPassword('123456');
                }}
              >
                {acc.label}
              </Button>
            ))}
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
}
