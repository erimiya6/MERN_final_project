# SST Lost & Found — Full-Stack Web Application

An enterprise-grade, secure, modern full-stack campus property recovery network built for **SST (School of Science and Technology)**. 

Upgraded from a client-side LocalStorage prototype into a production-ready MERN application with anti-fraud ownership verification, role-based moderation, real-time WebSocket notifications, and an automated legacy data migration pipeline.

---

## 🌟 Key Features

* **Dual Reporting Modes:**
  * **Report Lost:** Post lost property with approximate date/time, category, campus landmark, and secret identifying characteristics.
  * **Report Found:** Post discovered items to assist fellow students and faculty.
* **Anti-Fraud Ownership Verification Workflow:**
  * Reporters can store secret identifying details (e.g. serial numbers, hidden stickers, wallpaper, inside pocket items) **concealed from public view**.
  * Claimants must submit private proof of ownership. Finders and campus administrators evaluate answers against hidden details before approving physical handover.
* **Collegiate UI/UX Design System:**
  * Modern Tailwind CSS aesthetic with collegiate navy (`#1E3A8A`), vibrant status badges, responsive mobile drawer, and glassmorphism cards.
  * Shimmer skeleton loaders and accessible empty states.
* **Smart Search & Multi-Criteria Filtering:**
  * Real-time search across title, description, building, and room.
  * Combined filters for report type (*Lost*, *Found*), status (*Active*, *Pending Claim*, *Resolved*), category, and campus zones (*Library, Hostels, Sports Complex, Central Hub*).
* **Real-Time Notification Engine (Socket.IO):**
  * Instant in-app alerts when a claim is submitted, approved, or rejected.
  * Community broadcast feed when new items are reported.
* **Role-Based Access Control (RBAC):**
  * `user` (Students/Faculty): Report items, track claims, manage profile, import legacy reports.
  * `moderator` / `admin` (Campus Security & Staff): Platform metrics, user role management, account suspension, moderation queue for flagged content, and immutable security audit logs.
* **Legacy LocalStorage Migration Assistant:**
  * Built-in browser tool that scans legacy `localStorage` keys (`sst_lost_found_items`), previews old items, and imports them to the user's cloud account with 1-click.

---

## 🛠 Technology Stack

### Frontend (`client/`)
* **React 18** with **Vite**
* **Tailwind CSS 3.4** for custom campus styling
* **React Router v6** with protected and role-based route guards
* **Axios** with credentials and unified error interceptors
* **React Hook Form** for validated forms
* **Lucide React** for icons
* **Socket.IO Client** for real-time WebSocket communication

### Backend (`server/`)
* **Node.js** & **Express.js** (Modular REST API)
* **MongoDB** with **Mongoose ODM** (compound text indexes & pre/post hooks)
* **JWT Authentication** stored in HTTP-only, `SameSite=lax` secure cookies
* **bcryptjs** (12 salt rounds) for password hashing
* **Multer** + **Cloudinary** SDK (with local disk storage fallback)
* **Socket.IO Server** for authenticated WebSocket events
* **Helmet**, **express-mongo-sanitize**, and **express-rate-limit** for application security
* **Jest** & **Supertest** for automated integration testing

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18 or higher)
* **MongoDB** running locally or a **MongoDB Atlas** connection string

### 1. Installation
Clone the repository and install all dependencies:

```bash
# Clone repository
git clone <repo-url>
cd MERN_final_project

# Install root, backend, and frontend dependencies
npm --prefix server install
npm --prefix client install
```

### 2. Environment Configuration
Create your backend `.env` file in `server/.env`:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/sst_lost_found
JWT_SECRET=super_secret_jwt_key_sst_lost_and_found_2026_secure
JWT_EXPIRES_IN=7d
COOKIE_EXPIRES_DAYS=7
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Optional: Restrict registration to institutional email domain (e.g. sst.scaler.com)
COLLEGE_EMAIL_DOMAIN=

# Optional: Cloudinary (falls back to local filesystem in server/uploads/ if empty)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 3. Seed Realistic Campus Data
Populate the database with test accounts, campus items, sample claims, and notifications:

```bash
npm run seed
```

**Pre-seeded Demo Accounts:**
| Role | Email | Password | Purpose |
|---|---|---|---|
| **Admin** | `admin@sst.scaler.com` | `password123` | Security & moderation console, user management |
| **Student** | `arjun@sst.scaler.com` | `password123` | Reporter of Lost Dell Laptop & AirPods |
| **Student** | `priya@sst.scaler.com` | `password123` | Finder of Fossil Wallet |
| **Student** | `rohit@sst.scaler.com` | `password123` | Claimant with active pending claim |

