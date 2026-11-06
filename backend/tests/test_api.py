import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.models import (
    CoinTransaction,
    GroupMember,
    Invitation,
    ReadingProgress,
    RewardRequest,
    User,
)
from tests.conftest import (
    add_member,
    create_group,
    create_student,
    create_teacher,
    login,
)


def test_auth_and_role_guards(client, db):
    teacher = create_teacher(db)
    student = create_student(db, teacher)
    create_group(db, teacher)

    bad = client.post("/api/auth/login", json={"login": teacher.email, "password": "wrong-pass"})
    assert bad.status_code == 401

    teacher_headers = login(client, teacher.email, "Teacher12345")
    me = client.get("/api/auth/me", headers=teacher_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "teacher"

    student_headers = login(client, student.email, "Student12345")
    forbidden = client.get("/api/teacher/groups", headers=student_headers)
    assert forbidden.status_code == 403

    forbidden = client.get("/api/student/dashboard", headers=teacher_headers)
    assert forbidden.status_code == 403

    assert client.get("/api/teacher/students").status_code == 401


def test_invitation_registration_is_single_use_and_scoped(client, db):
    teacher = create_teacher(db)
    group = create_group(db, teacher, "Beginner Group")
    headers = login(client, teacher.email, "Teacher12345")

    response = client.post(
        "/api/teacher/invitations",
        headers=headers,
        json={
            "group_id": str(group.id),
            "first_name": "Aziza",
            "last_name": "Karimova",
            "email": "aziza@test.uz",
        },
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "pending"
    assert data["invite_link"]
    assert data["email_sent"] is False  # EmailJS not configured in tests

    token = data["invite_link"].split("token=")[1]
    info = client.get(f"/api/auth/invitations/{token}")
    assert info.status_code == 200
    assert info.json()["group_name"] == "Beginner Group"
    assert info.json()["first_name"] == "Aziza"

    register = client.post(
        f"/api/auth/invitations/{token}/register",
        json={"login": "aziza", "password": "Student12345", "confirm_password": "Student12345"},
    )
    assert register.status_code == 200, register.text
    body = register.json()
    assert body["user"]["group"]["name"] == "Beginner Group"
    assert body["user"]["email"] == "aziza@test.uz"

    reused = client.post(
        f"/api/auth/invitations/{token}/register",
        json={"login": "aziza2", "password": "Student12345", "confirm_password": "Student12345"},
    )
    assert reused.status_code == 409

    student = db.execute(select(User).where(User.email == "aziza@test.uz")).scalar_one()
    assert student.teacher_id == teacher.id
    membership = db.execute(select(GroupMember).where(GroupMember.user_id == student.id)).scalar_one()
    assert membership.group_id == group.id

    detail = client.get(f"/api/teacher/groups/{group.id}", headers=headers)
    assert detail.status_code == 200
    assert any(member["email"] == "aziza@test.uz" for member in detail.json()["members"])


def test_expired_invitation_cannot_be_used(client, db):
    teacher = create_teacher(db)
    group = create_group(db, teacher)
    headers = login(client, teacher.email, "Teacher12345")
    response = client.post(
        "/api/teacher/invitations",
        headers=headers,
        json={"group_id": str(group.id), "first_name": "Late", "last_name": "Student", "email": "late@test.uz"},
    )
    token = response.json()["invite_link"].split("token=")[1]
    invitation = db.execute(select(Invitation).where(Invitation.email == "late@test.uz")).scalar_one()
    invitation.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()

    info = client.get(f"/api/auth/invitations/{token}")
    assert info.status_code == 410
    register = client.post(
        f"/api/auth/invitations/{token}/register",
        json={"login": "late", "password": "Student12345", "confirm_password": "Student12345"},
    )
    assert register.status_code == 410


def test_coin_transactions_are_atomic_and_guarded(client, db):
    teacher = create_teacher(db)
    student = create_student(db, teacher)
    headers = login(client, teacher.email, "Teacher12345")

    award = client.post(
        "/api/teacher/coins",
        headers=headers,
        json={"student_id": str(student.id), "amount": 50, "reason": "Faol ishtirok"},
    )
    assert award.status_code == 201, award.text
    assert award.json()["balance"] == 50

    deduct = client.post(
        "/api/teacher/coins",
        headers=headers,
        json={"student_id": str(student.id), "amount": -20, "reason": "Kechikish"},
    )
    assert deduct.status_code == 201
    assert deduct.json()["balance"] == 30

    guard = client.post(
        "/api/teacher/coins",
        headers=headers,
        json={"student_id": str(student.id), "amount": -1000, "reason": "Impossible"},
    )
    assert guard.status_code == 400

    zero = client.post(
        "/api/teacher/coins",
        headers=headers,
        json={"student_id": str(student.id), "amount": 0, "reason": "Zero"},
    )
    assert zero.status_code == 400

    student_headers = login(client, student.email, "Student12345")
    coins = client.get("/api/student/coins", headers=student_headers)
    assert coins.json()["balance"] == 30
    assert len(coins.json()["transactions"]) == 2
    assert client.post(
        "/api/teacher/coins",
        headers=student_headers,
        json={"student_id": str(student.id), "amount": 10, "reason": "Hack"},
    ).status_code == 403

    db.expire_all()
    fresh = db.get(User, student.id)
    assert fresh.coin_balance == 30
    txs = db.execute(
        select(CoinTransaction).where(CoinTransaction.student_id == student.id).order_by(CoinTransaction.created_at)
    ).scalars().all()
    assert [tx.balance_after for tx in txs] == [50, 30]


def _create_reward(client, headers, title="Kitob", price=30):
    response = client.post(
        "/api/teacher/rewards",
        headers=headers,
        data={"title": title, "description": "Sovg'a", "price": str(price), "is_available": "true"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_reward_escrow_refund_and_approval(client, db):
    teacher = create_teacher(db)
    student = create_student(db, teacher)
    add_member(db, create_group(db, teacher), student)
    teacher_headers = login(client, teacher.email, "Teacher12345")
    student_headers = login(client, student.email, "Student12345")

    client.post(
        "/api/teacher/coins",
        headers=teacher_headers,
        json={"student_id": str(student.id), "amount": 100, "reason": "Boshlang'ich bonus"},
    )
    reward = _create_reward(client, teacher_headers, "Kitob sovg'asi", 30)

    request = client.post(f"/api/student/rewards/{reward['id']}/request", headers=student_headers)
    assert request.status_code == 201, request.text
    request_id = request.json()["id"]
    assert client.get("/api/student/coins", headers=student_headers).json()["balance"] == 70

    duplicate = client.post(f"/api/student/rewards/{reward['id']}/request", headers=student_headers)
    assert duplicate.status_code == 409

    reject = client.post(f"/api/teacher/reward-requests/{request_id}/reject", headers=teacher_headers)
    assert reject.status_code == 200, reject.text
    assert reject.json()["status"] == "rejected"
    assert client.get("/api/student/coins", headers=student_headers).json()["balance"] == 100

    second_reject = client.post(f"/api/teacher/reward-requests/{request_id}/reject", headers=teacher_headers)
    assert second_reject.status_code == 409

    db.expire_all()
    refunds = db.execute(
        select(func.count(CoinTransaction.id)).where(
            CoinTransaction.reward_request_id == uuid.UUID(request_id),
            CoinTransaction.type == "reward_refund",
        )
    ).scalar()
    assert refunds == 1

    # Re-requesting after rejection is allowed; approval does not refund.
    request2 = client.post(f"/api/student/rewards/{reward['id']}/request", headers=student_headers)
    assert request2.status_code == 201
    request2_id = request2.json()["id"]
    approve = client.post(f"/api/teacher/reward-requests/{request2_id}/approve", headers=teacher_headers)
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved"
    assert client.get("/api/student/coins", headers=student_headers).json()["balance"] == 70
    assert client.post(
        f"/api/teacher/reward-requests/{request2_id}/reject", headers=teacher_headers
    ).status_code == 409


def test_assignment_recipients_snapshot_and_view_tracking(client, db):
    teacher = create_teacher(db)
    group = create_group(db, teacher)
    s1 = create_student(db, teacher, email="s1@test.uz", name="Student One")
    s2 = create_student(db, teacher, email="s2@test.uz", name="Student Two")
    s3 = create_student(db, teacher, email="s3@test.uz", name="Student Three")
    add_member(db, group, s1)
    add_member(db, group, s2)
    headers = login(client, teacher.email, "Teacher12345")

    response = client.post(
        "/api/teacher/assignments",
        headers=headers,
        data={
            "title": "Unit 3 homework",
            "description": "Workbook pages 4-5",
            "group_id": str(group.id),
            "due_at": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        },
        files={"file": ("task.pdf", b"%PDF-1.4 test pdf", "application/pdf")},
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["recipient_count"] == 2
    assert data["attachment"]["name"] == "task.pdf"

    add_member(db, group, s3)
    s1_headers = login(client, s1.email, "Student12345")
    s3_headers = login(client, s3.email, "Student12345")

    list1 = client.get("/api/student/assignments", headers=s1_headers).json()
    assert len(list1) == 1
    assert list1[0]["viewed_at"] is None
    assert client.get("/api/student/assignments", headers=s3_headers).json() == []

    detail = client.get(f"/api/student/assignments/{data['id']}", headers=s1_headers)
    assert detail.status_code == 200
    assert detail.json()["teacher_name"] == "Test Teacher"

    teacher_detail = client.get(f"/api/teacher/assignments/{data['id']}", headers=headers).json()
    viewed = [item for item in teacher_detail["recipients"] if item["id"] == str(s1.id)][0]
    assert viewed["viewed_at"] is not None

    other = create_teacher(db, email="other@test.uz", name="Other Teacher")
    other_headers = login(client, other.email, "Teacher12345")
    assert client.get(f"/api/teacher/assignments/{data['id']}", headers=other_headers).status_code == 404
    assert client.get(f"/api/teacher/students/{s1.id}", headers=other_headers).status_code == 404


def test_book_library_progress_and_file_tokens(client, db):
    teacher = create_teacher(db)
    group = create_group(db, teacher)
    student = create_student(db, teacher)
    add_member(db, group, student)
    headers = login(client, teacher.email, "Teacher12345")
    student_headers = login(client, student.email, "Student12345")

    created = client.post(
        "/api/teacher/books",
        headers=headers,
        data={
            "title": "Test Book",
            "author": "Aesop",
            "description": "Sample",
            "level": "A2",
            "is_published": "true",
        },
        files={"file": ("book.pdf", b"%PDF-1.4 test book", "application/pdf")},
    )
    assert created.status_code == 201, created.text
    book = created.json()
    assert book["file_type"] == "pdf"

    books = client.get("/api/student/books", headers=student_headers)
    assert books.status_code == 200
    assert [item["title"] for item in books.json()] == ["Test Book"]

    file_response = client.get(book["file_url"])
    assert file_response.status_code == 200
    assert file_response.headers["content-type"] == "application/pdf"

    tampered = book["file_url"].replace(book["id"], str(uuid.uuid4()))
    assert client.get(tampered).status_code == 401

    progress = client.put(
        f"/api/student/books/{book['id']}/progress",
        headers=student_headers,
        json={"current_page": 5, "total_pages": 10, "progress_percent": 50},
    )
    assert progress.status_code == 200
    assert progress.json()["progress_percent"] == 50

    bookmark = client.post(
        f"/api/student/books/{book['id']}/bookmarks",
        headers=student_headers,
        json={"page": 5, "location": "page:5", "label": "Muhim"},
    )
    assert bookmark.status_code == 201
    assert len(client.get(f"/api/student/books/{book['id']}/bookmarks", headers=student_headers).json()) == 1

    other_student = create_student(db, teacher, email="other2@test.uz", name="Second Reader")
    other_headers = login(client, other_student.email, "Student12345")
    assert client.get(f"/api/student/books/{book['id']}/bookmarks", headers=other_headers).json() == []

    db.expire_all()
    saved_progress = db.execute(
        select(ReadingProgress).where(ReadingProgress.student_id == student.id)
    ).scalar_one()
    assert saved_progress.current_page == 5


def test_cross_teacher_isolation(client, db):
    teacher_a = create_teacher(db, email="a@test.uz", name="Teacher A")
    teacher_b = create_teacher(db, email="b@test.uz", name="Teacher B")
    group_a = create_group(db, teacher_a, "A group")
    student_a = create_student(db, teacher_a, email="sa@test.uz", name="Student A")
    add_member(db, group_a, student_a)

    headers_b = login(client, teacher_b.email, "Teacher12345")
    assert client.get(f"/api/teacher/groups/{group_a.id}", headers=headers_b).status_code == 404
    assert client.get(f"/api/teacher/students/{student_a.id}", headers=headers_b).status_code == 404
    assert client.get("/api/teacher/students", headers=headers_b).json() == []

    headers_a = login(client, teacher_a.email, "Teacher12345")
    assert client.get(f"/api/teacher/groups/{group_a.id}", headers=headers_a).status_code == 200


def test_leaderboard_period_boundaries(client, db):
    teacher = create_teacher(db)
    s1 = create_student(db, teacher, email="first@test.uz", name="First Student")
    s2 = create_student(db, teacher, email="second@test.uz", name="Second Student")
    headers = login(client, teacher.email, "Teacher12345")

    for amount in (20, 20, 10):
        client.post(
            "/api/teacher/coins",
            headers=headers,
            json={"student_id": str(s1.id), "amount": amount, "reason": "Award"},
        )
    client.post(
        "/api/teacher/coins",
        headers=headers,
        json={"student_id": str(s2.id), "amount": 5, "reason": "Award"},
    )

    db.expire_all()
    # Current month but before the current week (week starts Monday).
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    old = CoinTransaction(
        student_id=s1.id,
        created_by_id=teacher.id,
        amount=100,
        balance_after=0,
        type="award",
        reason="Month-only award",
        created_at=month_start + timedelta(hours=1),
    )
    ancient = CoinTransaction(
        student_id=s1.id,
        created_by_id=teacher.id,
        amount=500,
        balance_after=0,
        type="award",
        reason="Ancient award",
        created_at=datetime.now(timezone.utc) - timedelta(days=45),
    )
    db.add_all([old, ancient])
    db.commit()

    week = client.get("/api/leaderboard?period=week", headers=headers).json()
    assert week["top"][0]["student_id"] == str(s1.id)
    assert week["top"][0]["coins"] == 50

    month = client.get("/api/leaderboard?period=month", headers=headers).json()
    assert month["top"][0]["coins"] == 150

    all_time = client.get("/api/leaderboard?period=all", headers=headers).json()
    assert all_time["top"][0]["coins"] == 650

    s1_headers = login(client, s1.email, "Student12345")
    me = client.get("/api/leaderboard?period=week", headers=s1_headers).json()["me"]
    assert me["rank"] == 1


def test_weekly_goals_and_progress(client, db):
    teacher = create_teacher(db)
    group = create_group(db, teacher)
    student = create_student(db, teacher)
    add_member(db, group, student)
    headers = login(client, teacher.email, "Teacher12345")
    student_headers = login(client, student.email, "Student12345")

    client.post(
        "/api/teacher/coins",
        headers=headers,
        json={"student_id": str(student.id), "amount": 20, "reason": "Progress"},
    )

    created = client.post(
        "/api/teacher/goals",
        headers=headers,
        json={
            "title": "Haftada 100 coin",
            "metric": "coins",
            "target_value": 100,
            "group_id": str(group.id),
        },
    )
    assert created.status_code == 201, created.text

    duplicate = client.post(
        "/api/teacher/goals",
        headers=headers,
        json={
            "title": "Yana 100 coin",
            "metric": "coins",
            "target_value": 100,
            "group_id": str(group.id),
        },
    )
    assert duplicate.status_code == 409

    goals = client.get("/api/student/goals", headers=student_headers)
    assert goals.status_code == 200
    assert len(goals.json()) == 1
    assert goals.json()[0]["progress"]["value"] == 20
    assert goals.json()[0]["progress"]["percent"] == 20.0


def test_student_dashboard_and_engagement(client, db):
    teacher = create_teacher(db)
    group = create_group(db, teacher)
    student = create_student(db, teacher)
    add_member(db, group, student)
    headers = login(client, teacher.email, "Teacher12345")
    student_headers = login(client, student.email, "Student12345")

    sotd = client.post(
        "/api/teacher/student-of-the-day",
        headers=headers,
        json={"student_id": str(student.id), "note": "Eng faol"},
    )
    assert sotd.status_code == 200
    assert sotd.json()["student_name"] == "Test Student"

    announcement = client.post(
        "/api/teacher/announcements",
        headers=headers,
        json={"title": "Mock test", "body": "Shanba kuni", "group_id": str(group.id)},
    )
    assert announcement.status_code == 201

    dashboard = client.get("/api/student/dashboard", headers=student_headers)
    assert dashboard.status_code == 200, dashboard.text
    data = dashboard.json()
    assert data["badges"]["student_of_the_day"]["note"] == "Eng faol"
    assert data["announcements"][0]["title"] == "Mock test"
    assert data["student"]["group"]["name"] == "Test Group"


def test_push_endpoints_degrade_gracefully_without_vapid(client, db):
    teacher = create_teacher(db)
    headers = login(client, teacher.email, "Teacher12345")

    key = client.get("/api/push/public-key", headers=headers)
    assert key.status_code == 200
    assert key.json()["enabled"] is False

    status = client.get("/api/push/status", headers=headers)
    assert status.status_code == 200
    assert status.json()["subscriptions"] == 0

    subscribe = client.post(
        "/api/push/subscribe",
        headers=headers,
        json={
            "endpoint": "https://example.com/push/fake-endpoint",
            "keys": {"p256dh": "B" + "a" * 80, "auth": "a" * 20},
        },
    )
    assert subscribe.status_code == 503

    test = client.post("/api/push/test", headers=headers)
    assert test.status_code == 200
    assert test.json()["sent"] == 0
