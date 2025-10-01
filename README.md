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

## Testing Stage 4 (Allocation Algorithm)

The allocation algorithm automatically assigns clients to managers in a balanced way.

**Prerequisites:**
- Have managers added
- Have clients imported

**Test with curl:**

1. **Add some managers:**
   ```bash
   curl -X POST http://127.0.0.1:3000/api/managers -H "Content-Type: application/json" -d '{"name":"Alice"}'
   curl -X POST http://127.0.0.1:3000/api/managers -H "Content-Type: application/json" -d '{"name":"Bob"}'
   curl -X POST http://127.0.0.1:3000/api/managers -H "Content-Type: application/json" -d '{"name":"Carol"}'
   ```

2. **Import an Excel file** (via Postman or browser once frontend is ready)

3. **Run allocation:**
   ```bash
   curl -X POST http://127.0.0.1:3000/api/allocate
   ```

4. **Check results:**
   ```bash
   curl http://127.0.0.1:3000/api/state
   ```

You should see clients now have Manager assignments!

**Test in Browser Console:**
```javascript
// Run allocation
fetch('/api/allocate', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log(data));
```

## Testing Stage 3 (Backend API)

Start the server and test API endpoints:

```bash
npm start
```

In another terminal or browser:

1. **Test getting state:**
   ```bash
   curl http://127.0.0.1:3000/api/state
   ```

2. **Test adding a manager:**
   ```bash
   curl -X POST http://127.0.0.1:3000/api/managers \
     -H "Content-Type: application/json" \
     -d '{"name":"Alice"}'
   ```

3. **Open in browser:**
   Visit `http://127.0.0.1:3000`

## Testing Stage 2 (Excel Import)

1. Place your Excel file in the project folder
2. Update the filename in `test-import.js`
3. Run the test:
   ```bash
   node test-import.js
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
├── public/            # Frontend files (coming in Stage 5)
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
- ⏳ Stage 5: Frontend Structure
- ⏳ Stage 6: Frontend Logic
- ⏳ Stage 7: Excel Export