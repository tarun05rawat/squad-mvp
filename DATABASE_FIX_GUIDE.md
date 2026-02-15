# Database Fix Guide

## Issue
Members showing as "Unknown User" with "No email" in the Members tab.

**Root Cause:** The `users` table either:
1. Doesn't exist in the database
2. Doesn't have the proper permissions
3. Doesn't have data for existing users

## Solution (3 Steps)

### Step 1: Create Users Table & Set Permissions (REQUIRED)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to your project: `ajjndjepuhqifzpewsyi`
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase-migration-fix-users.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify you see a success message

### Step 2: Populate Existing Users (REQUIRED)

After Step 1, run this second migration:

1. Still in **SQL Editor**, click **New Query**
2. Copy and paste the contents of `populate-existing-users.sql`
3. Click **Run**
4. You should see your existing users listed in the results

### Step 3: Test the App

1. **Log out** of the app completely
2. **Log back in** (this will trigger the new user data sync)
3. Navigate to any squad → **Members tab**
4. You should now see proper names and emails!

## Why This Happened

The app code was trying to insert users into the `users` table on signup/login, but:
- The table didn't exist yet, OR
- The table existed but didn't have GRANT permissions, OR
- You signed up before the code was updated to insert user data

The fix ensures:
1. ✅ The users table exists with proper structure
2. ✅ Authenticated users have SELECT, INSERT, UPDATE permissions
3. ✅ RLS policies allow reading all users (needed for members list)
4. ✅ Existing auth users get their data backfilled into the users table
5. ✅ Future logins automatically sync user data

### Verification

After running the fix, verify the users table is accessible:

```sql
-- Run this in Supabase SQL Editor
SELECT * FROM public.users LIMIT 1;
```

You should either see rows (if users exist) or an empty result with column headers (if no users yet).

If you get an error, the table doesn't exist or RLS is blocking access.

## What the Fix Does

1. **Creates the users table** in the public schema if it doesn't exist
2. **Enables Row Level Security** (RLS) on the users table
3. **Creates RLS policies** that allow:
   - Anyone (authenticated) to view all users
   - Users to insert their own profile
   - Users to update their own profile
4. **Grants permissions** to the `authenticated` role (all logged-in users)
5. **Verifies** the table exists in the schema cache

## Testing

After applying the fix, test the app:

1. Sign up a new user
2. Create a squad
3. Navigate to the Members tab
4. You should see members listed (including yourself)
5. Click "+ Invite Member" to see the invite modal

The error `"Could not find the table 'public.users'"` should be gone!

## Common Issues

### "Relation already exists"
If you see this error, it means the table already exists. This is fine! The migration will skip creating it and just fix the permissions.

### "Permission denied"
If you see this after running the migration, make sure you're running it as the database owner (usually `postgres` user). In Supabase SQL Editor, you should have the right permissions by default.

### Still getting errors?
Check that:
1. You're logged in as an authenticated user (not anonymous)
2. The RLS policies are enabled
3. The GRANT statements ran successfully

You can verify grants with:
```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users';
```

## Next Steps

Once the database is fixed, the app should work perfectly:
- ✅ Members tab will load and display squad members
- ✅ Invite member button will show the invite code
- ✅ Share invite will work via native share sheet
- ✅ Email verification (2FA) will be enforced on signup
