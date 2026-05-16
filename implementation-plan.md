# Store Admin Portal — Implementation Plan

## Overview
A Next.js admin portal for WhatsApp Commerce store owners to manage products, categories, orders, customers, and view analytics.

---

## Phase 1 — Project Setup

### 1.1 Create Next.js App
- Create folder `store-admin` at project root
- Init with: `npx create-next-app@latest store-admin`
  - TypeScript: Yes
  - Tailwind CSS: Yes
  - App Router: Yes
  - ESLint: Yes
- Install additional dependencies:
  - `axios` — API calls to backend
  - `react-query` / `@tanstack/react-query` — server state management
  - `react-hook-form` + `zod` — form validation
  - `shadcn/ui` — component library (built on Radix UI + Tailwind)
  - `lucide-react` — icons
  - `recharts` — charts for analytics
  - `js-cookie` — JWT token storage

### 1.2 Folder Structure
```
store-admin/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Sidebar + header shell
│   │   ├── page.tsx           # Dashboard home (stats)
│   │   ├── orders/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── customers/
│   │   └── settings/
├── components/
│   ├── ui/                    # shadcn components
│   ├── layout/                # Sidebar, Header, Breadcrumb
│   └── shared/                # DataTable, StatusBadge, ConfirmDialog
├── lib/
│   ├── api.ts                 # Axios instance with JWT interceptors
│   └── utils.ts
├── hooks/                     # Custom React Query hooks
├── types/                     # TypeScript interfaces matching Prisma models
└── middleware.ts               # Next.js route protection
```

### 1.3 Environment Variables
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Phase 2 — Backend: Auth API (in backend-apis)

Before building the frontend, these backend routes need to be created:

### 2.1 Auth Routes (`/api/auth`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Email + password → JWT token |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Get current user info |

- Use `bcryptjs` to compare password
- Sign JWT with `JWT_SECRET` (already in `.env`)
- Return token + user + storeId on login

### 2.2 Auth Middleware
- Create `src/middleware/auth.js` in backend-apis
- Verify JWT on all protected routes
- Attach `req.user` and `req.storeId`

### 2.3 Admin Routes (`/api/admin`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/store` | Get store details |
| PUT | `/api/admin/store` | Update store settings |
| GET | `/api/admin/orders` | List orders (filter by status/date) |
| PUT | `/api/admin/orders/:id/status` | Update order status |
| GET | `/api/admin/products` | List products |
| POST | `/api/admin/products` | Create product |
| PUT | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Delete product |
| GET | `/api/admin/categories` | List categories |
| POST | `/api/admin/categories` | Create category |
| PUT | `/api/admin/categories/:id` | Update category |
| DELETE | `/api/admin/categories/:id` | Delete category |
| GET | `/api/admin/customers` | List customers |
| GET | `/api/admin/stats` | Daily/weekly stats |

---

## Phase 3 — Frontend: Authentication

### 3.1 Login Page (`/login`)
- Email + password form
- Calls `POST /api/auth/login`
- Stores JWT in httpOnly cookie via Next.js middleware
- Redirects to dashboard on success

### 3.2 Route Protection (middleware.ts)
- Intercept all `/dashboard/*` routes
- Redirect to `/login` if no valid JWT cookie
- Attach token to all API requests via Axios interceptor

---

## Phase 4 — Frontend: Dashboard Shell

### 4.1 Layout
- Sidebar with navigation links
- Top header with store name, user avatar, logout
- Responsive (collapsible sidebar on mobile)

### 4.2 Sidebar Navigation Items
- Dashboard (stats overview)
- Orders
- Products
- Categories
- Customers
- Settings

---

## Phase 5 — Frontend: Pages

### 5.1 Dashboard (Stats Overview)
- Today's orders count
- Today's revenue
- Pending orders count
- Total customers
- Orders by status (pie/bar chart)
- Recent orders table (last 10)

### 5.2 Orders Page
- Table: order number, customer, amount, status, payment, date
- Filter by: status, payment method, date range
- Click order → order detail modal/page
  - Customer info, items list, delivery address
  - Update order status dropdown (NEW → CONFIRMED → PROCESSING → OUT_FOR_DELIVERY → DELIVERED)

### 5.3 Products Page
- Table: image, name, category, price, stock status, active toggle
- Add / Edit product form:
  - Name, description, price, unit
  - Category dropdown
  - Image upload (Cloudinary)
  - In stock toggle
- Delete product with confirm dialog

### 5.4 Categories Page
- Table: name, sort order, active toggle, product count
- Add / Edit category form
- Delete category

### 5.5 Customers Page
- Table: name, phone, total orders, last order date
- Click customer → view order history

### 5.6 Settings Page
- Store name, address, logo
- Min order amount, delivery radius
- WhatsApp Phone Number ID (read-only)
- Update webhook verify token

---

## Phase 6 — Polish & Production Readiness

- Loading skeletons for all data tables
- Error boundaries and toast notifications
- Empty state illustrations
- Mobile responsive layouts
- Environment configs for production (`NEXT_PUBLIC_API_URL`)

---

## Build Order Summary

| Step | What | Where |
|------|------|-------|
| 1 | Create Next.js project | `store-admin/` |
| 2 | Build auth API + middleware | `backend-apis/` |
| 3 | Login page + route protection | `store-admin/` |
| 4 | Dashboard shell + sidebar | `store-admin/` |
| 5 | Stats / Dashboard page | `store-admin/` |
| 6 | Orders page + status update | `store-admin/` |
| 7 | Products CRUD | `store-admin/` |
| 8 | Categories CRUD | `store-admin/` |
| 9 | Customers page | `store-admin/` |
| 10 | Settings page | `store-admin/` |
