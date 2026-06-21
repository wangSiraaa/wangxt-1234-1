export enum UserRole {
  PARTNER = 'partner',
  RISK_CONTROL = 'risk_control',
  FINANCE = 'finance',
  LAWYER = 'lawyer',
}

export enum CaseStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFLICT_CHECKED = 'conflict_checked',
  BUDGET_CONFIRMED = 'budget_confirmed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export enum ConflictResult {
  NO_CONFLICT = 'no_conflict',
  INDIRECT_CONFLICT = 'indirect_conflict',
  DIRECT_CONFLICT = 'direct_conflict',
}

export enum BudgetStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
}

export enum PartyType {
  CLIENT = 'client',
  OPPOSING = 'opposing',
  RELATED = 'related',
}

export enum MaterialType {
  CONTRACT = 'contract',
  EVIDENCE = 'evidence',
  POWER_OF_ATTORNEY = 'power_of_attorney',
  OTHER = 'other',
}

export enum MaterialSupplementStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  id_type?: string;
  id_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_individual: boolean;
  created_at: string;
  updated_at: string;
}

export interface RelatedParty {
  id: number;
  case_id: number;
  name: string;
  party_type: PartyType;
  id_type?: string;
  id_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_individual: boolean;
  created_at: string;
}

export interface ConflictCheck {
  id: number;
  case_id: number;
  result: ConflictResult;
  conflict_details?: string;
  risk_suggestion?: string;
  checked_by?: number;
  checked_at?: string;
}

export interface Budget {
  id: number;
  case_id: number;
  total_amount: number;
  advance_payment?: number;
  payment_terms?: string;
  status: BudgetStatus;
  confirmed_by?: number;
  confirmed_at?: string;
  remarks?: string;
}

export interface CaseMaterial {
  id: number;
  case_id: number;
  material_name: string;
  material_type: MaterialType;
  file_path?: string;
  file_size?: number;
  uploaded_by?: number;
  is_supplementary: boolean;
  description?: string;
  created_at: string;
}

export interface MaterialSupplement {
  id: number;
  case_id: number;
  title: string;
  description?: string;
  status: MaterialSupplementStatus;
  requested_by?: number;
  requested_at: string;
  completed_at?: string;
  completed_by?: number;
  remark?: string;
  requester?: User;
  completer?: User;
}

export interface Case {
  id: number;
  case_number?: string;
  case_name: string;
  case_type?: string;
  description?: string;
  status: CaseStatus;
  client_id?: number;
  partner_id?: number;
  assigned_lawyer_id?: number;
  acceptance_date?: string;
  estimated_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseDetail extends Case {
  client?: Client;
  partner?: User;
  assigned_lawyer?: User;
  related_parties: RelatedParty[];
  conflict_check?: ConflictCheck;
  budget?: Budget;
  materials: CaseMaterial[];
  material_supplements: MaterialSupplement[];
}

export interface CaseListResponse {
  total: number;
  items: Case[];
  page: number;
  page_size: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}
