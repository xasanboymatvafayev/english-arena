import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api.router import api_router
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import IrregularVerb
from app.data.irregular_verbs import IRREGULAR_VERBS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("english_arena")


def seed_irregular_verbs() -> None:
    """Reference data must always exist; safe to run on every boot."""
    db = SessionLocal()
    try:
        count = len(db.execute(select(IrregularVerb.id)).scalars().all())
        if count:
            return
        for (
            base,
            past,
            participle,
            translation,
            ipa_base,
            ipa_past,
            ipa_pp,
            example,
            example_uz,
        ) in IRREGULAR_VERBS:
            db.add(
                IrregularVerb(
                    base=base,
                    past_simple=past,
                    past_participle=participle,
                    translation_uz=translation,
                    pronunciation=ipa_base,
                    base_pron=ipa_base,
                    past_pron=ipa_past,
                    participle_pron=ipa_pp,
                    example=example,
                    example_uz=example_uz,
                )
            )
        db.commit()
        logger.info("Seeded %s irregular verbs", len(IRREGULAR_VERBS))
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.environment == "production" and settings.secret_key.startswith("dev-insecure"):
        raise RuntimeError("SECRET_KEY production muhitida o'zgartirilishi shart")
    try:
        seed_irregular_verbs()
    except Exception as exc:  # database may not be migrated yet
        logger.warning("Irregular verbs seed skipped: %s", exc)
    yield


app = FastAPI(
    title="English Arena API",
    version="1.0.0",
    description="Ingliz tili o'quv platformasi — ustoz va o'quvchi paneli API.",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(part) for part in first.get("loc", []) if part not in {"body", "query"})
    message = first.get("msg", "Ma'lumot noto'g'ri")
    message = message.replace("Value error, ", "")
    return JSONResponse(
        status_code=422,
        content={"detail": f"{field}: {message}" if field else message},
    )


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}


app.include_router(api_router, prefix=settings.api_prefix)
