# EmailJS sozlash — taklif xatlari

English Arena o'quvchi taklifini **EmailJS** orqali yuboradi. Xat serverdan (FastAPI) yuboriladi, shuning uchun EmailJS kalitlari frontendga tushmaydi.

---

## 1. EmailJS hisobi

1. https://www.emailjs.com → **Sign Up**.
2. Email manzilingizni tasdiqlang.
3. Dashboard → **Email Services** → **Add New Service**.
4. **Gmail** (yoki boshqa SMTP) ni tanlang.
5. Gmail uchun `Connect Account` → ruxsat bering.
6. Service yaratilgach **Service ID** ni nusxalang:

```text
service_ab12cd3
```

> Gmail "App password" talab qilsa, Google akkauntida 2 bosqichli autentifikatsiyani yoqib, App Password yarating va uni EmailJS SMTP paroli sifatida kiriting.

---

## 2. Email template yaratish

1. **Email Templates** → **New Template**.
2. Template nomi: `English Arena — taklif`.
3. **Template ID** ni nusxalang:

```text
template_xy45zw6
```

### 2.1. Template maydonlari

**To Email:**

```text
{{to_email}}
```

**To Name:**

```text
{{to_name}}
```

**From Name:**

```text
English Arena
```

**Subject:**

```text
{{app_name}} — {{group_name}} guruhiga taklif
```

**Reply To:** o'z emailingiz (masalan `ustoz@example.com`).

### 2.2. HTML shablon (professional dizayn)

Template muharririda **HTML** rejimiga o'tib, quyidagini joylashtiring. Bu inline CSS bilan yozilgan — Gmail, Outlook va telefonlarda yaxshi ko'rinadi.

```html
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{app_name}} — taklif</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4fa;font-family:Arial,Helvetica,sans-serif;color:#1b2138;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e8f2;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#171c36 0%,#2a1f63 60%,#4b3fd6 100%);padding:36px 36px 30px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;background:linear-gradient(135deg,#8b7cff,#5b4ae0);border-radius:12px;color:#ffffff;font-size:22px;font-weight:bold;">A</div>
                    <div style="color:#ffffff;font-size:18px;font-weight:bold;margin-top:14px;letter-spacing:-0.3px;">{{app_name}}</div>
                    <div style="color:#b9b4ff;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Learn · Compete · Grow</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#6d5ef5;">Sizni taklif qilishdi</p>
              <h1 style="margin:0 0 14px 0;font-size:26px;line-height:1.25;color:#111528;">Salom, {{to_name}}!</h1>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#5a6478;">
                <strong style="color:#111528;">{{teacher_name}}</strong> sizni
                <strong style="color:#111528;">{{group_name}}</strong> guruhiga
                <strong style="color:#111528;">{{app_name}}</strong> platformasida taklif qildi.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6fb;border:1px solid #e5e8f2;border-radius:14px;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8a93a8;margin-bottom:4px;">Guruh</div>
                    <div style="font-size:16px;font-weight:bold;color:#111528;">{{group_name}}</div>
                    <div style="font-size:12px;color:#8a93a8;margin-top:10px;">Ustoz: {{teacher_name}}</div>
                    <div style="font-size:12px;color:#8a93a8;margin-top:2px;">Havola amal qiladi: {{expires_at}} gacha</div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px auto;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#7c6cff,#5b4ae0);border-radius:12px;">
                    <a href="{{invite_link}}" style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">
                      Akkaunt yaratish →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#8a93a8;text-align:center;">
                Tugma ishlamasa, quyidagi havolani brauzerga nusxalang:
              </p>
              <p style="margin:0 0 24px 0;font-size:11px;line-height:1.5;color:#6d5ef5;word-break:break-all;text-align:center;">
                <a href="{{invite_link}}" style="color:#6d5ef5;">{{invite_link}}</a>
              </p>

              <div style="border-top:1px solid #eef0f7;padding-top:18px;">
                <p style="margin:0 0 6px 0;font-size:12px;line-height:1.7;color:#8a93a8;">
                  <strong style="color:#5a6478;">Nima qilish kerak?</strong> Havolani oching, login va parol yarating — ism, familiya va email taklifdan avtomatik olinadi.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.7;color:#8a93a8;">
                  Havola <strong>bir martalik</strong> va <strong>{{expires_at}}</strong> gacha amal qiladi. Agar taklif sizga tegishli bo'lmasa, xatni e'tiborsiz qoldiring.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0f1424;padding:22px 36px;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#8d99b7;text-align:center;">
                {{app_name}} · Ingliz tilini arena darajasida o'rganing<br />
                Bu xat avtomatik yuborilgan. Javob yozish shart emas.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### 2.3. Ishlatiladigan o'zgaruvchilar

Backend quyidagi `template_params` ni yuboradi:

| O'zgaruvchi | Ma'nosi | Misol |
|---|---|---|
| `{{to_email}}` | O'quvchi emaili | `madina@example.com` |
| `{{to_name}}` | O'quvchi ismi | `Madina` |
| `{{teacher_name}}` | Ustoz F.I.Sh. | `Aziz Karimov` |
| `{{group_name}}` | Guruh nomi | `Pre-Intermediate Group` |
| `{{invite_link}}` | Bir martalik havola | `https://arena.uz/register?token=...` |
| `{{expires_at}}` | Amal qilish muddati | `12.11.2026 18:30` |
| `{{app_name}}` | Platforma nomi | `English Arena` |

