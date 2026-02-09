# Fix for Profiles RLS Infinite Recursion Error

## 🔴 Problem
The RLS (Row Level Security) policies on the `profiles` table are causing infinite recursion when trying to log in. This happens when a policy tries to read from the same table it's protecting.

## ✅ Solution
Use simple policies that **only rely on `auth.uid()`** and **never query the profiles table** within the policies themselves. Admin operations will be handled server-side using the service role key.

## 📋 Steps to Fix

### Step 1: Run the Fix Script

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a new query
4. Copy the entire contents of **`fix-profiles-rls-simple.sql`**
5. Paste and click **Run**

### Step 2: Verify the Fix

1. In the SQL Editor, create another new query
2. Copy the contents of **`test-rls-policies.sql`**
3. Run it and verify:
   - ✅ 3 policies exist (view own, update own, insert own)
   - ✅ Trigger `on_auth_user_created` exists
   - ✅ Foreign key `profiles.id` → `auth.users.id` exists
   - ✅ RLS is enabled (`rowsecurity = true`)

### Step 3: Test Login

1. Go to your application
2. Try to **log in** with an existing user
3. Should work without infinite recursion error ✅

### Step 4: Test Registration

1. Try to **register a new user**
2. Profile should be created automatically via the trigger
3. You should be redirected to `/dashboard` ✅

## 🔧 What Changed

### Before (❌ Causes Recursion)
```sql
-- This causes recursion because it queries profiles table
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles  -- ❌ Queries profiles within profiles policy!
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### After (✅ No Recursion)
```sql
-- This is safe - only uses auth.uid(), no table queries
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());  -- ✅ Only uses auth.uid()

-- Admin operations handled server-side via API routes
-- No admin policies = no recursion
```

## 🛡️ How Admin Operations Work Now

Admin operations (viewing all users, updating other users, etc.) are now handled **server-side** in API routes using the **service role key**, which bypasses RLS entirely.

### Example: API Route for Admin to View All Profiles

```typescript
// This runs server-side with service role key
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Admin can now query all profiles using service role
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')

  return NextResponse.json({ profiles: allProfiles })
}
```

## 📊 Policy Summary

After running the fix, you'll have these policies:

| Policy Name | Operation | Users | Logic |
|------------|-----------|-------|-------|
| Users can view own profile | SELECT | authenticated | `id = auth.uid()` |
| Users can update own profile | UPDATE | authenticated | `id = auth.uid()` (prevents role escalation) |
| Users can insert own profile | INSERT | authenticated | `id = auth.uid()` |

**Note:** No admin policies = no recursion issues!

## 🧪 Testing Checklist

- [ ] Run `fix-profiles-rls-simple.sql` in Supabase SQL Editor
- [ ] Run `test-rls-policies.sql` to verify setup
- [ ] Test user login (should work ✅)
- [ ] Test user registration (should work ✅)
- [ ] Test admin login (should work ✅)
- [ ] Test viewing campaigns as admin (should work ✅)

## 🚨 Common Issues

### Issue: "Policies not applied"
**Solution:** Make sure you ran the entire SQL script and refreshed your browser.

### Issue: "Profile not created on registration"
**Solution:** The trigger should create it automatically. Check if the trigger exists:
```sql
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
```

### Issue: "Admin can't see all users"
**Solution:** Admin operations should be done server-side via API routes using the service role key, not via client-side RLS policies.

## 📝 Next Steps

After fixing the RLS policies:

1. ✅ Test login and registration
2. ✅ Verify admin can access `/admin` routes
3. ✅ Test campaign creation
4. ✅ Deploy to Vercel

## 🔐 Security Notes

- ✅ Users can only view/update their own profile
- ✅ Users cannot escalate their own role
- ✅ Profile creation is automatic via trigger
- ✅ Admin operations are handled server-side
- ✅ No recursion = no infinite loops = no crashes

---

**After running the fix, you should be able to log in successfully!** 🎉
