# English Arena

**English Arena** — ustoz o'quvchilarini boshqaradigan, o'quvchilar esa vazifalar, coinlar, reyting, elektron kitoblar va lug'at orqali ingliz tilini o'rganadigan to'liq stack platforma.

Loyiha **noldan** yozilgan: React + TypeScript frontend, FastAPI + PostgreSQL backend, JWT autentifikatsiya, EmailJS taklif xatlari, PDF/EPUB o'quvchi va real lug'at API integratsiyasi.

---

## 1. Nima bor?

### Ustoz paneli
- Boshqaruv paneli: o'quvchilar, guruhlar, vazifalar, berilgan coinlar, sovg'a so'rovlari, haftalik faol o'quvchilar, so'nggi harakatlar.
- Guruhlar: yaratish, tahrirlash, o'chirish, a'zolarni boshqarish.
- O'quvchilar: ro'yxat, qidiruv, filtr, profil, coin balansi va tarixi, o'qish holati.
- Takliflar: bir martalik token, 7 kun muddat, EmailJS xati, holatlar (kutilmoqda / qabul qilindi / muddati tugadi / bekor qilindi).
- Vazifalar: matn, PDF biriktirma, muddat, guruh yoki tanlangan o'quvchilar. O'quvchi faqat ko'radi — topshirmaydi.
- Coinlar: faqat ustoz qo'lda beradi/ayirradi; balans va tarix bitta tranzaksiyada.
- Sovg'alar: rasm, narx, mavjudlik, so'rovlarni tasdiqlash/rad etish (escrow + avtomatik qaytarish).
- Kutubxona: PDF/EPUB yuklash, muqova, daraja, ko'rsatish/yashirish.
- E'lonlar: barcha yoki tanlangan guruhga.
- Motivatsiya: Student of the Day, haftalik maqsadlar, reyting.

