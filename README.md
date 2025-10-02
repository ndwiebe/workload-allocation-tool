# Workload Allocation Tool

A professional web application for accounting firms to automatically allocate client workloads to managers based on capacity, workload balancing, and partner preferences.

## ✨ Features

- **📊 Excel Import**: Import client data from Excel files with automatic parsing
- **👥 Manager Management**: Add, remove, and configure manager capacity by month
- **🤖 Smart Allocation**: Automatic workload distribution algorithm that:
  - Balances monthly workloads across all managers
  - Keeps client groups together under one manager
  - Respects manager capacity constraints
  - Uses squared deviation minimization for optimal balance
  - Honors partner preferences with client locking
- **🔒 Partner Preferences**: Import partner preference files to lock specific clients to designated managers
- **🎯 Drag-and-Drop**: Manual adjustment of assignments with intuitive UI
- **🔍 Search & Filter**: Quickly find clients and groups in the allocation board
- **📈 Visual Dashboard**: Real-time workload overview by manager and month
- **📤 Excel Export**: Generate Master List with 3 sheets:
  - Master Data (with formulas)
  - Manager Time By Month
  - Manager Time By Partner
- **💾 Persistent Storage**: All data saved automatically to disk

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ndwiebe/workload-allocation-tool.git
cd workload-allocation-tool
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the server**
```bash
npm start
```

4. **Open your browser**
```
http://127.0.0.1:3000
```

## 📖 Usage Guide

### Step 1: Import Client Data

1. Click **"Import Workload"** button
2. Select your Excel file (.xlsx or .xls)
3. File must contain these columns:
   - `Client Name` - Name of the client
   - `Group` - (Optional) Client group identifier
   - `Primary Partner` - Partner responsible for the client
   - `FYE (Month 1-12)` - Fiscal year end month (1-12)
   - `Work Type` - Type of work (Audit, Tax, etc.)
   - `PTD BHrs` - Hours for this entry
   - `WIP Date` - Date of work in progress

**Note**: If you already have clients loaded, you'll receive a warning before overwriting.

### Step 2: Add Managers

1. Click **"Add Manager"** button
2. Enter manager name (up to 100 characters)
3. Set default monthly capacity (hours)
4. Click **"Add Manager"**

You can:
- Edit capacity for individual months
- Delete managers (assigned clients will become unassigned)
- Add multiple managers before allocation

### Step 3: Import Partner Preferences (Optional)

1. Click **"Import Preferences"** button
2. Select your preferences Excel file
3. File must contain these columns:
   - `Group` - (Optional) Client group name
   - `Client Name` or `Client` - Individual client name
   - `Partner` - Partner name
   - `Proposed Manager` or `Manager` - Desired manager assignment

**How it works:**
- Matches clients/groups from your workload to preference file
- Assigns matched clients to specified managers
- **Locks** these assignments (marked with 🔒)
- Locked clients are excluded from automatic allocation
- You'll see a summary of matched and unmatched preferences

**Unlock clients:**
- Click the lock icon (🔒) on any locked client card
- This allows the client to be reassigned

### Step 4: Run Allocation

1. Click **"Run Allocation"** button
2. Confirm the action
3. The algorithm will:
   - Skip locked clients (from partner preferences)
   - Group remaining clients by Group field (if present)
   - Sort by total hours (largest first)
   - Assign to managers with best fit
   - Balance monthly workloads
   - Respect capacity constraints

### Step 5: Manual Adjustments

After allocation, you can:
- **Drag individual clients** between manager columns
- **Drag entire groups** to move all clients together
- **Search for clients** using the search box
- **View monthly breakdowns** in each manager column
- **Lock/unlock clients** to prevent reassignment
- Changes save automatically

### Step 6: Export Results

1. Click **"Export"** button
2. File downloads as `Master_List.xlsx`
3. Contains 3 sheets with complete allocation data
4. Formulas automatically calculate totals

## 🏗️ Architecture

### Backend (Node.js + Express)

```
server.js                - Main server with API routes
src/
  ├── constants.js       - Centralized constants (MONTH_NAMES)
  ├── import.js          - Excel parsing and data normalization
  ├── storage.js         - Persistent state management
  ├── allocate.js        - Workload balancing algorithm
  ├── export.js          - Excel generation with formulas
  └── partner-preferences.js - Partner preference import and locking
```

### Frontend (Vanilla JavaScript)

```
public/
  ├── index.html         - Main HTML structure
  ├── styles.css         - Responsive styling
  └── app.js             - Interactive UI and drag-drop
```

### Data Storage

```
data/
  └── state.json         - Persistent application state
uploads/                 - Temporary file uploads
output/                  - Generated Excel exports
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/state` | Get current application state |
| POST | `/api/import` | Import workload Excel file |
| POST | `/api/preferences/import` | Import partner preferences |
| POST | `/api/managers` | Add a new manager |
| DELETE | `/api/managers/:name` | Delete a manager |
| PUT | `/api/managers/:name/capacity` | Update manager capacity |
| PATCH | `/api/clients/:id` | Update client assignment |
| PATCH | `/api/clients/:id/lock` | Lock/unlock a client |
| POST | `/api/clients/:id/unlock` | Unlock a specific client |
| POST | `/api/allocate` | Run allocation algorithm |
| GET | `/api/export` | Export to Excel |

## 🛡️ Security Features

- ✅ **Input Validation**: All inputs validated on both client and server
- ✅ **HTML Escaping**: XSS prevention for user-generated content
- ✅ **File Type Validation**: Only .xlsx and .xls files accepted
- ✅ **Size Limits**: 10MB maximum file upload size
- ✅ **Capacity Limits**: Maximum 10,000 hours per month
- ✅ **Error Handling**: Comprehensive error messages without leaking internals
- ✅ **Manager Name Validation**: Length and character restrictions

