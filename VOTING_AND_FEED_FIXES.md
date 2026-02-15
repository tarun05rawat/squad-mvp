# Voting & Feed Issues - Fixes Needed

## 🐛 Issues Reported

### 1. Feed still shows "Unknown Event"
**Status:** Investigating
**Possible causes:**
- App didn't hot-reload properly after changes
- RLS policy preventing event data from being read
- Event query returning null

### 2. Users shouldn't vote multiple times
**Status:** ✅ Already implemented! (just needs better UX)
**Current behavior:**
- Users CAN'T vote twice on same option (database has unique constraint)
- After voting on all options, shows "You've voted!" with live tally
- **Issue:** When user re-opens the event, it shows swipe screen again (confusing!)

### 3. How does voting end?
**Status:** ✅ Already implemented!
**Current mechanism:**
- Events have `voting_closes_at` timestamp (set during creation)
- SquadDetailScreen auto-updates status from 'voting' → 'decided' when time expires
- Once 'decided', clicking event opens EventResultScreen (not SwipeVoting)

---

## 🔧 Fixes to Implement

### Fix 1: Event Name in Feed (Debug & Fix)

**Step 1: Add debugging**
```javascript
// In FeedTab.js - Already added
console.log('Event data:', event);
if (eventError) {
  console.error('Error fetching event:', eventError);
}
```

**Step 2: Force reload app**
```bash
# Stop expo
# Clear cache
npm start -- --clear
```

**Step 3: Check RLS policies**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM events WHERE id = 'your-event-id';
-- If this returns data, RLS is fine
-- If not, RLS policy needs fixing
```

**Possible RLS fix** (if needed):
```sql
-- Allow authenticated users to read events in their squads
CREATE POLICY "Users can view squad events"
ON events FOR SELECT
TO authenticated
USING (
  squad_id IN (
    SELECT squad_id FROM squad_members WHERE user_id = auth.uid()
  )
);
```

---

### Fix 2: Better UX After Voting

**Problem:** User who already voted sees swipe screen when re-opening event

**Solution:** Navigate directly to results if user has voted on all options

**Implementation:**
```javascript
// In SwipeVotingScreen.js - fetchOptions()
const unvotedOptions = (fetchedOptions || []).filter(o => !votedOptionIds.includes(o.id));

if (unvotedOptions.length === 0) {
  // User has voted on all options - navigate to results
  navigation.replace('EventResult', { eventId, eventTitle });
  return;
}
```

**Better alternative:** Check on navigation
```javascript
// In SquadDetailScreen.js - handleEventPress()
const handleEventPress = async (eventId) => {
  let event = events.find(e => e.id === eventId);

  if (!event) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, status')
      .eq('id', eventId)
      .single();

    if (!error && data) {
      event = data;
    }
  }

  if (event) {
    // Check if user has already voted
    const { data: userVotes } = await supabase
      .from('event_votes')
      .select('option_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    const { data: allOptions } = await supabase
      .from('event_options')
      .select('id')
      .eq('event_id', eventId);

    const hasVotedAll = userVotes?.length === allOptions?.length;

    // Navigate based on status and voting completion
    if (event.status === 'decided' || hasVotedAll) {
      navigation.navigate('EventResult', { eventId: event.id, eventTitle: event.title });
    } else {
      navigation.navigate('SwipeVoting', { eventId: event.id, eventTitle: event.title });
    }
  }
};
```

---

### Fix 3: Clarify How Voting Ends

**Current mechanism is good, but needs UI indicator!**

**Add countdown timer in SwipeVotingScreen:**
```javascript
// Show time remaining
const [timeRemaining, setTimeRemaining] = useState('');

