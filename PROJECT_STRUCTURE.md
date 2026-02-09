# Incentive Campaigns WebApp - Project Structure

## Recommended Next.js App Router Folder Structure

```
robsolwebapp/
├── .vscode/
├── public/
│   ├── images/
│   └── icons/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (user)/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── campaigns/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── coupons/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── upload/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── profile/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (admin)/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── campaigns/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── edit/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── coupons/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...supabase]/
│   │   │   │       └── route.ts
│   │   │   ├── campaigns/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── coupons/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── approve/
│   │   │   │       └── route.ts
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   └── ... (other UI components)
│   │   ├── admin/
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── CampaignForm.tsx
│   │   │   ├── CouponReviewCard.tsx
│   │   │   └── UserManagementTable.tsx
│   │   ├── user/
│   │   │   ├── UserSidebar.tsx
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CouponUpload.tsx
│   │   │   └── PointsDisplay.tsx
│   │   ├── shared/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ImageUploader.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── providers/
│   │       └── Providers.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── utils/
│   │   │   ├── cn.ts
│   │   │   ├── format.ts
│   │   │   └── validation.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useCampaigns.ts
│   │   │   └── useCoupons.ts
│   │   └── storage/
│   │       └── imageStorage.ts
│   │
│   ├── types/
│   │   ├── database.types.ts
│   │   ├── supabase.ts
│   │   ├── campaign.ts
│   │   ├── coupon.ts
│   │   └── user.ts
│   │
│   └── middleware.ts
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── config.toml
│
├── .env.local
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── supabase-schema.sql
└── README.md
```

## Key Structure Explanations

### Route Groups

**`(auth)/`** - Authentication pages (login, register)
- No prefix in URL
- Shared layout for auth pages

**`(user)/dashboard/`** - User-facing routes
- Accessible at `/dashboard/*`
- Protected by user authentication middleware
- Contains: campaigns view, coupon upload, profile

**`(admin)/admin/`** - Admin-only routes
- Accessible at `/admin/*`
- Protected by admin role check middleware
- Contains: campaign management, coupon approval, user management, analytics

### Layout Hierarchy

```
Root Layout (app/layout.tsx)
├── Auth Layout (app/(auth)/layout.tsx)
│   └── Login/Register pages
│
├── User Layout (app/(user)/layout.tsx)
│   └── Dashboard pages + User Sidebar
│
└── Admin Layout (app/(admin)/layout.tsx)
    └── Admin pages + Admin Sidebar
```

## Image Storage Logic

### Supabase Storage Bucket Structure

```
incentive-campaigns/
├── campaigns/
│   └── {campaign_id}/
│       └── banner.jpg
│
└── coupons/
    └── {campaign_id}/
        └── {user_id}/
            ├── {timestamp}_coupon1.jpg
            ├── {timestamp}_coupon2.jpg
            └── ...
```

### Implementation Example

**File: `src/lib/storage/imageStorage.ts`**

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const BUCKET_NAME = 'incentive-campaigns'

export const uploadCouponImage = async (
  file: File,
  userId: string,
  campaignId: string
): Promise<string> => {
  const supabase = createClientComponentClient()

  // Generate unique filename
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const fileName = `${timestamp}_${file.name}`

  // Storage path: coupons/{campaign_id}/{user_id}/{filename}
  const filePath = `coupons/${campaignId}/${userId}/${fileName}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrl
}

export const uploadCampaignBanner = async (
  file: File,
  campaignId: string
): Promise<string> => {
  const supabase = createClientComponentClient()

  const fileExt = file.name.split('.').pop()
  const filePath = `campaigns/${campaignId}/banner.${fileExt}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true // Allow overwriting existing banner
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrl
}

export const deleteCouponImage = async (imageUrl: string): Promise<void> => {
  const supabase = createClientComponentClient()

  // Extract file path from URL
  const path = imageUrl.split('/storage/v1/object/public/')[1]

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) throw error
}
```

### Storage Policies (Supabase)

```sql
-- Allow authenticated users to upload coupons to their own folder
CREATE POLICY "Users can upload own coupons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'incentive-campaigns' AND
  (storage.foldername(name))[1] = 'coupons' AND
  (storage.foldername(name))[3] = auth.uid()::text
);

-- Allow users to view their own coupons
CREATE POLICY "Users can view own coupons"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'incentive-campaigns' AND
  (storage.foldername(name))[1] = 'coupons' AND
  (storage.foldername(name))[3] = auth.uid()::text
);

-- Admins can view all coupons
CREATE POLICY "Admins can view all coupons"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'incentive-campaigns' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can upload campaign banners
CREATE POLICY "Admins can upload campaign banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'incentive-campaigns' AND
  (storage.foldername(name))[1] = 'campaigns' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## Middleware Protection

**File: `src/middleware.ts`**

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Protect user dashboard routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*']
}
```

## Environment Variables

**File: `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Getting Started

1. **Set up Supabase project**
   - Create a new project at supabase.com
   - Run the `supabase-schema.sql` in the SQL Editor
   - Create storage bucket named `incentive-campaigns`
   - Apply storage policies

2. **Install dependencies**
   ```bash
   npm install next@latest react react-dom
   npm install @supabase/auth-helpers-nextjs @supabase/supabase-js
   npm install tailwindcss postcss autoprefixer
   npm install -D typescript @types/react @types/node
   ```

3. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials

4. **Run development server**
   ```bash
   npm run dev
   ```

## Benefits of This Structure

✅ **Clear separation** between admin and user routes using route groups
✅ **Reusable components** organized by context (admin/user/shared)
✅ **Type safety** with TypeScript and Supabase generated types
✅ **Middleware protection** for role-based access control
✅ **Organized storage** with logical folder structure (campaign_id/user_id/filename)
✅ **Scalable** - easy to add new features within existing structure
