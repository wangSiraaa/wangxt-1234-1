import { useState, useEffect } from 'react';
import {
  VStack, HStack, Heading, Button, Input, Table, Thead, Tbody,
  Tr, Th, Td, Card, CardHeader, CardBody, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, useDisclosure, FormControl,
  FormLabel, Select, Text, Flex, Badge,
} from '@chakra-ui/react';
import { clientApi } from '../services/api';
import type { Client } from '../types';
import dayjs from 'dayjs';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const modal = useDisclosure();

  const [name, setName] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isIndividual, setIsIndividual] = useState(true);
  const [address, setAddress] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await clientApi.list(keyword || undefined);
      setClients(data);
    } catch {
      toast({ title: '获取客户列表失败', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [keyword]);

  const handleSearch = () => {
    fetchClients();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: '请输入客户名称', status: 'warning' });
      return;
    }
    try {
      await clientApi.create({
        name,
        id_type: idType || undefined,
        id_number: idNumber || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        is_individual: isIndividual,
      });
      toast({ title: '创建成功', status: 'success' });
      modal.onClose();
      resetForm();
      fetchClients();
    } catch {
      toast({ title: '创建失败', status: 'error' });
    }
  };

  const resetForm = () => {
    setName('');
    setIdType('');
    setIdNumber('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsIndividual(true);
  };

  return (
    <VStack spacing="6" align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">客户管理</Heading>
        <Button colorScheme="brand" onClick={modal.onOpen}>新建客户</Button>
      </Flex>

      <Flex gap="4" align="center">
        <Input
          placeholder="搜索客户名称或证件号"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          w="300px"
        />
        <Button onClick={handleSearch}>搜索</Button>
      </Flex>

      <Card>
        <CardBody p="0">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>客户名称</Th>
                <Th>类型</Th>
                <Th>证件号码</Th>
                <Th>联系电话</Th>
                <Th>创建时间</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={5} textAlign="center" py="8">加载中...</Td>
                </Tr>
              ) : clients.length === 0 ? (
                <Tr>
                  <Td colSpan={5} textAlign="center" py="8" color="gray.500">
                    暂无客户数据
                  </Td>
                </Tr>
              ) : (
                clients.map((c) => (
                  <Tr key={c.id} _hover={{ bg: 'gray.50' }}>
                    <Td fontWeight="medium">{c.name}</Td>
                    <Td>
                      <Badge colorScheme={c.is_individual ? 'blue' : 'purple'}>
                        {c.is_individual ? '个人' : '企业'}
                      </Badge>
                    </Td>
                    <Td>{c.id_number || '-'}</Td>
                    <Td>{c.phone || '-'}</Td>
                    <Td>{dayjs(c.created_at).format('YYYY-MM-DD')}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>新建客户</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl isRequired>
                <FormLabel>客户名称</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)}
                       placeholder="请输入客户名称" />
              </FormControl>
              <FormControl>
                <FormLabel>客户类型</FormLabel>
                <Select value={isIndividual ? 'individual' : 'company'}
                        onChange={(e) => setIsIndividual(e.target.value === 'individual')}>
                  <option value="individual">个人</option>
                  <option value="company">企业</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>证件类型</FormLabel>
                <Input value={idType} onChange={(e) => setIdType(e.target.value)}
                       placeholder="如：身份证、统一社会信用代码" />
              </FormControl>
              <FormControl>
                <FormLabel>证件号码</FormLabel>
                <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>联系电话</FormLabel>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>电子邮箱</FormLabel>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>地址</FormLabel>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={modal.onClose}>取消</Button>
            <Button colorScheme="brand" onClick={handleCreate}>创建</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
