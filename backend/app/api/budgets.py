from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import User, UserRole
from app.services import budget_service
from app.schemas import BudgetCreate, BudgetUpdate, BudgetResponse

router = APIRouter(prefix="/api/budgets", tags=["预算"])


@router.post("", response_model=BudgetResponse)
def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return budget_service.create_budget(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/case/{case_id}", response_model=BudgetResponse)
def get_by_case(case_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    result = budget_service.get_by_case_id(db, case_id)
    if not result:
        raise HTTPException(status_code=404, detail="未找到预算记录")
    return result


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(budget_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    result = budget_service.get_budget(db, budget_id)
    if not result:
        raise HTTPException(status_code=404, detail="未找到预算记录")
    return result


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = budget_service.update_budget(db, budget_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="未找到预算记录")
    return result


@router.post("/{budget_id}/confirm", response_model=BudgetResponse)
def confirm_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.FINANCE))
):
    try:
        result = budget_service.confirm_budget(db, budget_id, current_user.id, confirm=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="未找到预算记录")
    return result


@router.post("/{budget_id}/reject", response_model=BudgetResponse)
def reject_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.FINANCE))
):
    try:
        result = budget_service.confirm_budget(db, budget_id, current_user.id, confirm=False)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="未找到预算记录")
    return result