## 🎨 User Experience Enhancements

- ✅ **Loading Indicators**: Visual feedback during operations
- ✅ **Confirmation Dialogs**: Prevent accidental data loss
- ✅ **Validation Messages**: Clear, actionable error messages
- ✅ **Keyboard Support**: Modal can be closed with Escape key
- ✅ **Responsive Design**: Works on all screen sizes
- ✅ **File Reset**: Can re-import same file multiple times
- ✅ **Search Functionality**: Filter clients and groups
- ✅ **Lock Indicators**: Visual feedback for locked assignments

## 🧮 Allocation Algorithm

The allocation algorithm uses a **cost minimization approach**:

1. **Skip Locked Clients**: Clients locked via partner preferences are excluded
2. **Calculate Targets**: Divide total hours by number of managers
3. **Group Priority**: Assign groups first to keep them together
4. **Size Ordering**: Process largest clients/groups first
5. **Cost Function**: Minimize sum of squared deviations from target
6. **Capacity Checking**: Reject assignments that exceed capacity
7. **Tie Breaking**: Use total load and alphabetical order

**Formula**: 
```
Cost = Σ(projected_load - target)² for all months
```

This ensures balanced workloads across all months while respecting constraints and partner preferences.

## 📊 Excel Export Format

### Sheet 1: Master Data
- Complete client list with monthly hours
- Total column with SUM formulas
- Manager assignments
- Ready for further analysis

### Sheet 2: Manager Time By Month
- Pivot-style summary
- Hours per manager per month
- Grand totals

### Sheet 3: Manager Time By Partner
- Hierarchical breakdown
- Manager → Partner → Total hours
- Easy to see partner distribution

## 🔒 Partner Preferences Workflow

### Creating a Preferences File

Your Excel file should have these columns:

| Group | Client Name | Partner | Proposed Manager |
|-------|-------------|---------|------------------|
| Group A | | John Smith | Alice |
| | Acme Corp | Jane Doe | Bob |

**Rules:**
- If `Group` is specified, all clients in that group are assigned
- If `Client Name` is specified, only that specific client is assigned
- Group preferences take priority
- Manager must exist before importing preferences

### Understanding Lock Status

- 🔒 **Locked**: Client assigned via partner preferences
- 🔓 **Unlocked**: Client can be reassigned by allocation algorithm
- Click lock icon to toggle status

### Best Practices

1. **Import Order**: Import workload → Add managers → Import preferences → Allocate
2. **Verify Managers**: Ensure all managers in preference file exist in the system
3. **Review Results**: Check the import summary for unmatched clients/managers
4. **Lock Strategy**: Only lock clients that must stay with specific managers
5. **Flexibility**: Leave some clients unlocked for optimal workload balancing

## 🐛 Troubleshooting

### Import Fails
- **Check file format**: Must be .xlsx or .xls
- **Verify columns**: Ensure all required columns exist
- **Check data**: Client Name column must have values

### Preferences Not Applied
- **Manager exists**: Proposed managers must be added first
- **Client match**: Client/group names must match exactly (case-insensitive)
- **Check summary**: Review import results for unmatched items

### Allocation Doesn't Balance
- **Review capacity**: Ensure managers have sufficient capacity
- **Check locked clients**: Too many locks can prevent optimal balance
- **Consider groups**: Groups stay together, affecting balance
- **Large clients**: Very large clients may be hard to balance

### Drag-and-Drop Not Working
- **Check browser**: Modern browser required (Chrome, Firefox, Edge, Safari)
- **Locked clients**: Cannot drag locked clients
- **Reload page**: Try refreshing if UI becomes unresponsive

### Export Error
- **Check permissions**: Ensure write access to output folder
- **Verify data**: Need at least one client to export

## 🔄 Data Persistence

State is automatically saved to `data/state.json` after every change:
- Adding/removing managers
- Updating capacity
- Importing clients
- Importing preferences
- Moving clients
- Locking/unlocking clients
- Running allocation

**Backup**: Recommended to periodically back up `data/state.json`

## 🚀 Advanced Usage

### Custom Capacity Patterns
Set different capacity for each month to account for:
- Vacation periods
- Busy seasons (tax season, year-end)
- Part-time schedules

### Re-running Allocation
Run allocation multiple times with different manager setups to find optimal configuration. Locked clients remain assigned.

### Group Management
Use the Group field strategically:
- Group by industry
- Group by service line
- Group by relationship

### Hybrid Approach
Combine partner preferences with automatic allocation:
1. Lock critical client relationships
2. Let algorithm balance remaining work
3. Manually adjust edge cases

## 🤝 Contributing

This tool was built following best practices:
- ✅ Complete JSDoc comments
- ✅ Error handling on all routes
- ✅ Atomic file writes
- ✅ Input validation
- ✅ No placeholder code
- ✅ RESTful API design
- ✅ DRY principle (centralized constants)

## 📝 License

This project is for internal use. All rights reserved.

## 📧 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review error messages carefully
3. Check browser console for details
4. Contact your system administrator

## 🎯 Version History

### Version 1.1.0 (Current)
- ✅ Partner preferences import
- ✅ Client locking functionality
- ✅ Search and filter
- ✅ Centralized constants
- ✅ Enhanced validation
- ✅ Better error messages

### Version 1.0.0
- ✅ Initial release
- ✅ Excel import/export
- ✅ Automatic allocation
- ✅ Drag-and-drop interface
- ✅ Manager capacity management
- ✅ Persistent storage
- ✅ Security enhancements

---

**Built with ❤️ for accounting professionals**
