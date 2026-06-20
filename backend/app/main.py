from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.api import auth, users, clients, cases, conflict_checks, budgets, materials

Base.metadata.create_all(bind=engine)

app = FastAPI(title="律所案件承接系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(clients.router)
app.include_router(cases.router)
app.include_router(conflict_checks.router)
app.include_router(budgets.router)
app.include_router(materials.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
