"""Demo seed script. Real production data is created by teachers in the app.

Usage:
    python -m app.seed           # only if database is empty
    python -m app.seed --reset   # wipe ALL data, then seed (development only)
"""

import argparse
import sys
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, text

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Announcement,
    Assignment,
    AssignmentRecipient,
    Book,
    BookFavorite,
    Bookmark,
    Group,
    GroupMember,
    ReadingProgress,
    Reward,
    RewardRequest,
    SavedWord,
    StudentOfTheDay,
    User,
    WeeklyGoal,
)
from app.scripts.sample_files import make_cover, make_epub, make_pdf
from app.services.activity import log_activity
from app.services.coins import apply_coin_transaction
from app.services.serializers import file_url
from app.services.timeutils import today_local, week_start_for

TEACHER_EMAIL = "teacher@englisharena.uz"
TEACHER_PASSWORD = "Arena12345"
STUDENT_PASSWORD = "Student12345"

STUDENTS = [
    ("Aziza", "Karimova", "aziza", "Beginner Group"),
    ("Bekzod", "Tursunov", "bekzod", "Beginner Group"),
    ("Dilnoza", "Rahimova", "dilnoza", "Elementary Group"),
    ("Jasur", "Abdullayev", "jasur", "Elementary Group"),
    ("Madina", "Ismoilova", "madina", "Pre-Intermediate Group"),
    ("Sardor", "Qodirov", "sardor", "Pre-Intermediate Group"),
    ("Nilufar", "Yusupova", "nilufar", "IELTS Group"),
    ("Temur", "Ergashev", "temur", "IELTS Group"),
]

COIN_HISTORY = {
    "madina": [(30, 40, "Uy vazifasini a'lo bajardi"), (21, 30, "Darsda faol qatnashdi"), (14, 50, "Haftalik test g'olibi"), (7, 30, "Yangi so'zlar o'rgandi"), (5, 30, "O'qish mashqini bajardi"), (2, 45, "Speaking topshirig'i uchun"), (0, 60, "Hafta davomida faolligi uchun")],
    "nilufar": [(28, 30, "IELTS mock test"), (18, 25, "Essay yaxshilandi"), (10, 20, "Darsda faol qatnashdi"), (4, 20, "Vocabulary quiz"), (1, 40, "Writing task 2 uchun")],
    "aziza": [(25, 25, "Alifbo mashqlari"), (15, 20, "Darsda faol qatnashdi"), (6, 20, "Reading mashqi"), (3, 25, "Yangi so'zlar o'rgandi"), (0, 25, "Uy vazifasini bajardi")],
    "bekzod": [(22, 20, "Darsda faol qatnashdi"), (9, 15, "Vocabulary mashqi"), (1, 15, "Uy vazifasini bajardi")],
    "dilnoza": [(20, 30, "Test natijasi yaxshi"), (8, 25, "Speaking mashqi"), (2, 20, "Yangi so'zlar o'rgandi")],
    "jasur": [(19, 15, "Darsda qatnashdi"), (6, 15, "Reading mashqi")],
    "sardor": [(17, 20, "Uy vazifasini bajardi"), (5, 20, "Listening mashqi")],
    "temur": [(16, 25, "Mock speaking"), (6, 20, "Essay yozdi")],
}


