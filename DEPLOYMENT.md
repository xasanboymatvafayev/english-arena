# English Arena — to'liq deployment qo'llanmasi

Bu qo'llanma boshidan oxirigacha: kompyuterda ishga tushirish → PostgreSQL → migration → birinchi ustoz → EmailJS → Railway → Vercel → domen → backup.

> Har bir buyruq **PowerShell** uchun yozilgan. Qaysi papkada turish kerakligi alohida ko'rsatilgan. Buyruqlarni ketma-ket bajaring.

---

## 0. Qisqa yo'l xaritasi

1. Dasturlarni o'rnatish
2. PostgreSQL bazasini yaratish
3. Backend `.env` va migration
4. Birinchi ustoz akkaunti
5. Frontendni ishga tushirish
6. EmailJS sozlash
7. Backendni Railwayga deploy qilish
8. Frontendni Vercelga deploy qilish
9. Domen, HTTPS, CORS
10. Backup va yakuniy tekshiruv

---

## 1. Kerakli dasturlar (Windows)

### 1.1. Node.js
1. https://nodejs.org → **LTS** versiyani yuklab oling.
2. O'rnatishda "Add to PATH" belgilangan bo'lsin.
3. Tekshirish:

```powershell
node --version
npm --version
```

`v18.x` yoki yuqori bo'lishi kerak.

### 1.2. Python
1. https://www.python.org/downloads/ → Python **3.11+**.
2. O'rnatishda **"Add python.exe to PATH"** ni albatta belgilang.
3. Tekshirish:

```powershell
python --version
pip --version
```

### 1.3. PostgreSQL
1. https://www.postgresql.org/download/windows/ → installer.
2. Parolni yozib qo'ying (masalan `postgres`).
3. Port: `5432`.
4. Tekshirish:

```powershell
psql --version
```

Agar `psql` topilmasa, PowerShellni qayta oching yoki `C:\Program Files\PostgreSQL\16\bin` ni PATH ga qo'shing.

### 1.4. Git
https://git-scm.com/download/win → o'rnating. Tekshirish:

```powershell
git --version
```

---

## 2. Loyihani ochish

```powershell
cd C:\Projects
```

Agar loyiha papkasi boshqa joyda bo'lsa, o'sha yo'lni yozing. Keyingi barcha buyruqlarda `C:\Projects\english-arena` ni o'zingizning yo'lingizga almashtiring.

```powershell
cd C:\Projects\english-arena
dir
```

Ko'rinishi kerak: `backend`, `frontend`, `README.md`, `DEPLOYMENT.md`, ...

---

## 3. PostgreSQL bazasini yaratish (lokal)

### 3.1. Bazani yaratish

```powershell
$env:PGPASSWORD="postgres"
psql -U postgres -c "CREATE DATABASE english_arena;"
```

Agar `database already exists` desa — yaxshi, davom eting.

### 3.2. Foydalanuvchi yaratish (tavsiya etiladi)

```powershell
psql -U postgres -c "CREATE USER arena WITH PASSWORD 'kuchli-parol';"
psql -U postgres -c "ALTER DATABASE english_arena OWNER TO arena;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE english_arena TO arena;"
```

> Oddiy lokal ish uchun `postgres` foydalanuvchisini ishlatsangiz ham bo'ladi. Productionda alohida foydalanuvchi va kuchli parol ishlating.

---

## 4. Backendni sozlash

### 4.1. Papkaga o'tish

```powershell
cd C:\Projects\english-arena\backend
```

### 4.2. Virtual muhit

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

PowerShell "execution policy" xatosi bersa:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Keyin qayta:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 4.3. Kutubxonalar

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

### 4.4. `.env` fayl

```powershell
Copy-Item .env.example .env
notepad .env
```

Minimal lokal sozlama:

```env
ENVIRONMENT=development
SECRET_KEY=bu-yerga-kamida-32-belgili-tasodifiy-kalit-yozing
DATABASE_URL=postgresql+psycopg://arena:kuchli-parol@127.0.0.1:5432/english_arena
APP_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
UPLOAD_DIR=uploads
```

`SECRET_KEY` yaratish (PowerShell):

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Chiqqan qiymatni `SECRET_KEY=` ga yozing. **Bu kalitni hech kimga bermang va GitHubga yuklamang.**

