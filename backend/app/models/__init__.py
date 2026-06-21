import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Date, Numeric, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    PARTNER = "partner"
    RISK_CONTROL = "risk_control"
    FINANCE = "finance"
    LAWYER = "lawyer"


class CaseStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    CONFLICT_CHECKED = "conflict_checked"
    BUDGET_CONFIRMED = "budget_confirmed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class ConflictResult(str, enum.Enum):
    NO_CONFLICT = "no_conflict"
    INDIRECT_CONFLICT = "indirect_conflict"
    DIRECT_CONFLICT = "direct_conflict"


class BudgetStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class PartyType(str, enum.Enum):
    CLIENT = "client"
    OPPOSING = "opposing"
    RELATED = "related"


class MaterialType(str, enum.Enum):
    CONTRACT = "contract"
    EVIDENCE = "evidence"
    POWER_OF_ATTORNEY = "power_of_attorney"
    OTHER = "other"


class MaterialSupplementStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(200))
    role = Column(Enum(UserRole), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    id_type = Column(String(50))
    id_number = Column(String(100))
    phone = Column(String(50))
    email = Column(String(200))
    address = Column(Text)
    is_individual = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cases_as_client = relationship("Case", back_populates="client", foreign_keys="Case.client_id")


class RelatedParty(Base):
    __tablename__ = "related_parties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    party_type = Column(Enum(PartyType), nullable=False)
    id_type = Column(String(50))
    id_number = Column(String(100))
    phone = Column(String(50))
    email = Column(String(200))
    address = Column(Text)
    is_individual = Column(Boolean, default=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="related_parties")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True)
    case_name = Column(String(200), nullable=False)
    case_type = Column(String(100))
    description = Column(Text)
    status = Column(Enum(CaseStatus), default=CaseStatus.DRAFT, nullable=False)

    client_id = Column(Integer, ForeignKey("clients.id"))
    partner_id = Column(Integer, ForeignKey("users.id"))
    assigned_lawyer_id = Column(Integer, ForeignKey("users.id"))

    acceptance_date = Column(Date)
    estimated_end_date = Column(Date)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="cases_as_client", foreign_keys=[client_id])
    partner = relationship("User", foreign_keys=[partner_id])
    assigned_lawyer = relationship("User", foreign_keys=[assigned_lawyer_id])
    related_parties = relationship("RelatedParty", back_populates="case", cascade="all, delete-orphan")
    conflict_checks = relationship("ConflictCheck", back_populates="case",
                                   cascade="all, delete-orphan",
                                   foreign_keys="ConflictCheck.case_id")
    budgets = relationship("Budget", back_populates="case",
                            cascade="all, delete-orphan",
                            foreign_keys="Budget.case_id")
    materials = relationship("CaseMaterial", back_populates="case", cascade="all, delete-orphan")
    material_supplements = relationship("MaterialSupplement", back_populates="case", cascade="all, delete-orphan")

    @property
    def conflict_check(self):
        checks = sorted(self.conflict_checks, key=lambda c: c.id, reverse=True)
        return checks[0] if checks else None

    @property
    def budget(self):
        items = sorted(self.budgets, key=lambda b: b.id, reverse=True)
        return items[0] if items else None


class ConflictCheck(Base):
    __tablename__ = "conflict_checks"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    result = Column(Enum(ConflictResult), nullable=False)
    conflict_details = Column(Text)
    risk_suggestion = Column(Text)
    checked_by = Column(Integer, ForeignKey("users.id"))
    checked_at = Column(DateTime)

    case = relationship("Case", back_populates="conflict_checks")
    checker = relationship("User", foreign_keys=[checked_by])


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    total_amount = Column(Numeric(15, 2), nullable=False)
    advance_payment = Column(Numeric(15, 2))
    payment_terms = Column(Text)
    status = Column(Enum(BudgetStatus), default=BudgetStatus.PENDING, nullable=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"))
    confirmed_at = Column(DateTime)
    remarks = Column(Text)

    case = relationship("Case", back_populates="budgets")
    confirmer = relationship("User", foreign_keys=[confirmed_by])


class CaseMaterial(Base):
    __tablename__ = "case_materials"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    material_name = Column(String(200), nullable=False)
    material_type = Column(Enum(MaterialType), nullable=False)
    file_path = Column(String(500))
    file_size = Column(Integer)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    is_supplementary = Column(Boolean, default=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="materials")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class MaterialSupplement(Base):
    __tablename__ = "material_supplements"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(Enum(MaterialSupplementStatus), default=MaterialSupplementStatus.PENDING, nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"))
    requested_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    completed_by = Column(Integer, ForeignKey("users.id"))
    remark = Column(Text)

    case = relationship("Case", back_populates="material_supplements")
    requester = relationship("User", foreign_keys=[requested_by])
    completer = relationship("User", foreign_keys=[completed_by])
