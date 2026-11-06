from fastapi import APIRouter

from app.api.routes import (
    announcements,
    assignments,
    auth,
    books_student,
    books_teacher,
    coins,
    dictionary,
    engagement,
    files,
    groups,
    invitations,
    leaderboard,
    push,
    rewards_student,
    rewards_teacher,
    student_account,
    student_assignments,
    student_dashboard,
    students,
    teacher_dashboard,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(files.router)
api_router.include_router(teacher_dashboard.router)
api_router.include_router(students.router)
api_router.include_router(groups.router)
api_router.include_router(invitations.router)
api_router.include_router(assignments.router)
api_router.include_router(coins.router)
api_router.include_router(rewards_teacher.router)
api_router.include_router(rewards_student.router)
api_router.include_router(books_teacher.router)
api_router.include_router(books_student.router)
api_router.include_router(dictionary.router)
api_router.include_router(dictionary.student_router)
api_router.include_router(announcements.router)
api_router.include_router(announcements.student_router)
api_router.include_router(engagement.router)
api_router.include_router(engagement.student_router)
api_router.include_router(push.router)
api_router.include_router(leaderboard.router)
api_router.include_router(student_assignments.router)
api_router.include_router(student_account.router)
api_router.include_router(student_dashboard.router)
