# Phase 1 Setup Checklist

## ⚠️ YOU ARE HERE: Database migration needed!

**Current Error:**

```
Could not find the table 'public.feed_items' in the schema cache
```

Follow these steps in order:

---

## 📋 Step-by-Step Setup

### ✅ Step 1: Database Migration (2 minutes)

1. [ ] Open Supabase Dashboard: https://app.supabase.com
2. [ ] Select project: `ajjndjepuhqifzpewsyi`
3. [ ] Click **SQL Editor** in sidebar
4. [ ] Click **New Query**
5. [ ] Open file: `phase1-photos-feed-schema.sql`
6. [ ] Copy ALL contents
7. [ ] Paste into SQL Editor
8. [ ] Click **Run** (or Cmd+Enter)
9. [ ] See "Success" message

**Verify it worked:**

```sql
SELECT * FROM feed_items LIMIT 1;
```

Should return empty result (not an error!)

---

### ✅ Step 2: Storage Bucket Setup (2 minutes)

1. [ ] Click **Storage** in Supabase sidebar
2. [ ] Click **Create a new bucket**
3. [ ] Name: `squad-photos`
4. [ ] Check "Public bucket"
5. [ ] Click **Create bucket**

**Set up 3 storage policies:**

6. [ ] Click on `squad-photos` bucket
7. [ ] Click **Policies** tab
8. [ ] Click **New Policy** → **For full customization**
9. [ ] Copy policies from `STORAGE_SETUP_GUIDE.md`
10. [ ] Create all 3 policies (upload, read, delete)

---

### ✅ Step 3: Backfill Users (Optional - 1 minute)

**Only if you have existing users:**

1. [ ] Still in SQL Editor
2. [ ] Click **New Query**
3. [ ] Open file: `populate-existing-users.sql`
4. [ ] Copy and paste contents
5. [ ] Click **Run**
6. [ ] See list of users populated

**Skip this if you're starting fresh!**

---

### ✅ Step 4: Restart App (1 minute)

1. [ ] Stop Expo server (Ctrl+C)
2. [ ] Run: `npm start -- --clear`
3. [ ] Open app
4. [ ] Navigate to any squad
5. [ ] Feed tab should load!

---

## 🧪 Verification

### ✅ Test 1: Feed Tab Loads

- [ ] Open squad detail
- [ ] Click Feed tab
- [ ] See "No activity yet" (not an error!)

### ✅ Test 2: Create Event

- [ ] Go to Events tab
- [ ] Create a new event
- [ ] Go back to Feed tab
- [ ] See "X created a new event"

### ✅ Test 3: Real-time Updates

- [ ] Open app on two devices/emulators
- [ ] Create event on device 1
- [ ] See it appear on device 2 automatically

---

## ❌ If Something Goes Wrong

### Error: "table 'feed_items' not found"

→ Step 1 migration didn't run
→ Go back and re-run `phase1-photos-feed-schema.sql`

### Error: "permission denied"

→ You're not logged in
→ Log out and log back in

### Feed shows nothing even with events

→ Events created before migration won't show
→ Create a new event to test

---

## ✅ Success!

When complete:

- ✅ Feed tab loads
- ✅ New events appear in feed
- ✅ Real-time updates work
- ✅ No errors in console

**You're ready to test Phase 1!** 🎉

---

## 📚 Next Steps

After setup works:

1. Test creating multiple events
2. Test voting on events
3. Test with multiple users
4. Check real-time updates

**Phase 1 Part 2** (Photos UI) coming next!

---

**Questions?** See `SETUP_PHASE1.md` for detailed troubleshooting.
