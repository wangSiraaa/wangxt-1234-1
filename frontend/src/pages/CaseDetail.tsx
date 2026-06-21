import { useState, useEffect } from 'react';
import {
  VStack, HStack, Flex, Heading, Button, FormControl, FormLabel,
  Input, Select, Textarea, useToast, Box, SimpleGrid,
  Badge, Divider, Text, Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, useDisclosure, Accordion,
  AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Card, CardHeader, CardBody, CardFooter, Tag,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  caseApi, conflictApi, budgetApi, materialApi, materialSupplementApi, userApi, clientApi
} from '../services/api';
import type { CaseDetail, MaterialSupplement } from '../types';
import { ConflictResult, BudgetStatus, MaterialType, PartyType, UserRole, CaseStatus, MaterialSupplementStatus } from '../types';
import { useAuthStore } from '../hooks/useAuthStore';
import dayjs from 'dayjs';

const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending: '待冲突检查',
  conflict_checked: '冲突已检查',
  budget_confirmed: '预算已确认',
  accepted: '已承接',
  rejected: '已驳回',
  archived: '已归档',
};

const statusColors: Record<string, string> = {
  draft: 'gray',
  pending: 'yellow',
  conflict_checked: 'blue',
  budget_confirmed: 'purple',
  accepted: 'green',
  rejected: 'red',
  archived: 'gray',
};

const conflictLabels: Record<ConflictResult, string> = {
  no_conflict: '无冲突',
  indirect_conflict: '间接冲突',
  direct_conflict: '直接冲突',
};

const conflictColors: Record<ConflictResult, string> = {
  no_conflict: 'green',
  indirect_conflict: 'yellow',
  direct_conflict: 'red',
};

const budgetStatusLabels: Record<BudgetStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  rejected: '已拒绝',
};

const budgetStatusColors: Record<BudgetStatus, string> = {
  pending: 'yellow',
  confirmed: 'green',
  rejected: 'red',
};

const partyTypeLabels: Record<PartyType, string> = {
  client: '我方客户',
  opposing: '对方当事人',
  related: '关联方',
};

const materialTypeLabels: Record<MaterialType, string> = {
  contract: '合同',
  evidence: '证据',
  power_of_attorney: '授权委托书',
  other: '其他',
};

const supplementStatusLabels: Record<MaterialSupplementStatus, string> = {
  pending: '待补充',
  completed: '已补齐',
  cancelled: '已取消',
};

