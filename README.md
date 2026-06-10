# Soyte v2 — Sở Y Tế Hà Nội

Monorepo rebuild cho cổng thông tin Sở Y Tế Hà Nội. Hệ thống mới chạy song song với hệ thống cũ, migration dần từng module.

## Tech Stack

| Layer | Cũ | Mới |
|---|---|---|
| Backend | Express 5 + Sequelize | **NestJS 11 + Prisma 6** |
| Database | PostgreSQL / MSSQL | PostgreSQL (shared DB) |
| Auth | JWT 7d | **JWT 15min + Refresh 30d (httpOnly cookie)** |
| Frontend | React 18 + useState | **React 18 + TanStack Query v5 + Zustand** |
| CSS | Tailwind CDN | **Tailwind CSS installed** |
| TypeScript | allowJs, no strict | **Strict mode** |

## Cấu Trúc

```
E:\SOYTE\
├── apps/
│   ├── api/          NestJS backend  (port 3001, /api/v2/*)
│   └── web/          React frontend  (port 5174)
└── packages/
    ├── shared-types/ TypeScript types dùng chung FE + BE
    └── shared-utils/ Utilities (date, permission)
```

## Quick Start

```bash
# Cài dependencies
pnpm install

# Chạy dev (cả api + web)
pnpm dev

# Chỉ backend
pnpm --filter @soyte/api dev

# Chỉ frontend
pnpm --filter @soyte/web dev
```

## Environment

Copy `.env.example` → `.env` và điền thông tin:

```bash
cp .env.example .env
```

Các biến quan trọng:
- `DATABASE_URL` — PostgreSQL connection string (DB cũ)
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — ít nhất 32 ký tự
- `ALLOWED_ORIGINS` — CORS whitelist

## Database Migration (Safe — Additive Only)

```bash
# Generate Prisma client từ schema
cd apps/api && npx prisma generate

# Chạy migration thêm columns mới (KHÔNG xóa gì cả)
psql -U admin -d suckhuoethudo_db -f prisma/migrations/20260604000001_add_new_columns_to_existing_tables.sql
```

## API Documentation

Swagger UI: http://localhost:3001/api/docs

## Chiến Lược Migration (Không phá hệ thống cũ)

```
Nginx / Reverse Proxy
├── /api/v1/*  →  Old backend  (Express, port 3000)  ← hệ thống cũ
└── /api/v2/*  →  New backend  (NestJS,  port 3001)  ← hệ thống mới

Frontend dùng env var để chọn:
  VITE_API_V2_MODULES=auth,users,posts  → modules đã migrate sang v2
```

## API Endpoints (v2)

| Module | Base path |
|---|---|
| Auth | `POST /api/v2/auth/login` |
| Users | `GET /api/v2/users` |
| Roles | `GET /api/v2/roles` |
| Permissions | `GET /api/v2/permissions` |
| Posts | `GET /api/v2/posts` |
| Banners | `GET /api/v2/banners` |
| Social Facilities | `GET /api/v2/social-facilities` |
| Affiliated Facilities | `GET /api/v2/affiliated-facilities` |
| Trading Facilities | `GET /api/v2/trading-facilities` |
| Work Schedules | `GET /api/v2/schedules` |
| Forms | `GET /api/v2/forms` |
| Feedbacks | `GET /api/v2/feedbacks` |
| Surveys | `GET /api/v2/surveys` |
| Datasets | `GET /api/v2/datasets` |

## Docker

```bash
# Production build
docker compose up --build

# Chỉ build images
docker compose build

# Với dev hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Cải Tiến So Với Hệ Thống Cũ

### Backend
- ✅ **Unified APIs** — Bỏ hoàn toàn `_new` endpoints (forms-new, feedbacks-new, surveys-new)
- ✅ **Permission cache** — In-memory TTL 5 phút, không merge lại mỗi request
- ✅ **Refresh token** — Access token 15min, Refresh 30d (httpOnly cookie)
- ✅ **O(1) duplicate check** — `facilityId` column thay vì load all feedbacks
- ✅ **Prisma** — Type-safe, migration rõ ràng
- ✅ **Pino logger** — Structured JSON logging
- ✅ **Swagger tự động** từ decorators

### Frontend
- ✅ **TanStack Query v5** — Cache 2 phút, auto-refetch, optimistic updates
- ✅ **Zustand** — Global auth state (persist localStorage)
- ✅ **Auto refresh token** — Axios interceptor tự động refresh khi 401
- ✅ **TypeScript strict** — Không `allowJs`, không `any` implicit
- ✅ **Tailwind installed** — Bundle nhỏ hơn (purge CSS), không CDN
- ✅ **Lazy routing** — Code splitting per page

## Folder Structure (API)

```
apps/api/src/
├── modules/
│   ├── auth/           Login, refresh token, logout
│   ├── users/          CRUD, role/permission assignment
│   ├── roles/          CRUD, assign permissions
│   ├── permissions/    CRUD, hierarchy
│   ├── posts/          CRUD, image upload
│   ├── banners/        CRUD, reorder
│   ├── facilities/     Social / Affiliated / Trading
│   ├── schedules/      Work schedules, approve/reject
│   ├── forms/          Unified form builder (bỏ _new)
│   ├── feedbacks/      Submit, stats, facility status
│   ├── surveys/        CRUD, facility management
│   └── datasets/       Dataset types + records
├── common/
│   ├── decorators/     @CurrentUser, @Public, @RequirePermissions
│   ├── guards/         JwtAuthGuard, PermissionGuard (với cache)
│   ├── interceptors/   TransformInterceptor (response format)
│   └── filters/        AllExceptionsFilter
└── prisma/             PrismaService (global module)
```
