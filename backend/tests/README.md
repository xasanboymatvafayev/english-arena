# Backend testlari

Testlar alohida PostgreSQL bazasida ishlaydi:

```powershell
psql -U postgres -c "CREATE DATABASE english_arena_test;"
$env:TEST_DATABASE_URL="postgresql+psycopg://postgres:parol@127.0.0.1:5432/english_arena_test"
pytest -q
```

`tests/conftest.py` test bazasini avtomatik tozalab, qayta yaratadi. Hech qachon production bazasiga qarshi ishlatmang.