> `{{to_name}}` ga to'liq ism-familiya yuboriladi. Agar "Familiya" alohida kerak bo'lsa, `template_params` ga qo'shimcha maydon qo'shib, backenddagi `app/services/emailjs.py` ni kengaytiring.

---

## 3. Kalitlarni olish

EmailJS dashboard:

1. **Account → General → API Keys**:
   - **Public Key** — `user_id` sifatida ishlatiladi.
2. **Account → Security → Private Key**:
   - **Private Key** — server-side so'rovlar uchun. `accessToken` sifatida yuboriladi.

Backend `.env`:

```env
EMAILJS_SERVICE_ID=service_ab12cd3
EMAILJS_TEMPLATE_ID=template_xy45zw6
EMAILJS_PUBLIC_KEY=public_key_here
EMAILJS_PRIVATE_KEY=private_key_here
EMAILJS_API_URL=https://api.emailjs.com/api/v1.0/email/send
```

> Public key brauzerda ko'rinishi mumkin bo'lgan kalit, lekin bu loyihada u ham faqat backendda saqlanadi. Private keyni **hech qachon** frontendga yoki GitHubga qo'ymang.

---

## 4. EmailJS sozlamalarini tekshirish

### 4.1. Backend holati

Backendni qayta ishga tushiring:

```powershell
cd C:\Projects\english-arena\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Agar `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` dan biri bo'sh bo'lsa, taklif yaratiladi, lekin email yuborilmaydi va ustoz panelida havola ko'rsatiladi.

### 4.2. To'g'ridan-to'g'ri API test (PowerShell)

```powershell
$body = @{
  service_id  = "service_ab12cd3"
  template_id = "template_xy45zw6"
  user_id     = "PUBLIC_KEY"
  accessToken = "PRIVATE_KEY"
  template_params = @{
    to_email    = "sizning_emailingiz@gmail.com"
    to_name     = "Test"
    teacher_name = "Aziz Karimov"
    group_name  = "Beginner Group"
    invite_link = "https://example.com/register?token=test"
    expires_at  = "12.11.2026 18:30"
    app_name    = "English Arena"
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "https://api.emailjs.com/api/v1.0/email/send" `
  -Method Post -ContentType "application/json" -Body $body
```

Muvaffaqiyatli javob: `200 OK` (ba'zan bo'sh matn).

### 4.3. Ilova orqali test

1. Ustoz paneli → **Takliflar** → **Yangi taklif**.
2. Guruh, ism, email kiriting.
3. Yuboring.
4. Natija oynasida:
   - ✅ **Email yuborildi** — hammasi joyida.
   - ⚠️ **Email yuborilmadi** — xatolik matni va havola ko'rsatiladi. Havolani qo'lda nusxalab yuborishingiz mumkin.
5. Email kelmasa: Spam papkasini, EmailJS **Activity → Email History** bo'limini tekshiring.

---

## 5. Tez-tez uchraydigan EmailJS xatolari

| Xato | Sabab | Yechim |
|---|---|---|
| `412 Precondition Failed` | `to_email` yoki `template_id` noto'g'ri; "To Email" maydoni `{{to_email}}` emas | Template sozlamalarini tekshiring |
| `401 Unauthorized` | Public/Private key noto'g'ri | Kalitlarni qayta nusxalang |
| `403 Forbidden` | EmailJS "non-browser applications" ruxsati yopiq | Account → Security → ruxsat bering yoki private key ishlating |
| Email ketdi, lekin havola noto'g'ri | `APP_URL` production domeniga teng emas | Railway `APP_URL` ni yangilang |
| Email spamda | Gmail SMTP yangi; domen reputatsiyasi yo'q | SPF/DKIM sozlang yoki professional SMTP ulang |
| `quota exceeded` | Free plan limiti tugadi | EmailJS tarifni oshiring yoki boshqa service ulang |
| Xat dizayni buzilgan | Templateda `{{...}}` o'rniga noto'g'ri nom | 2.3 jadvalidagi nomlarni aynan ishlating |

---

## 6. Xavfsizlik

- EmailJS Private Key faqat backend `.env` / Railway Variables da.
- Frontendda `EMAILJS_*` o'zgaruvchilari **yo'q** — `VITE_` prefiksi bilan yozmang.
- Taklif tokeni bazada faqat SHA-256 hash ko'rinishida saqlanadi; xatdagi havola bir marta ishlaydi.
- Taklif 7 kundan keyin avtomatik kuchini yo'qotadi.
- Bir emailga bir vaqtda faqat bitta kutilayotgan taklif yuboriladi.
- Email manzili taklif yaratilganda qat'iy belgilanadi; ro'yxatdan o'tishda boshqa email kiritish imkoni yo'q.

---

## 7. Email matnini o'zgartirish

Matnni o'zgartirish uchun EmailJS dashboarddagi templateni tahrirlang — kodni qayta deploy qilish shart emas. Faqat o'zgaruvchi nomlarini (`{{...}}`) saqlab qoling.

Agar yangi o'zgaruvchi qo'shmoqchi bo'lsangiz:

1. `backend/app/services/emailjs.py` → `template_params` ga maydon qo'shing.
2. EmailJS templateda `{{yangi_maydon}}` ishlating.
3. Backendni qayta deploy qiling.
