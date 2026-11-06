# Render’dan Railway’ga ko‘chirish + Vercel + PWA/Push

Bu qo‘llanma aynan sizning holatingiz uchun:

- Backend: **Railway** (Render uxlab qolmoqda)
- Baza: **Neon** (hozirgi bazani saqlab qolamiz, ma’lumotlar ko‘chmaydi)
- Frontend: **Vercel** (o‘zgarmaydi)
- PWA + push bildirishnomalar: **Vercel + Railway + VAPID**

---

## 0. “Har 30 kunda hisob almashtiramiz” — bu yaxshi fikr emas

Texnik jihatdan mumkin, lekin har 30 kunda:

- yangi backend URL paydo bo‘ladi;
- Vercel’da `VITE_API_URL` yangilanadi;
- Render/Railway’da `CORS_ORIGINS` yangilanadi;
- PWA boshqa domenda qayta o‘rnatiladi;
- eski taklif havolalari ishlamaydi;
- fayllar/volume ko‘chirilmaydi;
- 1–2 soat downtime bo‘ladi;
- har safar deploy, migration va testni qaytadan qilasiz.

Buning o‘rniga:

- **Railway Hobby** (~$5/oy) yoki **Render Starter** — doimiy ishlaydi;
- yoki bepul variantda bitta platformada qoling va cold start’ga chidang.

**Tavsiya:** Railway’ga o‘ting, Neon bazani saqlang. 30 kunda almashtirish shart emas.

---

## 1. Hozirgi holat

Sizda:

```text
Frontend: https://english-arena-3u43.vercel.app
Backend:  https://english-arena-api-s14s.onrender.com
Database: Neon (neondb)
```

Bazada `teacher@arena.uz` ustoz akkaunti bor. Uni yo‘qotmaymiz.

---

## 2. Railway loyihasi yaratish

1. https://railway.app → GitHub bilan kiring.
2. **New Project → Deploy from GitHub repo**.
3. `english-arena` repo’ni tanlang.
4. Servis sozlamalari:
   - **Root Directory:** `backend` (tavsiya)
   - Railway `backend/railway.json` va `start.sh` ni ko‘radi.
   - Agar Root Directory bo‘sh qolsa ham, repo ildizidagi `start.sh` + `requirements.txt` fallback ishlaydi.
5. **Settings → Build**:
   - Builder: **Nixpacks** (yoki Dockerfile avtomatik)
   - Build Command: `pip install -r requirements.txt`
6. **Settings → Deploy**:
   - Start Command: `sh start.sh`
   - Healthcheck Path: `/api/health`
7. **Deploy**.

`start.sh` har deployda:

```sh
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

bajaradi.

---

## 3. Environment variables

Railway → service → **Variables** → **Raw Editor** yoki bittalab qo‘shing:

```env
ENVIRONMENT=production
SECRET_KEY=<48+ belgili tasodifiy>
DATABASE_URL=<Neon pooled connection string>
APP_URL=https://english-arena-3u43.vercel.app
CORS_ORIGINS=https://english-arena-3u43.vercel.app
UPLOAD_DIR=/data/uploads
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30
INVITATION_EXPIRE_DAYS=7
MAX_IMAGE_MB=4
MAX_BOOK_MB=40
MAX_ASSIGNMENT_MB=15

EMAILJS_SERVICE_ID=...
EMAILJS_TEMPLATE_ID=...
EMAILJS_PUBLIC_KEY=...
EMAILJS_PRIVATE_KEY=...

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:sizning@emailingiz.com
```

Muhim:

- `DATABASE_URL` — Neon’dagi **pooled** URL. Hozirgi baza ishlatiladi, ma’lumot ko‘chirilmaydi.
- `APP_URL` va `CORS_ORIGINS` — Vercel URL.
- `UPLOAD_DIR=/data/uploads` — volume uchun.
- VAPID kalitlari push uchun.

`SECRET_KEY` yaratish:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## 4. Volume — kitob va rasmlar uchun

Railway → service → **Volumes → Add Volume**:

| Sozlama | Qiymat |
|---|---|
| Mount path | `/data` |
| Size | `1 GB` (yetadi) |

Keyin env:

```env
UPLOAD_DIR=/data/uploads
```

Volume bo‘lmasa, yuklangan PDF/EPUB/rasmlar deployda yo‘qoladi.

> Render’dagi eski fayllar avtomatik ko‘chmaydi. Ular Render volume’ida bo‘lsa, qo‘lda yuklab, Railway volume’iga joylash kerak. Hozircha demo fayllar bo‘lsa, muammo yo‘q.

---

## 5. Railway domeni

Railway → service → **Settings → Networking → Generate Domain**.

Masalan:

```text
https://english-arena-api-production.up.railway.app
```

Tekshirish:

```powershell
Invoke-RestMethod https://english-arena-api-production.up.railway.app/api/health
```

Kutilgan:

```text
status : ok
app    : English Arena
environment : production
```

---

## 6. Vercel’ni Railway’ga bog‘lash

Vercel → Project → **Settings → Environment Variables**:

```env
VITE_API_URL=https://english-arena-api-production.up.railway.app
```

Keyin:

**Deployments → eng oxirgi deployment → ⋯ → Redeploy**.

Vercel’da `VITE_API_URL` build vaqtida o‘qiladi — envni o‘zgartirgach **albatta redeploy** qiling.

---

## 7. CORS’ni yangilash

Railway → Variables:

```env
APP_URL=https://english-arena-3u43.vercel.app
CORS_ORIGINS=https://english-arena-3u43.vercel.app
```

Saqlang → Railway qayta deploy qiladi.

Tekshirish:

```powershell
curl.exe -i -X OPTIONS "https://english-arena-api-production.up.railway.app/api/auth/login" `
  -H "Origin: https://english-arena-3u43.vercel.app" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type"
```

