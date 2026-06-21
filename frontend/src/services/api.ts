import axios from 'axios';
import type {
  User, Client, Case, CaseDetail, CaseListResponse,
  ConflictCheck, Budget, CaseMaterial, MaterialSupplement,
  LoginResponse, RelatedParty
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }).then(r => r.data),
  getMe: () => api.get<User>('/auth/me').then(r => r.data),
};

export const userApi = {
  list: (role?: string) =>
    api.get<User[]>('/users', { params: { role } }).then(r => r.data),
  get: (id: number) => api.get<User>(`/users/${id}`).then(r => r.data),
};

export const clientApi = {
  list: (keyword?: string) =>
    api.get<Client[]>('/clients', { params: { keyword } }).then(r => r.data),
  create: (data: Partial<Client>) =>
    api.post<Client>('/clients', data).then(r => r.data),
  get: (id: number) => api.get<Client>(`/clients/${id}`).then(r => r.data),
  update: (id: number, data: Partial<Client>) =>
    api.put<Client>(`/clients/${id}`, data).then(r => r.data),
};

export const caseApi = {
  list: (params: { page?: number; page_size?: number; status?: string; keyword?: string }) =>
    api.get<CaseListResponse>('/cases', { params }).then(r => r.data),
  create: (data: {
    case_name: string;
    case_type?: string;
    description?: string;
    client_id?: number;
    partner_id?: number;
    related_parties: Array<{
      name: string;
      party_type: string;
      id_type?: string;
      id_number?: string;
      phone?: string;
      email?: string;
      is_individual: boolean;
    }>;
  }) => api.post<Case>('/cases', data).then(r => r.data),
  get: (id: number) => api.get<CaseDetail>(`/cases/${id}`).then(r => r.data),
  update: (id: number, data: Partial<Case>) =>
    api.put<Case>(`/cases/${id}`, data).then(r => r.data),
  submitConflict: (id: number) =>
    api.post<Case>(`/cases/${id}/submit-conflict`).then(r => r.data),
  assignLawyer: (id: number, lawyer_id: number) =>
    api.post<Case>(`/cases/${id}/assign-lawyer`, null, { params: { lawyer_id } }).then(r => r.data),
  accept: (id: number) =>
    api.post<Case>(`/cases/${id}/accept`).then(r => r.data),
  archive: (id: number) =>
    api.post<Case>(`/cases/${id}/archive`).then(r => r.data),
};

export const conflictApi = {
  create: (data: { case_id: number; result: string; conflict_details?: string; risk_suggestion?: string }) =>
    api.post<ConflictCheck>('/conflict-checks', data).then(r => r.data),
  getByCase: (caseId: number) =>
    api.get<ConflictCheck>(`/conflict-checks/case/${caseId}`).then(r => r.data),
  update: (id: number, data: Partial<ConflictCheck>) =>
    api.put<ConflictCheck>(`/conflict-checks/${id}`, data).then(r => r.data),
};

export const budgetApi = {
  create: (data: { case_id: number; total_amount: number; advance_payment?: number; payment_terms?: string; remarks?: string }) =>
    api.post<Budget>('/budgets', data).then(r => r.data),
  getByCase: (caseId: number) =>
    api.get<Budget>(`/budgets/case/${caseId}`).then(r => r.data),
  update: (id: number, data: Partial<Budget>) =>
    api.put<Budget>(`/budgets/${id}`, data).then(r => r.data),
  confirm: (id: number) =>
    api.post<Budget>(`/budgets/${id}/confirm`).then(r => r.data),
  reject: (id: number) =>
    api.post<Budget>(`/budgets/${id}/reject`).then(r => r.data),
};

export const materialApi = {
  list: (caseId: number, material_type?: string) =>
    api.get<CaseMaterial[]>(`/materials/case/${caseId}`, { params: { material_type } }).then(r => r.data),
  add: (data: {
    case_id: number;
    material_name: string;
    material_type: string;
    description?: string;
    is_supplementary?: boolean;
  }) => api.post<CaseMaterial>('/materials', data).then(r => r.data),
  delete: (id: number) => api.delete(`/materials/${id}`).then(r => r.data),
};

export const materialSupplementApi = {
  list: (caseId: number, status?: string) =>
    api.get<MaterialSupplement[]>(`/material-supplements/case/${caseId}`, { params: { status } }).then(r => r.data),
  get: (id: number) =>
    api.get<MaterialSupplement>(`/material-supplements/${id}`).then(r => r.data),
  create: (data: { case_id: number; title: string; description?: string }) =>
    api.post<MaterialSupplement>('/material-supplements', data).then(r => r.data),
  update: (id: number, data: Partial<MaterialSupplement>) =>
    api.put<MaterialSupplement>(`/material-supplements/${id}`, data).then(r => r.data),
  complete: (id: number, remark?: string) =>
    api.post<MaterialSupplement>(`/material-supplements/${id}/complete`, null, { params: { remark } }).then(r => r.data),
  cancel: (id: number) =>
    api.post<MaterialSupplement>(`/material-supplements/${id}/cancel`).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/material-supplements/${id}`).then(r => r.data),
  getPendingCount: (caseId: number) =>
    api.get<{ pending_count: number }>(`/material-supplements/case/${caseId}/pending-count`).then(r => r.data),
};

export default api;
