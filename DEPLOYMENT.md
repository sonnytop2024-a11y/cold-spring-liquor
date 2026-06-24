# 🚀 Cold Spring Liquor — Deployment Guide

> Hướng dẫn từng bước để đưa website lên production.
> Dành cho người không rành kỹ thuật — chỉ cần làm theo thứ tự.

---

## 📋 Tổng quan — Cần tài khoản gì?

| Dịch vụ | Dùng để làm gì | Link đăng ký | Giá |
|---------|---------------|--------------|-----|
| **GitHub** | Lưu & quản lý code | github.com | Miễn phí |
| **Supabase** | Database + Auth + Storage | supabase.com | Miễn phí (500MB) |
| **Vercel** | Deploy website lên internet | vercel.com | Miễn phí |

---

## BƯỚC 1 — GitHub: Đưa code lên cloud

### 1.1 Tạo tài khoản GitHub
1. Vào **github.com** → Sign up
2. Xác nhận email

### 1.2 Tạo repository mới
1. Đăng nhập GitHub → nhấn nút **"+"** góc trên phải → **New repository**
2. Điền thông tin:
   - **Repository name:** `cold-spring-liquor`
   - **Description:** Cold Spring Liquor Delivery Platform
   - **Visibility:** Private ✅ (để bảo mật code)
   - **KHÔNG** tick "Add a README file"
3. Nhấn **Create repository**
4. Copy đường dẫn repo (dạng: `https://github.com/YOUR_USERNAME/cold-spring-liquor.git`)

### 1.3 Tạo .gitignore (quan trọng — bảo vệ secret keys)
Mở Terminal trong thư mục project, chạy:
```bash
cd "/Users/trungson/Cold Spring Liquor"
```

Tạo file `.gitignore` nếu chưa có:
```
node_modules/
.env.local
.env*.local
.next/
out/
*.log
/tmp/csl-mock-store.json
apps/web/public/uploads/products/*
!apps/web/public/uploads/products/.gitkeep
```

### 1.4 Push code lên GitHub
```bash
cd "/Users/trungson/Cold Spring Liquor"

# Khởi tạo git (nếu chưa có)
git init

# Kết nối với GitHub repo vừa tạo
git remote add origin https://github.com/YOUR_USERNAME/cold-spring-liquor.git

# Thêm tất cả file
git add .

# Commit
git commit -m "Initial commit - Cold Spring Liquor platform"

# Push lên GitHub
git push -u origin main
```

✅ **Kiểm tra:** Vào GitHub repo → thấy tất cả file code là thành công.

---

## BƯỚC 2 — Supabase: Tạo Database

### 2.1 Tạo tài khoản Supabase
1. Vào **supabase.com** → Start your project → Sign up with GitHub
2. Xác nhận email

### 2.2 Tạo project mới
1. Nhấn **"New Project"**
2. Điền thông tin:
   - **Name:** `cold-spring-liquor`
   - **Database Password:** Tạo mật khẩu mạnh → **LƯU LẠI mật khẩu này**
   - **Region:** US East (N. Virginia) — gần Texas nhất
3. Nhấn **Create new project** → đợi ~2 phút

