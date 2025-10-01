# Workload Allocation Tool

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start server:
   ```bash
   npm start
   ```

3. Open browser:
   ```
   http://127.0.0.1:3000
   ```

## Testing Stage 5 (Frontend Structure)

The visual interface is now live! Start the server and visit http://127.0.0.1:3000

**What you'll see:**
- ✅ Header with 4 action buttons
- ✅ Manager capacity section (empty until you add managers)
- ✅ Allocation board (empty until you import clients)
- ✅ Professional styling and layout

**Note:** Buttons won't do anything yet - functionality comes in Stage 6!

You can inspect the HTML structure and CSS styling. The interface is fully responsive and ready for interactivity.

## Testing Stage 4 (Allocation Algorithm)

The allocation algorithm automatically assigns clients to managers in a balanced way.

**Test with curl:**

1. **Add some managers:**
   ```bash
   curl -X POST http://127.0.0.1:3000/api/managers -H "Content-Type: application/json" -d '{"name":"Alice"}'
   curl -X POST http://127.0.0.1:3000/api/managers -H "Content-Type: application/json" -d '{"name":"Bob"}'
   ```

2. **Run allocation:**
   ```bash
   curl -X POST http://127.0.0.1:3000/api/allocate
   ```

## Usage

1. Import Excel file
2. Add managers
3. Set capacity
4. Run allocation
5. Adjust via drag-drop
6. Export results

## Project Structure

```
workload-allocation/
├── src/
│   ├── import.js      # Excel import logic
│   ├── storage.js     # Data persistence
│   └── allocate.js    # Allocation algorithm
├── public/
│   ├── index.html     # Frontend structure
│   ├── styles.css     # Professional styling
│   └── app.js         # JavaScript (Stage 6)
├── data/              # Persistent storage (auto-created)
├── output/            # Exported Excel files
├── uploads/           # Temporary file uploads (auto-created)
├── server.js          # Express API server
├── package.json       # Dependencies
└── test-import.js     # Test script
```

## API Endpoints

- `GET /api/state` - Get current state
- `POST /api/import` - Import Excel file
- `POST /api/managers` - Add manager
- `DELETE /api/managers/:name` - Delete manager
- `PUT /api/managers/:name/capacity` - Update capacity
- `PATCH /api/clients/:id` - Update client assignment
- `POST /api/allocate` - Run allocation algorithm

## Development Stages

- ✅ Stage 1: Project Setup
- ✅ Stage 2: Excel Import
- ✅ Stage 3: Backend API & Storage
- ✅ Stage 4: Allocation Algorithm
- ✅ Stage 5: Frontend Structure (HTML & CSS)
- ⏳ Stage 6: Frontend Logic (JavaScript & Drag-Drop)
- ⏳ Stage 7: Excel Export