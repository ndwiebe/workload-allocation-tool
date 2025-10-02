# Group Collapse/Expand Feature

## What's New? 🎉

Your Workload Allocation Tool now has a **group collapse feature**! This makes it easier to see the big picture while still being able to drill down into details when needed.

## How It Works

### Visual Changes

**Before:** Groups showed all individual clients expanded all the time.

**Now:** 
- **Collapsed view** (default): Shows one row per group with aggregated monthly hours
- **Expanded view**: Shows all individual clients within the group

### Using the Feature

#### Click to Toggle
Simply **click on any group header row** to collapse or expand it.

#### What You'll See

**When Collapsed (▶):**
```
▶ 📁 Group A (3 clients)    [Monthly Hours: Jan: 45, Feb: 50, etc.]  Total: 540
```

**When Expanded (▼):**
```
▼ 📁 Group A (3 clients)
      Client 1    Partner    Manager    [Monthly Hours]    Total
      Client 2    Partner    Manager    [Monthly Hours]    Total
      Client 3    Partner    Manager    [Monthly Hours]    Total
```

### Accessibility Features ♿

Following WCAG guidelines, this feature includes:

- **Keyboard Navigation**: Press `Enter` or `Space` to toggle groups
- **Screen Reader Support**: Uses `aria-expanded` attribute
- **Focus Indicators**: Visual outline when navigating with keyboard
- **Clear Visual Feedback**: Triangle icon (▶/▼) shows current state

## Benefits

✅ **Cleaner Overview**: See all groups at a glance without clutter  
✅ **Quick Totals**: Monthly hours aggregated and visible when collapsed  
✅ **Easy Details**: Click to expand when you need to see individual clients  
✅ **Better Performance**: Less DOM elements visible = faster rendering  
✅ **Accessible**: Works with keyboard and screen readers

## Default Behavior

- All groups **start collapsed** when you import data
- State is **preserved during your session** (collapses/expands remembered)
- After importing new data, groups reset to collapsed state

## Example Workflow

1. **Import** your Excel file → All groups appear collapsed
2. **Scan** the aggregated monthly hours to identify bottlenecks
3. **Click** a specific group to expand and see individual clients
4. **Adjust** assignments as needed
5. **Collapse** the group again to keep your view clean

## Testing Your New Feature

1. Start your server: `npm start`
2. Open: `http://localhost:3000`
3. Import an Excel file with grouped clients
4. You'll see groups are collapsed by default
5. Click any group header to expand/collapse it
6. Try using keyboard: Tab to a group header, press Enter

## Technical Implementation

### JavaScript Changes (app.js)
- Added `collapsedGroups` Set to track state
- Added `toggleGroup()` function
- Added `calculateGroupMonthlyHours()` for aggregation
- Modified `renderTable()` to show/hide client rows
- Groups default to collapsed on import

### CSS Changes (styles.css)
- Added `.group-header` styles for clickable rows
- Added `.expand-icon` for visual indicator
- Added hover and focus states for accessibility
- Smooth transitions for better UX

### Accessibility
- `role="button"` on group headers
- `aria-expanded` attribute (true/false)
- `aria-label` for clear announcements
- `tabindex="0"` for keyboard navigation
- Keyboard event handlers for Enter and Space keys

## Questions?

This feature integrates seamlessly with all existing functionality:
- ✅ Works with search/filter
- ✅ Works with locked clients
- ✅ Works with manager assignments
- ✅ Works with export functionality

Enjoy your cleaner, more organized workload view! 🚀
