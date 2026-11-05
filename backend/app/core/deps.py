import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Avtorizatsiya talab qilinadi") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise _unauthorized()
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise _unauthorized("Token yaroqsiz yoki muddati tugagan")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("Foydalanuvchi topilmadi yoki bloklangan")
    return user


def require_teacher(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.teacher.value:
        raise HTTPException(status_code=403, detail="Bu amal faqat ustoz uchun")
    return user


def require_student(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.student.value:
        raise HTTPException(status_code=403, detail="Bu amal faqat o'quvchi uchun")
    return user


def ensure_owned_group(db: Session, teacher: User, group_id: uuid.UUID):
    from app.models import Group

    group = db.get(Group, group_id)
    if group is None or group.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    return group


def ensure_own_student(db: Session, teacher: User, student_id: uuid.UUID) -> User:
    student = db.get(User, student_id)
    if (
        student is None
        or student.role != UserRole.student.value
        or student.teacher_id != teacher.id
    ):
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    return student
