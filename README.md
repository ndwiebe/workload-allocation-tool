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
│   └── import.js      # Excel import logic
├── public/            # Frontend files
├── data/              # Persistent storage
├── output/            # Exported Excel files
├── uploads/           # Temporary file uploads
├── package.json       # Dependencies
└── test-import.js     # Test script
```

## Development Stages

- ✅ Stage 1: Project Setup
- ✅ Stage 2: Excel Import
- ⏳ Stage 3: Backend API
- ⏳ Stage 4: Allocation Algorithm
- ⏳ Stage 5: Frontend Structure
- ⏳ Stage 6: Frontend Logic
- ⏳ Stage 7: Excel Export