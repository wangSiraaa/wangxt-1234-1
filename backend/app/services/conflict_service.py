from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models import ConflictCheck, Case, CaseStatus, ConflictResult
from app.schemas import ConflictCheckCreate, ConflictCheckUpdate


def create_conflict_check(db: Session, data: ConflictCheckCreate, checked_by: int) -> ConflictCheck:
    db_case = db.query(Case).filter(Case.id == data.case_id).first()
    if not db_case:
        raise ValueError("案件不存在")

    if db_case.status not in [CaseStatus.PENDING, CaseStatus.CONFLICT_CHECKED]:
        raise ValueError("当前案件状态不允许进行冲突检查")

    existing = db.query(ConflictCheck).filter(ConflictCheck.case_id == data.case_id).first()
    if existing:
        existing.result = data.result
        existing.conflict_details = data.conflict_details
        existing.risk_suggestion = data.risk_suggestion
        existing.checked_by = checked_by
        existing.checked_at = datetime.utcnow()
        db_check = existing
    else:
        db_check = ConflictCheck(
            case_id=data.case_id,
            result=data.result,
            conflict_details=data.conflict_details,
            risk_suggestion=data.risk_suggestion,
            checked_by=checked_by,
            checked_at=datetime.utcnow()
        )
        db.add(db_check)

    if data.result == ConflictResult.DIRECT_CONFLICT:
        db_case.status = CaseStatus.REJECTED
    else:
        db_case.status = CaseStatus.CONFLICT_CHECKED

    db.commit()
    db.refresh(db_check)
    return db_check


def get_conflict_check(db: Session, check_id: int) -> Optional[ConflictCheck]:
    return db.query(ConflictCheck).filter(ConflictCheck.id == check_id).first()


def get_by_case_id(db: Session, case_id: int) -> Optional[ConflictCheck]:
    return db.query(ConflictCheck).filter(ConflictCheck.case_id == case_id).first()


def update_conflict_check(db: Session, check_id: int, data: ConflictCheckUpdate,
                          checked_by: int) -> Optional[ConflictCheck]:
    db_check = get_conflict_check(db, check_id)
    if not db_check:
        return None

    db_case = db.query(Case).filter(Case.id == db_check.case_id).first()
    if db_case and db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能修改冲突检查结论")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_check, key, value)

    db_check.checked_by = checked_by
    db_check.checked_at = datetime.utcnow()

    if "result" in update_data:
        if data.result == ConflictResult.DIRECT_CONFLICT:
            db_case.status = CaseStatus.REJECTED
        elif db_case.status == CaseStatus.REJECTED:
            db_case.status = CaseStatus.CONFLICT_CHECKED

    db.commit()
    db.refresh(db_check)
    return db_check
