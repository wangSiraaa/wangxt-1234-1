from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from app.models import MaterialSupplement, Case, CaseStatus, MaterialSupplementStatus, User
from app.schemas import MaterialSupplementCreate, MaterialSupplementUpdate


def create_supplement(db: Session, data: MaterialSupplementCreate, requested_by: int) -> MaterialSupplement:
    db_case = db.query(Case).filter(Case.id == data.case_id).first()
    if not db_case:
        raise ValueError("案件不存在")

    if db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能发起材料补充")

    db_supplement = MaterialSupplement(
        case_id=data.case_id,
        title=data.title,
        description=data.description,
        status=MaterialSupplementStatus.PENDING,
        requested_by=requested_by,
        requested_at=datetime.utcnow()
    )
    db.add(db_supplement)
    db.commit()
    db.refresh(db_supplement)
    return db_supplement


def list_supplements(db: Session, case_id: int, status: Optional[MaterialSupplementStatus] = None) -> List[MaterialSupplement]:
    query = db.query(MaterialSupplement).options(
        joinedload(MaterialSupplement.requester),
        joinedload(MaterialSupplement.completer),
    ).filter(MaterialSupplement.case_id == case_id)
    if status:
        query = query.filter(MaterialSupplement.status == status)
    return query.order_by(MaterialSupplement.created_at.desc()).all()


def get_supplement(db: Session, supplement_id: int) -> Optional[MaterialSupplement]:
    return db.query(MaterialSupplement).options(
        joinedload(MaterialSupplement.requester),
        joinedload(MaterialSupplement.completer),
    ).filter(MaterialSupplement.id == supplement_id).first()


def update_supplement(db: Session, supplement_id: int, data: MaterialSupplementUpdate,
                      operator_id: Optional[int] = None) -> Optional[MaterialSupplement]:
    db_supplement = get_supplement(db, supplement_id)
    if not db_supplement:
        return None

    db_case = db.query(Case).filter(Case.id == db_supplement.case_id).first()
    if db_case and db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能修改材料补充要求")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_supplement, key, value)

    if "status" in update_data and data.status == MaterialSupplementStatus.COMPLETED:
        db_supplement.completed_at = datetime.utcnow()
        if operator_id:
            db_supplement.completed_by = operator_id

    if "status" in update_data and data.status == MaterialSupplementStatus.PENDING:
        db_supplement.completed_at = None
        db_supplement.completed_by = None

    db.commit()
    db.refresh(db_supplement)
    return db_supplement


def complete_supplement(db: Session, supplement_id: int, completed_by: int,
                        remark: Optional[str] = None) -> Optional[MaterialSupplement]:
    db_supplement = get_supplement(db, supplement_id)
    if not db_supplement:
        return None

    db_case = db.query(Case).filter(Case.id == db_supplement.case_id).first()
    if db_case and db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能完成材料补充")

    if db_supplement.status == MaterialSupplementStatus.COMPLETED:
        raise ValueError("该补充要求已完成")

    if db_supplement.status == MaterialSupplementStatus.CANCELLED:
        raise ValueError("该补充要求已取消")

    db_supplement.status = MaterialSupplementStatus.COMPLETED
    db_supplement.completed_at = datetime.utcnow()
    db_supplement.completed_by = completed_by
    if remark:
        db_supplement.remark = remark

    db.commit()
    db.refresh(db_supplement)
    return db_supplement


def cancel_supplement(db: Session, supplement_id: int, operator_id: int) -> Optional[MaterialSupplement]:
    db_supplement = get_supplement(db, supplement_id)
    if not db_supplement:
        return None

    db_case = db.query(Case).filter(Case.id == db_supplement.case_id).first()
    if db_case and db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能取消材料补充")

    if db_supplement.status == MaterialSupplementStatus.COMPLETED:
        raise ValueError("已完成的补充要求不能取消")

    if db_supplement.status == MaterialSupplementStatus.CANCELLED:
        raise ValueError("该补充要求已取消")

    db_supplement.status = MaterialSupplementStatus.CANCELLED
    db.commit()
    db.refresh(db_supplement)
    return db_supplement


def delete_supplement(db: Session, supplement_id: int) -> bool:
    db_supplement = get_supplement(db, supplement_id)
    if not db_supplement:
        return False

    db_case = db.query(Case).filter(Case.id == db_supplement.case_id).first()
    if db_case and db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能删除材料补充要求")

    db.delete(db_supplement)
    db.commit()
    return True


def get_pending_count(db: Session, case_id: int) -> int:
    return db.query(MaterialSupplement).filter(
        MaterialSupplement.case_id == case_id,
        MaterialSupplement.status == MaterialSupplementStatus.PENDING
    ).count()
