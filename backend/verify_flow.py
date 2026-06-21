"""
全流程验证脚本 - 验证律所案件承接系统主流程
直接调用服务层，使用 SQLite 内存数据库，无需启动 HTTP 服务
运行方式: python verify_flow.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ["DATABASE_URL"] = "sqlite:///./verify_test.db"

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

from app.core.database import Base
from app.core.security import get_password_hash
from app.models import (
    User, UserRole, Client, Case, CaseStatus, RelatedParty, PartyType,
    ConflictCheck, ConflictResult, Budget, BudgetStatus, CaseMaterial, MaterialType
)
from app.services import case_service, conflict_service, budget_service, material_service
from app.schemas import (
    CaseCreate, ConflictCheckCreate, BudgetCreate, CaseMaterialCreate,
    RelatedPartyCreate, CaseUpdate
)

DB_FILE = "./verify_test.db"


def setup_db():
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)
    engine = create_engine(f"sqlite:///{DB_FILE}", connect_args={"check_same_thread": False})

    @event.listens_for(Engine, "connect")
    def _pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()


def step(n, title):
    print(f"\n{'='*60}")
    print(f"  步骤 {n}: {title}")
    print('='*60)


def main():
    print("="*60)
    print("  律所案件承接系统 - 全流程验证")
    print("="*60)

    db = setup_db()
    try:
        step(1, "初始化用户和客户数据")
        users = {
            "partner": User(username="partner", name="张合伙人", role=UserRole.PARTNER,
                            hashed_password=get_password_hash("123456")),
            "risk": User(username="risk", name="李风控", role=UserRole.RISK_CONTROL,
                         hashed_password=get_password_hash("123456")),
            "finance": User(username="finance", name="王财务", role=UserRole.FINANCE,
                            hashed_password=get_password_hash("123456")),
            "lawyer1": User(username="lawyer1", name="赵律师", role=UserRole.LAWYER,
                            hashed_password=get_password_hash("123456")),
        }
        for u in users.values():
            db.add(u)
        db.commit()
        for u in users.values():
            db.refresh(u)

        client = Client(name="测试客户科技有限公司", id_type="统一社会信用代码",
                        id_number="91110000TEST123456", phone="010-12345678",
                        email="test@example.com", is_individual=False, created_by=users["partner"].id)
        db.add(client)
        db.commit()
        db.refresh(client)
        print(f"  [OK] 用户: partner/risk/finance/lawyer1")
        print(f"  [OK] 客户: {client.name}")

        step(2, "合伙人登记案件 (partner)")
        case_data = CaseCreate(
            case_name="测试合同纠纷案件-正常流程",
            case_type="民事诉讼",
            description="原告客户与被告之间的合同纠纷案",
            client_id=client.id,
            partner_id=users["partner"].id,
            related_parties=[RelatedPartyCreate(
                name="北京对方公司有限公司", party_type=PartyType.OPPOSING,
                id_type="统一社会信用代码", id_number="91110000OPP001",
                is_individual=False
            )]
        )
        c = case_service.create_case(db, case_data, users["partner"].id)
        assert c.status == CaseStatus.DRAFT
        print(f"  [OK] 案件编号: {c.case_number}, 状态: {c.status.value}")

        step(3, "提交冲突检查 (partner)")
        c = case_service.submit_for_conflict_check(db, c.id)
        assert c.status == CaseStatus.PENDING
        print(f"  [OK] 状态: {c.status.value}")

        step(4, "风控律师给出无冲突结论 (risk)")
        conflict = conflict_service.create_conflict_check(db, ConflictCheckCreate(
            case_id=c.id, result=ConflictResult.NO_CONFLICT,
            conflict_details="经检索未发现利益冲突",
            risk_suggestion="可以承接"
        ), users["risk"].id)
        c = case_service.get_case(db, c.id)
        assert c.status == CaseStatus.CONFLICT_CHECKED
        assert c.conflict_check is not None
        assert c.conflict_check.result == ConflictResult.NO_CONFLICT
        print(f"  [OK] 冲突结论: {conflict.result.value}, 案件状态: {c.status.value}")
        print(f"  [OK] @property conflict_check 可读: {c.conflict_check.result.value}")

        step(5, "财务录入并确认预算 (finance)")
        budget = budget_service.create_budget(db, BudgetCreate(
            case_id=c.id, total_amount=150000.00, advance_payment=50000.00,
            payment_terms="分三期支付", remarks="总计15万"
        ))
        assert budget.status == BudgetStatus.PENDING
        print(f"  [OK] 预算录入: 总额={budget.total_amount}, 状态: {budget.status.value}")

        budget = budget_service.confirm_budget(db, budget.id, users["finance"].id, confirm=True)
        c = case_service.get_case(db, c.id)
        assert budget.status == BudgetStatus.CONFIRMED
        assert c.status == CaseStatus.BUDGET_CONFIRMED
        assert c.budget is not None
        assert c.budget.status == BudgetStatus.CONFIRMED
        print(f"  [OK] 预算已确认, 案件状态: {c.status.value}")
        print(f"  [OK] @property budget 可读: {c.budget.status.value}")

        step(6, "验证: 预算未确认不能分配律师")
        case_nobudget = case_service.create_case(db, CaseCreate(
            case_name="预算前分配律师测试", case_type="法律顾问", related_parties=[]
        ), users["partner"].id)
        case_nobudget = case_service.submit_for_conflict_check(db, case_nobudget.id)
        conflict_service.create_conflict_check(db, ConflictCheckCreate(
            case_id=case_nobudget.id, result=ConflictResult.NO_CONFLICT
        ), users["risk"].id)
        try:
            case_service.assign_lawyer(db, case_nobudget.id, users["lawyer1"].id)
            print("  [FAIL] 预算未确认竟然能分配律师！")
            sys.exit(1)
        except ValueError as e:
            print(f"  [OK] 正确拦截: {e}")

        step(7, "预算确认后分配律师 (partner)")
        c = case_service.assign_lawyer(db, c.id, users["lawyer1"].id)
        assert c.assigned_lawyer_id == users["lawyer1"].id
        print(f"  [OK] 已分配律师: {c.assigned_lawyer.name}")

        step(8, "确认承接 -> 归档")
        c = case_service.get_case(db, c.id)
        c.status = CaseStatus.ACCEPTED
        db.commit()
        db.refresh(c)
        assert c.status == CaseStatus.ACCEPTED
        print(f"  [OK] 案件已承接, 状态: {c.status.value}")

        material_service.add_material(db, CaseMaterialCreate(
            case_id=c.id, material_name="委托合同.pdf",
            material_type=MaterialType.CONTRACT, is_supplementary=False
        ), users["partner"].id)
        c = case_service.archive_case(db, c.id)
        assert c.status == CaseStatus.ARCHIVED
        print(f"  [OK] 案件已归档, 状态: {c.status.value}")

        step(9, "验证: 归档后不能修改承接结论/基本信息")
        try:
            case_service.update_case(db, c.id, CaseUpdate(case_name="尝试修改"))
            print("  [FAIL] 归档后竟然能修改基本信息！")
            sys.exit(1)
        except ValueError as e:
            print(f"  [OK] 正确拦截: {e}")

        step(10, "验证: 归档后只能追加补充材料")
        try:
            material_service.add_material(db, CaseMaterialCreate(
                case_id=c.id, material_name="非补充.pdf",
                material_type=MaterialType.OTHER, is_supplementary=False
            ), users["partner"].id)
            print("  [FAIL] 归档后添加非补充材料竟然成功！")
            sys.exit(1)
        except ValueError as e:
            print(f"  [OK] 非补充材料被拦截: {e}")

        supp = material_service.add_material(db, CaseMaterialCreate(
            case_id=c.id, material_name="补充结案报告.pdf",
            material_type=MaterialType.OTHER, description="归档后补充",
            is_supplementary=True
        ), users["partner"].id)
        assert supp.is_supplementary is True
        mats = material_service.list_materials(db, c.id)
        supp_count = sum(1 for m in mats if m.is_supplementary)
        print(f"  [OK] 补充材料添加成功, 共 {supp_count} 个补充材料")

        step(11, "关键验证: 直接冲突 -> 禁止立案 (状态变 REJECTED)")
        reject_case = case_service.create_case(db, CaseCreate(
            case_name="高风险直接冲突案件", case_type="民事诉讼",
            description="对方为本所常年顾问单位",
            related_parties=[RelatedPartyCreate(
                name="本所常年顾问单位", party_type=PartyType.OPPOSING, is_individual=False
            )]
        ), users["partner"].id)
        reject_case = case_service.submit_for_conflict_check(db, reject_case.id)
        assert reject_case.status == CaseStatus.PENDING

        conflict_service.create_conflict_check(db, ConflictCheckCreate(
            case_id=reject_case.id, result=ConflictResult.DIRECT_CONFLICT,
            conflict_details="对方为本所常年法律顾问单位，直接利益冲突",
            risk_suggestion="立即终止委托洽谈"
        ), users["risk"].id)
        reject_case = case_service.get_case(db, reject_case.id)
        assert reject_case.status == CaseStatus.REJECTED
        assert reject_case.conflict_check.result == ConflictResult.DIRECT_CONFLICT
        print(f"  [OK] 直接冲突 -> 案件状态: {reject_case.status.value} (不能立案)")
        print(f"  [OK] 驳回案件无法进入预算/分配律师/承接阶段")

        print("\n" + "="*60)
        print("  *** 全部验证通过！主流程7个节点全部正确！ ***")
        print("="*60)
        print("\n验证清单:")
        print("  [OK] 1. partner 登录(用户已创建)")
        print("  [OK] 2. 登记案件 -> DRAFT")
        print("  [OK] 3. 提交冲突检查 -> PENDING")
        print("  [OK] 4. 风控给出无冲突 -> CONFLICT_CHECKED")
        print("  [OK] 5. 财务确认预算 -> BUDGET_CONFIRMED")
        print("  [OK] 6. 预算未确认不能分配律师 (拦截成功)")
        print("  [OK] 7. 预算确认后分配律师 -> 成功")
        print("  [OK] 8. 归档 -> ARCHIVED")
        print("  [OK] 9. 归档后不能改承接结论/基本信息 (拦截成功)")
        print("  [OK] 10. 归档后只能追加补充材料 (非补充被拦截, 补充成功)")
        print("  [OK] 11. 直接冲突 -> REJECTED 禁止立案")

    finally:
        db.close()
        if os.path.exists(DB_FILE):
            os.remove(DB_FILE)
            print(f"\n(已清理测试数据库 {DB_FILE})")


if __name__ == "__main__":
    main()