### 4.5. Migrationlar

```powershell
alembic upgrade head
```

Tekshirish:

```powershell
alembic current
```

`head` ko'rinishi kerak.

### 4.6. Birinchi ustoz akkaunti

Ommaviy ustoz ro'yxatdan o'tishi yo'q — akkaunt faqat shu buyruq bilan yaratiladi:

```powershell
python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov
```

Parol so'raladi (kamida 8 belgi). Parolni yozganda ekranda ko'rinmaydi — bu normal.

ixtiyoriy login qo'shish:

```powershell
python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov --username ustoz
```

### 4.7. Serverni ishga tushirish

```powershell
uvicorn app.main:app --reload --port 8000
```

Tekshirish (yangi PowerShell oynasida):

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

Javob:

```text
status app           environment
------ ---           -----------
ok     English Arena development
```

Swagger: http://localhost:8000/docs (faqat developmentda ochiq).

> Server oynasini yopmang. Keyingi qadamlar uchun **yangi PowerShell oynasi** oching.

### 4.8. Demo ma'lumot (ixtiyoriy)

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
python -m app.seed
```

Demo loginlar `README.md` da. Demo ma'lumotni tozalash:

```powershell
python -m app.seed --reset
```

> `--reset` **barcha** ma'lumotni o'chiradi. Faqat lokal/test bazada ishlating.

---

## 5. Frontendni sozlash

### 5.1. Papkaga o'tish

```powershell
cd C:\Projects\english-arena\frontend
```

### 5.2. Kutubxonalar

```powershell
npm install
```

### 5.3. `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

Lokal uchun bo'sh qoldiring:

```env
VITE_API_URL=
```

Vite `/api` so'rovlarini `http://127.0.0.1:8000` ga proxy qiladi.

### 5.4. Ishga tushirish

```powershell
npm run dev
```

Brauzer: http://localhost:5173

Ustoz akkaunti bilan kiring (4.6 da yaratgan email/parol). O'quvchi akkaunti faqat taklif orqali yaratiladi.

### 5.5. Production buildni tekshirish

```powershell
npm run build
npm run preview
```

Build xatosiz tugashi kerak.

---

## 6. EmailJS sozlash (qisqacha)

To'liq qo'llanma: **[EMAILJS_SETUP.md](EMAILJS_SETUP.md)**.

Qisqasi:
1. https://www.emailjs.com → ro'yxatdan o'ting.
2. **Email Services** → Gmail/SMTP ulang → `Service ID` oling.
3. **Email Templates** → yangi template → `Template ID` oling.
4. Templateda **To Email** = `{{to_email}}`, **Subject** = `{{app_name}} — taklif`, HTML qismiga `EMAILJS_SETUP.md` dagi professional shablonni qo'ying.
5. **Account → General → Public Key** ni oling.
6. **Account → Security → Private Key** ni oling (server-side yuborish uchun tavsiya etiladi).
7. Backend `.env` ga yozing:

```env
EMAILJS_SERVICE_ID=service_xxxxxxx
EMAILJS_TEMPLATE_ID=template_xxxxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxx
EMAILJS_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxx
```

8. Backendni qayta ishga tushiring.
9. Ustoz panelida taklif yuborib test qiling.

> EmailJS kalitlari **faqat backendda**. Frontendga hech qachon yozilmaydi.

---

## 7. Backendni Railwayga deploy qilish

### 7.1. GitHub repo

Loyihani GitHubga yuklang (`.env` va `uploads` yuklanmasin — `.gitignore` buni bajaradi):

```powershell
cd C:\Projects\english-arena
git init
git add .
git commit -m "English Arena initial release"
git branch -M main
git remote add origin https://github.com/USERNAME/english-arena.git
git push -u origin main
```

### 7.2. Railway loyihasi

1. https://railway.app → GitHub bilan kiring.
2. **New Project** → **Deploy from GitHub repo** → `english-arena` ni tanlang.
3. Servis sozlamalari → **Settings → Root Directory** = `backend`.
4. **Settings → Build** avtomatik Nixpacks bo'ladi (`requirements.txt` va `runtime.txt` asosida).
5. **Settings → Deploy → Start Command**: `sh start.sh` (repo ichidagi `railway.json` ham shu buyruqni beradi).
6. **Settings → Healthcheck Path**: `/api/health`.

