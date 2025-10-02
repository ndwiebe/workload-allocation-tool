# Manager Workload Overview Panel

## What's New? 📊

Your Workload Allocation Tool now has a **Manager Workload Overview Panel** that replaces the metrics section! This gives you an at-a-glance view of workload distribution across all managers with visual capacity indicators.

---

## Visual Overview

### Collapsed State (Default)
```
┌──────────────────────────────────────────────────────────┐
│ ▶ 📊 Manager Workload Overview      Click to expand      │
│                                                           │
│ 3 Managers • 3,595 total hours • 399 unassigned hours    │
└──────────────────────────────────────────────────────────┘
```

### Expanded State
```
┌────────────────────────────────────────────────────────────────────────┐
│ ▼ 📊 Manager Workload Overview                  Click to collapse      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Manager  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Total  Capacity │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ Alice     85   92   78   95  110   88   75   82   90   95  100   88  1,078  1,078/1,200 │
│                                                                                    90%  │
│ Bob       95  105   88   92   85   90  105   98   95  100   92   95  1,140  1,140/1,200 │
│                                                                                    95%  │
│ Carol     70   65   80   75   88   92   85   90   78   82   88   85    978    978/1,200 │
│                                                                                    82%  │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ ⚠️ Unassigned 45   38   54   38   17   30   35   30   37   23   20   32    399      - │
│ ══════════════════════════════════════════════════════════════════════════════════════ │
│ 📊 Total    295  300  300  300  300  300  300  300  300  300  300  300  3,595      - │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 📊 Comprehensive Workload View
- **Monthly Breakdown**: See exactly how many hours each manager has in every month
- **Unassigned Work**: Highlighted row shows work that hasn't been allocated yet
- **Total Row**: Grand total of all work across all managers

### 🎨 Color-Coded Capacity Indicators

The panel uses color coding to instantly show capacity utilization:

#### 🟢 Green (Under 80%)
- Manager has comfortable capacity
- Safe to assign more work
- Example: 750 / 1,000 hours (75%)

#### 🟡 Yellow (80-100%)
- Manager is at moderate to full capacity
- Be cautious with new assignments
- Example: 950 / 1,000 hours (95%)

#### 🔴 Red (Over 100%)
- Manager is overallocated
- Needs workload rebalancing
- Example: 1,150 / 1,000 hours (115%)

### ⚠️ Unassigned Work Tracking
- **Yellow background** makes unassigned work stand out
- **Monthly view** shows which months need attention
- **Total hours** unassigned displayed prominently

### 🎯 Default Collapsed State
- Starts collapsed for a cleaner interface
- Click to expand when you need details
- State preserved during your session

---

## How to Use

### Expanding the Panel
1. **Click** anywhere on the collapsed panel header
2. **Keyboard**: Tab to the panel, press Enter or Space
3. Panel smoothly expands to show full details

### Reading the Data

#### Manager Rows
- **Name**: Manager's name in the first column
- **Monthly Hours**: Each month shows allocated hours
- **Total**: Sum of all months
- **Capacity**: Shows allocated/capacity (percentage)

#### Unassigned Row
- **Yellow background** for visibility
- Shows unassigned hours per month
- Helps identify allocation gaps

#### Total Row
- **Bold formatting** with top border separator
- Shows overall workload distribution by month
- Grand total of all work in the system

### Understanding Colors
- Look at the numbers and percentages
- Green = All good, capacity available
- Yellow = Getting full, monitor closely
- Red = Over capacity, action needed

---

## Benefits

✅ **Quick Assessment**: See entire team workload at a glance  
✅ **Capacity Planning**: Instantly spot who's over/under allocated  
✅ **Gap Identification**: See unassigned work by month  
✅ **Visual Clarity**: Color coding makes issues obvious  
✅ **Clean Interface**: Collapsed by default, expand when needed  
✅ **Data-Driven**: Make informed allocation decisions  

---

## Example Scenarios

### Scenario 1: Balanced Team
```
Alice:  850 / 1,000 (85%) 🟡
Bob:    780 / 1,000 (78%) 🟢
Carol:  820 / 1,000 (82%) 🟡
```
**Action**: Team is well-balanced, no issues

### Scenario 2: Overallocation Detected
```
Alice: 1,150 / 1,000 (115%) 🔴
Bob:    650 / 1,000 (65%)  🟢
Carol:  700 / 1,000 (70%)  🟢
```
**Action**: Redistribute some of Alice's work to Bob or Carol

### Scenario 3: Unassigned Work
```
Unassigned: 
Jan: 45, Feb: 60, Mar: 80 ...
```
**Action**: Expand panel to see which months need attention, assign work accordingly

---

## Integration with Other Features

### Works With Allocation Algorithm
- Run allocation → Overview updates automatically
- Color coding reflects new distribution
- Unassigned row shows remaining work

### Works With Manual Assignments
- Drag-drop clients → Overview updates in real-time
- Colors adjust as capacity changes
- Immediate visual feedback

### Works With Capacity Management
- Change manager capacity → Colors recalculate
- Percentage updates immediately
- Red/Yellow/Green indicators adjust

### Works With Locked Clients
- Locked clients counted in manager totals
- Unassigned row excludes locked work
- Accurate capacity calculations

---

## Technical Details

### Calculation Logic
```javascript
// For each manager:
allocated_hours = sum(all assigned client hours)
capacity_hours = sum(monthly capacity)
percentage = (allocated / capacity) * 100

