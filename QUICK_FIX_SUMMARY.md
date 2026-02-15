# Quick Fix Summary - Members Showing as "Unknown User"

## 🔴 Problem
Members tab shows "Unknown User" with "No email" instead of actual names and emails.

## ✅ Solution (3 Steps - Takes 2 minutes)

### Step 1: Create Users Table
**Go to Supabase Dashboard → SQL Editor → New Query**

Paste and run: `supabase-migration-fix-users.sql`

This creates the users table with proper permissions.

---

### Step 2: Populate Existing Users
**In SQL Editor → New Query again**

Paste and run: `populate-existing-users.sql`

This copies your existing auth users into the users table.

---

### Step 3: Test
1. **Log out** of the app
2. **Log back in** (this syncs your user data)
3. Go to Members tab
4. ✅ You should see names and emails!

---

## 🎯 What Was Fixed

### Code Changes Made:
1. **AuthContext.js** - Now syncs user data on login automatically
2. **AuthContext.js** - Better error handling for signup
3. Added graceful fallbacks for missing user data

### Database Changes Needed:
1. Create `users` table with RLS policies
2. Grant SELECT/INSERT/UPDATE to authenticated users
3. Backfill existing users from auth.users

---

## 🧪 Testing Checklist

After running both SQL scripts:

- [ ] Log out and log back in
- [ ] Go to any squad
- [ ] Click Members tab
- [ ] See your name (not "Unknown User")
- [ ] See your email prefix (not "No email")
- [ ] See "You" badge next to your name
- [ ] Click "+ Invite Member" to test invite flow

---

## 🚨 If Still Not Working

### Check 1: Verify Users Table Exists
Run in SQL Editor:
```sql
SELECT * FROM public.users LIMIT 5;
```

Should show users with names and emails.

### Check 2: Verify Permissions
Run in SQL Editor:
```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users' AND grantee = 'authenticated';
```

Should show SELECT, INSERT, UPDATE permissions.

### Check 3: Check Console Logs
In your app, open the console and look for:
- `"Fetched members with details:"` - Should show user data
- `"Error fetching user details:"` - Indicates permission issue

---

## 📝 Files Changed

1. `src/context/AuthContext.js` - Auto-sync user data on login
2. `supabase-migration-fix-users.sql` - Creates users table
3. `populate-existing-users.sql` - Backfills existing users
4. `DATABASE_FIX_GUIDE.md` - Detailed instructions

---

## 💡 For Future Signups

New users will automatically have their data inserted into the users table on signup. No manual intervention needed!

The login function also acts as a fallback - if a user's data is missing from the users table for any reason, it will be inserted when they log in.
