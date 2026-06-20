from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, CaseStatus
from app.services import case_service
from app.schemas import (
    CaseCreate, CaseUpdate, CaseResponse, CaseDetailResponse,
    CaseListResponse
)

router = APIRouter(prefix="/api/cases", tags=["案件"])


@router.get("", response_model=CaseListResponse)
def list_cases(
    status: Optional[CaseStatus] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    skip = (page - 1) * page_size
    total, items = case_service.list_cases(db, skip, page_size, status, keyword)
    return CaseListResponse(
        total=total,
        items=items,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=CaseResponse)
def create_case(
    case_data: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return case_service.create_case(db, case_data, current_user.id)


@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case(case_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    db_case = case_service.get_case(db, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="案件不存在")
    return db_case


@router.put("/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, case_data: CaseUpdate,
                db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    try:
        db_case = case_service.update_case(db, case_id, case_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not db_case:
        raise HTTPException(status_code=404, detail="案件不存在")
    return db_case


@router.post("/{case_id}/submit-conflict", response_model=CaseResponse)
def submit_conflict_check(case_id: int, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    try:
        db_case = case_service.submit_for_conflict_check(db, case_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not db_case:
        raise HTTPException(status_code=404, detail="案件不存在")
    return db_case


@router.post("/{case_id}/assign-lawyer", response_model=CaseResponse)
def assign_lawyer(case_id: int, lawyer_id: int,
                  db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    try:
        db_case = case_service.assign_lawyer(db, case_id, lawyer_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not db_case:
        raise HTTPException(status_code=404, detail="案件不存在")
    return db_case


@router.post("/{case_id}/accept", response_model=CaseResponse)
def accept_case(case_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    db_case = case_service.get_case(db, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="案件不存在")
    if db_case.status != CaseStatus.BUDGET_CONFIRMED:
        raise HTTPException(status_code=400, detail="预算确认后才能承接案件")
    db_case.status = CaseStatus.ACCEPTED
    db.commit()
    db.refresh(db_case)
    return db_case


@router.post("/{case_id}/archive", response_model=CaseResponse)
def archive_case(case_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    try:
        db_case = case_service.archive_case(db, case_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not db_case:
        raise HTTPException(status_code=404, detail="案件不存在")
    return db_case
