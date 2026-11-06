# English Arena — Render + Neon + Vercel deployment

Bu qo‘llanma aynan siz tanlagan kombinatsiya uchun:

- **Backend:** Render (Python web service)
- **Database:** Neon PostgreSQL (tavsiya) yoki Render PostgreSQL
- **Frontend:** Vercel

> Railway varianti kerak bo‘lsa: [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 0. Tayyor fayllar

Loyihada quyidagilar bor:

| Fayl | Vazifasi |
|---|---|
| `render.yaml` | Render Blueprint: web service, build/start, healthcheck, env o‘zgaruvchilari |
| `backend/start.sh` | `alembic upgrade head` + `uvicorn` (har deployda migration) |
| `backend/.python-version` | Python 3.11.9 |
| `backend/runtime.txt` | Render/Nixpacks uchun Python versiyasi |
| `frontend/vercel.json` | SPA rewrite (refreshda 404 bo‘lmasligi uchun) |
| `frontend/.env.example` | `VITE_API_URL` namunasi |

---

## 1. GitHubga yuklash

Render va Vercel GitHub repo’dan deploy qiladi.

```powershell
cd C:\Projects\english-arena
git init
git add .
git commit -m "English Arena"
git branch -M main
git remote add origin https://github.com/USERNAME/english-arena.git
git push -u origin main
```

`.env` fayllari GitHubga tushmasligi kerak (`.gitignore` buni ta’minlaydi). Repo **private** bo‘lsa ham Render/Vercel unga ruxsat so‘raydi.

---

## 2. Neon PostgreSQL yaratish (tavsiya)

### 2.1. Hisob va loyiha

1. https://neon.tech → **Sign up** (GitHub/Google bilan mumkin).
2. **Create project**.
3. Project name: `english-arena`.
4. Region: o‘zingizga yaqin (O‘zbekiston uchun **Frankfurt** yoki **Singapore** odatda yaxshi).
5. PostgreSQL version: default (16/17) qoldiring.
6. **Create project**.

### 2.2. Connection string

1. Neon project → **Connect** (yoki **Dashboard → Connection string**).
2. **Pooled connection** ni tanlang (hostda `-pooler` bo‘ladi). Render uchun bu eng mos variant, chunki u IPv4 orqali ulanadi. Kod PgBouncer bilan ishlashga moslashtirilgan (`prepare_threshold=None`).
3. String quyidagicha bo‘ladi:

```text
postgresql://neondb_owner:PAROL@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

4. `PAROL` o‘rnida haqiqiy parol bo‘ladi. Uni nusxalang.

> **Muhim:** Render’da IPv6 muammosi bo‘lsa, **pooled** URL ishlating. Kod prepared statement’larni o‘chirib qo‘ygan, shuning uchun PgBouncer bilan muammo bo‘lmaydi. Neon’da IPv4 add-on yoki Render’da IPv6 mavjud bo‘lsa, **direct** URL ham ishlaydi; ikkalasi ham `sslmode=require` bilan yoziladi.

### 2.3. Tekshirish

```powershell
psql "postgresql://neondb_owner:PAROL@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require" -c "select version();"
```

`psql` yo‘q bo‘lsa, Neon SQL Editor’da `select 1;` ishlating.

### 2.4. Parolni URL-encode qilish

Parolda `@`, `#`, `%`, `/` kabi belgilar bo‘lsa, ularni encode qilish kerak:

| Belgi | Encode |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `/` | `%2F` |

Masalan parol `Abc@123` bo‘lsa:

```text
postgresql://neondb_owner:Abc%40123@ep-.../neondb?sslmode=require
```

---

## 3. Render backend

### 3.1. Blueprint orqali (tavsiya)

1. https://render.com → GitHub bilan kiring.
2. **New → Blueprint**.
3. `english-arena` repo’ni tanlang.
4. Render ildizdagi `render.yaml` ni o‘qiydi.
5. Quyidagi env qiymatlari so‘raladi (`sync: false` bo‘lganlar):

| Variable | Qiymat |
|---|---|
| `DATABASE_URL` | Neon connection string (2.2) |
| `APP_URL` | Hozircha `http://localhost:5173` (keyin Vercel URL bilan almashtiriladi) |
| `CORS_ORIGINS` | Hozircha `http://localhost:5173` |
| `EMAILJS_SERVICE_ID` | EmailJS service ID (keyin ham qo‘yish mumkin) |
| `EMAILJS_TEMPLATE_ID` | EmailJS template ID |
| `EMAILJS_PUBLIC_KEY` | EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | EmailJS private key |
| `VAPID_PUBLIC_KEY` | Web Push public key |
| `VAPID_PRIVATE_KEY` | Web Push private key |
| `VAPID_SUBJECT` | `mailto:sizning@emailingiz.com` |

6. **Apply / Create**.
7. Render build va deployni boshlaydi.

Blueprint quyidagilarni avtomatik qiladi:
- Root Directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `sh start.sh` → `alembic upgrade head` + `uvicorn`
- Healthcheck: `/api/health`
- `SECRET_KEY`: avtomatik generatsiya (`generateValue: true`)
- `ENVIRONMENT=production`

### 3.2. Blueprint ishlamasa — qo‘lda

1. **New → Web Service** → repo.
2. **Name:** `english-arena-api`.
3. **Root Directory:** `backend`.
4. **Runtime:** Python 3.
5. **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
6. **Start Command:** `sh start.sh`
7. **Health Check Path:** `/api/health`
8. **Instance Type:** Free (yoki Starter).
9. Environment:

```env
PYTHON_VERSION=3.11.9
ENVIRONMENT=production
SECRET_KEY=<48 belgili tasodifiy>
DATABASE_URL=<Neon connection string>
APP_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
UPLOAD_DIR=/tmp/uploads
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=
```

### 3.3. Backend URL

Deploy tugagach Render beradi:

```text
https://english-arena-api.onrender.com
```

Tekshirish:

```powershell
Invoke-RestMethod https://english-arena-api.onrender.com/api/health
```

Natija:

```text
status app           environment
------ ---           -----------
ok     English Arena production
```

Agar 502/503 bo‘lsa: **Logs** bo‘limini oching. Free instans uxlab qolgan bo‘lsa, birinchi so‘rov 30–60 soniya olishi mumkin.

### 3.4. Migration holati

`start.sh` har deployda `alembic upgrade head` bajaradi. Logs’da quyidagini ko‘rish kerak:

```text
Running upgrade caf70aea99df -> 66fa59f2dd66
Application startup complete.
```

Agar migration xato bersa, deploy to‘xtaydi. Logs’dagi xatoni o‘qing yoki Shell’da qo‘lda:

```bash
alembic current
alembic upgrade head
```

---

## 4. Birinchi ustoz akkaunti

Ommaviy ustoz ro‘yxatdan o‘tishi yo‘q. Ikki usul:

### 4.1. Render Shell (qulay)

Render → `english-arena-api` → **Shell**:

```bash
pwd
ls
# agar backend papkasi ko‘rinsa:
cd backend
python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov
```

Parol so‘raladi (kamida 8 belgi).

> `Shell` free planda mavjud bo‘lmasa, 4.2 usulidan foydalaning.

### 4.2. Lokal kompyuterdan Neon’ga

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql+psycopg://neondb_owner:PAROL@ep-...neon.tech/neondb?sslmode=require"
python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov
```

Bu to‘g‘ridan-to‘g‘ri Neon bazasiga yozadi. Render’dagi backend keyingi so‘rovda uni ko‘radi.

### 4.3. Tekshirish

Neon SQL Editor:

```sql
select email, role, created_at from users;
```

Keyin frontend tayyor bo‘lgach, shu email/parol bilan kiring.

> **Demo seed’ni productionda ishlatmang.** `python -m app.seed` demo parolli akkauntlar yaratadi. Faqat sinov uchun.

---

## 5. Vercel frontend

### 5.1. Import

1. https://vercel.com → GitHub bilan kiring.
2. **Add New → Project** → `english-arena`.
3. **Root Directory:** `frontend`.
4. Framework: **Vite** (avtomatik).
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. **Environment Variables:**

```env
VITE_API_URL=https://english-arena-api.onrender.com
```

> Oxirida `/` bo‘lmasin. Backend URL’ni Render’dan aniq nusxalang.

8. **Deploy**.

### 5.2. Vercel URL

Deploy tugagach:

```text
https://english-arena.vercel.app
```

`vercel.json` SPA rewrite qiladi, shuning uchun `/student/library` kabi sahifalar refreshda 404 bermaydi.

### 5.3. Preview URL haqida

Har bir Vercel preview deploy yangi URL oladi (`english-arena-abc123.vercel.app`). Backend CORS faqat ruxsat berilgan originlarni qabul qiladi. Production domen bilan test qiling; preview kerak bo‘lsa, o‘sha URL’ni `CORS_ORIGINS` ga qo‘shib qayta deploy qiling.

---

## 6. Render env’larini yakunlash (juda muhim)

Vercel URL tayyor bo‘lgach, Render → backend → **Environment**:

```env
APP_URL=https://english-arena.vercel.app
CORS_ORIGINS=https://english-arena.vercel.app
```

Agar custom domen ham bo‘lsa:

```env
APP_URL=https://arena.example.uz
CORS_ORIGINS=https://arena.example.uz,https://english-arena.vercel.app
```

**Save Changes** → Render avtomatik qayta deploy qiladi (yoki **Manual Deploy**).

Bu qadam bo‘lmasa:
- taklif havolalari `localhost`ga ketadi;
- brauzer CORS xatosi beradi;
- login ishlamaydi.

Tekshirish: brauzer DevTools → Network → `login` javobida:

```text
access-control-allow-origin: https://english-arena.vercel.app
```

---

## 7. EmailJS

`EMAILJS_SETUP.md` bo‘yicha service/template yarating. Render env’ga:

```env
EMAILJS_SERVICE_ID=service_xxxxxxx
EMAILJS_TEMPLATE_ID=template_xxxxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxx
EMAILJS_PRIVATE_KEY=xxxxxxxx
```

Keyin Render’da **Manual Deploy → Clear build cache & deploy** yoki Save Changes.

Test: ustoz paneli → Takliflar → Yangi taklif → email kiriting. Natija oynasida:
- ✅ Email yuborildi — yaxshi.
- ⚠️ Email yuborilmadi — xatolik matni va havola ko‘rsatiladi; `EMAILJS_SETUP.md` 5-bo‘lim.

> EmailJS kalitlari faqat Render backend env’da. Vercel’da `EMAILJS_*` yozmang.

---

## 8. Yuklangan fayllar (kitob, rasm, PDF)

### 8.1. Free Render muammosi

Render free instansda **doimiy disk yo‘q**. `UPLOAD_DIR=/tmp/uploads` ishlaydi, lekin:
- har deploy/restartda fayllar o‘chadi;
- kitob muqovalari, PDF/EPUB va vazifa fayllari yo‘qoladi;
- bazadagi `file_key` yozuvlari qoladi, lekin fayl topilmaydi.

Demo/sinov uchun bu mayli. Haqiqiy foydalanuvchilar uchun disk kerak.

### 8.2. Pullik Render + disk

1. Render → backend → **Disks → Add Disk**.
2. Name: `english-arena-data`.
3. Mount Path: `/var/data`.
4. Size: `1 GB` (yetadi; keyin oshirish mumkin).
5. Environment:

```env
UPLOAD_DIR=/var/data/uploads
```

6. Qayta deploy.

`render.yaml` ichida disk bloki kommentariya qilib qo‘yilgan. Blueprint orqali disk qo‘shmoqchi bo‘lsangiz:

```yaml
    disk:
      name: english-arena-data
      mountPath: /var/data
      sizeGB: 1
```

va `UPLOAD_DIR` ni `/var/data/uploads` ga o‘zgartiring.

> Diskli servisda zero-downtime deploy cheklangan bo‘lishi mumkin — Render diskni qayta ulash uchun servisni qisqa to‘xtatadi. Bu normal.

### 8.3. Muqobil

Kelajakda fayllarni S3/Cloudflare R2 ga ko‘chirish mumkin, lekin hozirgi kod lokal diskka yozadi. Buning uchun `backend/app/services/files.py` ni almashtirish kerak.

---

## 9. Neon yoki Render PostgreSQL?

| Mezon | Neon | Render PostgreSQL |
|---|---|---|
| Free muddat | Doimiy free tier, limitlar bilan | Free baza muddati cheklangan bo‘lishi mumkin |
| SSL | `?sslmode=require` majburiy | Internal URL’da shart emas |
| Backend bilan yaqinlik | Regionni tanlang | Bir xil regionda juda tez |
| Backup | Neon’da point-in-time (tarifga qarab) | Render backup |
| Sozlash | Connection string nusxalash | Render ichida “Internal URL” |
| Tavsiya | **Ha** (boshlash uchun) | Productionda pullik variant yaxshi |

### Render PostgreSQL ishlatsangiz

1. Render → **New → PostgreSQL**.
2. Region: backend bilan bir xil.
3. Yaratilgach **Internal Database URL** ni nusxalang.
4. Backend env:

```env
DATABASE_URL=<Internal Database URL>
```

5. `start.sh` migrationni o‘zi bajaradi.

Tashqi URL ishlatish kerak bo‘lsa, SSL qo‘shing:

```text
...?sslmode=require
```

---

## 10. Domen (ixtiyoriy)

### Vercel

1. Project → **Settings → Domains → Add**.
2. `arena.example.uz`.
3. DNS’da CNAME → `cname.vercel-dns.com` (yoki apex uchun A).
4. HTTPS avtomatik.

### Render

1. Backend → **Settings → Custom Domains → Add**.
2. `api.arena.example.uz`.
3. DNS’da Render bergan CNAME’ni qo‘shing.
4. HTTPS avtomatik.

Keyin:

Render env:

```env
APP_URL=https://arena.example.uz
CORS_ORIGINS=https://arena.example.uz
```

Vercel env:

```env
VITE_API_URL=https://api.arena.example.uz
```

Ikkalasini qayta deploy qiling.

---

## 11. Yakuniy tekshiruv

- [ ] `https://...onrender.com/api/health` → `{"status":"ok"}`
- [ ] Render logs’da migration xatosiz
- [ ] Ustoz akkaunti yaratilgan
- [ ] Vercel’da login ishlaydi
- [ ] CORS xatosi yo‘q
- [ ] Guruh yaratish ishlaydi
- [ ] Taklif yuborish ishlaydi (EmailJS yoki havola fallback)
- [ ] O‘quvchi havola orqali ro‘yxatdan o‘tadi
- [ ] Vazifa PDF bilan yuboriladi
- [ ] Coin berish/ayirish ishlaydi
- [ ] Sovg‘a so‘rovi va refund ishlaydi
- [ ] Kitob yuklanadi va readerda ochiladi (disk bo‘lsa)
- [ ] Lug‘at real API’dan javob beradi
- [ ] Mobil va dark/light ko‘rinish yaxshi
- [ ] Neon backup yoqilgan

---

## 12. Muammolarni tuzatish

| Muammo | Sabab / yechim |
|---|---|
| Build: `No module named app` | Root Directory `backend` emas. Render → Settings → Root Directory. |
| `SECRET_KEY production...` | `ENVIRONMENT=production` da default kalit. Render’da `SECRET_KEY` generatsiya qiling. |
| `connection requires sslmode` | Neon URL oxiriga `?sslmode=require` qo‘shing. |
| `password authentication failed` | Neon paroli noto‘g‘ri yoki URL-encode qilinmagan. `@` → `%40`. |
| `relation "users" does not exist` | Migration bajarilmagan. Logs/`alembic upgrade head` tekshiring. |
| `CORS policy` | Render `CORS_ORIGINS` da Vercel URL aniq (https, slashsiz) bo‘lsin. Qayta deploy. |
| Login 401 | Ustoz yaratilganmi? Neon’da `select * from users;`. |
| Login 429 | 5 daqiqada 10 xato urinish. Kuting. |
| Birinchi so‘rov 50 soniya | Render free instans uxlagan. Retry yoki Starter plan. |
| Fayllar deploydan keyin yo‘q | Free Render’da disk yo‘q. 8-bo‘lim. |
| 413 File too large | `MAX_BOOK_MB` / `MAX_ASSIGNMENT_MB` / `MAX_IMAGE_MB` env’larini oshiring. |
| Email ketmadi | EmailJS service/template/keylar, “To Email” = `{{to_email}}`, private key. |
| PDF ochilmaydi | `npm ci` bilan build qiling; `pdfjs-dist` 4.8.69 pinlangan. |
| Vercel’da refresh 404 | `frontend/vercel.json` SPA rewrite ishlatilishi kerak; Root Directory `frontend`. |
| Neon’da juda ko‘p ulanish | Direct URL ishlating; backend bitta instansda `pool_size=5`. |
| `prepared statement already exists` | Kodda oldingi versiya ishlayapti yoki boshqa client. Backendni qayta deploy qiling; kerak bo‘lsa direct URL’ga o‘ting. |

---

## 12.1. `start.sh` topilmadi xatosi (aynan sizning holat)

Build log:

```text
==> Running 'sh start.sh'
sh: 0: cannot open start.sh: No such file
==> Exited with status 2
```

Bu kod xatosi emas — Render **noto‘g‘ri papkada** turgan yoki GitHub repo’da bu loyiha fayllari yo‘q.

### Tekshirish 1 — GitHub repo

GitHub’da repo ildizida quyidagilar bo‘lishi shart:

```text
render.yaml
start.sh
requirements.txt
backend/
  app/
  alembic/
  start.sh
  requirements.txt
frontend/
```

Agar `backend/start.sh` yo‘q bo‘lsa — loyiha repo’ga to‘liq yuklanmagan.

### Tekshirish 2 — requirements fayli

`backend/requirements.txt` ichida quyidagilar bo‘lishi kerak:

```text
fastapi==0.115.6
uvicorn[standard]==0.34.0
SQLAlchemy==2.0.36
alembic==1.14.0
psycopg[binary]==3.2.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
Pillow==11.0.0
```

Render logida `argon2-cffi`, `redis`, `celery`, `boto3` o‘rnatilgan bo‘lsa — bu **boshqa loyihaning requirements fayli**. Ya’ni repo’da English Arena kodi emas, eski loyiha turgan.

### Tekshirish 3 — Render Root Directory

Render → service → **Settings → Build & Deploy**:

```text
Root Directory: backend
Build Command: pip install --upgrade pip && pip install -r requirements.txt
Start Command: sh start.sh
Health Check Path: /api/health
```

Saqlang → **Manual Deploy → Clear build cache & deploy**.

Agar Root Directory allaqachon `backend` bo‘lsa-yu, `start.sh` topilmasa — GitHub’dagi `backend` papkasida `start.sh` yo‘q.

### Tekshirish 4 — repo noto‘g‘ri bo‘lsa

Eng ishonchli yechim: `english-arena.zip` ni ochib, **ichidagi `english-arena` papkasi** tarkibini repo ildiziga qo‘ying:

```text
repo/
├── backend/
├── frontend/
├── render.yaml
├── start.sh
└── README.md
```

`english-arena/english-arena/backend` kabi ichma-ich bo‘lmasin.

Keyin:

```powershell
cd C:\Projects\english-arena
git add .
git commit -m "Fix project structure for Render"
git push
```

Render avtomatik qayta deploy qiladi.

> Agar repo’da eski loyiha kodi bo‘lsa, uni alohida branchga saqlab, English Arena’ni yangi repo’ga yuklash eng xavfsiz yo‘l.

### Root Directory’ni o‘zgartirmasangiz

Loyihaga qo‘shimcha ravishda ildizda `start.sh` va `requirements.txt` fallback ham bor:

```text
start.sh          → cd backend && alembic upgrade head && uvicorn ...
requirements.txt  → -r backend/requirements.txt
```

Shu sababli Root Directory bo‘sh qolsa ham, **agar repo’da `backend/` papkasi mavjud bo‘lsa**, build va start ishlaydi. Lekin `backend/` papkasi repo’da bo‘lmasa, hech qanday sozlama yordam bermaydi.

---

## 13. Yangilanish tartibi

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
cd ..
git add .
git commit -m "Update"
git push
```

Render va Vercel GitHub push’da avtomatik deploy qiladi. Migration `start.sh` orqali Render’da bajariladi.

---

## 14. Backup

### Neon

- Neon dashboard → **Backups** / **Restore** (tarifga qarab).
- Qo‘lda:

```powershell
$env:PGPASSWORD="NEON_PAROL"
pg_dump "postgresql://neondb_owner:NEON_PAROL@ep-...neon.tech/neondb?sslmode=require" -F c -f "C:\backups\arena_neon.dump"
```

### Render PostgreSQL

```powershell
$env:PGPASSWORD="RENDER_PAROL"
pg_dump "postgresql://user:pass@host:5432/db?sslmode=require" -F c -f "C:\backups\arena_render.dump"
```

### Fayllar

- Render disk bo‘lsa — disk snapshot/backup.
- Free bo‘lsa — fayllar doimiy emas; productionda disk yoki tashqi storage kerak.
