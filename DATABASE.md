# Database — English Arena

PostgreSQL 14+ · SQLAlchemy 2.0 · Alembic

Barcha vaqtlar `timestamptz` (UTC) ko'rinishida saqlanadi. Hafta/oy chegaralari va streak hisoblashda **Asia/Tashkent** (UTC+5) ishlatiladi.

---

## 1. Umumiy sxema

```text
users (teacher) 1 ──── * groups
   │                      │
   │                      ├── * group_members * ──── 1 users (student)
   │                      ├── * invitations
   │                      ├── * assignments
   │                      ├── * announcements
   │                      └── * weekly_goals
   │
   ├── * rewards ──── * reward_requests ──── 1 users (student)
   ├── * books ──── * reading_progress / bookmarks / book_favorites
   ├── * coin_transactions (student, actor)
   ├── * student_of_the_day
   └── * activity_logs

dictionary_cache      (global kesh)
irregular_verbs       (reference)
saved_words           (student)
saved_verbs           (student)
recent_searches       (student)
```

### Rollar
- `users.role` faqat `teacher` yoki `student`.
- Ustoz `teacher_id = NULL`; o'quvchida `teacher_id` majburiy (ustozga bog'langan).
- Har bir o'quvchi bir vaqtda **bitta guruhda** bo'ladi (`group_members.user_id` unique).

---

## 2. Jadvallar

### `users`
| Ustun | Tur | Izoh |
|---|---|---|
| id | uuid PK | |
| role | varchar(16) | `teacher` / `student` |
| first_name, last_name | varchar(80) | |
| email | varchar(255) unique | kichik harflarda |
| username | varchar(50) unique nullable | login |
| password_hash | varchar(255) | `bcrypt_sha256` |
| teacher_id | uuid FK users(id) ON DELETE SET NULL | o'quvchi uchun ustoz |
| coin_balance | int NOT NULL default 0 | `CHECK >= 0` |
| is_active | bool default true | |
| last_login_at | timestamptz | |
| created_at, updated_at | timestamptz | |

Indekslar: `email`, `username`, `role`, `teacher_id`, `(role, is_active)`.

### `groups`
`id`, `teacher_id` (FK users CASCADE), `name`, `description`, `color`, timestamps.
- `UNIQUE (teacher_id, name)`.

### `group_members`
`id`, `group_id` (FK groups CASCADE), `user_id` (FK users CASCADE), `joined_at`.
- `UNIQUE (user_id)` — bitta o'quvchi bitta guruhda.

### `invitations`
`id`, `teacher_id`, `group_id`, `student_id` (nullable, qabul qilinganda), `first_name`, `last_name`, `email`, `token_hash` (sha256, unique), `status`, `expires_at`, `accepted_at`, `last_sent_at`, `email_error`, timestamps.
- Statuslar: `pending`, `accepted`, `expired`, `revoked`.
- Tokenning o'zi bazada saqlanmaydi — faqat hash.

### `assignments`
`id`, `teacher_id`, `group_id` (nullable), `title`, `description`, `due_at`, `attachment_key`, `attachment_name`, `attachment_mime`, `attachment_size`, timestamps.
- `group_id` o'chirilsa `SET NULL` (vazifa tarixi qoladi).

### `assignment_recipients`
`id`, `assignment_id` (CASCADE), `student_id` (CASCADE), `viewed_at`, `created_at`.
- `UNIQUE (assignment_id, student_id)`.
- Vazifa yaratilganda qabul qiluvchilar **snapshot** qilinadi: keyin guruhga qo'shilgan o'quvchi eski vazifani ko'rmaydi.

### `coin_transactions`
`id`, `student_id`, `created_by_id`, `amount` (≠0), `balance_after`, `type`, `reason`, `reward_request_id`, `created_at`.
- Turlar: `award`, `deduction`, `reward_spend`, `reward_refund`.
- `UNIQUE (reward_request_id, type)` — bitta so'rov uchun ikki marta spend/refund bo'lmaydi.
- Indekslar: `(student_id, created_at)`, `(type, created_at)`.

### `rewards`
`id`, `teacher_id`, `title`, `description`, `image_key`, `price`, `is_available`, `is_archived`, timestamps.

### `reward_requests`
`id`, `reward_id`, `student_id`, `teacher_id`, `status`, `price_snapshot`, `note`, `requested_at`, `resolved_at`, `resolved_by_id`, `refunded_at`.
- Statuslar: `pending`, `approved`, `rejected`.
- **Partial unique index** `uq_reward_request_pending (student_id, reward_id) WHERE status='pending'` — bir vaqtda bitta kutilayotgan so'rov.
- `price_snapshot` — narx keyin o'zgarsa ham so'rov summasi o'zgarmaydi.

### `books`
`id`, `teacher_id`, `title`, `author`, `description`, `level` (A1–C2), `cover_key`, `file_key`, `file_type` (`pdf`/`epub`), `file_size`, `is_published`, timestamps.
- Indeks: `(level, is_published)`.

