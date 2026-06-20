from typing import List, Optional
from sqlalchemy.orm import Session

from app.models import CaseMaterial, Case, CaseStatus, MaterialType
from app.schemas import CaseMaterialCreate


def add_material(db: Session, data: CaseMaterialCreate, uploaded_by: int) -> CaseMaterial:
    db_case = db.query(Case).filter(Case.id == data.case_id).first()
    if not db_case:
        raise ValueError("案件不存在")

    if db_case.status == CaseStatus.ARCHIVED and not data.is_supplementary:
        raise ValueError("已归档案件只能追加补充材料")

    db_material = CaseMaterial(
        case_id=data.case_id,
        material_name=data.material_name,
        material_type=data.material_type,
        file_path=data.file_path,
        file_size=data.file_size,
        description=data.description,
        is_supplementary=data.is_supplementary,
        uploaded_by=uploaded_by
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material


def list_materials(db: Session, case_id: int, material_type: Optional[MaterialType] = None) -> List[CaseMaterial]:
    query = db.query(CaseMaterial).filter(CaseMaterial.case_id == case_id)
    if material_type:
        query = query.filter(CaseMaterial.material_type == material_type)
    return query.order_by(CaseMaterial.created_at.desc()).all()


def get_material(db: Session, material_id: int) -> Optional[CaseMaterial]:
    return db.query(CaseMaterial).filter(CaseMaterial.id == material_id).first()


def delete_material(db: Session, material_id: int) -> bool:
    db_material = get_material(db, material_id)
    if not db_material:
        return False

    db_case = db.query(Case).filter(Case.id == db_material.case_id).first()
    if db_case and db_case.status == CaseStatus.ARCHIVED:
        raise ValueError("已归档案件不能删除材料")

    db.delete(db_material)
    db.commit()
    return True