*(Note: The login page also features 1-click demo login buttons for rapid testing.)*

### 4. Running Locally
Run both backend and frontend concurrently:

```bash
# Start backend API (runs on port 5001 with nodemon)
npm run server

# In a separate terminal, start frontend client (runs on port 5173)
npm run client
```

Open your browser at **`http://localhost:5173`**.

---

## 🧪 Automated Testing

Execute the comprehensive Jest and Supertest test suite:

```bash
npm run test:server
```

**Test Coverage Highlights:**
* Health & Discovery checks (`GET /api/health`, `GET /api/items/stats`)
* Registration, duplicate prevention, and invalid credential rejection
* Profile verification with Bearer tokens and HTTP-only cookies
* Item creation, update authorization, and private identifying info protection
* Content moderation flag recording

---

## 📡 REST API Endpoint Reference

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Register student or staff account
* `POST /api/auth/login` — Sign in and receive secure HTTP-only cookie
* `POST /api/auth/logout` — Clear session cookie
* `GET /api/auth/me` — Get authenticated user details
* `PUT /api/auth/profile` — Update name, phone, student ID, and contact preferences
* `POST /api/auth/forgot-password` — Request password reset token
* `PUT /api/auth/reset-password/:token` — Set new password with valid token

### Items (`/api/items`)
* `GET /api/items` — Query items with search, category, status, zone, and pagination
* `GET /api/items/stats` — Summary metrics (total, lost, found, resolved, recovery rate)
* `GET /api/items/recent` — Top 6 recent items for landing page
* `GET /api/items/my-reports` — Authenticated user's reports
* `GET /api/items/:id` — Full details (strips secret identifiers for non-owners)
* `POST /api/items` — Create report with optional photo upload
* `PUT /api/items/:id` — Update report (ownership enforced)
* `DELETE /api/items/:id` — Delete report (ownership enforced)
* `PATCH /api/items/:id/status` — Mark item as resolved or change status
* `POST /api/items/:id/flag` — Report inappropriate content
* `POST /api/items/migrate-legacy` — Batch import legacy LocalStorage items

### Claims (`/api/claims`)
* `POST /api/claims` — Submit claim with proof of ownership
* `GET /api/claims/my-claims` — Get claims submitted by logged-in user
* `GET /api/claims/item/:itemId` — Reporter reviews claims on their item
* `PATCH /api/claims/:id/review` — Approve or reject claim with notes

### Administration (`/api/admin`)
* `GET /api/admin/stats` — Platform KPIs and category volume breakdown
* `GET /api/admin/users` — Paginated user directory with role & status filters
* `PATCH /api/admin/users/:id/role` — Update role (`user`, `moderator`, `admin`)
* `PATCH /api/admin/users/:id/status` — Suspend or activate account
* `GET /api/admin/moderation` — Moderation queue of flagged listings
* `PATCH /api/admin/items/:id/dismiss-flags` — Dismiss flags on an item
* `DELETE /api/admin/items/:id` — Permanently delete violating listing
* `GET /api/admin/audit-logs` — Immutable audit trail of system events

---

## 🔒 Security Best Practices

1. **HTTP-Only Cookies:** JWT tokens are stored in `HttpOnly`, `SameSite=Lax` cookies, protecting against JavaScript token theft (XSS).
2. **IDOR & Ownership Verification:** Write operations (`PUT`, `DELETE`, `PATCH`) strictly verify that `item.reporter === req.user._id` before permitting modifications.
3. **Information Disclosure Prevention:** Secret identifying characteristics (`privateIdentifyingInfo`) and direct phone numbers are stripped from public API responses unless authorized.
4. **NoSQL Injection Defense:** `express-mongo-sanitize` strips `$` and `.` operators from request payloads.
5. **Secure Headers & Rate Limiting:** `helmet` sets strict HTTP headers, and sensitive endpoints are protected by `express-rate-limit`.

---

## 🚢 Production Deployment

* **Frontend:** Build optimized static bundle with `npm run build:client` and deploy to Vercel, Netlify, or AWS S3.
* **Backend:** Deploy to Render, Railway, or Fly.io with Node.js 18+ runtime.
* **Database:** Connect to MongoDB Atlas M0 (Free Tier) cluster by setting `MONGO_URI`.
* **Media:** Add Cloudinary free tier credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) for automatic WebP image optimization and worldwide CDN distribution.
