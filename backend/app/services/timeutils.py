from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

APP_TZ = ZoneInfo("Asia/Tashkent")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def local_now() -> datetime:
    return datetime.now(APP_TZ)


def today_local() -> date:
    return local_now().date()


def week_start_for(day: date | None = None) -> date:
    day = day or today_local()
    return day - timedelta(days=day.weekday())


def month_start_for(day: date | None = None) -> date:
    day = day or today_local()
    return day.replace(day=1)


def local_midnight_to_utc(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=APP_TZ).astimezone(timezone.utc)


def week_bounds(day: date | None = None) -> tuple[datetime, datetime]:
    start = week_start_for(day)
    return local_midnight_to_utc(start), local_midnight_to_utc(start + timedelta(days=7))


def month_bounds(day: date | None = None) -> tuple[datetime, datetime]:
    start = month_start_for(day)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return local_midnight_to_utc(start), local_midnight_to_utc(end)


def period_bounds(period: str) -> tuple[datetime | None, datetime | None]:
    if period == "week":
        return week_bounds()
    if period == "month":
        return month_bounds()
    if period == "all":
        return None, None
    raise ValueError("Noto'g'ri davr")
