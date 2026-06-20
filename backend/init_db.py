from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import User, UserRole, Client


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("数据库已初始化，跳过种子数据")
            return

        users = [
            User(username="partner", name="张合伙人", email="partner@lawfirm.com",
                 role=UserRole.PARTNER, hashed_password=get_password_hash("123456")),
            User(username="risk", name="李风控", email="risk@lawfirm.com",
                 role=UserRole.RISK_CONTROL, hashed_password=get_password_hash("123456")),
            User(username="finance", name="王财务", email="finance@lawfirm.com",
                 role=UserRole.FINANCE, hashed_password=get_password_hash("123456")),
            User(username="lawyer1", name="赵律师", email="lawyer1@lawfirm.com",
                 role=UserRole.LAWYER, hashed_password=get_password_hash("123456")),
            User(username="lawyer2", name="钱律师", email="lawyer2@lawfirm.com",
                 role=UserRole.LAWYER, hashed_password=get_password_hash("123456")),
        ]
        for u in users:
            db.add(u)

        clients = [
            Client(name="北京科技有限公司", id_type="统一社会信用代码",
                   id_number="91110000MA00ABCD12", phone="010-12345678",
                   email="contact@tech.com", address="北京市朝阳区xxx路xxx号",
                   is_individual=False, created_by=1),
            Client(name="张三", id_type="身份证", id_number="110101199001011234",
                   phone="13800138000", email="zhangsan@email.com",
                   address="北京市海淀区xxx路xxx号", is_individual=True, created_by=1),
            Client(name="上海贸易公司", id_type="统一社会信用代码",
                   id_number="91310000MA00EFAB34", phone="021-87654321",
                   email="info@trade.com", address="上海市浦东新区xxx路xxx号",
                   is_individual=False, created_by=1),
        ]
        for c in clients:
            db.add(c)

        db.commit()
        print("数据库初始化完成")
        print("测试账号:")
        print("  合伙人: partner / 123456")
        print("  风控律师: risk / 123456")
        print("  财务: finance / 123456")
        print("  律师: lawyer1 / 123456")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
