from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import User, UserRole, MaterialSupplementStatus
from app.services import material_supplement_service
from app.schemas import (
    MaterialSupplementCreate, MaterialSupplementUpdate, MaterialSupplementResponse
)

router = APIRouter(prefix="/api/material-supplements", tags=["材料补充要求"])


@router.post("", response_model=MaterialSupplementResponse)
def create_supplement(
    data: MaterialSupplementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.RISK_CONTROL))
):
    try:
        return material_supplement_service.create_supplement(db, data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/case/{case_id}", response_model=List[MaterialSupplementResponse])
def list_supplements(
    case_id: int,
    status: Optional[MaterialSupplementStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return material_supplement_service.list_supplements(db, case_id, status)


@router.get("/{supplement_id}", response_model=MaterialSupplementResponse)
def get_supplement(
    supplement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = material_supplement_service.get_supplement(db, supplement_id)
    if not result:
        raise HTTPException(status_code=404, detail="未找到材料补充要求")
    return result


@router.put("/{supplement_id}", response_model=MaterialSupplementResponse)
def update_supplement(
    supplement_id: int,
    data: MaterialSupplementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = material_supplement_service.update_supplement(
            db, supplement_id, data, current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="未找到材料补充要求")
    return result


@router.post("/{supplement_id}/complete", response_model=MaterialSupplementResponse)
def complete_supplement(
    supplement_id: int,
    remark: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = material_supplement_service.complete_supplement(
            db, supplement_id, current_user.id, remark
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="未找到材料补充要求")
    return result


@router.post("/{supplement_id}/cancel", response_model=MaterialSupplementResponse)
def cancel_supplement(
    supplement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.RISK_CONTROL))
):
    try:
        result = material_supplement_service.cancel_supplement(
            db, supplement_id, current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="未找到材料补充要求")
    return result


@router.delete("/{supplement_id}")
def delete_supplement(
    supplement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.RISK_CONTROL))
):
    try:
        success = material_supplement_service.delete_supplement(db, supplement_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not success:
        raise HTTPException(status_code=404, detail="未找到材料补充要求")
    return {"success": True}


@router.get("/case/{case_id}/pending-count")
def get_pending_count(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = material_supplement_service.get_pending_count(db, case_id)
    return {"pending_count": count}
