"""Create a teacher account securely (no public teacher sign-up).

Usage:
    python -m app.scripts.create_teacher --email teacher@example.com \
        --first-name Aziz --last-name Karimov
"""

import argparse
import getpass
import sys

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User, UserRole


def main() -> int:
    parser = argparse.ArgumentParser(description="English Arena: ustoz akkaunti yaratish")
    parser.add_argument("--email", required=True, help="Ustoz emaili")
    parser.add_argument("--first-name", required=True, help="Ism")
    parser.add_argument("--last-name", required=True, help="Familiya")
    parser.add_argument("--username", default=None, help="Login (ixtiyoriy)")
    parser.add_argument("--password", default=None, help="Parol (xavfsizlik uchun so'raladi)")
    args = parser.parse_args()

    email = args.email.strip().lower()
    if "@" not in email:
        print("Xato: email noto'g'ri")
        return 1

    password = args.password or getpass.getpass("Parol (kamida 8 belgi): ")
    if len(password) < 8:
        print("Xato: parol kamida 8 belgidan iborat bo'lishi kerak")
        return 1
    if args.password is None:
        confirm = getpass.getpass("Parolni tasdiqlang: ")
        if password != confirm:
            print("Xato: parollar mos kelmadi")
            return 1

    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none()
        if existing:
            print(f"Xato: {email} allaqachon ro'yxatdan o'tgan")
            return 1
        username = args.username.strip().lower() if args.username else None
        if username and db.execute(
            select(User).where(func.lower(User.username) == username)
        ).scalar_one_or_none():
            print(f"Xato: {username} login band")
            return 1

        teacher = User(
            role=UserRole.teacher.value,
            first_name=args.first_name.strip(),
            last_name=args.last_name.strip(),
            email=email,
            username=username,
            password_hash=hash_password(password),
        )
        db.add(teacher)
        db.commit()
        print("Ustoz akkaunti yaratildi:")
        print(f"  Email: {email}")
        if username:
            print(f"  Login: {username}")
        print("  Parol: (kiritilgan parol)")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
