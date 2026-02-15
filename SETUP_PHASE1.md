# ⚠️ IMPORTANT: Phase 1 Setup Required

## Error You're Seeing

```
Could not find the table 'public.feed_items' in the schema cache
```

**This is expected!** You need to run the database migrations before the Feed tab will work.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project: `ajjndjepuhqifzpewsyi`

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run Phase 1 Migration**
   - Open the file: `phase1-photos-feed-schema.sql`
   - Copy ALL contents
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - Or: A list of created tables

**✅ This creates:**
- `photos` table
- `photo_reactions` table
- `photo_comments` table
- `feed_items` table ← This fixes your error!
- Database triggers for automatic feed item creation
- RLS policies for security

---

### Step 2: Set Up Storage Bucket

1. **Navigate to Storage**
   - Click **Storage** in the left sidebar
   - Click **Create a new bucket**

2. **Create Bucket**
   - Name: `squad-photos`
   - Public bucket: **Yes** (check the box)
   - Click **Create bucket**

3. **Set Up Policies**
   - Click on the `squad-photos` bucket
   - Click **Policies** tab
   - Click **New Policy**

**Policy 1: Upload Photos (INSERT)**
```sql
CREATE POLICY "Users can upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'squad-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2: Read Photos (SELECT)**
```sql
CREATE POLICY "Anyone can view photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'squad-photos');
```

**Policy 3: Delete Own Photos (DELETE)**
```sql
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'squad-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Or use the Quick Setup from `STORAGE_SETUP_GUIDE.md`**

---

### Step 3: Backfill Existing Users (Optional)

**Only needed if you have existing users in auth.users**

1. **Still in SQL Editor**
   - Click **New Query**
   - Open file: `populate-existing-users.sql`
   - Copy all contents
   - Paste and **Run**

This ensures existing users show up correctly in the Feed.

---

### Step 4: Restart Your App

1. **Stop the Expo server** (Ctrl+C in terminal)
2. **Clear cache and restart:**
   ```bash
   npm start -- --clear
   ```
3. **Test the Feed tab:**
   - Open your app
   - Navigate to a squad
   - Feed tab should load without errors!

---

## 🧪 Verify Setup

### Test 1: Check Tables Exist
Run in Supabase SQL Editor:
```sql
SELECT * FROM feed_items LIMIT 1;
SELECT * FROM photos LIMIT 1;
SELECT * FROM photo_reactions LIMIT 1;
SELECT * FROM photo_comments LIMIT 1;
```

✅ Should return either:
- Empty result (no data yet) - **This is OK!**
- Or column headers visible - **This means tables exist!**

❌ Should NOT return:
- "relation does not exist" error

---

### Test 2: Check Storage Bucket
1. Go to **Storage** in Supabase Dashboard
2. Look for `squad-photos` bucket
3. Click on it
4. Should show empty folder structure (that's OK!)

---

### Test 3: Check Feed in App
1. Open your app
2. Navigate to any squad
3. Feed tab should show:
   - "No activity yet" (if no events/photos)
   - Or actual feed items if you have activity

❌ Should NOT show:
- "Could not find the table 'public.feed_items'" error

---

## 🎯 What to Test After Setup

### Create Feed Activity

1. **Create a new event**
   - Go to Events tab
   - Click "+ New Event"
   - Fill in details and create
   - **Check Feed tab** → Should show "X created a new event"

2. **Vote on event**
   - Swipe to vote on options
   - Wait for voting to close (or manually update in DB)
   - **Check Feed tab** → Should show "Voting ended for X"

3. **Test real-time updates**
   - Open app on two devices/emulators
   - Create event on device 1
   - **Check device 2** → Feed should update automatically!

---

## ❌ Troubleshooting

### Still getting "table not found" error?

**Check 1: Did migration run successfully?**
```sql
-- Run this in SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('feed_items', 'photos', 'photo_reactions', 'photo_comments');
```

Should return 4 rows. If not, migration didn't run.

**Check 2: RLS policies enabled?**
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('feed_items', 'photos', 'photo_reactions', 'photo_comments');
```

All should show `rowsecurity = true`.

**Check 3: Permissions granted?**
```sql
-- Check permissions
SELECT grantee, privilege_type, table_name
FROM information_schema.role_table_grants
WHERE table_name IN ('feed_items', 'photos')
AND grantee = 'authenticated';
```

Should show SELECT, INSERT, UPDATE, DELETE permissions.

---

### Feed shows "No activity yet" even with events?

**This is normal if:**
- Events were created BEFORE running the migration
- Database triggers only fire for NEW events

**Solution: Create a new event**
- The trigger will fire and create a feed item
- Existing events won't automatically appear in feed

**Or manually backfill:**
```sql
-- Run this to create feed items for existing events
INSERT INTO feed_items (squad_id, type, entity_id, created_by, created_at)
SELECT squad_id, 'event_created', id, created_by, created_at
FROM events
WHERE NOT EXISTS (
  SELECT 1 FROM feed_items
  WHERE entity_id = events.id AND type = 'event_created'
);
```

---

### "Access denied" or RLS policy errors?

**Make sure you're logged in!**
- RLS policies only work for authenticated users
- Log out and log back in if needed
- Check `user` in AuthContext is not null

---

## 📝 Quick Reference

**Files to run in Supabase:**
1. `phase1-photos-feed-schema.sql` - Creates tables, triggers, RLS ✅ REQUIRED
2. `populate-existing-users.sql` - Backfills users ⚠️ Optional
3. Storage policies from `STORAGE_SETUP_GUIDE.md` ✅ REQUIRED (for photos)

**What each creates:**
- **feed_items** - Unified activity feed (events, votes, photos, comments)
- **photos** - Photo metadata and URLs
- **photo_reactions** - ❤️ reactions on photos (Phase 1 part 2)
- **photo_comments** - Comments on photos (Phase 1 part 2)
- **Triggers** - Auto-create feed items (event_created, voting_decided)
- **RLS Policies** - Security (squad members can only see their squad's data)

---

## ✅ Success Checklist

Before considering Phase 1 setup complete:

- [ ] Ran `phase1-photos-feed-schema.sql` in Supabase SQL Editor
- [ ] Verified tables exist (feed_items, photos, etc.)
- [ ] Created `squad-photos` storage bucket
- [ ] Set up storage policies (upload, read, delete)
- [ ] Ran `populate-existing-users.sql` (if you have existing users)
- [ ] Restarted Expo dev server with `--clear` flag
- [ ] Feed tab loads without "table not found" error
- [ ] Created a test event and saw it appear in Feed
- [ ] Tested on both iOS and Android (if applicable)

---

## 🚀 After Setup

Once setup is complete, the Feed will:
- ✅ Show all squad activity chronologically
- ✅ Update in real-time when new events happen
- ✅ Display events, voting results, photos (when implemented)
- ✅ Work across all squad members simultaneously

**Your app is now ready for Phase 1 testing!** 🎉

---

## 💡 Pro Tips

1. **Test with multiple users** - Create 2+ accounts to see real-time updates
2. **Monitor Supabase logs** - Check Logs tab for any errors
3. **Use Supabase Table Editor** - Manually inspect feed_items table
4. **Clear app cache if issues** - Sometimes React Native caches stale data

---

Need help? Check:
- `PHASE1_COMPLETE_SUMMARY.md` - Full implementation overview
- `STORAGE_SETUP_GUIDE.md` - Detailed storage setup
- `DATABASE_FIX_GUIDE.md` - Database troubleshooting
- `TESTING_SUMMARY.md` - What tests validate

**You've got this!** 🚀
