# Architecture — English Arena

## 1. Umumiy oqim

```text
Brauzer (React SPA)
   │  HTTPS + JSON / multipart
   ▼
FastAPI (/api)
   │  JWT access token → role tekshiruvi → egalik tekshiruvi
   ▼
SQLAlchemy Session
   │  transaction + row lock (SELECT ... FOR UPDATE)
   ▼
PostgreSQL
```

Fayllar (PDF, EPUB, muqova, sovg'a rasmi) diskda, volume ichida saqlanadi. Bazada faqat kalit (`books/xxx.pdf`) turadi. Fayl URL'lari **imzolangan va muddatli** (`?token=...`), 2 soat amal qiladi.

## 2. Backend qatlamlari

| Qatlam | Joy | Vazifa |
|---|---|---|
| API | `app/api/routes/*` | HTTP endpointlar, validatsiya, status kodlar |
| Dependencies | `app/core/deps.py` | JWT, rollar, egalik (`ensure_own_student`, `ensure_owned_group`) |
| Services | `app/services/*` | coin tranzaksiyasi, reyting, streak, fayl, email, lug'at, maqsad |
| Models | `app/models/*` | 22 jadval, FK, unique, check, index |
| Schemas | `app/schemas/*` | Pydantic request modellari |
| DB | `app/db/*` | engine, session, Base |
| Migration | `alembic/` | schema versiyalari |

API routerlar:
- `auth`, `files`
- teacher: `teacher_dashboard`, `students`, `groups`, `invitations`, `assignments`, `coins`, `rewards_teacher`, `books_teacher`, `announcements`, `engagement`
- student: `student_dashboard`, `student_assignments`, `rewards_student`, `books_student`, `student_account`
- shared: `leaderboard`, `dictionary`

## 3. Auth va ruxsatlar

1. Login → access (24 soat) + refresh (30 kun) JWT.
2. Har bir so'rovda `Authorization: Bearer ...`.
3. `require_teacher` / `require_student` rol darajasida.
4. Har bir resurs uchun **egalik** tekshiriladi:
   - ustoz faqat o'z guruhi/o'quvchisi/vazifasi/sovg'asi/kitobiga kiriladi;
   - o'quvchi faqat o'z `student_id` ma'lumotlarini oladi;
   - boshqa ustozning resursi `404` qaytaradi (ma'lumot mavjudligini oshkor qilmaslik uchun).
5. O'quvchi faqat o'z ustozining e'lonlari, kitoblari, sovg'alari va reytingini ko'radi.

## 4. Taklif oqimi

```text
Ustoz guruh yaratadi
  → ism/familiya/email kiritadi
  → server 32-byte token yaratadi
  → bazaga SHA-256 hash + expiry yoziladi
  → EmailJS orqali havola yuboriladi
  → o'quvchi havolani ochadi (token validatsiya)
  → ism/email taklifdan olinadi
  → login/parol yaratiladi
  → users + group_members + accepted status (bitta tranzaksiya)
```

Token bir martalik: `status='accepted'` dan keyin qayta ishlatilmaydi. Muddat o'tsa `410`, ishlatilgan bo'lsa `409`.

## 5. Coin va sovg'a tranzaksiyalari

- Balans `users.coin_balance` da denormalizatsiya qilinadi, lekin har bir o'zgarish `coin_transactions` ga `balance_after` bilan yoziladi.
- Har bir amalda o'quvchi qatori `FOR UPDATE` bilan qulflanadi → parallel so'rovlarda balans buzilmaydi.
- `CHECK coin_balance >= 0` — manfiy balans DB darajasida taqiqlanadi.
- Sovg'a so'rovi: `reward_spend` (−price) + `pending` request, bitta tranzaksiyada.
- Rad: `reward_refund` (+price) faqat bir marta; `UNIQUE (reward_request_id, type)` DB kafolati.
- Tasdiq: refund yo'q, `approved`.

## 6. Reyting va vaqt chegaralari

- Faqat `award` turi hisoblanadi (`deduction`, `reward_spend`, `reward_refund` kirmaydi).
- `Asia/Tashkent` mintaqasi:
  - hafta — dushanba 00:00;
  - oy — 1-kun 00:00;
  - umumiy — barcha vaqt.
- `leaderboard()` SQL `SUM` + guruh join; rank Python tomonda beriladi (maktab miqyosida yetarli).
- `weekly_champion` — haftalik birinchi o'rin, 0 coin bo'lsa `null`.

## 7. Streak va faollik

- Har qanday `activity_logs` yozuvi faollik hisoblanadi.
- Streak ketma-ket **lokal kunlar** bo'yicha hisoblanadi; bugun hali faollik bo'lmasa, kechadan boshlab sanaladi.
- Dublikat loglarni kamaytirish: lug'at qidiruvi 15 daqiqada bir marta log qilinadi.
- `activity_logs` dashboard feed, streak va haftalik grafik uchun ishlatiladi.

## 8. Fayl xavfsizligi

1. Kengaytma + hajm tekshiriladi.
2. PDF `%PDF` magic, EPUB zip `mimetype` tekshiriladi.
3. Rasmlar Pillow bilan qayta kodlanadi (metadata tozalanadi, WebP).
4. Fayl nomi UUID; path traversal yo'q.
5. `GET /api/files/{kind}/{id}` — signed token yoki Bearer + egalik.
6. Imzolangan URL 120 daqiqa amal qiladi; token boshqa obyektga almashtirilsa 401.

## 9. Frontend tuzilmasi

- `contexts/AuthContext` — tokenlar, `me`, logout (query cache tozalanadi).
- `lib/api.ts` — fetch wrapper, 401 da refresh, xatolarni `ApiError` ga aylantirish.
- `lib/queryClient.ts` — TanStack Query sozlamalari.
- `components/ui/*` — Button, Card, Field, Modal, Badge, Avatar, Progress, Tabs, States, ConfirmDialog.
- `components/layout/*` — Sidebar, AppShell, RequireRole, ThemeToggle.
- `pages/*` — role bo'yicha sahifalar; shared dictionary/verbs ikkala panelda.
- Reader alohida full-screen route: `/student/library/:bookId/read`.

## 10. Dizayn tizimi

- CSS variables orqali light/dark.
- Tailwind semantic ranglar: `app`, `ink`, `muted`, `line`, `brand`, `gold`.
- `Manrope` display + `Inter` body.
- Bir xil radius (xl/2xl/3xl), spacing, focus ring, animatsiyalar.
- Loading (skeleton/spinner), empty, error holatlari barcha sahifalarda.

## 11. Kengaytirish nuqtalari

- Email provayderini almashtirish: `app/services/emailjs.py`.
- Fayllarni S3/R2 ga ko'chirish: `app/services/files.py` interfeysini saqlab, implementatsiyani almashtiring.
- Yangi rol qo'shish: `UserRole` + `require_*` + frontend route guard.
- Telegram bot / push: `activity_logs` va `notifications` jadvali qo'shish.
- Audit log: `activity_logs` allaqachon actor_id va meta saqlaydi.
