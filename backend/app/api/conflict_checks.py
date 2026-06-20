from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import User, UserRole
from app.services import conflict_service
from app.schemas import ConflictCheckCreate, ConflictCheckUpdate, ConflictCheckResponse

router = APIRouter(prefix="/api/conflict-checks", tags=["冲突检查"])


@router.post("", response_model=ConflictCheckResponse)
def create_conflict_check(
    data: ConflictCheckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.RISK_CONTROL))
):
    try:
        return conflict_service.create_conflict_check(db, data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/case/{case_id}", response_model=ConflictCheckResponse)
def get_by_case(case_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    result = conflict_service.get_by_case_id(db, case_id)
    if not result:
        raise HTTPException(status_code=404, detail="未找到冲突检查记录")
    return result


@router.get("/{check_id}", response_model=ConflictCheckResponse)
def get_conflict_check(check_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    result = conflict_service.get_conflict_check(db, check_id)
    if not result:
        raise HTTPException(status_code=404, detail="未找到冲突检查记录")
    return result


@router.put("/{check_id}", response_model=ConflictCheckResponse)
def update_conflict_check(
    check_id: int,
    data: ConflictCheckUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.RISK_CONTROL))
):
    try:
        result = conflict_service.update_conflict_check(db, check_id, data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="未找到冲突检查记录")
    return result