### 2.3 Lấy API Keys
1. Vào **Project Settings** (icon bánh răng góc trái) → **API**
2. Copy các giá trị sau (sẽ cần ở bước sau):
   - **Project URL** → dán vào `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → dán vào `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret** key → dán vào `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **QUAN TRỌNG:** `service_role` key là SECRET — không bao giờ paste vào code hoặc GitHub.

### 2.4 Chạy Database Schema
1. Vào **SQL Editor** (icon database bên trái)
2. Nhấn **"New Query"**
3. Mở file `supabase/schema.sql` trong project
4. Copy toàn bộ nội dung → paste vào SQL Editor
5. Nhấn **Run** (hoặc Ctrl+Enter)
6. Thấy "Success" = hoàn tất

### 2.5 Setup Storage (lưu hình sản phẩm)
1. Vào **Storage** (icon folder bên trái)
2. Nhấn **"New bucket"**
3. Điền:
   - **Name:** `product-images`
   - **Public bucket:** ✅ BẬT (hình cần public để hiển thị)
4. Nhấn **Save**
5. Vào bucket vừa tạo → **Policies** → **New policy**:
   - Tạo policy "Public read": `SELECT` → For all users → **Review** → **Save**
   - Tạo policy "Admin upload": `INSERT` → Restricted → Expression: `is_admin()` → **Save**
   - Tạo policy "Admin delete": `DELETE` → Restricted → Expression: `is_admin()` → **Save**

### 2.6 Setup Authentication
1. Vào **Authentication** (icon người dùng) → **Providers**
2. **Email** provider: đã bật sẵn ✅
3. **Phone** (nếu muốn SMS thật):
   - Bật Phone provider ON
   - Kết nối Twilio (cần tài khoản Twilio riêng)
4. **Google** (nếu muốn Google login thật):
   - Vào Google Cloud Console → tạo OAuth credentials
   - Dán Client ID + Secret vào Supabase → Google provider

✅ **Kiểm tra:** Vào **Table Editor** → thấy các bảng `profiles`, `orders`, `products`, v.v.

---

## BƯỚC 3 — Vercel: Deploy Website

### 3.1 Tạo tài khoản Vercel
1. Vào **vercel.com** → Sign up with GitHub
2. Cấp quyền cho Vercel truy cập GitHub

### 3.2 Import project

> Project này có **3 app** — cần deploy riêng 3 lần:
> - **Web** (customer website) → domain chính
> - **Admin** (quản trị)
> - **Driver** (tài xế)

#### Deploy App Web (Customer Website):
1. Vercel dashboard → **"Add New"** → **Project**
2. Tìm repo `cold-spring-liquor` → **Import**
3. Cấu hình:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (tự detect)
   - **Build Command:** `cd ../.. && pnpm build --filter=web` (hoặc để mặc định)
4. **Environment Variables** — nhấn **Add** từng cái:
   ```
   NEXT_PUBLIC_SUPABASE_URL        = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY       = eyJhbGc...
   NEXT_PUBLIC_WEB_URL             = https://your-web-domain.vercel.app
   ```
5. Nhấn **Deploy** → đợi 2-3 phút

#### Deploy App Admin:
1. Vercel → **Add New** → **Project** → Import cùng repo
2. **Root Directory:** `apps/admin`
3. Thêm environment variables tương tự + thêm:
   ```
   NEXT_PUBLIC_WEB_URL = https://your-web-domain.vercel.app
   ```
4. **Deploy**

#### Deploy App Driver:
1. Tương tự → **Root Directory:** `apps/driver`
2. Thêm environment variables tương tự
3. **Deploy**

### 3.3 Cập nhật URLs sau khi deploy
Sau khi Vercel cấp domain, vào từng project → **Settings** → **Environment Variables** → cập nhật:
```
NEXT_PUBLIC_WEB_URL    = https://cold-spring-liquor.vercel.app
NEXT_PUBLIC_ADMIN_URL  = https://cold-spring-liquor-admin.vercel.app
NEXT_PUBLIC_DRIVER_URL = https://cold-spring-liquor-driver.vercel.app
```
Rồi redeploy.

✅ **Kiểm tra:** Click vào domain Vercel cấp → website load được = thành công.

---

## BƯỚC 4 — Auto Deploy (tự động deploy khi update code)

Vercel đã tự động kết nối với GitHub. Mỗi khi bạn push code mới:
```bash
git add .
git commit -m "Mô tả thay đổi"
git push
```
→ Vercel tự động build và deploy trong ~2 phút.

Xem trạng thái deploy tại: **vercel.com/dashboard**

---

## BƯỚC 5 — Kiểm tra sau khi deploy

### Checklist kiểm tra Website (Web app):
- [ ] Trang chủ load được
- [ ] Đăng ký tài khoản được
- [ ] Đăng nhập được
- [ ] Xem sản phẩm được
- [ ] Thêm vào giỏ hàng được
- [ ] Checkout đặt hàng được
- [ ] Xem lịch sử đơn hàng được

### Checklist Admin Panel:
- [ ] Đăng nhập Admin được
- [ ] Xem danh sách đơn hàng
- [ ] Xem sản phẩm, thêm sản phẩm mới
- [ ] Upload hình sản phẩm được
- [ ] Xem cài đặt Settings

### Checklist Driver App:
- [ ] Đăng nhập Driver được (marcus/1234)
- [ ] Xem danh sách đơn hàng
- [ ] Flow giao hàng: Accept → Head to Store → Pick Up → On the Way → Arrived
- [ ] Verification modal: DOB + Checkbox + Signature + Photo
- [ ] Complete Delivery được

---

## 🔧 Xử lý lỗi thường gặp

### Lỗi: "Invalid API key"
→ Kiểm tra Environment Variables trong Vercel — đảm bảo không có khoảng trắng thừa.

### Lỗi: "relation does not exist" (database)
→ Chạy lại file `supabase/schema.sql` trong Supabase SQL Editor.

### Lỗi: "CORS error" khi Admin gọi API
→ Vercel đã có cấu hình proxy trong `next.config.mjs`. Nếu vẫn lỗi, kiểm tra `NEXT_PUBLIC_WEB_URL` đã được set đúng chưa.

### Lỗi: Hình sản phẩm không hiện
→ Kiểm tra Supabase Storage bucket `product-images` đã set Public = ON chưa.

### Build thất bại trên Vercel
→ Chạy local trước:
```bash
cd "/Users/trungson/Cold Spring Liquor"
pnpm build
```
Sửa lỗi TypeScript/build trước khi push lên GitHub.

---

## 📁 Cấu trúc file quan trọng

```
Cold Spring Liquor/
├── apps/
│   ├── web/          → Customer website (port 3000)
│   │   ├── src/app/api/    → Tất cả API endpoints
│   │   └── public/uploads/ → Hình sản phẩm (local dev)
│   ├── admin/        → Admin panel (port 3001)
│   └── driver/       → Driver app (port 3002)
├── supabase/
│   └── schema.sql    → Database schema — chạy trên Supabase
├── .env.example      → Template environment variables
├── DEPLOYMENT.md     → File này
└── package.json      → Monorepo config
```

---

## 🔑 Tóm tắt: Những gì cần lưu lại

| Thứ cần lưu | Lấy ở đâu | Dùng để làm gì |
|------------|-----------|----------------|
| Supabase Project URL | Supabase → Settings → API | Kết nối database |
| Supabase Anon Key | Supabase → Settings → API | Frontend đọc data |
| Supabase Service Role Key | Supabase → Settings → API | Backend ghi data (SECRET) |
| Supabase DB Password | Khi tạo project | Backup database |
| GitHub repo URL | GitHub → repo của bạn | Vercel import |
| Vercel domain (Web) | Vercel → project web | URL website chính |
| Vercel domain (Admin) | Vercel → project admin | URL trang quản trị |
| Vercel domain (Driver) | Vercel → project driver | URL app tài xế |
