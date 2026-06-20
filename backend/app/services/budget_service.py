from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Budget, Case, CaseStatus, BudgetStatus
from app.schemas import BudgetCreate, BudgetUpdate


def create_budget(db: Session, data: BudgetCreate) -> Budget:
    db_case = db.query(Case).filter(Case.id == data.case_id).first()
    if not db_case:
        raise ValueError("案件不存在")

    existing = db.query(Budget).filter(Budget.case_id == data.case_id).first()
    if existing:
        existing.total_amount = data.total_amount
        existing.advance_payment = data.advance_payment
        existing.payment_terms = data.payment_terms
        existing.remarks = data.remarks
        db_budget = existing
    else:
        db_budget = Budget(
            case_id=data.case_id,
            total_amount=data.total_amount,
            advance_payment=data.advance_payment,
            payment_terms=data.payment_terms,
            remarks=data.remarks,
            status=BudgetStatus.PENDING
        )
        db.add(db_budget)

    db.commit()
    db.refresh(db_budget)
    return db_budget


def get_budget(db: Session, budget_id: int) -> Optional[Budget]:
    return db.query(Budget).filter(Budget.id == budget_id).first()


def get_by_case_id(db: Session, case_id: int) -> Optional[Budget]:
    return db.query(Budget).filter(Budget.case_id == case_id).first()


def confirm_budget(db: Session, budget_id: int, confirmed_by: int, confirm: bool = True) -> Optional[Budget]:
    db_budget = get_budget(db, budget_id)
    if not db_budget:
        return None

    db_case = db.query(Case).filter(Case.id == db_budget.case_id).first()
    if db_case and db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能修改预算状态")

    db_budget.confirmed_by = confirmed_by
    db_budget.confirmed_at = datetime.utcnow()

    if confirm:
        db_budget.status = BudgetStatus.CONFIRMED
        if db_case and db_case.status == CaseStatus.CONFLICT_CHECKED:
            db_case.status = CaseStatus.BUDGET_CONFIRMED
        elif db_case and db_case.status == CaseStatus.BUDGET_CONFIRMED:
            pass
    else:
        db_budget.status = BudgetStatus.REJECTED
        if db_case and db_case.status in [CaseStatus.BUDGET_CONFIRMED, CaseStatus.ACCEPTED]:
            db_case.status = CaseStatus.CONFLICT_CHECKED

    db.commit()
    db.refresh(db_budget)
    return db_budget


def update_budget(db: Session, budget_id: int, data: BudgetUpdate) -> Optional[Budget]:
    db_budget = get_budget(db, budget_id)
    if not db_budget:
        return None

    db_case = db.query(Case).filter(Case.id == db_budget.case_id).first()
    if db_case and db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能修改预算")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_budget, key, value)

    if "status" in update_data and data.status == BudgetStatus.PENDING:
        db_budget.confirmed_by = None
        db_budget.confirmed_at = None

    db.commit()
    db.refresh(db_budget)
    return db_budget
