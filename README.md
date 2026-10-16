# Portal Mutu — Komplain & Klaim

Dua proyek terpisah:

- `backend/`  — NestJS + Prisma + PostgreSQL (REST API, JWT, RBAC, export Excel)
- `frontend/` — Next.js 14 (App Router) + Tailwind CSS + Recharts

## Menjalankan

### 1. Backend
```bash
cd backend
cp .env.example .env          # isi DATABASE_URL & JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run prisma:seed           # akun contoh, customer, produk
npm run start:dev             # http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

## Akun seed (kata sandi: `password123`)
| Email | Peran |
|---|---|
| qc.staff@perusahaan.co.id | QC Staff — Prepared |
| qc.spv@perusahaan.co.id | QC Supervisor — Checked |
| manager@perusahaan.co.id | Manager — Approved |
| marketing@perusahaan.co.id | Marketing |
| produksi@perusahaan.co.id | Produksi |
| admin@perusahaan.co.id | Admin (semua hak akses) |

## Alur persetujuan komplain
Draft → **Prepared** (QC Staff) → **Checked** (QC Supervisor) → **Approved** (Manager).
Supervisor/Manager dapat menolak (kembali ke Draft + catatan). Kasus bisa ditutup (Closed) setelah Approved.

## Endpoint utama
`POST /auth/login` · `GET/POST /complaints` · `POST /complaints/:id/{prepare|check|approve|reject|close}` ·
`GET /complaints/export?year=&month=` · `GET/POST /claims` · `PATCH /claims/:id/status` · `GET /dashboard?year=` · `GET /master/{customers,products,users}`

## Langkah berikutnya
1. Sesuaikan kolom `Complaint` / `Claim` di `backend/prisma/schema.prisma` dengan file Excel `RESUME COMPLAINT` dan `Data Base Claim`.
2. Tulis skrip impor data historis (xlsx → Prisma) untuk uji akurasi.
3. Pindahkan token dari localStorage ke cookie httpOnly sebelum produksi; tambahkan manajemen pengguna (CRUD) untuk Admin.
