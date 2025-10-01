# Workload Allocation Tool

A professional web application for accounting firms to automatically allocate client workloads to managers based on capacity and workload balancing.

## ✨ Features

- **📊 Excel Import**: Import client data from Excel files with automatic parsing
- **👥 Manager Management**: Add, remove, and configure manager capacity by month
- **🤖 Smart Allocation**: Automatic workload distribution algorithm that:
  - Balances monthly workloads across all managers
  - Keeps client groups together under one manager
  - Respects manager capacity constraints
  - Uses squared deviation minimization for optimal balance
- **🎯 Drag-and-Drop**: Manual adjustment of assignments with intuitive UI
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

1. Click **"Import Excel"** button
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

### Step 3: Run Allocation

1. Click **"Run Allocation"** button
2. Confirm the action
3. The algorithm will:
   - Group clients by Group field (if present)
   - Sort by total hours (largest first)
   - Assign to managers with best fit
   - Balance monthly workloads
   - Respect capacity constraints

### Step 4: Manual Adjustments

After allocation, you can:
- **Drag individual clients** between manager columns
- **Drag entire groups** to move all clients together
- **View monthly breakdowns** in each manager column
- Changes save automatically

### Step 5: Export Results

1. Click **"Export to Excel"** button
2. File downloads as `Master_List.xlsx`
3. Contains 3 sheets with complete allocation data
4. Formulas automatically calculate totals

## 🏗️ Architecture

### Backend (Node.js + Express)

```
server.js           - Main server with API routes
src/
  ├── import.js     - Excel parsing and data normalization
  ├── storage.js    - Persistent state management
  ├── allocate.js   - Workload balancing algorithm
  └── export.js     - Excel generation with formulas
```

### Frontend (Vanilla JavaScript)

```
public/
  ├── index.html    - Main HTML structure
  ├── styles.css    - Responsive styling
  └── app.js        - Interactive UI and drag-drop
```

### Data Storage

```
data/
  └── state.json    - Persistent application state
uploads/            - Temporary file uploads
output/             - Generated Excel exports
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/state` | Get current application state |
| POST | `/api/import` | Import Excel file |
| POST | `/api/managers` | Add a new manager |
| DELETE | `/api/managers/:name` | Delete a manager |
| PUT | `/api/managers/:name/capacity` | Update manager capacity |
| PATCH | `/api/clients/:id` | Update client assignment |
| POST | `/api/allocate` | Run allocation algorithm |
| GET | `/api/export` | Export to Excel |

## 🛡️ Security Features

- ✅ **Input Validation**: All inputs validated on both client and server
- ✅ **HTML Escaping**: XSS prevention for user-generated content
- ✅ **File Type Validation**: Only .xlsx and .xls files accepted
- ✅ **Size Limits**: 10MB maximum file upload size
- ✅ **Capacity Limits**: Maximum 10,000 hours per month
- ✅ **Error Handling**: Comprehensive error messages without leaking internals

## 🎨 User Experience Enhancements

- ✅ **Loading Indicators**: Visual feedback during operations
- ✅ **Confirmation Dialogs**: Prevent accidental data loss
- ✅ **Validation Messages**: Clear, actionable error messages
- ✅ **Keyboard Support**: Modal can be closed with Escape key
- ✅ **Responsive Design**: Works on all screen sizes
- ✅ **File Reset**: Can re-import same file multiple times

## 🧮 Allocation Algorithm

The allocation algorithm uses a **cost minimization approach**:

1. **Calculate Targets**: Divide total hours by number of managers
2. **Group Priority**: Assign groups first to keep them together
3. **Size Ordering**: Process largest clients/groups first
4. **Cost Function**: Minimize sum of squared deviations from target
5. **Capacity Checking**: Reject assignments that exceed capacity
6. **Tie Breaking**: Use total load and alphabetical order

**Formula**: 
```
Cost = Σ(projected_load - target)² for all months
```

This ensures balanced workloads across all months while respecting constraints.

## 📊 Excel Export Format

### Sheet 1: Master Data
- Complete client list with monthly hours
- Total column with SUM formulas
- Ready for further analysis

### Sheet 2: Manager Time By Month
- Pivot-style summary
- Hours per manager per month
- Grand totals

### Sheet 3: Manager Time By Partner
- Hierarchical breakdown
- Manager → Partner → Total hours
- Easy to see partner distribution

## 🐛 Troubleshooting

### Import Fails
- **Check file format**: Must be .xlsx or .xls
- **Verify columns**: Ensure all required columns exist
- **Check data**: Client Name column must have values

### Allocation Doesn't Balance
- **Review capacity**: Ensure managers have sufficient capacity
- **Check client hours**: Very large clients may be hard to balance
- **Consider groups**: Groups stay together, affecting balance

### Drag-and-Drop Not Working
- **Check browser**: Modern browser required (Chrome, Firefox, Edge, Safari)
- **Reload page**: Try refreshing if UI becomes unresponsive

### Export Error
- **Check permissions**: Ensure write access to output folder
- **Verify data**: Need at least one client to export

## 🔄 Data Persistence

State is automatically saved to `data/state.json` after every change:
- Adding/removing managers
- Updating capacity
- Importing clients
- Moving clients
- Running allocation

**Backup**: Recommended to periodically back up `data/state.json`

## 🚀 Advanced Usage

### Custom Capacity Patterns
You can set different capacity for each month to account for:
- Vacation periods
- Busy seasons (tax season, year-end)
- Part-time schedules

### Re-running Allocation
You can run allocation multiple times with different manager setups to find the optimal configuration.

### Group Management
Use the Group field strategically:
- Group by industry
- Group by service line
- Group by relationship

## 🤝 Contributing

This tool was built following best practices:
- ✅ Complete JSDoc comments
- ✅ Error handling on all routes
- ✅ Atomic file writes
- ✅ Input validation
- ✅ No placeholder code
- ✅ RESTful API design

## 📝 License

This project is for internal use. All rights reserved.

## 📧 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review error messages carefully
3. Check browser console for details
4. Contact your system administrator

## 🎯 Version History

### Version 1.0.0 (Current)
- ✅ Initial release
- ✅ Excel import/export
- ✅ Automatic allocation
- ✅ Drag-and-drop interface
- ✅ Manager capacity management
- ✅ Persistent storage
- ✅ Loading indicators
- ✅ Security enhancements
- ✅ Input validation

---

**Built with ❤️ for accounting professionals**