const supplementStatusColors: Record<MaterialSupplementStatus, string> = {
  pending: 'orange',
  completed: 'green',
  cancelled: 'gray',
};

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lawyers, setLawyers] = useState<Array<{ id: number; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);

  const [conflictResult, setConflictResult] = useState<ConflictResult | ''>('');
  const [conflictDetails, setConflictDetails] = useState('');
  const [riskSuggestion, setRiskSuggestion] = useState('');

  const [totalAmount, setTotalAmount] = useState('');
  const [advancePayment, setAdvancePayment] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [budgetRemarks, setBudgetRemarks] = useState('');

  const [materialName, setMaterialName] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>(MaterialType.OTHER);
  const [materialDesc, setMaterialDesc] = useState('');
  const [isSupplementary, setIsSupplementary] = useState(false);

  const [supplementTitle, setSupplementTitle] = useState('');
  const [supplementDesc, setSupplementDesc] = useState('');
  const [completingSupplementId, setCompletingSupplementId] = useState<number | null>(null);
  const [completeRemark, setCompleteRemark] = useState('');

  const conflictModal = useDisclosure();
  const budgetModal = useDisclosure();
  const materialModal = useDisclosure();
  const supplementModal = useDisclosure();
  const completeSupplementModal = useDisclosure();

  const isPartner = user?.role === UserRole.PARTNER;
  const isRisk = user?.role === UserRole.RISK_CONTROL;
  const isFinance = user?.role === UserRole.FINANCE;
  const isArchived = caseData?.status === 'archived';
  const isRejected = caseData?.status === 'rejected';

  const pendingSupplements = caseData?.material_supplements?.filter(
    s => s.status === MaterialSupplementStatus.PENDING
  ) || [];

  useEffect(() => {
    fetchCaseDetail();
    fetchLawyers();
    fetchClients();
  }, [id]);

  const fetchCaseDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await caseApi.get(parseInt(id));
      setCaseData(data);
      if (data.conflict_check) {
        setConflictResult(data.conflict_check.result);
        setConflictDetails(data.conflict_check.conflict_details || '');
        setRiskSuggestion(data.conflict_check.risk_suggestion || '');
      }
      if (data.budget) {
        setTotalAmount(data.budget.total_amount.toString());
        setAdvancePayment(data.budget.advance_payment?.toString() || '');
        setPaymentTerms(data.budget.payment_terms || '');
        setBudgetRemarks(data.budget.remarks || '');
      }
    } catch (err: any) {
      toast({ title: '获取案件详情失败', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLawyers = async () => {
    try {
      const data = await userApi.list(UserRole.LAWYER);
      setLawyers(data.map(u => ({ id: u.id, name: u.name })));
    } catch {
      // silent
    }
  };

  const fetchClients = async () => {
    try {
      const data = await clientApi.list();
      setClients(data.map(c => ({ id: c.id, name: c.name })));
    } catch {
      // silent
    }
  };

  const handleSubmitConflict = async () => {
    if (!caseData || !conflictResult) return;
    try {
      await conflictApi.create({
        case_id: caseData.id,
        result: conflictResult,
        conflict_details: conflictDetails,
        risk_suggestion: riskSuggestion,
      });
      toast({ title: '冲突检查提交成功', status: 'success' });
      conflictModal.onClose();
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '提交失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleSubmitBudget = async () => {
    if (!caseData || !totalAmount) return;
    try {
      await budgetApi.create({
        case_id: caseData.id,
        total_amount: parseFloat(totalAmount),
        advance_payment: advancePayment ? parseFloat(advancePayment) : undefined,
        payment_terms: paymentTerms,
        remarks: budgetRemarks,
      });
      toast({ title: '预算保存成功', status: 'success' });
      budgetModal.onClose();
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '保存失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleConfirmBudget = async (confirm: boolean) => {
    if (!caseData?.budget?.id) return;
    try {
      if (confirm) {
        await budgetApi.confirm(caseData.budget.id);
      } else {
        await budgetApi.reject(caseData.budget.id);
      }
      toast({ title: confirm ? '预算已确认' : '预算已拒绝', status: 'success' });
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '操作失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleAddMaterial = async () => {
    if (!caseData || !materialName) return;
    try {
      await materialApi.add({
        case_id: caseData.id,
        material_name: materialName,
        material_type: materialType,
        description: materialDesc,
        is_supplementary: isSupplementary,
      });
      toast({ title: '材料添加成功', status: 'success' });
      setMaterialName('');
      setMaterialDesc('');
      setIsSupplementary(false);
      materialModal.onClose();
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '添加失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    try {
      await materialApi.delete(materialId);
      toast({ title: '删除成功', status: 'success' });
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '删除失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleCreateSupplement = async () => {
    if (!caseData || !supplementTitle) return;
    try {
      await materialSupplementApi.create({
        case_id: caseData.id,
        title: supplementTitle,
        description: supplementDesc,
      });
      toast({ title: '材料补充要求已发起', status: 'success' });
      setSupplementTitle('');
      setSupplementDesc('');
      supplementModal.onClose();
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '发起失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleOpenCompleteSupplement = (supplementId: number) => {
    setCompletingSupplementId(supplementId);
    setCompleteRemark('');
    completeSupplementModal.onOpen();
  };

  const handleCompleteSupplement = async () => {
    if (!completingSupplementId) return;
    try {
      await materialSupplementApi.complete(completingSupplementId, completeRemark || undefined);
      toast({ title: '已标记为已补齐', status: 'success' });
      completeSupplementModal.onClose();
      setCompletingSupplementId(null);
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '操作失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleCancelSupplement = async (supplementId: number) => {
    try {
      await materialSupplementApi.cancel(supplementId);
      toast({ title: '已取消补充要求', status: 'success' });
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '取消失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleAssignLawyer = async (lawyerId: number) => {
    if (!caseData) return;
    try {
      await caseApi.assignLawyer(caseData.id, lawyerId);
      toast({ title: '律师分配成功', status: 'success' });
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '分配失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleSubmitForConflict = async () => {
    if (!caseData) return;
    try {
      await caseApi.submitConflict(caseData.id);
      toast({ title: '已提交冲突检查', status: 'success' });
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '提交失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleAcceptCase = async () => {
    if (!caseData) return;
    try {
      await caseApi.accept(caseData.id);
      toast({ title: '案件已承接', status: 'success' });
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '承接失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  const handleArchiveCase = async () => {
    if (!caseData) return;
    try {
      await caseApi.archive(caseData.id);
      toast({ title: '案件已归档', status: 'success' });
      fetchCaseDetail();
    } catch (err: any) {
      toast({ title: '归档失败', description: err.response?.data?.detail, status: 'error' });
    }
  };

  if (loading) {
    return <Box p="8">加载中...</Box>;
  }

  if (!caseData) {
    return <Box p="8">案件不存在</Box>;
  }

  return (
    <VStack spacing="6" align="stretch">
      <Flex justify="space-between" align="center">
        <HStack>
          <Button variant="ghost" onClick={() => navigate('/cases')}>← 返回</Button>
          <Heading size="lg">{caseData.case_name}</Heading>
          <Badge colorScheme={statusColors[caseData.status]} fontSize="md" px="3" py="1">
            {statusLabels[caseData.status]}
          </Badge>
        </HStack>
        <HStack>
          {isPartner && caseData.status === 'draft' && (
            <Button colorScheme="brand" onClick={handleSubmitForConflict}>
              提交冲突检查
            </Button>
          )}
          {isPartner && caseData.status === 'budget_confirmed' && (
            <Button colorScheme="green" onClick={handleAcceptCase}>
              确认承接
            </Button>
          )}
          {isPartner && caseData.status === 'accepted' && (
            <Button colorScheme="gray" onClick={handleArchiveCase}>
              归档案件
            </Button>
          )}
        </HStack>
      </Flex>

      {pendingSupplements.length > 0 && (
        <Box p="4" bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
          <HStack>
            <Text color="orange.600" fontWeight="medium">
              ⚠️ 有 {pendingSupplements.length} 项材料待补充
            </Text>
            <Text color="orange.500" fontSize="sm">
              请尽快补齐相关材料
            </Text>
          </HStack>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing="6">
        <Card>
          <CardHeader pb="2">
            <Heading size="md">基本信息</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing="3" align="stretch">
              <SimpleGrid columns={2} spacing="4">
                <Box>
                  <Text fontSize="sm" color="gray.500">案号</Text>
                  <Text fontWeight="medium">{caseData.case_number || '-'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">案件类型</Text>
                  <Text fontWeight="medium">{caseData.case_type || '-'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">客户</Text>
                  <Text fontWeight="medium">{caseData.client?.name || '-'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">合伙人</Text>
                  <Text fontWeight="medium">{caseData.partner?.name || '-'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">承办律师</Text>
                  {caseData.assigned_lawyer ? (
                    <Text fontWeight="medium">{caseData.assigned_lawyer.name}</Text>
                  ) : (
                    <HStack>
                      <Text color="gray.400">未分配</Text>
                      {isPartner && (caseData.status === CaseStatus.BUDGET_CONFIRMED || caseData.status === CaseStatus.ACCEPTED) && (
                        <Select
                          size="sm"
                          w="140px"
                          placeholder="分配律师"
                          onChange={(e) => e.target.value && handleAssignLawyer(parseInt(e.target.value))}
                        >
                          {lawyers.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </Select>
                      )}
                    </HStack>
                  )}
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">创建时间</Text>
                  <Text fontWeight="medium">{dayjs(caseData.created_at).format('YYYY-MM-DD')}</Text>
                </Box>
              </SimpleGrid>
              <Box>
                <Text fontSize="sm" color="gray.500" mb="1">案件描述</Text>
                <Text>{caseData.description || '暂无描述'}</Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb="2">
            <Flex justify="space-between" align="center">
              <Heading size="md">利益冲突检查</Heading>
              {isRisk && !isArchived && (
                <Button size="sm" colorScheme="brand" onClick={conflictModal.onOpen}>
                  {caseData.conflict_check ? '修改' : '录入'}
                </Button>
              )}
            </Flex>
          </CardHeader>
          <CardBody>
            {caseData.conflict_check ? (
              <VStack spacing="3" align="stretch">
                <HStack>
                  <Text fontSize="sm" color="gray.500">检查结果：</Text>
                  <Badge colorScheme={conflictColors[caseData.conflict_check.result]}>
                    {conflictLabels[caseData.conflict_check.result]}
                  </Badge>
                </HStack>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb="1">冲突详情</Text>
                  <Text>{caseData.conflict_check.conflict_details || '无'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb="1">风险建议</Text>
                  <Text>{caseData.conflict_check.risk_suggestion || '无'}</Text>
                </Box>
                <Text fontSize="xs" color="gray.400">
                  检查时间：{caseData.conflict_check.checked_at
                    ? dayjs(caseData.conflict_check.checked_at).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </Text>
              </VStack>
            ) : (
              <Text color="gray.400">暂无冲突检查记录</Text>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb="2">
            <Flex justify="space-between" align="center">
              <Heading size="md">预算管理</Heading>
              <HStack>
                {!isArchived && (
                  <Button size="sm" colorScheme="brand" onClick={budgetModal.onOpen}>
                    {caseData.budget ? '编辑预算' : '新建预算'}
                  </Button>
                )}
                {isFinance && caseData.budget && caseData.budget.status === 'pending' && !isArchived && (
                  <>
                    <Button size="sm" colorScheme="green" onClick={() => handleConfirmBudget(true)}>
                      确认
                    </Button>
                    <Button size="sm" colorScheme="red" onClick={() => handleConfirmBudget(false)}>
                      拒绝
                    </Button>
                  </>
                )}
              </HStack>
            </Flex>
          </CardHeader>
          <CardBody>
            {pendingSupplements.length > 0 && (
              <Box p="3" mb="4" bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                <Text color="orange.600" fontSize="sm" fontWeight="medium">
                  ⚠️ 有 {pendingSupplements.length} 项材料待补充
                </Text>
                <Text color="orange.500" fontSize="xs" mt="1">
                  请确认材料是否已补齐后再操作预算
                </Text>
              </Box>
            )}
            {caseData.budget ? (
              <VStack spacing="3" align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">状态</Text>
                  <Badge colorScheme={budgetStatusColors[caseData.budget.status]}>
                    {budgetStatusLabels[caseData.budget.status]}
                  </Badge>
                </HStack>
                <SimpleGrid columns={2} spacing="4">
                  <Box>
                    <Text fontSize="sm" color="gray.500">总金额</Text>
                    <Text fontWeight="medium" fontSize="lg">¥{caseData.budget.total_amount.toLocaleString()}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">预付款</Text>
                    <Text fontWeight="medium">
                      ¥{caseData.budget.advance_payment?.toLocaleString() || '0'}
                    </Text>
                  </Box>
                </SimpleGrid>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb="1">付款方式</Text>
                  <Text>{caseData.budget.payment_terms || '无'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb="1">备注</Text>
                  <Text>{caseData.budget.remarks || '无'}</Text>
                </Box>
              </VStack>
            ) : (
              <Text color="gray.400">暂无预算信息</Text>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb="2">
            <Flex justify="space-between" align="center">
              <Heading size="md">对方当事人与关联方</Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            {caseData.related_parties.length > 0 ? (
              <VStack spacing="2" align="stretch">
                {caseData.related_parties.map(p => (
                  <Box key={p.id} p="3" bg="gray.50" borderRadius="md">
                    <Flex justify="space-between" align="center" mb="1">
                      <Text fontWeight="medium">{p.name}</Text>
                      <Tag size="sm" colorScheme="blue">{partyTypeLabels[p.party_type]}</Tag>
                    </Flex>
                    {p.phone && <Text fontSize="sm" color="gray.500">电话：{p.phone}</Text>}
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text color="gray.400">暂无关联方信息</Text>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardHeader pb="2">
          <Flex justify="space-between" align="center">
            <Heading size="md">材料补充要求</Heading>
            {isRisk && !isArchived && (
              <Button size="sm" colorScheme="orange" onClick={supplementModal.onOpen}>
                发起补充要求
              </Button>
            )}
          </Flex>
        </CardHeader>
        <CardBody>
          {caseData.material_supplements?.length > 0 ? (
            <VStack spacing="3" align="stretch">
              {caseData.material_supplements.map((s: MaterialSupplement) => (
                <Box key={s.id} p="4" borderWidth="1px" borderRadius="md" borderColor="gray.200">
                  <Flex justify="space-between" align="start" mb="2">
                    <HStack>
                      <Text fontWeight="medium">{s.title}</Text>
                      <Badge colorScheme={supplementStatusColors[s.status]}>
                        {supplementStatusLabels[s.status]}
                      </Badge>
                    </HStack>
                    <HStack>
                      {s.status === MaterialSupplementStatus.PENDING && (
                        <>
                          <Button
                            size="xs"
                            colorScheme="green"
                            onClick={() => handleOpenCompleteSupplement(s.id)}
                          >
                            标记已补齐
                          </Button>
                          {isRisk && (
                            <Button
                              size="xs"
                              variant="ghost"
                              colorScheme="gray"
                              onClick={() => handleCancelSupplement(s.id)}
                            >
                              取消
                            </Button>
                          )}
                        </>
                      )}
                    </HStack>
                  </Flex>
                  {s.description && (
                    <Text fontSize="sm" color="gray.600" mb="2">
                      {s.description}
                    </Text>
                  )}
                  <HStack spacing="4" fontSize="xs" color="gray.400">
                    <Text>发起人：{s.requester?.name || '-'}</Text>
                    <Text>发起时间：{dayjs(s.requested_at).format('YYYY-MM-DD HH:mm')}</Text>
                    {s.completed_at && (
                      <Text>完成时间：{dayjs(s.completed_at).format('YYYY-MM-DD HH:mm')}</Text>
                    )}
                    {s.completer && (
                      <Text>完成人：{s.completer.name}</Text>
                    )}
                  </HStack>
                  {s.remark && (
                    <Text fontSize="xs" color="gray.500" mt="2">
                      备注：{s.remark}
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="gray.400">暂无材料补充要求</Text>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader pb="2">
          <Flex justify="space-between" align="center">
            <Heading size="md">案卷材料</Heading>
            <Button size="sm" colorScheme="brand" onClick={materialModal.onOpen}>
              {isArchived ? '追加补充材料' : '添加材料'}
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          {caseData.materials.length > 0 ? (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>材料名称</Th>
                  <Th>类型</Th>
                  <Th>是否补充</Th>
                  <Th>描述</Th>
                  <Th>上传时间</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {caseData.materials.map(m => (
                  <Tr key={m.id}>
                    <Td>{m.material_name}</Td>
                    <Td>{materialTypeLabels[m.material_type]}</Td>
                    <Td>{m.is_supplementary ? '是' : '否'}</Td>
                    <Td>{m.description || '-'}</Td>
                    <Td>{dayjs(m.created_at).format('YYYY-MM-DD')}</Td>
                    <Td>
                      {!isArchived && (
                        <Button size="xs" variant="ghost" colorScheme="red"
                                onClick={() => handleDeleteMaterial(m.id)}>
                          删除
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text color="gray.400">暂无材料</Text>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={conflictModal.isOpen} onClose={conflictModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>利益冲突检查</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl isRequired>
                <FormLabel>检查结果</FormLabel>
                <Select value={conflictResult} onChange={(e) => setConflictResult(e.target.value as ConflictResult)}>
                  <option value="">请选择</option>
                  <option value="no_conflict">无冲突</option>
                  <option value="indirect_conflict">间接冲突</option>
                  <option value="direct_conflict">直接冲突</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>冲突详情</FormLabel>
                <Textarea value={conflictDetails} onChange={(e) => setConflictDetails(e.target.value)}
                          rows={4} placeholder="请描述冲突情况" />
              </FormControl>
              <FormControl>
                <FormLabel>风险建议</FormLabel>
                <Textarea value={riskSuggestion} onChange={(e) => setRiskSuggestion(e.target.value)}
                          rows={3} placeholder="请给出风险处理建议" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={conflictModal.onClose}>取消</Button>
            <Button colorScheme="brand" onClick={handleSubmitConflict}>提交</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={budgetModal.isOpen} onClose={budgetModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>预算信息</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl isRequired>
                <FormLabel>总金额（元）</FormLabel>
                <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
                       placeholder="请输入总金额" />
              </FormControl>
              <FormControl>
                <FormLabel>预付款（元）</FormLabel>
                <Input type="number" value={advancePayment} onChange={(e) => setAdvancePayment(e.target.value)}
                       placeholder="请输入预付款金额" />
              </FormControl>
              <FormControl>
                <FormLabel>付款方式</FormLabel>
                <Textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
                          rows={3} placeholder="请描述付款方式和节点" />
              </FormControl>
              <FormControl>
                <FormLabel>备注</FormLabel>
                <Textarea value={budgetRemarks} onChange={(e) => setBudgetRemarks(e.target.value)}
                          rows={2} placeholder="备注信息" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={budgetModal.onClose}>取消</Button>
            <Button colorScheme="brand" onClick={handleSubmitBudget}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={materialModal.isOpen} onClose={materialModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isArchived ? '追加补充材料' : '添加材料'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl isRequired>
                <FormLabel>材料名称</FormLabel>
                <Input value={materialName} onChange={(e) => setMaterialName(e.target.value)}
                       placeholder="请输入材料名称" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>材料类型</FormLabel>
                <Select value={materialType} onChange={(e) => setMaterialType(e.target.value as MaterialType)}>
                  {Object.entries(materialTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormControl>
              {isArchived && (
                <FormControl>
                  <FormLabel>补充材料标记</FormLabel>
                  <Text color="gray.500" fontSize="sm">已归档案件只能追加补充材料</Text>
                </FormControl>
              )}
              <FormControl>
                <FormLabel>描述</FormLabel>
                <Textarea value={materialDesc} onChange={(e) => setMaterialDesc(e.target.value)}
                          rows={3} placeholder="材料描述" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={materialModal.onClose}>取消</Button>
            <Button colorScheme="brand" onClick={handleAddMaterial}>添加</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={supplementModal.isOpen} onClose={supplementModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>发起材料补充要求</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl isRequired>
                <FormLabel>补充要求标题</FormLabel>
                <Input value={supplementTitle} onChange={(e) => setSupplementTitle(e.target.value)}
                       placeholder="请输入补充要求标题，如：请补充授权委托书" />
              </FormControl>
              <FormControl>
                <FormLabel>详细描述</FormLabel>
                <Textarea value={supplementDesc} onChange={(e) => setSupplementDesc(e.target.value)}
                          rows={4} placeholder="请详细描述需要补充的材料内容和要求" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={supplementModal.onClose}>取消</Button>
            <Button colorScheme="orange" onClick={handleCreateSupplement}>发起</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={completeSupplementModal.isOpen} onClose={completeSupplementModal.onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>标记材料已补齐</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl>
                <FormLabel>补充说明（可选）</FormLabel>
                <Textarea value={completeRemark} onChange={(e) => setCompleteRemark(e.target.value)}
                          rows={3} placeholder="请填写补齐情况说明" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={completeSupplementModal.onClose}>取消</Button>
            <Button colorScheme="green" onClick={handleCompleteSupplement}>确认已补齐</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
