const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importExcel } = require('./src/import');
const { loadState, saveState } = require('./src/storage');
const { allocate } = require('./src/allocate');
const { exportToExcel } = require('./src/export');

const app = express();
const PORT = 3000;
const HOST = '127.0.0.1';

// Ensure required directories exist at startup
const requiredDirs = ['./data', './uploads', './output'];
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Middleware - order matters!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  dest: './uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowedExts.includes(ext) ? cb(null, true) : cb(new Error('Only Excel files'));
  }
});

/**
 * GET /api/state
 * Get current application state
 */
app.get('/api/state', async (req, res, next) => {
  try {
    const state = await loadState();
    res.json({ success: true, state });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/import
 * Import Excel file and parse clients
 */
app.post('/api/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }
    
    // Import the Excel file
    const clients = importExcel(req.file.path);
    
    // Delete the uploaded file
    fs.unlinkSync(req.file.path);
    
    // Load current state and update with new clients
    const state = await loadState();
    state.clients = clients;
    await saveState(state);
    
    res.json({ success: true, message: `Imported ${clients.length} clients`, state });
  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    next(error);
  }
});

/**
 * POST /api/managers
 * Add a new manager
 */
app.post('/api/managers', async (req, res, next) => {
  try {
    const { name, capacity } = req.body;
    
    if (!name) {
      throw new Error('Manager name required');
    }
    
    const state = await loadState();
    
    // Check if manager already exists
    if (state.managers.includes(name)) {
      throw new Error('Manager already exists');
    }
    
    // Add manager to list
    state.managers.push(name);
    
    // Set capacity (default 100 hours per month if not provided)
    state.managerCapacity[name] = capacity || {
      January: 100, February: 100, March: 100, April: 100,
      May: 100, June: 100, July: 100, August: 100,
      September: 100, October: 100, November: 100, December: 100
    };
    
    await saveState(state);
    
    res.json({ success: true, message: 'Manager added', state });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/managers/:name
 * Delete a manager
 */
app.delete('/api/managers/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    
    const state = await loadState();
    
    // Remove manager from list
    state.managers = state.managers.filter(m => m !== name);
    delete state.managerCapacity[name];
    
    // Unassign clients from this manager
    state.clients.forEach(client => {
      if (client.Manager === name) {
        client.Manager = '';
      }
    });
    
    await saveState(state);
    
    res.json({ success: true, message: 'Manager deleted', state });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/managers/:name/capacity
 * Update manager capacity
 */
app.put('/api/managers/:name/capacity', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { month, hours, allMonths } = req.body;
    
    const state = await loadState();
    
    if (!state.managers.includes(name)) {
      throw new Error('Manager not found');
    }
    
    // Update all months with the same value
    if (allMonths !== undefined) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      monthNames.forEach(m => {
        state.managerCapacity[name][m] = allMonths;
      });
    } 
    // Update specific month
    else if (month && hours !== undefined) {
      state.managerCapacity[name][month] = hours;
    } else {
      throw new Error('Must provide either allMonths or month and hours');
    }
    
    await saveState(state);
    
    res.json({ success: true, message: 'Capacity updated', state });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/clients/:id
 * Update client assignment (e.g., change manager)
 */
app.patch('/api/clients/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Manager } = req.body;
    
    const state = await loadState();
    
    // Find the client
    const client = state.clients.find(c => c.id === id);
    if (!client) {
      throw new Error('Client not found');
    }
    
    // Update manager assignment
    client.Manager = Manager || '';
    
    await saveState(state);
    
    res.json({ success: true, state });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/allocate
 * Run the allocation algorithm to automatically assign clients to managers
 */
app.post('/api/allocate', async (req, res, next) => {
  try {
    const state = await loadState();
    
    if (state.managers.length === 0) {
      throw new Error('No managers defined');
    }
    
    if (state.clients.length === 0) {
      throw new Error('No clients to allocate');
    }
    
    // Run the allocation algorithm
    // This modifies the clients array in place
    allocate(state.managers, state.clients, state.managerCapacity);
    
    await saveState(state);
    
    res.json({ success: true, message: 'Allocation complete', state });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export
 * Export current allocation to Excel file
 */
app.get('/api/export', async (req, res, next) => {
  try {
    const state = await loadState();
    
    if (state.clients.length === 0) {
      throw new Error('No clients to export');
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate the Excel file
    const outputPath = path.join(outputDir, 'Master_List.xlsx');
    exportToExcel(state, outputPath);
    
    // Send file for download
    res.download(outputPath, 'Master_List.xlsx', (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Error handling middleware
 * MUST have 4 parameters and be LAST
 */
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});