useEffect(() => {
  const interval = setInterval(() => {
    const now = new Date();
    const closes = new Date(event.voting_closes_at);
    const diff = closes - now;

    if (diff <= 0) {
      setTimeRemaining('Voting ended');
      // Auto-navigate to results
      navigation.replace('EventResult', { eventId, eventTitle });
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m remaining`);
    }
  }, 1000);

  return () => clearInterval(interval);
}, [event]);
```

**Display in UI:**
```javascript
<Text style={styles.timer}>⏰ {timeRemaining}</Text>
```

---

## 🎯 Priority Actions

### Immediate (Do Now)

1. **Hard reload app to fix "Unknown Event"**
   ```bash
   # Stop app (Ctrl+C)
   npm start -- --clear
   # Open app fresh
   ```

2. **Check console logs**
   - Look for "Event data: ..." logs
   - If null, check database
   - If error, check RLS policies

3. **Test creating new event**
   - Create brand new event
   - Check if it shows in Feed with correct name
   - If yes → old events might have data issue
   - If no → RLS policy issue

---

### Short-term (This Session)

4. **Implement better navigation logic**
   - Update `handleEventPress` to check if user voted
   - Navigate to results if voting complete

5. **Add timer UI**
   - Show countdown in SwipeVotingScreen
   - Auto-navigate when voting ends

6. **Test full flow**
   - Create event with 2-minute voting window
   - Vote on all options
   - Re-open event → should go to results
   - Wait 2 minutes → auto-navigate to results

---

## 📊 Current Voting Flow

```
User opens event from Events tab or Feed
↓
SquadDetailScreen.handleEventPress()
↓
Check event.status
├─ If 'voting' → SwipeVotingScreen
└─ If 'decided' → EventResultScreen

In SwipeVotingScreen:
↓
fetchOptions() - filters out already-voted options
├─ If unvotedOptions.length > 0 → Show swiper
└─ If unvotedOptions.length === 0 → Show "You've voted!" tally

User swipes on options
↓
handleSwipeRight() → Records vote in DB
↓
After all options swiped → handleAllSwiped()
↓
Shows live tally (stays on SwipeVotingScreen)

Meanwhile, in background:
↓
SquadDetailScreen checks voting_closes_at
↓
If time expired → Updates status to 'decided'
↓
Next time event is opened → Goes to EventResultScreen
```

---

## 🐛 Debugging "Unknown Event"

### Check 1: Console Logs
```javascript
// Should see in console:
"Event data: { id: 'xxx', title: 'Pizza Night', winning_option: null }"

// If you see:
"Event data: null" → Event not found in DB
"Event data: undefined" → Query failed
"Error fetching event: ..." → RLS or permission issue
```

### Check 2: Manual Query
```sql
-- Run in Supabase SQL Editor
SELECT id, title, squad_id, created_by
FROM events
WHERE id = 'paste-feed-item-entity-id-here';

-- Should return event data
-- If not, event was deleted or ID is wrong
```

### Check 3: Feed Items
```sql
-- Check what's in feed_items
SELECT
  fi.id,
  fi.type,
  fi.entity_id,
  e.title as event_title,
  fi.created_at
FROM feed_items fi
LEFT JOIN events e ON e.id = fi.entity_id
WHERE fi.type = 'event_created'
ORDER BY fi.created_at DESC
LIMIT 10;

-- This shows if events are being joined correctly
```

### Check 4: RLS Policies
```sql
-- Check if RLS is blocking reads
SET ROLE authenticated;
SET request.jwt.claims.sub = 'your-user-id';

SELECT * FROM events WHERE id = 'event-id';

-- If this returns nothing, RLS is blocking
```

---

## ✅ Expected Behavior After Fixes

1. **Feed shows event names**
   - "Tarun Rawat created a new event Pizza Night" ✅

2. **Can't vote twice**
   - User votes on all options once ✅
   - Re-opening event shows results, not swipe screen ✅

3. **Voting ends automatically**
   - Countdown timer shows time remaining ✅
   - When time expires, status → 'decided' ✅
   - Auto-navigate to results screen ✅

4. **Smart navigation from Feed**
   - Voting ongoing → SwipeVoting
   - User finished voting → EventResult
   - Voting ended → EventResult

---

## 🚀 Next Steps

1. Check console for "Event data" logs
2. Hard reload app if needed
3. Implement navigation improvements
4. Add countdown timer
5. Test complete voting flow

Let me know what you see in the console logs!
