# Incentive Campaigns WebApp - Project Structure

## Implemented Next.js App Router Structure

```
robsolwebapp/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Login page (Suspense-wrapped)
│   │   │   ├── register/
│   │   │   │   └── page.tsx          # Registration page
│   │   │   └── layout.tsx            # Auth layout (centered cards)
│   │   │
│   │   ├── (user)/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx          # User dashboard (stats, quick actions)
│   │   │   │   └── scan/
│   │   │   │       └── page.tsx      # Receipt scanner (GPT-4o-mini OCR)
│   │   │   └── layout.tsx            # User layout
│   │   │
│   │   ├── (admin)/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx          # → DashboardOverview
│   │   │   │   ├── campaigns/
│   │   │   │   │   ├── page.tsx      # → CampaignList
│   │   │   │   │   └── new/
│   │   │   │   │       └── page.tsx  # → CampaignForm
│   │   │   │   ├── coupons/
│   │   │   │   │   └── page.tsx      # → CouponModeration
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx      # → UserManagementTable
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx      # → AnalyticsDashboard
│   │   │   └── layout.tsx            # Admin layout (sidebar + content area)
│   │   │
│   │   ├── actions/
│   │   │   └── scanCoupon.ts         # Server Action: GPT-4o-mini receipt OCR
│   │   │
│   │   ├── api/
│   │   │   ├── campaigns/
│   │   │   │   ├── route.ts          # GET (list) + POST (create)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # GET + PATCH + DELETE
│   │   │   └── coupons/
│   │   │       ├── route.ts          # GET (list with filters) + POST (submit)
│   │   │       └── [id]/
│   │   │           └── route.ts      # PATCH (approve/reject + award points)
│   │   │
│   │   ├── layout.tsx                # Root layout (Geist fonts, metadata)
│   │   ├── page.tsx                  # Root redirect (role-based → /admin or /dashboard)
│   │   └── globals.css               # Tailwind v4 config + brand palette
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminSidebar.tsx      # Fixed sidebar with nav (Dashboard, Campaigns, Coupons, Users, Analytics)
│   │   │   ├── AdminHeader.tsx       # Sticky header with title, subtitle, user info, sign out
│   │   │   ├── DashboardOverview.tsx # Live stats cards, hero banner, quick action grid
│   │   │   ├── CampaignList.tsx      # Campaign listing with toggle active, delete, keywords display
│   │   │   ├── CampaignForm.tsx      # Create campaign form (title, dates, keywords, banner upload)
│   │   │   ├── CouponModeration.tsx  # Filter tabs, coupon cards, review modal (photo + AI data side-by-side)
│   │   │   ├── UserManagementTable.tsx # Users table with avatar, role badge, points
│   │   │   └── AnalyticsDashboard.tsx  # Stats cards + coupon status breakdown bars
│   │   └── shared/
│   │       └── LoadingSpinner.tsx     # Reusable spinner (size, color, fullScreen props)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client (createBrowserClient from @supabase/ssr)
│   │   │   └── server.ts             # Server client (createServerClient with cookies)
│   │   ├── hooks/
│   │   │   └── useAuth.ts            # Auth hook (signIn, signUp, signOut, profile, isAdmin)
│   │   └── storage/
│   │       └── imageStorage.ts       # Upload helpers for campaigns + coupons bucket
│   │
│   ├── types/
│   │   ├── database.types.ts         # Supabase generated types
│   │   ├── campaign.ts               # Campaign interface (includes keywords: string[])
│   │   ├── coupon.ts                 # Coupon, CouponItem, ExtractedData, CouponWithRelations
│   │   └── user.ts                   # Profile interface (role: 'admin' | 'user')
│   │
│   └── middleware.ts                 # Route protection (admin/dashboard/login/register)
│
├── .env.local                        # Supabase URL + Anon Key + OpenAI API Key
├── supabase-schema.sql               # Database schema reference
├── package.json
├── tsconfig.json
└── PROJECT_STRUCTURE.md
```

## Architecture

### Route Groups

| Group      | URL Prefix    | Auth Required | Role     |
|-----------|---------------|---------------|----------|
| `(auth)`  | `/login`, `/register` | No | — |
| `(user)`  | `/dashboard/*` | Yes | Any |
| `(admin)` | `/admin/*`     | Yes | Admin |

### Component-Based Architecture

All admin pages are **thin wrappers** that import dedicated components from `src/components/admin/`:

```
page.tsx (5 lines) → Component.tsx (full logic + UI)
```

This separation keeps route files minimal and all business logic in reusable, testable components.

### Layout Hierarchy

```
Root Layout (app/layout.tsx) — Geist fonts, global metadata
├── Auth Layout — Centered card container
├── User Layout — Standard page layout
└── Admin Layout — Fixed sidebar (w-64) + content area (ml-64)
    ├── AdminSidebar — Navigation links
    └── AdminHeader — Sticky top bar per page
```

### Key Integrations

- **Supabase Auth** — Email/password via `@supabase/ssr` (not deprecated auth-helpers)
- **Supabase Storage** — `incentive-campaigns` bucket for banners + receipt images
- **Supabase RLS** — Simple policies using `auth.uid()` only (avoids recursive admin checks)
- **OpenAI GPT-4o-mini** — Server Action receipt OCR with keyword matching
- **Middleware** — Route protection with role-based redirects

### Routes Summary

| Route | Page | Component |
|-------|------|-----------|
| `/` | Root redirect | — |
| `/login` | Login form | — |
| `/register` | Register form | — |
| `/dashboard` | User dashboard | — |
| `/dashboard/scan` | Receipt scanner | — |
| `/admin` | Admin dashboard | `DashboardOverview` |
| `/admin/campaigns` | Campaign list | `CampaignList` |
| `/admin/campaigns/new` | Create campaign | `CampaignForm` |
| `/admin/coupons` | Coupon moderation | `CouponModeration` |
| `/admin/users` | User management | `UserManagementTable` |
| `/admin/analytics` | Analytics | `AnalyticsDashboard` |