def reset_database(db) -> None:
    tables = [
        "activity_logs",
        "saved_verbs",
        "saved_words",
        "recent_searches",
        "bookmarks",
        "book_favorites",
        "reading_progress",
        "books",
        "announcements",
        "weekly_goals",
        "student_of_the_day",
        "reward_requests",
        "rewards",
        "coin_transactions",
        "assignment_recipients",
        "assignments",
        "invitations",
        "group_members",
        "groups",
        "users",
        "dictionary_cache",
    ]
    db.execute(text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE"))
    db.commit()


def seed() -> None:
    db = SessionLocal()
    try:
        if db.execute(select(User.id).limit(1)).first():
            print("Bazada ma'lumot bor. Tozalash uchun: python -m app.seed --reset")
            return

        now = datetime.now(timezone.utc)

        teacher = User(
            role="teacher",
            first_name="Aziz",
            last_name="Karimov",
            email=TEACHER_EMAIL,
            username="ustoz",
            password_hash=hash_password(TEACHER_PASSWORD),
        )
        db.add(teacher)
        db.flush()

        groups: dict[str, Group] = {}
        for name, color, description in [
            ("Beginner Group", "emerald", "Boshlang'ich daraja — A1"),
            ("Elementary Group", "sky", "Elementar daraja — A2"),
            ("Pre-Intermediate Group", "violet", "O'rta daraja — B1"),
            ("IELTS Group", "amber", "IELTS imtihoniga tayyorgarlik"),
        ]:
            group = Group(teacher_id=teacher.id, name=name, color=color, description=description)
            db.add(group)
            groups[name] = group
        db.flush()

        students: dict[str, User] = {}
        for index, (first, last, username, group_name) in enumerate(STUDENTS):
            student = User(
                role="student",
                first_name=first,
                last_name=last,
                email=f"{username}@example.com",
                username=username,
                password_hash=hash_password(STUDENT_PASSWORD),
                teacher_id=teacher.id,
            )
            db.add(student)
            db.flush()
            db.add(GroupMember(group_id=groups[group_name].id, user_id=student.id))
            students[username] = student

        # Coin history — inserted chronologically so balance_after is consistent.
        for username, history in COIN_HISTORY.items():
            student = students[username]
            for days_ago, amount, reason in sorted(history, key=lambda x: -x[0]):
                _, tx = apply_coin_transaction(
                    db,
                    student_id=student.id,
                    amount=amount,
                    tx_type="award",
                    reason=reason,
                    actor_id=teacher.id,
                )
                tx.created_at = now - timedelta(days=days_ago, hours=index % 5)
                log_activity(
                    db,
                    student.id,
                    "coins_awarded",
                    f"{amount} coin berildi: {reason}",
                    {"amount": amount},
                    actor_id=teacher.id,
                ).created_at = tx.created_at

        # Rewards
        uploads = settings.upload_path
        (uploads / "seed").mkdir(parents=True, exist_ok=True)
        reward_specs = [
            ("Inglizcha kitob sovg'asi", "O'zingiz tanlagan ingliz tilidagi badiiy kitob.", 80, "Kitob sovg'asi", (99, 102, 241), (139, 92, 246)),
            ("Kino chiptasi", "Do'stingiz bilan kinoga bir chipta.", 120, "Kino chiptasi", (14, 165, 233), (59, 130, 246)),
            ("Arena futbolkasi", "English Arena brendli futbolka.", 200, "Arena futbolkasi", (16, 185, 129), (5, 150, 105)),
        ]
        rewards = []
        for idx, (title, description, price, cover_text, top, bottom) in enumerate(reward_specs):
            image_path = uploads / "seed" / f"reward-{idx}.webp"
            make_cover(image_path, cover_text, "English Arena", top, bottom, size=(800, 450), center_title=True)
            reward = Reward(
                teacher_id=teacher.id,
                title=title,
                description=description,
                price=price,
                image_key=f"seed/reward-{idx}.webp",
            )
            db.add(reward)
            rewards.append(reward)
        db.flush()

        # Pending request (escrow), approved request, rejected + refunded request.
        def make_request(reward: Reward, student: User, status: str, days_ago: int = 1):
            request = RewardRequest(
                reward_id=reward.id,
                student_id=student.id,
                teacher_id=teacher.id,
                price_snapshot=reward.price,
                status="pending",
            )
            request.requested_at = now - timedelta(days=days_ago)
            db.add(request)
            db.flush()
            _, spend = apply_coin_transaction(
                db,
                student_id=student.id,
                amount=-reward.price,
                tx_type="reward_spend",
                reason=f"Sovg'a so'rovi: {reward.title}",
                actor_id=student.id,
                reward_request_id=request.id,
            )
            spend.created_at = request.requested_at
            if status == "approved":
                request.status = "approved"
                request.resolved_at = request.requested_at + timedelta(hours=3)
                request.resolved_by_id = teacher.id
            elif status == "rejected":
                _, refund = apply_coin_transaction(
                    db,
                    student_id=student.id,
                    amount=reward.price,
                    tx_type="reward_refund",
                    reason=f"Sovg'a rad etildi: {reward.title}",
                    actor_id=teacher.id,
                    reward_request_id=request.id,
                )
                refund.created_at = request.requested_at + timedelta(hours=2)
                request.status = "rejected"
                request.refunded_at = request.requested_at + timedelta(hours=2)
                request.resolved_at = request.refunded_at
                request.resolved_by_id = teacher.id
            return request

        make_request(rewards[0], students["madina"], "pending", 1)
        make_request(rewards[1], students["nilufar"], "approved", 9)
        make_request(rewards[0], students["aziza"], "rejected", 5)

        # Books (public-domain sample texts generated locally)
        fox_pages = [
            ["# The Fox and the Grapes", "", "A fable by Aesop", "", "One hot summer day, a fox was walking", "through the vineyard. He looked up and saw", "a bunch of ripe grapes hanging from a vine."],
            ["The grapes were purple and soft.", "They looked delicious.", "", "The fox jumped up to reach them,", "but the grapes were too high.", "", "He tried again and again."],
            ["Each time he fell back to the ground.", "The fox was tired and thirsty,", "but he did not give up.", "", "At last he sat down and looked at the grapes", "one more time."],
            ["The fox could not reach the grapes.", "He turned away and said,", "\"Those grapes are probably sour anyway.\"", "", "It is easy to say you do not want", "what you cannot have.", "", "Moral: People often despise what they cannot get."],
        ]
        pdf_path = uploads / "seed" / "fox-and-grapes.pdf"
        make_pdf(pdf_path, "The Fox and the Grapes", fox_pages)
        cover_path = uploads / "seed" / "fox-cover.webp"
        make_cover(cover_path, "The Fox and the Grapes", "Aesop", (245, 158, 11), (180, 83, 9))

        north_wind = [
            ("Chapter 1 — An Argument", [
                "The North Wind and the Sun were arguing about which of them was stronger.",
                "They saw a traveller walking along the road in a warm coat.",
                "The Sun said, \"Let us test our strength on this man.\"",
            ]),
            ("Chapter 2 — The North Wind", [
                "The North Wind blew as hard as he could.",
                "The wind was cold and fierce, but the traveller only pulled his coat closer.",
                "The harder the wind blew, the tighter the man held his coat.",
            ]),
            ("Chapter 3 — The Sun", [
                "Then it was the Sun's turn.",
                "The Sun shone gently and warmly on the traveller.",
                "Soon the man felt hot and took off his coat.",
                "The Sun had won without a single blow.",
            ]),
            ("Chapter 4 — The Moral", [
                "Gentleness and persuasion are often stronger than force.",
                "This short fable is still told to children around the world.",
            ]),
        ]
        epub_path = uploads / "seed" / "north-wind.epub"
        make_epub(epub_path, "The North Wind and the Sun", "Aesop", north_wind)
        epub_cover = uploads / "seed" / "north-wind-cover.webp"
        make_cover(epub_cover, "The North Wind and the Sun", "Aesop", (14, 165, 233), (30, 64, 175))

        book1 = Book(
            teacher_id=teacher.id,
            title="The Fox and the Grapes",
            author="Aesop",
            description="Qisqa va oson o'qiladigan mashhur ertak. A2 darajadagi o'quvchilar uchun tavsiya etiladi.",
            level="A2",
            cover_key=f"seed/fox-cover.webp",
            file_key="seed/fox-and-grapes.pdf",
            file_type="pdf",
            file_size=pdf_path.stat().st_size,
            is_published=True,
        )
        book2 = Book(
            teacher_id=teacher.id,
            title="The North Wind and the Sun",
            author="Aesop",
            description="Ingliz tilidagi klassik ertak. B1 darajadagi o'quvchilar uchun.",
            level="B1",
            cover_key="seed/north-wind-cover.webp",
            file_key="seed/north-wind.epub",
            file_type="epub",
            file_size=epub_path.stat().st_size,
            is_published=True,
        )
        db.add_all([book1, book2])
        db.flush()

        madina = students["madina"]
        db.add(
            ReadingProgress(
                book_id=book1.id,
                student_id=madina.id,
                current_page=2,
                total_pages=4,
                progress_percent=50,
                last_read_at=now - timedelta(hours=5),
            )
        )
        db.add(BookFavorite(book_id=book1.id, student_id=madina.id))
        db.add(
            Bookmark(
                book_id=book1.id,
                student_id=madina.id,
                page=2,
                location="page:2",
                label="Muhim joy",
                note="Moral joyi",
            )
        )
        db.add(
            ReadingProgress(
                book_id=book2.id,
                student_id=students["aziza"].id,
                current_page=1,
                total_pages=4,
                progress_percent=25,
                location="epubcfi(/6/8[ch2]!/4/2)",
                last_read_at=now - timedelta(days=1),
            )
        )

        # Assignments
        assignments = [
            ("Unit 3 — Present Perfect", "Workbook 3-bob, 4-5 mashqlar. Darsda tekshiramiz.", "Beginner Group", 3),
            ("Reading practice — The Fox", "Kitobni o'qib, yangi so'zlarni daftaringizga yozing.", "Pre-Intermediate Group", 5),
            ("IELTS Writing Task 2", "Advantages/disadvantages essay: 'Online learning'. 250 so'z.", "IELTS Group", 7),
        ]
        for title, description, group_name, days in assignments:
            assignment = Assignment(
                teacher_id=teacher.id,
                group_id=groups[group_name].id,
                title=title,
                description=description,
                due_at=now + timedelta(days=days),
            )
            db.add(assignment)
            db.flush()
            members = db.execute(
                select(GroupMember.user_id).where(GroupMember.group_id == groups[group_name].id)
            ).scalars()
            for student_id in members:
                db.add(AssignmentRecipient(assignment_id=assignment.id, student_id=student_id))

        # Announcements
        db.add_all(
            [
                Announcement(
                    teacher_id=teacher.id,
                    title="Haftalik mock test",
                    body="Shanba kuni soat 10:00 da IELTS mock test bo'lib o'tadi. Barcha IELTS guruhi o'quvchilari qatnashishi shart.",
                    group_id=groups["IELTS Group"].id,
                    is_pinned=True,
                ),
                Announcement(
                    teacher_id=teacher.id,
                    title="Yangi elektron kitoblar",
                    body="Kutubxonaga ikkita yangi kitob qo'shildi. 'Kutubxona' bo'limidan o'qishni boshlashingiz mumkin.",
                    group_id=None,
                ),
            ]
        )

        db.add(
            StudentOfTheDay(
                teacher_id=teacher.id,
                student_id=madina.id,
                awarded_on=today_local(),
                note="Hafta davomida eng faol o'quvchi!",
            )
        )

        db.add_all(
            [
                WeeklyGoal(
                    teacher_id=teacher.id,
                    group_id=groups["IELTS Group"].id,
                    title="Haftada 100 coin yig'ish",
                    metric="coins",
                    target_value=100,
                    week_start=week_start_for(),
                ),
                WeeklyGoal(
                    teacher_id=teacher.id,
                    student_id=madina.id,
                    title="10 ta yangi so'z saqlash",
                    metric="words",
                    target_value=10,
                    week_start=week_start_for(),
                ),
            ]
        )

        # Saved words for Madina
        db.add_all(
            [
                SavedWord(
                    student_id=madina.id,
                    word="beautiful",
                    translation="chiroyli, go'zal",
                    phonetic="/ˈbjuːtɪfəl/",
                    part_of_speech="adjective",
                    definition="very pleasing to look at",
                    example="She has a beautiful smile.",
                    example_translation="Uning chiroyli tabassumi bor.",
                    synonyms=["lovely", "pretty", "attractive"],
                    note="Tabassum haqida gapirganda ishlataman.",
                ),
                SavedWord(
                    student_id=madina.id,
                    word="improve",
                    translation="yaxshilamoq",
                    phonetic="/ɪmˈpruːv/",
                    part_of_speech="verb",
                    definition="to make something better",
                    example="I want to improve my English.",
                    example_translation="Men ingliz tilimni yaxshilashni xohlayman.",
                    synonyms=["enhance", "develop"],
                ),
                SavedWord(
                    student_id=madina.id,
                    word="challenge",
                    translation="qiyinchilik, sinov",
                    phonetic="/ˈtʃælɪndʒ/",
                    part_of_speech="noun",
                    definition="something difficult that tests your ability",
                    example="Learning a language is a challenge.",
                    example_translation="Til o'rganish qiyinchilik talab qiladi.",
                ),
            ]
        )

        # Activity history (for streak + charts)
        for username, days, per_day in [("madina", 6, 4), ("aziza", 3, 2), ("nilufar", 2, 2)]:
            student = students[username]
            for day in range(days):
                for item in range(per_day):
                    entry = log_activity(
                        db,
                        student.id,
                        "login" if item == 0 else "study",
                        "Platformaga kirdi" if item == 0 else "Dars materialini o'rgandi",
                    )
                    entry.created_at = now - timedelta(days=day, hours=item + 1)

        db.commit()
        print("Demo ma'lumotlar yaratildi.")
        print(f"  Ustoz:  {TEACHER_EMAIL} / {TEACHER_PASSWORD}")
        print("  O'quvchilar: madina@example.com, aziza@example.com ... / " + STUDENT_PASSWORD)
        print("  Barcha o'quvchi loginlari: " + ", ".join(STUDENTS[i][2] for i in range(len(STUDENTS))))
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="English Arena demo seed")
    parser.add_argument("--reset", action="store_true", help="Barcha ma'lumotlarni o'chirib qayta seed qilish")
    args = parser.parse_args()
    if args.reset:
        db = SessionLocal()
        try:
            reset_database(db)
        finally:
            db.close()
    seed()


if __name__ == "__main__":
    main()
