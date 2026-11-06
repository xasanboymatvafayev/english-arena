# PWA va telefon bildirishnomalari

English Arena endi **PWA** (Progressive Web App) va **Web Push** bildirishnomalarini qo‘llab-quvvatlaydi.

---

## 1. PWA nima beradi?

- Sayt telefonga ilova sifatida o‘rnatiladi.
- Brauzer manzil satrisiz, mustaqil oynada ochiladi.
- Tezroq ishlaydi, asosiy qobiq oflayn keshlanadi.
- Push bildirishnomalar telefonga keladi.
- iOS 16.4+ da “Add to Home Screen” orqali ishlaydi.

PWA uchun HTTPS shart. Vercel va Railway HTTPS beradi.

---

## 2. PWA fayllari

| Fayl | Vazifasi |
|---|---|
| `frontend/public/manifest.webmanifest` | Ilova nomi, ikonkalar, ranglar, standalone rejim |
| `frontend/public/sw.js` | Service worker: offline qobiq + push |
| `frontend/public/icons/*` | 192/512/maskable/apple ikonkalar |
| `frontend/src/lib/push.ts` | Obuna bo‘lish, o‘chirish, test |
| `frontend/src/components/pwa/PushNotificationsButton.tsx` | Topbardagi qo‘ng‘iroq oynasi |
| `frontend/src/components/pwa/PwaInstallPrompt.tsx` | “Ilovani o‘rnatish” banneri |
| `frontend/src/components/layout/MobileNav.tsx` | Telefon uchun pastki navigatsiya |

Service worker faqat production buildda ro‘yxatdan o‘tadi (`import.meta.env.PROD`). Dev rejimda kesh muammosi bo‘lmaydi.

---

## 3. Telefonga o‘rnatish

### Android / Chrome

1. Saytni oching: `https://english-arena-3u43.vercel.app`
2. Pastda **“English Arena’ni telefonga o‘rnating”** banneri chiqadi.
3. **O‘rnatish** tugmasini bosing.
4. Yoki brauzer menyusi → **Install app / Add to Home screen**.

### iPhone / Safari

1. Safari’da saytni oching.
2. Pastdagi **Share** (ulashish) tugmasi.
3. **Add to Home Screen**.
4. **Add**.
5. Ekrandagi **English Arena** ikonkasini oching.

> iPhone’da push faqat iOS 16.4+ va **Home Screen’ga qo‘shilgan** ilovada ishlaydi. Safari ichida ochilgan saytda emas.

---

## 4. Push bildirishnomalar

### 4.1. VAPID kalitlarini yaratish

Backend papkasida:

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
python -m app.scripts.generate_vapid_keys
```

Natija:

```text
VAPID_PUBLIC_KEY=BD...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
```

`VAPID_SUBJECT` ga o‘zingizning emailingizni yozing.

> Private keyni hech kimga bermang, GitHubga yuklamang. Bir marta yaratib, backend environment’ga qo‘ying.

### 4.2. Backend environment

Railway yoki Render → backend → Environment:

```env
VAPID_PUBLIC_KEY=BD...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:sizning@emailingiz.com
```

Saqlang → qayta deploy.

### 4.3. Migration

Yangi `push_subscriptions` jadvali qo‘shildi:

```powershell
alembic upgrade head
```

`start.sh` buni deployda avtomatik bajaradi. Logs’da:

```text
Running upgrade 66fa59f2dd66 -> 261b75e7eadd
```

### 4.4. Yoqish

1. Saytga kiring.
2. Topbardagi **qo‘ng‘iroq** belgisini bosing.
3. **Bildirishnomalarni yoqish**.
4. Brauzer ruxsat so‘raydi → **Allow**.
5. **Test bildirishnoma yuborish** bilan tekshiring.

Test bildirishnoma kelmasa:
- HTTPS ekanini tekshiring;
- brauzer ruxsatini tekshiring;
- VAPID envlar deploy bo‘lganini tekshiring;
- iPhone’da PWA o‘rnatilganini tekshiring.

---

## 5. Qanday xabarlar keladi?

| Hodisa | Kimga |
|---|---|
| Yangi vazifa | Vazifa olgan o‘quvchilarga |
| Yangi e’lon | E’lon qilingan guruh o‘quvchilariga |
| Coin berildi / ayirildi | O‘quvchiga |
| Sovg‘a so‘rovi tasdiqlandi | O‘quvchiga |
| Sovg‘a so‘rovi rad etildi | O‘quvchiga (coin qaytarilgani bilan) |
| Yangi sovg‘a so‘rovi | Ustozga |
| Yangi kitob | Ustozning barcha o‘quvchilariga |
| Student of the Day | Tanlangan o‘quvchiga |

Bildirishnoma bosilganda tegishli sahifa ochiladi.

---

## 6. Texnik tafsilotlar

- Backend `pywebpush` + VAPID ishlatadi.
- Har bir qurilma `push_subscriptions` jadvalida saqlanadi.
- Muddati o‘tgan (404/410) obunalar avtomatik o‘chiriladi.
- `send_push_to_users()` fon vazifasida ishlaydi — asosiy API javobini sekinlashtirmaydi.
- Service worker `push` va `notificationclick` hodisalarini boshqaradi.
- Push yuborilmasa ham asosiy amal bajariladi (fail-safe).

---

## 7. Service worker yangilash

`frontend/public/sw.js` ichida:

```js
const CACHE = "english-arena-v1";
```

Katta frontend yangilanishidan keyin `v1` ni `v2` ga oshiring — eski kesh tozalanadi.

---

## 8. Cheklovlar

- iOS’da push faqat PWA rejimida.
- Brauzer ruxsati bloklansa, sayt sozlamalaridan qayta yoqish kerak.
- Ba’zi korporativ tarmoqlar push endpointlarni bloklashi mumkin.
- Render free’da servis uxlab qolsa, push yuborish uchun uyg‘onishi kerak bo‘ladi; Railway doimiyroq ishlaydi.
