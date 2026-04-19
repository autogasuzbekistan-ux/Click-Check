# Click-Check Bot

Telegram guruhlar uchun chek nazorat boti. Chek rasmini OCR orqali o'qiydi, summani ajratadi va Google Sheets ga avtomatik yozadi.

## Tezkor Boshlash

### 1. Muhit o'zgaruvchilari

```bash
cp .env.example .env
```

`.env` faylini to'ldiring:

| O'zgaruvchi | Ta'rif |
|---|---|
| `BOT_TOKEN` | @BotFather dan olingan token |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account JSON fayli yo'li |
| `SPREADSHEET_ID` | Google Sheets URL dagi ID |
| `ADMIN_IDS` | Admin Telegram user ID lari (vergul bilan) |

### 2. Google Cloud sozlash

1. [Google Cloud Console](https://console.cloud.google.com/) da project yarating
2. **Cloud Vision API** va **Google Sheets API** larni yoqing
3. Service Account yarating → JSON kalitini yuklab oling
4. JSON faylni `credentials/service-account.json` ga joylashtiring
5. Google Sheets ni service account emailiga **Muharrir** sifatida ulashing

### 3. Telegram Bot sozlash

1. @BotFather → `/newbot` → token oling
2. @BotFather → `/setprivacy` → **Disable** (guruh xabarlarini o'qishi uchun)
3. Botni guruhga qo'shing va **admin** qiling

### 4. O'rnatish va ishga tushirish

```bash
npm install
npm start
```

Rivojlantirish uchun:
```bash
npm run dev
```

---

## Buyruqlar

| Buyruq | Ta'rif | Ruxsat |
|---|---|---|
| `/start` | Boshlash | Hammaga |
| `/hisob <summa>` | Summani qo'lda kiritish | Hammaga |
| `/hisobot` | Jami summa | Operator, Admin |
| `/kunlik` | Bugungi summa | Operator, Admin |
| `/rol @user <rol>` | Rol o'zgartirish | Admin |

---

## Ish Tartibi

```
User → Chek rasm yuboradi
  ↓
Bot → Eng yuqori sifatli versiyani oladi
  ↓
Google Vision API → OCR (TEXT_DETECTION)
  ↓
Summa ajratish → TOTAL / JAMI / SUMMA / ИТОГ
  ↓
Bot → "Topildi: 125,000 so'm. Tasdiqlaysizmi?"
       [✅ Ha] [❌ Yo'q]
  ↓
Ha → Google Sheets ga yoziladi
Yo'q → /hisob <summa> bilan qo'lda kiritiladi
```

---

## Google Sheets Strukturasi

### `Cheklar` varag'i

| Sana | User | Summa | Turi | Guruh |
|---|---|---|---|---|
| 19.04.2026, 14:30 | @johndoe | 125000 | chek | -100123456 |

### `Users` varag'i

| user_id | username | name | group_id | role | created_at |
|---|---|---|---|---|---|
| 123456 | johndoe | John Doe | -100123456 | user | ... |

---

## Rol Tizimi

- **user** — chek yuboradi, o'z chekini tasdiqlaydi
- **operator** — barcha chekni tasdiqlaydi, hisobotlarni ko'radi
- **admin** — to'liq huquq + rol boshqaruvi

Admin ID larni `.env` → `ADMIN_IDS` ga kiriting.
Operator tayinlash: `/rol @username operator` (admin reply qilishi kerak)
