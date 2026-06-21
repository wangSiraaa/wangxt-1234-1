from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models import UserRole, CaseStatus, ConflictResult, BudgetStatus, PartyType, MaterialType, MaterialSupplementStatus


class UserBase(BaseModel):
    username: str
    name: str
    email: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ClientBase(BaseModel):
    name: str
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_individual: bool = True


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_individual: Optional[bool] = None


class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RelatedPartyBase(BaseModel):
    name: str
    party_type: PartyType
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_individual: bool = True


class RelatedPartyCreate(RelatedPartyBase):
    pass


class RelatedPartyResponse(RelatedPartyBase):
    id: int
    case_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConflictCheckBase(BaseModel):
    result: ConflictResult
    conflict_details: Optional[str] = None
    risk_suggestion: Optional[str] = None


class ConflictCheckCreate(ConflictCheckBase):
    case_id: int


class ConflictCheckUpdate(BaseModel):
    result: Optional[ConflictResult] = None
    conflict_details: Optional[str] = None
    risk_suggestion: Optional[str] = None


class ConflictCheckResponse(ConflictCheckBase):
    id: int
    case_id: int
    checked_by: Optional[int] = None
    checked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetBase(BaseModel):
    total_amount: float
    advance_payment: Optional[float] = None
    payment_terms: Optional[str] = None
    remarks: Optional[str] = None


class BudgetCreate(BudgetBase):
    case_id: int


class BudgetUpdate(BaseModel):
    total_amount: Optional[float] = None
    advance_payment: Optional[float] = None
    payment_terms: Optional[str] = None
    remarks: Optional[str] = None
    status: Optional[BudgetStatus] = None


class BudgetResponse(BudgetBase):
    id: int
    case_id: int
    status: BudgetStatus
    confirmed_by: Optional[int] = None
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CaseMaterialBase(BaseModel):
    material_name: str
    material_type: MaterialType
    description: Optional[str] = None


class CaseMaterialCreate(CaseMaterialBase):
    case_id: int
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    is_supplementary: bool = False


class CaseMaterialResponse(CaseMaterialBase):
    id: int
    case_id: int
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_by: Optional[int] = None
    is_supplementary: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MaterialSupplementBase(BaseModel):
    title: str
    description: Optional[str] = None


class MaterialSupplementCreate(MaterialSupplementBase):
    case_id: int


class MaterialSupplementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[MaterialSupplementStatus] = None
    remark: Optional[str] = None


class MaterialSupplementResponse(MaterialSupplementBase):
    id: int
    case_id: int
    status: MaterialSupplementStatus
    requested_by: Optional[int] = None
    requested_at: datetime
    completed_at: Optional[datetime] = None
    completed_by: Optional[int] = None
    remark: Optional[str] = None
    requester: Optional[UserResponse] = None
    completer: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class CaseBase(BaseModel):
    case_name: str
    case_type: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[int] = None
    partner_id: Optional[int] = None
    acceptance_date: Optional[date] = None
    estimated_end_date: Optional[date] = None


class CaseCreate(CaseBase):
    related_parties: List[RelatedPartyCreate] = []


class CaseUpdate(BaseModel):
    case_name: Optional[str] = None
    case_type: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[int] = None
    partner_id: Optional[int] = None
    assigned_lawyer_id: Optional[int] = None
    acceptance_date: Optional[date] = None
    estimated_end_date: Optional[date] = None


class CaseResponse(CaseBase):
    id: int
    case_number: Optional[str] = None
    status: CaseStatus
    assigned_lawyer_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CaseDetailResponse(CaseResponse):
    client: Optional[ClientResponse] = None
    partner: Optional[UserResponse] = None
    assigned_lawyer: Optional[UserResponse] = None
    related_parties: List[RelatedPartyResponse] = []
    conflict_check: Optional[ConflictCheckResponse] = None
    budget: Optional[BudgetResponse] = None
    materials: List[CaseMaterialResponse] = []
    material_supplements: List[MaterialSupplementResponse] = []


class CaseListResponse(BaseModel):
    total: int
    items: List[CaseResponse]
    page: int
    page_size: int


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
