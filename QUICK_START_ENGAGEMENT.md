# Quick Start: Photo Engagement Features

**Get reactions and comments working in 5 minutes!** ⚡

---

## 🚀 5-Minute Setup

### Step 1: Run Migration (2 min)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `phase2-reactions-feed-trigger.sql`
3. Click **Run** (or Cmd+Enter)
4. See "Success" message ✅

**Verify it worked:**
```sql
SELECT constraint_name FROM information_schema.check_constraints
WHERE constraint_name = 'feed_items_type_check';
```
Should return 1 row.

---

### Step 2: Test Reactions (1 min)

1. Open your app
2. Tap any photo
3. See emoji picker: ❤️ 😂 🔥 👍 🎉 😮
4. Tap ❤️ → Should highlight with purple border
5. See count: "❤️ 1"

**Works?** ✅ Move to Step 3
**Doesn't work?** Check console for errors

---

### Step 3: Test Comments (1 min)

1. In same photo, tap **"▶ Show Comments"**
2. Section expands
3. Type: "Test comment"
4. Tap **"Post"**
5. Comment appears instantly

**Works?** ✅ Move to Step 4
**Doesn't work?** Check console for errors

---

### Step 4: Test Feed (1 min)

1. Go to **Feed tab**
2. Pull to refresh
3. See: "You reacted ❤️ to a photo"
4. Tap it → Opens photo
5. See your reaction

**Works?** ✅ You're done!
**Doesn't work?** Check trigger was created (see Troubleshooting)

---

## 🎯 Quick Test Checklist

**Copy this to verify everything works:**

```
Reactions:
□ Can see emoji picker
□ Can tap emoji
□ Emoji highlights (purple border)
□ Count appears
□ Can tap again to remove
□ Other emojis work independently

Comments:
□ Can toggle comments section
□ Can type in input
□ "Post" button enables with text
□ Comment appears after posting
□ Can delete own comment
□ Timestamp shows relative time

Feed:
□ Reaction creates feed item
□ Comment creates feed item
□ 2nd reaction doesn't create feed item
□ 2nd comment doesn't create feed item
□ Tapping feed item opens photo

Real-time:
□ Open photo on 2 devices
□ Add reaction on device 1
□ Reaction appears on device 2
□ Add comment on device 1
□ Comment appears on device 2
```

---

## 🐛 Troubleshooting (30 sec each)

### "Can't add reaction"

**Fix:**
```sql
-- Enable real-time for photo_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE photo_reactions;
```

### "Can't post comment"

**Fix:**
```sql
-- Enable real-time for photo_comments
ALTER PUBLICATION supabase_realtime ADD TABLE photo_comments;
```

### "Feed item not created"

**Check trigger exists:**
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_feed_item_first_reaction';
```

**Should return 1 row.** If not, re-run migration.

### "Real-time not working"

**Check channel subscription in console:**
```
Should see: "Subscribed to channel: photo-reactions:photo-123"
```

**If not, check component is mounted and photoId is valid.**

---

## 📊 Quick Performance Check

**Expected timings:**

| Action | Expected Time |
|--------|---------------|
| Tap emoji → Highlight | < 100ms |
| Post comment → Appears | < 500ms |
| Real-time update | < 2 seconds |
| Feed refresh | < 1 second |

**If slower:** Check network tab for slow queries.

---

## ✅ Success Criteria

**You're ready to launch if:**

- ✅ All checklist items work
- ✅ Real-time updates work across devices
- ✅ Feed shows engagement activity
- ✅ No console errors
- ✅ Performance is acceptable

---

## 📚 Need More Help?

**Read these docs (in order):**

1. **Quick troubleshooting:** This file (you're here)
2. **Detailed setup:** `SETUP_PHOTO_ENGAGEMENT.md`
3. **Full feature docs:** `PHOTO_ENGAGEMENT_COMPLETE.md`
4. **Architecture:** `ENGAGEMENT_ARCHITECTURE.md`
5. **Migration SQL:** `phase2-reactions-feed-trigger.sql`

---

## 🎉 You're Done!

**Congratulations!** Your Squad app now has:
- ✅ Photo reactions
- ✅ Photo comments
- ✅ Feed integration
- ✅ Real-time updates

**Go celebrate!** 🎊

Then invite your team to start reacting and commenting! 📸❤️💬

---

**Time spent:** 5 minutes
**Features gained:** 3 major features
**User engagement:** ∞ increased

**ROI: AMAZING** 🚀
