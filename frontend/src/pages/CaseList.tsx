import { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Heading, Button, Input,
  Select, Table, Thead, Tbody, Tr, Th, Td,
  Badge, useToast, Text, Flex, IconButton, Tooltip
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { caseApi } from '../services/api';
import type { Case, CaseStatus } from '../types';
import { UserRole } from '../types';
import { useAuthStore } from '../hooks/useAuthStore';
import dayjs from 'dayjs';

const statusLabels: Record<CaseStatus, string> = {
  draft: '草稿',
  pending: '待冲突检查',
  conflict_checked: '冲突已检查',
  budget_confirmed: '预算已确认',
  accepted: '已承接',
  rejected: '已驳回',
  archived: '已归档',
};

const statusColors: Record<CaseStatus, string> = {
  draft: 'gray',
  pending: 'yellow',
  conflict_checked: 'blue',
  budget_confirmed: 'purple',
  accepted: 'green',
  rejected: 'red',
  archived: 'gray',
};

export default function CaseList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();

  const canCreate = user?.role === UserRole.PARTNER;

  const fetchCases = async () => {
    setLoading(true);
    try {
      const response = await caseApi.list({
        page,
        page_size: pageSize,
        status: status || undefined,
        keyword: keyword || undefined,
      });
      setCases(response.items);
      setTotal(response.total);
    } catch (err: any) {
      toast({
        title: '获取案件列表失败',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, status]);

  const handleSearch = () => {
    setPage(1);
    fetchCases();
  };

  return (
    <VStack spacing="6" align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">案件管理</Heading>
        {canCreate && (
          <Button colorScheme="brand" onClick={() => navigate('/cases/new')}>
            新建案件
          </Button>
        )}
      </Flex>

      <Flex gap="4" align="center">
        <Input
          placeholder="搜索案件名称或案号"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          w="300px"
        />
        <Select
          placeholder="全部状态"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          w="200px"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Button onClick={handleSearch}>搜索</Button>
      </Flex>

      <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>案号</Th>
              <Th>案件名称</Th>
              <Th>案件类型</Th>
              <Th>状态</Th>
              <Th>创建时间</Th>
              <Th>操作</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={6} textAlign="center" py="8">加载中...</Td>
              </Tr>
            ) : cases.length === 0 ? (
              <Tr>
                <Td colSpan={6} textAlign="center" py="8" color="gray.500">
                  暂无案件数据
                </Td>
              </Tr>
            ) : (
              cases.map((c) => (
                <Tr key={c.id} _hover={{ bg: 'gray.50' }} cursor="pointer"
                    onClick={() => navigate(`/cases/${c.id}`)}>
                  <Td fontWeight="medium">{c.case_number || '-'}</Td>
                  <Td>{c.case_name}</Td>
                  <Td>{c.case_type || '-'}</Td>
                  <Td>
                    <Badge colorScheme={statusColors[c.status]}>
                      {statusLabels[c.status]}
                    </Badge>
                  </Td>
                  <Td>{dayjs(c.created_at).format('YYYY-MM-DD')}</Td>
                  <Td>
                    <Button size="sm" variant="ghost" colorScheme="brand"
                            onClick={(e) => { e.stopPropagation(); navigate(`/cases/${c.id}`); }}>
                      查看
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>

        <Flex justify="space-between" align="center" p="4" borderTopWidth="1px" borderColor="gray.200">
          <Text color="gray.500" fontSize="sm">共 {total} 条</Text>
          <HStack>
            <Button
              size="sm"
              isDisabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <Text fontSize="sm">第 {page} 页</Text>
            <Button
              size="sm"
              isDisabled={page * pageSize >= total}
              onClick={() => setPage(p => p + 1)}
            >
              下一页
            </Button>
          </HStack>
        </Flex>
      </Box>
    </VStack>
  );
}