### O'quvchi paneli
- Dashboard: guruh, coin balansi, haftalik/oylik/umumiy o'rin, badge'lar, yangi vazifalar, e'lonlar, streak, haftalik maqsad, o'qishni davom ettirish.
- Vazifalar: matn, PDF yuklab olish, muddat holati (bugun / muddatli / o'tgan).
- Coinlar: balans, jami olingan/sarflangan, to'liq tarix va sabablar.
- Sovg'alar do'koni: so'rov yuborish, coin escrow, so'rov holati.
- Reyting: haftalik/oylik/umumiy, top-3 podium, o'z o'rni.
- Kutubxona + reader: PDF (react-pdf) va EPUB (epub.js), sahifa/CFI saqlash, bookmark, mundarija, shrift va mavzu.
- Lug'at: real API (freedictionaryapi.com / Wiktionary + MyMemory), IPA, audio, izoh, misol va tarjima, sinonimlar, qidiruv tarixi, shaxsiy so'z daftari.
- Irregular Verbs: 68 ta fe'l, V1/V2/V3, IPA, tarjima, misollar, alifbo/qidiruv, shaxsiy ro'yxat.
- Faoliyat: streak, haftalik grafik, to'liq timeline.
- Profil: ma'lumotlar, parolni o'zgartirish, dark/light mavzu.

### Dizayn
- Premium dark + light rejim, CSS variables, silliq animatsiyalar.
- Responsive: desktop, planshet, telefon (sidebar drawer + pastki navigatsiya).
- **PWA**: telefonga o‘rnatish, offline app shell, service worker.
- **Web Push**: vazifa, e’lon, coin, sovg‘a va kitob bildirishnomalari.
- Loading, empty, error holatlari; toast bildirishnomalar; accessible focus holatlari.

---

## 2. Texnologiyalar

| Qism | Texnologiya |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS 3, React Router 6, TanStack Query 5 |
| Reader | react-pdf / pdf.js, epub.js |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 |
| Database | PostgreSQL 14+ |
| Auth | JWT (access + refresh), bcrypt_sha256 |
| Email | EmailJS server-side REST API |
| Deploy | Vercel (frontend), Railway (backend), Neon yoki Railway PostgreSQL |

---

## 3. Papkalar tuzilmasi

```text
english-arena/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # auth, groups, invitations, assignments, coins,
│   │   │                      # rewards, books, dictionary, engagement, dashboards
│   │   ├── core/              # config, security, dependencies
│   │   ├── db/                # base, session
│   │   ├── models/            # 23 ta SQLAlchemy model
│   │   ├── schemas/           # Pydantic request modellari
│   │   ├── services/          # email, files, coins, ranking, goals, dictionary
│   │   ├── scripts/           # create_teacher, sample fayl generatorlari
│   │   ├── data/              # 68 irregular verb reference data
│   │   ├── main.py
│   │   └── seed.py            # demo seed (alohida)
│   ├── alembic/               # migrationlar
│   ├── tests/                 # 11 ta API test (real PostgreSQL)
│   ├── requirements.txt
│   ├── .env.example
│   ├── Procfile / railway.json / Dockerfile / start.sh
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── components/        # UI design system, layout, charts
│   │   ├── contexts/          # Auth, Theme, Toast
│   │   ├── lib/               # api client, types, utils, query client
│   │   ├── pages/
│   │   │   ├── auth/          # login, invite register
│   │   │   ├── teacher/       # 12 sahifa
│   │   │   ├── student/       # 11 sahifa + reader
│   │   │   └── shared/        # dictionary, irregular verbs
│   │   └── main.tsx
│   ├── package.json
│   ├── .env.example
│   └── vercel.json
├── README.md
├── DEPLOYMENT.md
├── EMAILJS_SETUP.md
├── DATABASE.md
└── .gitignore
```

---

## 4. Tez boshlash (Windows PowerShell)

To'liq qadam-baqadam qo'llanma: **[DEPLOYMENT.md](DEPLOYMENT.md)**. Quyida qisqa versiya.

### 4.1. Kerakli dasturlar
- Node.js 18+ (tavsiya: 20+)
- Python 3.11+
- PostgreSQL 14+
- Git

### 4.2. Bazani yaratish

```powershell
# PostgreSQL parolini o'zingiznikiga almashtiring
$env:PGPASSWORD="postgres"
psql -U postgres -c "CREATE DATABASE english_arena;"
```

### 4.3. Backend

```powershell
cd C:\Projects\english-arena\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

`.env` ichida kamida:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/english_arena
SECRET_KEY=uzun-va-tasodifiy-kalit-kamida-32-belgi
APP_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

Keyin:

```powershell
alembic upgrade head
python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov
uvicorn app.main:app --reload --port 8000
```

API: `http://localhost:8000/api/health` · Swagger: `http://localhost:8000/docs` (development rejimida).

### 4.4. Demo ma'lumot (ixtiyoriy)

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
python -m app.seed
```

Demo akkauntlar:

| Rol | Login | Parol |
|---|---|---|
| Ustoz | `teacher@englisharena.uz` | `Arena12345` |
| O'quvchi | `madina` (yoki `madina@example.com`) | `Student12345` |
| Boshqa o'quvchilar | `aziza`, `bekzod`, `dilnoza`, `jasur`, `sardor`, `nilufar`, `temur` | `Student12345` |

> Demo seed faqat sinov uchun. Productionda `python -m app.seed` ishlatmang; ustozni CLI orqali yarating.

### 4.5. Frontend

```powershell
cd C:\Projects\english-arena\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Brauzer: `http://localhost:5173`.

`VITE_API_URL` bo'sh bo'lsa, Vite `/api` ni `http://127.0.0.1:8000` ga proxy qiladi.

---

## 5. Muhim ish qoidalari

- **Ommaviy ustoz ro'yxatdan o'tishi yo'q.** Ustoz faqat CLI orqali yaratiladi.
- **O'quvchi faqat taklif orqali.** Har bir havola bir martalik, 7 kun amal qiladi, token bazada faqat SHA-256 hash ko'rinishida saqlanadi.
- **Vazifa topshirilmaydi.** O'quvchi vazifani ko'radi va darsda ustozga ko'rsatadi. Submission/baho tizimi ataylab yo'q.
- **Coin faqat ustoz tomonidan.** Har bir o'zgarish `SELECT ... FOR UPDATE` bilan qulflangan o'quvchi balansida bajariladi va tarixga yoziladi.
- **Sovg'a escrow.** So'rovda coin yechiladi; rad etilsa bir marta qaytariladi (DB unique constraint bilan himoyalangan).
- **Reyting faqat `award` turidagi coinlar** asosida. Hafta dushanba 00:00 (Asia/Tashkent), oy 1-kuni 00:00 dan boshlanadi.
- **Fayllar** ruxsat etilgan tur va hajm bo'yicha tekshiriladi; rasmlar WebP ga qayta kodlanadi; fayllarga faqat imzolangan, muddatli URL orqali kiriladi.
- **Barcha ma'lumotlar PostgreSQL da.** localStorage faqat JWT token va mavzu (theme) uchun ishlatiladi.

---

## 6. Testlar

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
psql -U postgres -c "CREATE DATABASE english_arena_test;"
$env:TEST_DATABASE_URL="postgresql+psycopg://postgres:postgres@127.0.0.1:5432/english_arena_test"
pytest -q
```

12 ta test: auth/rollar, taklif (bir martalik + muddat), coin atomikligi, sovg'a escrow/refund/approve, vazifa snapshot va ko'rilganligi, kutubxona/progress/fayl tokeni, ustozlar izolyatsiyasi, reyting davrlari, haftalik maqsad, dashboard, push endpointlari.

Frontend build tekshiruvi:

```powershell
cd C:\Projects\english-arena\frontend
npm run build
```

---

## 7. Hujjatlar

| Fayl | Mazmuni |
|---|---|
| [RAILWAY_VERCEL_DEPLOY.md](RAILWAY_VERCEL_DEPLOY.md) | **Railway + Neon + Vercel** ga ko‘chirish (Render uxlab qolsa) |
| [PWA_PUSH_SETUP.md](PWA_PUSH_SETUP.md) | PWA o‘rnatish, VAPID, telefon push bildirishnomalari |
| [RENDER_VERCEL_DEPLOY.md](RENDER_VERCEL_DEPLOY.md) | Render + Neon + Vercel varianti |
| [DEPLOYMENT.md](DEPLOYMENT.md) | PowerShell, Railway, Vercel, domen, CORS, backup — alternativ variant |
| [EMAILJS_SETUP.md](EMAILJS_SETUP.md) | EmailJS hisobi, service, professional HTML template, kalitlar, test |
| [DATABASE.md](DATABASE.md) | Jadvallar, bog'lanishlar, constraintlar, tranzaksiyalar, migration, backup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Qatlamlar, auth, taklif oqimi, tranzaksiyalar, xavfsizlik qarorlari |
| [backend/.env.example](backend/.env.example) | Backend environment namunalari |
| [frontend/.env.example](frontend/.env.example) | Frontend environment namunalari |

---

## 8. Ma'lumot manbalari / litsenziyalar

- Lug'at ma'lumotlari: [freedictionaryapi.com](https://freedictionaryapi.com) — Wiktionary, **CC BY-SA 4.0**. Interfeysda manba ko'rsatiladi.
- Tarjima: [MyMemory](https://mymemory.translated.net) (en→uz).
- Talaffuz audio: dictionaryapi.dev media fayllari; mavjud bo'lmasa brauzer SpeechSynthesis ishlatiladi.
- Demo kitoblar: Aesop ertaklari (public domain), seed script tomonidan lokal generatsiya qilinadi.
- Ikonkalar: [Lucide](https://lucide.dev) (ISC).