### 7.3. PostgreSQL qo'shish

1. Loyiha sahifasida **New** → **Database** → **Add PostgreSQL**.
2. PostgreSQL servisi ochiladi.
3. Backend servisiga qaytib **Variables** → **New Variable**:
   - Name: `DATABASE_URL`
   - Value: **Add Reference** → `Postgres` → `DATABASE_URL`
4. Railway URL ni avtomatik beradi (`postgresql://...`). Kod uni `postgresql+psycopg://` ga o'zi aylantiradi.

### 7.4. Environment variables

Backend servisi → **Variables** bo'limida quyidagilarni kiriting:

| Variable | Qiymat |
|---|---|
| `ENVIRONMENT` | `production` |
| `SECRET_KEY` | 48+ belgili tasodifiy kalit (lokal `.env` dagidan **boshqa**) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference) |
| `APP_URL` | `https://your-frontend.vercel.app` (keyinroq domen bilan yangilanadi) |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` |
| `EMAILJS_SERVICE_ID` | EmailJS service ID |
| `EMAILJS_TEMPLATE_ID` | EmailJS template ID |
| `EMAILJS_PUBLIC_KEY` | EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | EmailJS private key |
| `INVITATION_EXPIRE_DAYS` | `7` |
| `UPLOAD_DIR` | `/data/uploads` (volume ishlatilsa) |
| `MAX_BOOK_MB` | `40` |
| `MAX_ASSIGNMENT_MB` | `15` |
| `MAX_IMAGE_MB` | `4` |

> Productionda `ENVIRONMENT=production` bo'lsa, `SECRET_KEY` default qiymatda qolsa ilova ishga tushmaydi. Bu ataylab qilingan himoya.

### 7.5. Yuklangan fayllar uchun volume (juda muhim)

Railway konteyneri qayta deploy bo'lganda lokal fayllar o'chib ketadi. Kitoblar, muqovalar, sovg'a rasmlari va PDF vazifalar saqlanishi uchun:

1. Backend servisi → **Volumes** → **Add Volume**.
2. Mount path: `/data`.
3. `UPLOAD_DIR=/data/uploads` env ni qo'shing.
4. Qayta deploy qiling.

Volume bo'lmasa, fayllar vaqtincha ishlaydi, lekin redeploydan keyin yo'qoladi.

### 7.6. Deploy va migration

`railway.json` dagi start buyrug'i:

```sh
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Ya'ni har deployda migration avtomatik bajariladi. Deploy loglarida quyidagilarni ko'rish kerak:

```text
Running upgrade ... -> ...
Application startup complete.
```

### 7.7. Birinchi ustozni Railway bazasida yaratish

**A usul — Railway CLI (tavsiya):**

```powershell
npm install -g @railway/cli
railway login
cd C:\Projects\english-arena
railway link
railway service backend
railway run python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov
```

**B usul — lokal kompyuterdan Railway bazasiga ulanish:**

1. Railway → PostgreSQL → **Connect** → public connection stringni oling.
2. PowerShell:

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql+psycopg://postgres:PAROL@HOST:PORT/railway"
python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov
```

> Public networking yoqilmagan bo'lsa, Railway PostgreSQL sozlamalarida **Public Networking** ni yoqing yoki CLI usulidan foydalaning.

### 7.8. Backend URL

Railway → backend servisi → **Settings → Networking → Generate Domain**.

Masalan:

```text
https://english-arena-production.up.railway.app
```

Tekshirish:

```powershell
Invoke-RestMethod https://english-arena-production.up.railway.app/api/health
```

---

## 8. Frontendni Vercelga deploy qilish

### 8.1. Import

1. https://vercel.com → GitHub bilan kiring.
2. **Add New → Project** → `english-arena` repo.
3. **Root Directory**: `frontend`.
4. Framework Preset: **Vite** (avtomatik aniqlanadi).
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. **Environment Variables**:
   - `VITE_API_URL` = `https://english-arena-production.up.railway.app`
8. **Deploy**.

### 8.2. CORSni yangilash

Deploy tugagach Vercel URL olinadi, masalan:

```text
https://english-arena.vercel.app
```

