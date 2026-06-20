import { useState, useEffect } from 'react';
import {
  VStack, HStack, Heading, Button, FormControl, FormLabel,
  Input, Select, Textarea, useToast, Card, CardHeader,
  CardBody, CardFooter, SimpleGrid, Box, Text, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, useDisclosure, Flex,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { caseApi, clientApi, userApi } from '../services/api';
import { PartyType, UserRole } from '../types';
import type { Client, User } from '../types';

interface RelatedPartyForm {
  name: string;
  party_type: PartyType;
  id_type: string;
  id_number: string;
  phone: string;
  email: string;
  is_individual: boolean;
}

const partyTypeOptions = [
  { value: PartyType.OPPOSING, label: '对方当事人' },
  { value: PartyType.RELATED, label: '关联方' },
];

export default function CaseCreate() {
  const navigate = useNavigate();
  const toast = useToast();

  const [caseName, setCaseName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [partnerId, setPartnerId] = useState<number | ''>('');
  const [relatedParties, setRelatedParties] = useState<RelatedPartyForm[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const partyModal = useDisclosure();
  const clientModal = useDisclosure();
  const [newParty, setNewParty] = useState<RelatedPartyForm>({
    name: '',
    party_type: PartyType.OPPOSING,
    id_type: '',
    id_number: '',
    phone: '',
    email: '',
    is_individual: true,
  });

  const [newClientName, setNewClientName] = useState('');
  const [newClientIdType, setNewClientIdType] = useState('');
  const [newClientIdNumber, setNewClientIdNumber] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientIsIndividual, setNewClientIsIndividual] = useState(true);

  useEffect(() => {
    fetchClients();
    fetchPartners();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await clientApi.list();
      setClients(data);
    } catch {
      // silent
    }
  };

  const fetchPartners = async () => {
    try {
      const data = await userApi.list(UserRole.PARTNER);
      setPartners(data);
    } catch {
      // silent
    }
  };

  const handleAddParty = () => {
    if (!newParty.name.trim()) {
      toast({ title: '请输入名称', status: 'warning' });
      return;
    }
    setRelatedParties([...relatedParties, { ...newParty }]);
    setNewParty({
      name: '',
      party_type: PartyType.OPPOSING,
      id_type: '',
      id_number: '',
      phone: '',
      email: '',
      is_individual: true,
    });
    partyModal.onClose();
  };

  const handleRemoveParty = (index: number) => {
    setRelatedParties(relatedParties.filter((_, i) => i !== index));
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({ title: '请输入客户名称', status: 'warning' });
      return;
    }
    try {
      const client = await clientApi.create({
        name: newClientName,
        id_type: newClientIdType || undefined,
        id_number: newClientIdNumber || undefined,
        phone: newClientPhone || undefined,
        is_individual: newClientIsIndividual,
      });
      setClients([client, ...clients]);
      setClientId(client.id);
      clientModal.onClose();
      setNewClientName('');
      setNewClientIdType('');
      setNewClientIdNumber('');
      setNewClientPhone('');
      toast({ title: '客户创建成功', status: 'success' });
    } catch (err: any) {
      toast({ title: '创建失败', status: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!caseName.trim()) {
      toast({ title: '请输入案件名称', status: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await caseApi.create({
        case_name: caseName,
        case_type: caseType || undefined,
        description: description || undefined,
        client_id: clientId ? clientId : undefined,
        partner_id: partnerId ? partnerId : undefined,
        related_parties: relatedParties.map(p => ({
          name: p.name,
          party_type: p.party_type,
          id_type: p.id_type || undefined,
          id_number: p.id_number || undefined,
          phone: p.phone || undefined,
          email: p.email || undefined,
          is_individual: p.is_individual,
        })),
      });
      toast({ title: '案件创建成功', status: 'success' });
      navigate(`/cases/${result.id}`);
    } catch (err: any) {
      toast({
        title: '创建失败',
        description: err.response?.data?.detail,
        status: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VStack spacing="6" align="stretch">
      <Flex justify="space-between" align="center">
        <HStack>
          <Button variant="ghost" onClick={() => navigate('/cases')}>← 返回</Button>
          <Heading size="lg">新建案件</Heading>
        </HStack>
      </Flex>

      <Card>
        <CardHeader>
          <Heading size="md">基本信息</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing="6">
            <FormControl isRequired>
              <FormLabel>案件名称</FormLabel>
              <Input
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                placeholder="请输入案件名称"
              />
            </FormControl>
            <FormControl>
              <FormLabel>案件类型</FormLabel>
              <Select
                placeholder="请选择"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
              >
                <option value="民事诉讼">民事诉讼</option>
                <option value="刑事诉讼">刑事诉讼</option>
                <option value="行政诉讼">行政诉讼</option>
                <option value="非诉业务">非诉业务</option>
                <option value="法律顾问">法律顾问</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>客户</FormLabel>
              <HStack>
                <Select
                  flex="1"
                  placeholder="选择客户"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value ? parseInt(e.target.value) : '')}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                <Button colorScheme="brand" onClick={clientModal.onOpen}>新建</Button>
              </HStack>
            </FormControl>
            <FormControl>
              <FormLabel>合伙人</FormLabel>
              <Select
                placeholder="选择合伙人"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value ? parseInt(e.target.value) : '')}
              >
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl gridColumn="1 / -1">
              <FormLabel>案件描述</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="请简要描述案件情况"
              />
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Heading size="md">对方当事人与关联方</Heading>
            <Button size="sm" colorScheme="brand" onClick={partyModal.onOpen}>
              添加
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          {relatedParties.length === 0 ? (
            <Text color="gray.400">暂未添加关联方</Text>
          ) : (
            <VStack spacing="3" align="stretch">
              {relatedParties.map((party, index) => (
                <Box key={index} p="4" bg="gray.50" borderRadius="md">
                  <Flex justify="space-between" align="center">
                    <HStack>
                      <Badge colorScheme="blue">
                        {partyTypeOptions.find(o => o.value === party.party_type)?.label}
                      </Badge>
                      <Text fontWeight="medium">{party.name}</Text>
                    </HStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleRemoveParty(index)}
                    >
                      删除
                    </Button>
                  </Flex>
                  {party.phone && <Text fontSize="sm" color="gray.500" mt="1">电话：{party.phone}</Text>}
                </Box>
              ))}
            </VStack>
          )}
        </CardBody>
      </Card>

      <Flex justify="flex-end">
        <HStack>
          <Button variant="ghost" onClick={() => navigate('/cases')}>取消</Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isLoading={submitting}
            loadingText="提交中"
          >
            创建案件
          </Button>
        </HStack>
      </Flex>

      <Modal isOpen={partyModal.isOpen} onClose={partyModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>添加关联方</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl isRequired>
                <FormLabel>类型</FormLabel>
                <Select
                  value={newParty.party_type}
                  onChange={(e) => setNewParty({ ...newParty, party_type: e.target.value as PartyType })}
                >
                  {partyTypeOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>名称</FormLabel>
                <Input
                  value={newParty.name}
                  onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                  placeholder="请输入名称"
                />
              </FormControl>
              <FormControl>
                <FormLabel>证件类型</FormLabel>
                <Input
                  value={newParty.id_type}
                  onChange={(e) => setNewParty({ ...newParty, id_type: e.target.value })}
                  placeholder="如：身份证、统一社会信用代码"
                />
              </FormControl>
              <FormControl>
                <FormLabel>证件号码</FormLabel>
                <Input
                  value={newParty.id_number}
                  onChange={(e) => setNewParty({ ...newParty, id_number: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>联系电话</FormLabel>
                <Input
                  value={newParty.phone}
                  onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={partyModal.onClose}>取消</Button>
            <Button colorScheme="brand" onClick={handleAddParty}>添加</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={clientModal.isOpen} onClose={clientModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>新建客户</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl isRequired>
                <FormLabel>客户名称</FormLabel>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="请输入客户名称"
                />
              </FormControl>
              <FormControl>
                <FormLabel>客户类型</FormLabel>
                <Select
                  value={newClientIsIndividual ? 'individual' : 'company'}
                  onChange={(e) => setNewClientIsIndividual(e.target.value === 'individual')}
                >
                  <option value="individual">个人</option>
                  <option value="company">企业</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>证件类型</FormLabel>
                <Input
                  value={newClientIdType}
                  onChange={(e) => setNewClientIdType(e.target.value)}
                  placeholder="如：身份证、统一社会信用代码"
                />
              </FormControl>
              <FormControl>
                <FormLabel>证件号码</FormLabel>
                <Input
                  value={newClientIdNumber}
                  onChange={(e) => setNewClientIdNumber(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>联系电话</FormLabel>
                <Input
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={clientModal.onClose}>取消</Button>
            <Button colorScheme="brand" onClick={handleCreateClient}>创建</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