### `reading_progress`
`id`, `book_id`, `student_id`, `current_page`, `total_pages`, `progress_percent`, `location` (EPUB CFI), `started_at`, `last_read_at`.
- `UNIQUE (book_id, student_id)`.

### `bookmarks`
`id`, `book_id`, `student_id`, `page`, `location`, `label`, `note`, `created_at`.
- `UNIQUE (book_id, student_id, location)` — bir joyga bitta belgi.

### `book_favorites`
`id`, `book_id`, `student_id`, `created_at`; `UNIQUE (book_id, student_id)`.

### `dictionary_cache`
`id`, `query` (unique), `payload` JSONB, `source`, `fetched_at`, `expires_at`.
- TTL 7 kun; `payload.cache_version` eski bo'lsa qayta olinadi.

### `saved_words`
`id`, `student_id`, `word`, `translation`, `phonetic`, `audio_url`, `part_of_speech`, `definition`, `example`, `example_translation`, `synonyms` JSONB, `note`, timestamps.
- `UNIQUE (student_id, word)`.

### `recent_searches`
`id`, `student_id`, `query`, `created_at`.
- `UNIQUE (student_id, query)`; har qidiruvda `created_at` yangilanadi; 12 tadan ko'pi saqlanmaydi.

### `irregular_verbs`
`id`, `base` (unique), `past_simple`, `past_participle`, `translation_uz`, `pronunciation`, `base_pron`, `past_pron`, `participle_pron`, `example`, `example_uz`, `irregular_type`.

### `saved_verbs`
`id`, `student_id`, `verb_id`, `note`, timestamps; `UNIQUE (student_id, verb_id)`.

### `announcements`
`id`, `teacher_id`, `group_id` (nullable = barcha guruhlar), `title`, `body`, `is_pinned`, timestamps.

### `student_of_the_day`
`id`, `teacher_id`, `student_id`, `awarded_on` (date), `note`, `created_at`.
- `UNIQUE (teacher_id, awarded_on)` — bir kunda bitta tanlov; qayta tanlashda yangilanadi.

### `weekly_goals`
`id`, `teacher_id`, `student_id` (nullable), `group_id` (nullable), `title`, `metric` (`coins`/`books`/`words`), `target_value`, `week_start` (dushanba), timestamps.
- `CHECK` — aynan bitta target (student yoki group).
- `UNIQUE (student_id, week_start, metric)`, `UNIQUE (group_id, week_start, metric)`.

### `push_subscriptions`
`id`, `user_id` (FK users CASCADE), `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`, `last_seen_at`.
- Bitta foydalanuvchi bir nechta qurilmada obuna bo‘lishi mumkin.
- 404/410 qaytargan endpointlar avtomatik o‘chiriladi.

### `activity_logs`
`id`, `user_id`, `actor_id`, `type`, `title`, `meta` JSONB, `created_at`.
- Indekslar: `(user_id, created_at)`, `(type, created_at)`.
- Streak: har qanday log yozuvi bo'lgan ketma-ket **lokal kunlar**.
- Faollik turlari: `login`, `coins_awarded`, `coins_deducted`, `reward_requested`, `reward_approved`, `reward_rejected`, `assignment_received`, `assignment_viewed`, `book_started`, `book_read`, `bookmark_added`, `dictionary_search`, `word_saved`, `verb_saved`, `announcement`, `student_of_the_day`, `invitation_sent`, `account_created`.

---

## 3. Tranzaksiya kafolatlari

### Coin berish / ayirish
1. `SELECT * FROM users WHERE id = :student FOR UPDATE`
2. `new_balance = coin_balance + amount`
3. `new_balance < 0` bo'lsa — 400, hech narsa yozilmaydi.
4. `users.coin_balance` yangilanadi + `coin_transactions` yoziladi (`balance_after` bilan).
5. Bitta `COMMIT`.

### Sovg'a so'rovi (escrow)
1. O'quvchi qatori `FOR UPDATE`.
2. Balans yetarlimi — tekshiriladi.
3. `reward_requests` yaratiladi (`pending`).
4. `-price` miqdorida `reward_spend` tranzaksiyasi yoziladi (`reward_request_id` bilan).
5. Commit.

Partial unique index bir vaqtda ikkita `pending` so'rov yaratilishini DB darajasida to'xtatadi.

### Rad etish (refund)
1. `SELECT reward_request FOR UPDATE`.
2. Status `pending` ekanini tekshirish.
3. `refunded_at IS NULL` tekshirish.
4. `+price_snapshot` `reward_refund` tranzaksiyasi.
5. `status='rejected'`, `refunded_at`, `resolved_at`.
6. `UNIQUE (reward_request_id, type)` ikki marta refundni DB darajasida bloklaydi.