Railway → backend → Variables:

```env
APP_URL=https://english-arena.vercel.app
CORS_ORIGINS=https://english-arena.vercel.app
```

Agar custom domen ham bo'lsa, vergul bilan:

```env
CORS_ORIGINS=https://english-arena.vercel.app,https://arena.example.uz
```

Saqlangach Railway avtomatik qayta deploy qiladi.

### 8.3. Tekshirish

1. Vercel URL ni oching.
2. Ustoz bilan kiring.
3. Taklif yuboring.
4. O'quvchi havolasini boshqa brauzerda ochib, ro'yxatdan o'ting.
5. Kitob yuklang va o'quvchi sifatida o'qing.

---

## 9. Domen va HTTPS

### 9.1. Frontend domeni (Vercel)

1. Vercel → Project → **Settings → Domains** → **Add**.
2. `arena.example.uz` yozing.
3. Vercel DNS yozuvini ko'rsatadi:
   - CNAME `arena` → `cname.vercel-dns.com`
   - yoki apex uchun A yozuv.
4. Domen provayderingizda (Cloudflare, Namecheap, ...) shu yozuvni qo'shing.
5. Vercel HTTPS sertifikatni avtomatik beradi (Let's Encrypt).

### 9.2. Backend domeni (Railway)

1. Railway → backend → **Settings → Networking → Custom Domain**.
2. `api.arena.example.uz` kiriting.
3. Railway CNAME target beradi — DNS ga qo'shing.
4. HTTPS avtomatik.

### 9.3. URLlarni yangilash

Railway env:

```env
APP_URL=https://arena.example.uz
CORS_ORIGINS=https://arena.example.uz
```

Vercel env:

```env
VITE_API_URL=https://api.arena.example.uz
```

Ikkalasini qayta deploy qiling.

### 9.4. CORS tekshiruvi

Brauzerda frontendni oching → DevTools → Network → `login` so'rovi:

- `Access-Control-Allow-Origin: https://arena.example.uz` bo'lishi kerak.
- Agar CORS xatosi bo'lsa: `CORS_ORIGINS` da **https** va domen aynan mosligini tekshiring (oxirida `/` bo'lmasin).

---

## 10. Database backup va fayllar

### 10.1. Lokal backup

```powershell
$env:PGPASSWORD="kuchli-parol"
pg_dump -U arena -h 127.0.0.1 -d english_arena -F c -f "C:\backups\english_arena_$(Get-Date -Format yyyy-MM-dd).dump"
```

### 10.2. Railway backup

1. Railway → PostgreSQL → **Data** / **Backups** bo'limida mavjud bo'lsa, avtomatik backupni yoqing.
2. Qo'lda:

```powershell
$env:PGPASSWORD="RAILWAY_PAROL"
pg_dump "postgresql://postgres:RAILWAY_PAROL@HOST:PORT/railway" -F c -f "C:\backups\railway_$(Get-Date -Format yyyy-MM-dd).dump"
```

### 10.3. Tiklash

```powershell
$env:PGPASSWORD="kuchli-parol"
pg_restore -U arena -h 127.0.0.1 -d english_arena --clean --if-exists "C:\backups\english_arena_2026-11-05.dump"
```

> `--clean` mavjud jadvallarni o'chiradi. Avval bo'sh test bazada sinab ko'ring.

### 10.4. Fayllar backupi

- Lokal: `backend\uploads` papkasini zip qiling.
- Railway: volume snapshot/backup imkoniyatidan foydalaning yoki davriy ravishda `/data/uploads` ni tashqi storagega ko'chiring.
- Kitoblar va muqovalar bazada emas, diskda saqlanadi — ularsiz `books.file_key` yaroqsiz bo'ladi.

### 10.5. Tiklash tartibi

1. PostgreSQL dumpni tiklang.
2. `uploads` / volume fayllarini joyiga qaytaring.
3. `alembic upgrade head`.
4. Backendni qayta ishga tushiring.
5. Health va login tekshiring.

---

## 11. Yakuniy tekshiruv ro'yxati