Javobda:

```text
HTTP/2 200
access-control-allow-origin: https://english-arena-3u43.vercel.app
```

bo‘lishi kerak.

---

## 8. Ustoz akkaunti

Neon bazada `teacher@arena.uz` bor — u saqlanadi. Railway’ga o‘tgach shu akkaunt bilan kiring.

Agar yangi baza yaratgan bo‘lsangiz:

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql+psycopg://...yangi-baza..."
python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov
```

Yoki Railway **Shell**:

```bash
cd backend
python -m app.scripts.create_teacher --email teacher@example.com --first-name Aziz --last-name Karimov
```

---

## 9. PWA va push’ni yoqish

### 9.1. VAPID kalitlari

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
python -m app.scripts.generate_vapid_keys
```

Natijadagi uchta qiymatni Railway env’ga qo‘ying:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:sizning@emailingiz.com
```

Railway qayta deploy bo‘ladi.

### 9.2. Migration

`start.sh` `alembic upgrade head` ni bajaradi. Logs’da:

```text
Running upgrade 66fa59f2dd66 -> 261b75e7eadd
```

ko‘rinishi kerak — bu `push_subscriptions` jadvali.

### 9.3. Saytda yoqish

1. https://english-arena-3u43.vercel.app
2. Topbardagi **qo‘ng‘iroq** belgisi.
3. **Bildirishnomalarni yoqish**.
4. Brauzer ruxsati → **Allow**.
5. **Test bildirishnoma yuborish**.

Batafsil: [PWA_PUSH_SETUP.md](PWA_PUSH_SETUP.md).

---

## 10. Telefonga o‘rnatish

### Android

Saytni Chrome’da oching → pastdagi **“English Arena’ni telefonga o‘rnating”** → **O‘rnatish**.

### iPhone

Safari → **Share** → **Add to Home Screen** → **Add**.

iPhone’da push faqat iOS 16.4+ va shu tarzda o‘rnatilgan ilovada ishlaydi.

---

## 11. Render’ni o‘chirish

Railway to‘liq ishlagach:

1. Vercel `VITE_API_URL` Railway URL’ga o‘tdi.
2. CORS 200 qaytardi.
3. Login, guruh, taklif, kitob, push test ishladi.
4. Shundan keyingina Render servisini **Suspend** yoki o‘chirish mumkin.

Render’dagi eski URL’ni zaxira sifatida bir necha kun saqlab turish mumkin.

---

## 12. Domen (ixtiyoriy)

### Backend

Railway → **Settings → Networking → Custom Domain**:

```text
api.arena.example.uz
```

DNS’da Railway bergan CNAME’ni qo‘shing.

### Frontend

Vercel → **Domains** → `arena.example.uz`.

Keyin:

```env
APP_URL=https://arena.example.uz
CORS_ORIGINS=https://arena.example.uz,https://english-arena-3u43.vercel.app
VITE_API_URL=https://api.arena.example.uz
```

Ikkala platformani qayta deploy qiling.

---

## 13. Backup

Neon:

```powershell
$env:PGPASSWORD="NEON_PAROL"
pg_dump "postgresql://neondb_owner:PAROL@ep-...-pooler.../neondb?sslmode=require" -F c -f "C:\backups\arena.dump"
```

Railway volume:

- Railway → volume → snapshot/backup imkoniyatini tekshiring.
- Yoki `/data/uploads` ni davriy ravishda tashqi storagega ko‘chiring.

---

## 14. Tez-tez uchraydigan xatolar

| Muammo | Yechim |
|---|---|
| `sh: cannot open start.sh` | Root Directory `backend` emas. Railway → Settings → Root Directory. |
| `No module named app` | Root Directory `backend` qiling. |
| Migration xatosi | Logs’da `alembic upgrade head` natijasini ko‘ring; Shell’da qo‘lda bajaring. |
| CORS xatosi | `CORS_ORIGINS` da Vercel URL aniq, slashsiz. |
| Login 401 | Ustoz akkaunti bormi? Neon’da `select * from users;`. |
| Push yoqilmayapti | VAPID envlar, HTTPS, brauzer ruxsati; iPhone’da PWA o‘rnatilganmi? |
| Fayllar yo‘qoladi | Railway volume `/data` va `UPLOAD_DIR=/data/uploads`. |
| Railway free trial tugadi | Hobby tarifiga o‘ting yoki boshqa doimiy hosting. |
| 30 kunda almashtirish | Tavsiya etilmaydi: URL, CORS, PWA, fayllar va ma’lumotlar buziladi. |

---

## 15. Yakuniy tartib

```text
1. Railway project + backend root
2. Neon DATABASE_URL + envlar
3. Volume /data
4. Deploy + migration
5. Health tekshirish
6. Vercel VITE_API_URL = Railway URL
7. Vercel redeploy
8. Railway CORS/APP_URL = Vercel URL
9. Login + asosiy flowlar
10. VAPID + push test
11. PWA o‘rnatish (telefon)
12. Render’ni suspend qilish
```

Shu tartibda hech narsa buzilmaydi.
