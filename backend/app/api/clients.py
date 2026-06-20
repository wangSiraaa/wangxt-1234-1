from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Client
from app.schemas import ClientCreate, ClientUpdate, ClientResponse

router = APIRouter(prefix="/api/clients", tags=["客户"])


@router.get("", response_model=List[ClientResponse])
def list_clients(
    keyword: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Client)
    if keyword:
        query = query.filter(
            (Client.name.like(f"%{keyword}%")) |
            (Client.id_number.like(f"%{keyword}%"))
        )
    return query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=ClientResponse)
def create_client(
    client: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_client = Client(
        **client.model_dump(),
        created_by=current_user.id
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="客户不存在")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client_data: ClientUpdate,
                  db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="客户不存在")
    update_data = client_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)
    db.commit()
    db.refresh(db_client)
    return db_client
