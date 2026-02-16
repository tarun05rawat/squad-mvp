# Setup Guide: Photo Reactions & Comments

Quick setup guide to enable photo reactions and comments in your Squad app.

---

## ✅ Prerequisites

Before you start, make sure you've already:
1. Run `phase1-photos-feed-schema.sql` migration
2. Set up Supabase storage bucket with policies
3. Uploaded at least one test photo

---

## 🚀 Step 1: Run Database Migration

### In Supabase Dashboard:

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `phase2-reactions-feed-trigger.sql`
4. Click **Run** or press `Cmd/Ctrl + Enter`

### Verify Migration Success:

Run this query to verify:
```sql
-- Should show 'photo_reacted' in the type list
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name = 'feed_items_type_check';
```

Expected output should include:
```
photo_reacted
```

---

## 🧪 Step 2: Test Reactions

### In your app:

1. **Open a photo** in fullscreen view
2. **See emoji picker** below the caption (❤️ 😂 🔥 👍 🎉 😮)
3. **Tap an emoji** → should highlight with purple border
4. **See reaction count** appear below picker
5. **Tap again** → reaction removed

### What to look for:
- ✅ Emoji highlights when selected
- ✅ Count shows "1" after first tap
- ✅ Reaction disappears when tapped again
- ✅ Other emojis work independently

---

## 💬 Step 3: Test Comments

### In your app:

1. **Open a photo** in fullscreen view
2. **Tap "▶ Show Comments"** button
3. **See empty state:** "No comments yet"
4. **Type a comment** in the input field
5. **Tap "Post"** → comment appears instantly

### What to look for:
- ✅ Comments section expands
- ✅ Input field is visible
- ✅ Post button is disabled when input is empty
- ✅ Comment appears with your name and avatar
- ✅ "Delete" button shows on your comment

---

## 📰 Step 4: Test Feed Integration

### Test First Reaction Feed Item:

1. **Go to Feed tab**
2. **React to a photo** you haven't reacted to before
3. **Pull to refresh feed**
4. **See new feed item:** "[Your Name] reacted ❤️ to a photo"
5. **Tap feed item** → opens photo fullscreen

### Test Comment Feed Item:

1. **Post a comment** on a photo that has no comments yet
2. **Pull to refresh feed**
3. **See new feed item:** "[Your Name] commented on a photo"
4. **See comment text** in gray box
5. **Tap feed item** → opens photo with comments expanded

### What to look for:
- ✅ Feed updates after reaction
- ✅ Feed updates after first comment
- ✅ Feed does NOT update after 2nd, 3rd comment
- ✅ Feed does NOT update when you react to your own photo

---

## ⚡ Step 5: Test Real-time Updates

### Test with two devices (or browsers):

**Device 1:**
1. Open a photo in fullscreen
2. Keep it open

**Device 2:**
1. Open the same photo
2. Add a reaction
3. Post a comment

**Device 1 (should update automatically):**
- ✅ Reaction appears without refresh
- ✅ Comment appears without refresh
- ✅ Counts update in real-time

---

## 🐛 Troubleshooting

### Reactions not appearing?
**Check:**
- Did you run `phase2-reactions-feed-trigger.sql`?
- Is real-time enabled on `photo_reactions` table?
- Check browser console for errors

**Fix:**
```sql
-- Verify real-time is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE photo_reactions;
```

### Comments not appearing?
**Check:**
- Is real-time enabled on `photo_comments` table?
- Are RLS policies correct?

**Fix:**
```sql
-- Verify real-time is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE photo_comments;
```

### Feed items not created?
**Check:**
- Are triggers installed?

**Verify:**
```sql
-- Check triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('photo_reactions', 'photo_comments')
ORDER BY event_object_table, trigger_name;
```

**Expected output:**
- `trigger_feed_item_first_comment` on `photo_comments`
- `trigger_feed_item_first_reaction` on `photo_reactions`

---

## 📊 Quick Test Checklist

Use this checklist to verify everything works:

### Reactions
- [ ] Can see emoji picker on photo
- [ ] Can tap emoji to add reaction
- [ ] Selected emoji has purple border
- [ ] Reaction count appears
- [ ] Can tap again to remove reaction
- [ ] Multiple emojis work independently
- [ ] Other users can see my reactions

### Comments
- [ ] Can toggle comments section
- [ ] Empty state shows when no comments
- [ ] Can type in comment input
- [ ] Post button disabled when empty
- [ ] Post button enabled with text
- [ ] Comment appears instantly after posting
- [ ] Can delete own comment
- [ ] Other users can see my comments

### Feed
- [ ] First reaction creates feed item
- [ ] First comment creates feed item
- [ ] Self-reactions don't create feed item
- [ ] 2nd comment doesn't create feed item
- [ ] Feed items show correct emoji/comment
- [ ] Tapping feed item opens photo

### Real-time
- [ ] Reactions appear without refresh
- [ ] Comments appear without refresh
- [ ] Feed updates without refresh
- [ ] Works across multiple devices

---

## 🎯 Performance Check

### Expected Behavior:
- **Reaction toggle:** < 100ms (optimistic update)
- **Comment post:** < 500ms (optimistic update + DB)
- **Real-time sync:** < 2 seconds
- **Feed refresh:** < 1 second

### If slower:
- Check network connection
- Check Supabase region (use closest)
- Check for console errors

---

## ✅ Success!

If all tests pass, you're ready to go! Your Squad app now has:
- ✅ Photo reactions (6 emojis)
- ✅ Photo comments (with threading)
- ✅ Feed integration
- ✅ Real-time updates

---

## 📚 Next Steps

1. **Invite team members** to test
2. **Monitor feed** for engagement
3. **Watch for errors** in Supabase logs
4. **Gather feedback** on emoji selection
5. **Consider adding** push notifications (future)

---

## 🆘 Need Help?

**Check these files:**
- `PHOTO_ENGAGEMENT_COMPLETE.md` - Full feature documentation
- `phase2-reactions-feed-trigger.sql` - Migration file
- `__tests__/PhotoReactions.test.js` - Test examples
- `__tests__/PhotoComments.test.js` - Test examples

**Common issues:**
1. "Can't add reaction" → Check RLS policies
2. "Reactions not showing" → Check real-time enabled
3. "Feed not updating" → Check triggers installed
4. "Real-time not working" → Check channel subscription

---

**Happy reacting! 🎉❤️💬**