- [ ] `GET /api/health` → `{"status":"ok"}`
- [ ] Ustoz login ishlaydi
- [ ] Guruh yaratish/tahrirlash/o'chirish
- [ ] O'quvchi taklifi emailga keldi (yoki havola nusxalandi)
- [ ] O'quvchi havola orqali ro'yxatdan o'tdi va guruhga qo'shildi
- [ ] O'sha havola qayta ishlamaydi
- [ ] Vazifa PDF bilan yuborildi, o'quvchi ko'rdi
- [ ] Coin berish/ayirish, balans va tarix to'g'ri
- [ ] Sovg'a so'rovi: rad etilganda coin qaytdi, tasdiqlanganda qaytmadi
- [ ] Reyting hafta/oy/umumiy ishlaydi
- [ ] PDF kitob readerda ochildi va sahifa saqlandi
- [ ] EPUB readerda ochildi, mundarija va belgi ishladi
- [ ] Lug'at qidiruvi tarjima + IPA + audio qaytardi
- [ ] Irregular Verbs qidiruv/saqlash ishladi
- [ ] Dark/light va mobil ko'rinish yaxshi
- [ ] EmailJS xatidagi havola to'g'ri domenga ketdi
- [ ] CORS xatosi yo'q
- [ ] Backup olingan

---

## 12. Muammolarni tuzatish

| Muammo | Sabab / yechim |
|---|---|
| `relation "users" does not exist` | `alembic upgrade head` bajarilmagan. Backend papkasida bajaring. |
| `password authentication failed` | `DATABASE_URL` dagi parol/port noto'g'ri. `%` belgilari URL-encoded bo'lsin. |
| `CORS policy` xatosi | `CORS_ORIGINS` ga frontend URL ni **aniq** yozing (https, slashsiz). Qayta deploy qiling. |
| Login 401 | Email/login va parolni tekshiring. Ustoz yaratilganmi? `users` jadvalida bormi? |
| Login 429 | 5 daqiqada 10 marta xato urinish. Kuting yoki backendni qayta ishga tushiring (lokal). |
| `SECRET_KEY production...` xatosi | Productionda default kalit qoldirilgan. Railwayda yangi `SECRET_KEY` qo'ying. |
| Email ketmadi | `EMAILJS_*` envlar, service/template ID, private key, EmailJS dashboarddagi "To Email" maydoni `{{to_email}}` ekanini tekshiring. |
| Rasm/kitob yuklanmadi (413) | `MAX_*_MB` qiymatlarini oshiring yoki fayl hajmini kamaytiring. |
| Kitob redeploydan keyin yo'q | Railway volume ulanmagan yoki `UPLOAD_DIR` noto'g'ri. 7.5 bo'lim. |
| PDF o'chmaydi | Worker versiyasi mos emas. `package-lock.json` bilan `npm ci` qiling; `pdfjs-dist` 4.8.69 ga pin qilingan. |
| EPUB ochilmaydi | Fayl haqiqiy EPUB ekanini tekshiring (mimetype `application/epub+zip`). |
| Lug'at 502 | Tashqi API vaqtincha ishlamayapti yoki serverda internet yo'q. Qayta urinib ko'ring. |
| Vercel 404 (refreshda) | `vercel.json` dagi SPA rewrite ishlatilishi kerak; repo ildizida emas, `frontend` papkasida ekanini tekshiring. |
| Railway build `No module named app` | Root Directory `backend` emas. Settings → Root Directory ni tuzating. |

---

## 13. Yangilanish (update) tartibi

```powershell
cd C:\Projects\english-arena
git pull
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
pytest -q
cd ..\frontend
npm install
npm run build
```

Keyin:

```powershell
git add .
git commit -m "Update"
git push
```

Railway va Vercel GitHubga push bo'lganda avtomatik deploy qiladi.

---

## 14. Xavfsizlik eslatmalari

- `.env` ni **hech qachon** GitHubga yuklamang.
- `SECRET_KEY` va EmailJS private keyni faqat serverda saqlang.
- Productionda PostgreSQL parolini murakkab qiling.
- Railway/Vercel akkauntlarida 2FA yoqing.
- Ustoz akkauntini faqat CLI orqali yarating; ommaviy teacher sign-up endpointi yo'q.
- Ishlatilmagan ustoz/o'quvchi akkauntlarini bloklash uchun `users.is_active=false` qiling (hozircha admin UI yo'q; SQL orqali).
- Davriy backup qiling.