### Tasdiqlash
1. So'rov qulflanadi.
2. `pending` → `approved`.
3. Coin qaytarilmaydi.
4. Commit.

---

## 4. Reyting hisoblash

- Faqat `coin_transactions.type = 'award'` yig'indisi.
- `week`: dushanba 00:00 (Asia/Tashkent) → keyingi dushanba 00:00.
- `month`: 1-kun 00:00 → keyingi oy 1-kuni 00:00.
- `all`: barcha vaqt.
- `deduction`, `reward_spend`, `reward_refund` reytingga kirmaydi.
- Guruh filtri `group_members` orqali.

---

## 5. Migrationlar

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1

alembic current          # joriy versiya
alembic history          # tarix
alembic upgrade head     # oxirgi versiyaga
alembic downgrade -1     # bitta orqaga
```

Yangi model o'zgarishidan keyin:

```powershell
alembic revision --autogenerate -m "describe change"
# generated faylni tekshiring!
alembic upgrade head
```

Migrationlar:
1. `caf70aea99df` — initial schema (22 jadval).
2. `66fa59f2dd66` — pending reward request uniqueness.
3. `261b75e7eadd` — push subscriptions.

Productionda migratsiyani `start.sh` avtomatik bajaradi (`alembic upgrade head`).

---

## 6. Seed va reference data

- `python -m app.seed` — demo ustoz, guruhlar, o'quvchilar, coinlar, sovg'alar, kitoblar, vazifalar.
- `python -m app.seed --reset` — barcha jadvallarni tozalab qayta seed (faqat lokal).
- 68 ta irregular verb ilova ishga tushganda avtomatik seed qilinadi (`main.py` → `seed_irregular_verbs`), agar jadval bo'sh bo'lsa.
- Demo kitoblar Aesop ertaklari asosida lokal PDF/EPUB generatori bilan yaratiladi.

---

## 7. Backup / restore

### Backup

```powershell
$env:PGPASSWORD="parol"
pg_dump -U arena -h 127.0.0.1 -d english_arena -F c -f "C:\backups\english_arena.dump"
```

### Restore

```powershell
$env:PGPASSWORD="parol"
pg_restore -U arena -h 127.0.0.1 -d english_arena --clean --if-exists "C:\backups\english_arena.dump"
```

### Faqat schema

```powershell
pg_dump -U arena -d english_arena --schema-only -f schema.sql
```

### Faqat ma'lumot

```powershell
pg_dump -U arena -d english_arena --data-only -f data.sql
```

> Fayllar (`uploads/`) bazadan alohida. `books.file_key`, `rewards.image_key`, `assignments.attachment_key` faqat kalitlarni saqlaydi — fayllarni ham backup qiling.

---

## 8. Foydali SQL

```sql
-- Ustozning barcha o'quvchilari va balanslari
SELECT u.first_name, u.last_name, u.coin_balance, g.name AS group_name
FROM users u
LEFT JOIN group_members gm ON gm.user_id = u.id
LEFT JOIN groups g ON g.id = gm.group_id
WHERE u.teacher_id = :teacher_id AND u.role = 'student'
ORDER BY u.first_name;

-- Haftalik reyting (Toshkent vaqti)
SELECT u.first_name, u.last_name, COALESCE(SUM(ct.amount), 0) AS coins
FROM users u
LEFT JOIN coin_transactions ct
  ON ct.student_id = u.id
 AND ct.type = 'award'
 AND ct.created_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'
WHERE u.teacher_id = :teacher_id
GROUP BY u.id
ORDER BY coins DESC;

-- Kutilayotgan sovg'a so'rovlari
SELECT rr.id, u.first_name, u.last_name, r.title, rr.price_snapshot, rr.requested_at
FROM reward_requests rr
JOIN users u ON u.id = rr.student_id
JOIN rewards r ON r.id = rr.reward_id
WHERE rr.status = 'pending'
ORDER BY rr.requested_at;

-- Balans va tranzaksiyalar yig'indisi mosligi
SELECT u.id, u.coin_balance, COALESCE(SUM(ct.amount), 0) AS calculated
FROM users u
LEFT JOIN coin_transactions ct ON ct.student_id = u.id
WHERE u.role = 'student'
GROUP BY u.id
HAVING u.coin_balance <> COALESCE(SUM(ct.amount), 0);
```

Oxirgi so'rov bo'sh natija qaytarishi kerak — bu balans va tarix mosligini tekshiradi.

---

## 9. Indekslar va unumdorlik

- Reyting so'rovlari `coin_transactions (type, created_at)` va `(student_id, created_at)` indekslaridan foydalanadi.
- Faollik/streak `activity_logs (user_id, created_at)`.
- Qidiruvlar `users.email`, `users.username`, `books (level, is_published)`, `saved_words (student_id, word)`.
- Katta hajmlarda `activity_logs` va `coin_transactions` uchun oylik arxiv/partition strategiyasini qo'llash mumkin (hozircha shart emas).