// Color assignment:
if (percentage < 80)  → Green
if (percentage <= 100) → Yellow
if (percentage > 100)  → Red
```

### State Management
- Panel state (collapsed/expanded) preserved during session
- Recalculates on every state change
- Real-time updates when data changes

### Accessibility
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ ARIA attributes (`role="button"`, `aria-expanded`)
- ✅ Focus indicators
- ✅ Screen reader friendly

---

## Testing the Feature

### Step 1: Pull Latest Code
```bash
cd workload-allocation-tool
git pull origin main
npm start
```

### Step 2: Open Application
```
http://localhost:3000
```

### Step 3: Check Default State
- Panel should be **collapsed** by default
- Shows summary: X managers, Y total hours, Z unassigned

### Step 4: Expand Panel
- Click anywhere on the panel
- Should smoothly expand showing table
- See all managers with monthly breakdowns

### Step 5: Verify Colors
- Check managers near/over capacity (Yellow/Red)
- Check managers with room (Green)
- Unassigned row should be yellow

### Step 6: Test Interactions
- Run allocation → Panel updates
- Drag-drop clients → Colors adjust
- Change capacity → Percentages recalculate

---

## Troubleshooting

### Panel Not Showing
- Make sure you have both managers AND clients imported
- Empty state shows message: "No managers added yet" or "No clients imported yet"

### Colors Not Showing
- Check that manager capacities are set (not 0)
- Verify clients are assigned to managers
- Refresh the page if colors don't update

### Numbers Don't Add Up
- Verify all clients have correct monthly hours
- Check that managers are correctly assigned
- Look at unassigned row for missing work

---

## What Changed

### Replaced
- Old metrics cards (Total Clients, Locked Clients, etc.)

### Added
- Manager Workload Overview Panel
- Monthly hour breakdowns
- Capacity indicators with color coding
- Unassigned work tracking
- Collapsible interface

### Files Modified
- `public/app.js` - Added overview calculation and rendering logic
- `public/styles.css` - Added complete styling for panel and colors

---

## Questions?

**Q: Can I see the old metrics?**  
A: The new overview provides more detailed information. The metrics data is still available by expanding the panel and reviewing the totals.

**Q: Why is everything red?**  
A: Your managers might be overallocated. Check individual capacities in Settings and consider running the allocation algorithm to rebalance.

**Q: Can I export this view?**  
A: The overview calculations are included in the Excel export under "Manager Time By Month" sheet.

**Q: Does this replace the main table?**  
A: No! The main allocation table below shows individual clients. The overview gives you the big picture summary.

---

Enjoy your new at-a-glance workload overview! 🚀
