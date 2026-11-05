import os
import uuid

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://arena:arena_dev_password@127.0.0.1:5432/english_arena_test",
)
os.environ["SECRET_KEY"] = "test-secret-key-for-english-arena-tests-123456"
os.environ["ENVIRONMENT"] = "test"
os.environ["APP_URL"] = "http://localhost:5173"

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models import Group, GroupMember, User


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_teacher(db, email="teacher@test.uz", password="Teacher12345", name="Test Teacher"):
    first, _, last = name.partition(" ")
    teacher = User(
        role="teacher",
        first_name=first,
        last_name=last or "Teacher",
        email=email,
        username=email.split("@")[0],
        password_hash=hash_password(password),
        coin_balance=0,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


def create_student(db, teacher, email="student@test.uz", password="Student12345", name="Test Student"):
    first, _, last = name.partition(" ")
    student = User(
        role="student",
        first_name=first,
        last_name=last or "Student",
        email=email,
        username=email.split("@")[0],
        password_hash=hash_password(password),
        teacher_id=teacher.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def create_group(db, teacher, name="Test Group"):
    group = Group(teacher_id=teacher.id, name=name, color="violet")
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def add_member(db, group, student):
    db.add(GroupMember(group_id=group.id, user_id=student.id))
    db.commit()


def login(client, login_value, password):
    response = client.post("/api/auth/login", json={"login": login_value, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
