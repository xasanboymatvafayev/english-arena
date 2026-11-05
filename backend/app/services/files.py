import io
import uuid
import zipfile
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
BOOK_EXTENSIONS = {".pdf", ".epub"}
ATTACHMENT_EXTENSIONS = {".pdf"}


def _safe_suffix(filename: str | None, allowed: set[str]) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Fayl turi qabul qilinmaydi. Ruxsat etilgan: {', '.join(sorted(allowed))}",
        )
    return suffix


def _check_size(content: bytes, max_mb: int) -> None:
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Fayl bo'sh")
    if len(content) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Fayl hajmi {max_mb} MB dan oshmasligi kerak")


def _verify_signature(suffix: str, content: bytes) -> None:
    if suffix == ".pdf" and not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Fayl haqiqiy PDF emas")
    if suffix == ".epub":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                names = archive.namelist()
                if "mimetype" not in names:
                    raise HTTPException(status_code=400, detail="Fayl haqiqiy EPUB emas")
                if archive.read("mimetype").strip() != b"application/epub+zip":
                    raise HTTPException(status_code=400, detail="Fayl haqiqiy EPUB emas")
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Fayl haqiqiy EPUB emas")


def _save_bytes(key: str, content: bytes) -> None:
    path = settings.upload_path / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def save_image(upload: UploadFile, folder: str) -> tuple[str, int]:
    suffix = _safe_suffix(upload.filename, IMAGE_EXTENSIONS)
    content = upload.file.read()
    _check_size(content, settings.max_image_mb)
    try:
        image = Image.open(io.BytesIO(content))
        image.verify()
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Rasm fayli shikastlangan yoki noto'g'ri")
    image.thumbnail((1600, 1600))
    output = io.BytesIO()
    image.save(output, format="WEBP", quality=86, method=4)
    data = output.getvalue()
    key = f"{folder}/{uuid.uuid4().hex}.webp"
    _save_bytes(key, data)
    return key, len(data)


def save_book_file(upload: UploadFile) -> tuple[str, str, int]:
    suffix = _safe_suffix(upload.filename, BOOK_EXTENSIONS)
    content = upload.file.read()
    _check_size(content, settings.max_book_mb)
    _verify_signature(suffix, content)
    key = f"books/{uuid.uuid4().hex}{suffix}"
    _save_bytes(key, content)
    return key, suffix.lstrip("."), len(content)


def save_attachment(upload: UploadFile) -> tuple[str, str, str, int]:
    suffix = _safe_suffix(upload.filename, ATTACHMENT_EXTENSIONS)
    content = upload.file.read()
    _check_size(content, settings.max_assignment_mb)
    _verify_signature(suffix, content)
    key = f"assignments/{uuid.uuid4().hex}{suffix}"
    _save_bytes(key, content)
    return key, Path(upload.filename or "topshiriq.pdf").name[:255], "application/pdf", len(content)


def resolve_key(key: str) -> Path:
    base = settings.upload_path.resolve()
    path = (base / key).resolve()
    if not str(path).startswith(str(base)) or not path.is_file():
        raise HTTPException(status_code=404, detail="Fayl topilmadi")
    return path


def delete_key(key: str | None) -> None:
    if not key:
        return
    try:
        path = resolve_key(key)
        path.unlink(missing_ok=True)
    except HTTPException:
        return
