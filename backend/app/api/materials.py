from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, MaterialType
from app.services import material_service
from app.schemas import CaseMaterialCreate, CaseMaterialResponse

router = APIRouter(prefix="/api/materials", tags=["材料"])


@router.post("", response_model=CaseMaterialResponse)
def add_material(
    data: CaseMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return material_service.add_material(db, data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/case/{case_id}", response_model=List[CaseMaterialResponse])
def list_materials(
    case_id: int,
    material_type: Optional[MaterialType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return material_service.list_materials(db, case_id, material_type)


@router.get("/{material_id}", response_model=CaseMaterialResponse)
def get_material(material_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    result = material_service.get_material(db, material_id)
    if not result:
        raise HTTPException(status_code=404, detail="未找到材料记录")
    return result


@router.delete("/{material_id}")
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        success = material_service.delete_material(db, material_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not success:
        raise HTTPException(status_code=404, detail="未找到材料记录")
    return {"success": True}
