from typing import List, Optional
from sqlalchemy.orm import Session

from app.models import Case, CaseStatus, ConflictResult, BudgetStatus
from app.schemas import CaseCreate, CaseUpdate


def create_case(db: Session, case_data: CaseCreate, created_by: int) -> Case:
    db_case = Case(
        case_name=case_data.case_name,
        case_type=case_data.case_type,
        description=case_data.description,
        client_id=case_data.client_id,
        partner_id=case_data.partner_id,
        acceptance_date=case_data.acceptance_date,
        estimated_end_date=case_data.estimated_end_date,
        status=CaseStatus.DRAFT
    )
    db.add(db_case)
    db.flush()

    case_number = f"CASE{db_case.id:06d}"
    db_case.case_number = case_number

    from app.models import RelatedParty
    for party_data in case_data.related_parties:
        party = RelatedParty(
            case_id=db_case.id,
            name=party_data.name,
            party_type=party_data.party_type,
            id_type=party_data.id_type,
            id_number=party_data.id_number,
            phone=party_data.phone,
            email=party_data.email,
            address=party_data.address,
            is_individual=party_data.is_individual
        )
        db.add(party)

    db.commit()
    db.refresh(db_case)
    return db_case


def get_case(db: Session, case_id: int) -> Optional[Case]:
    return db.query(Case).filter(Case.id == case_id).first()


def list_cases(db: Session, skip: int = 0, limit: int = 20, status: Optional[CaseStatus] = None,
               keyword: Optional[str] = None) -> tuple[int, List[Case]]:
    query = db.query(Case)
    if status:
        query = query.filter(Case.status == status)
    if keyword:
        query = query.filter(
            (Case.case_name.like(f"%{keyword}%")) |
            (Case.case_number.like(f"%{keyword}%"))
        )
    total = query.count()
    items = query.order_by(Case.created_at.desc()).offset(skip).limit(limit).all()
    return total, items


def update_case(db: Session, case_id: int, case_data: CaseUpdate) -> Optional[Case]:
    db_case = get_case(db, case_id)
    if not db_case:
        return None

    if db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能修改基本信息")

    update_data = case_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_case, key, value)

    db.commit()
    db.refresh(db_case)
    return db_case


def submit_for_conflict_check(db: Session, case_id: int) -> Optional[Case]:
    db_case = get_case(db, case_id)
    if not db_case:
        return None
    if db_case.status not in [CaseStatus.DRAFT, CaseStatus.PENDING]:
        raise ValueError("当前案件状态不允许提交冲突检查")
    db_case.status = CaseStatus.PENDING
    db.commit()
    db.refresh(db_case)
    return db_case


def assign_lawyer(db: Session, case_id: int, lawyer_id: int) -> Optional[Case]:
    db_case = get_case(db, case_id)
    if not db_case:
        return None

    if db_case.status != CaseStatus.BUDGET_CONFIRMED and db_case.status != CaseStatus.ACCEPTED:
        raise ValueError("预算未确认的案件不能分配律师")

    db_case.assigned_lawyer_id = lawyer_id
    db.commit()
    db.refresh(db_case)
    return db_case


def archive_case(db: Session, case_id: int) -> Optional[Case]:
    db_case = get_case(db, case_id)
    if not db_case:
        return None
    if db_case.status != CaseStatus.ACCEPTED:
        raise ValueError("只有已承接案件可以归档")
    db_case.status = CaseStatus.ARCHIVED
    db.commit()
    db.refresh(db_case)
    return db_case
