const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importExcel } = require('./src/import');
const { loadState, saveState } = require('./src/storage');
const { allocate } = require('./src/allocate');
const { exportToExcel } = require('./src/export');
const { importPartnerPreferences, applyPartnerPreferences } = require('./src/partner-preferences');
const { MONTH_NAMES, createMonthObject } = require('./src/constants');

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
    allowedExts.includes(ext) ? cb(null, true) : cb(new Error('Only Excel files allowed (.xlsx or .xls)'));
  }
});

/**
 * Validate manager name format
 * @param {string} name - Manager name to validate
 * @throws {Error} If name is invalid
 */
function validateManagerName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Manager name is required');
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    throw new Error('Manager name cannot be empty');
  }
  
  if (trimmedName.length > 100) {
    throw new Error('Manager name is too long (maximum 100 characters)');
  }
  
  return trimmedName;
}

/**
 * Validate capacity value
 * @param {number} value - Capacity value to validate
 * @param {string} fieldName - Name of field for error message
 * @throws {Error} If value is invalid
 */
function validateCapacity(value, fieldName = 'Capacity') {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  
  if (numValue < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
  
  if (numValue > 10000) {
    throw new Error(`${fieldName} is too large (maximum 10,000 hours)`);
  }
  
  return numValue;
}

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
 * POST /api/preferences/import
 * Import partner preferences Excel file and lock clients
 */
app.post('/api/preferences/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }
    
    const state = await loadState();
    
    if (state.clients.length === 0) {
      throw new Error('Please import workload data first');
    }
    
    if (state.managers.length === 0) {
      throw new Error('Please add managers first');
    }
    
    const preferences = importPartnerPreferences(req.file.path);
    
    fs.unlinkSync(req.file.path);
    
    const results = applyPartnerPreferences(state.clients, preferences, state.managers);
    
    await saveState(state);
    
    res.json({ 
      success: true, 
      message: `Locked ${results.matched} clients`,
      results,
      state 
    });
  } catch (error) {
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
    
    // Validate and sanitize manager name
    const validatedName = validateManagerName(name);
    
    const state = await loadState();
    
    // Check if manager already exists (case-insensitive)
    const existingManager = state.managers.find(
      m => m.toLowerCase() === validatedName.toLowerCase()
    );
    
    if (existingManager) {
      throw new Error(`Manager "${existingManager}" already exists`);
    }
    
    // Validate capacity if provided
    let validatedCapacity;
    if (capacity) {
      validatedCapacity = {};
      
      MONTH_NAMES.forEach(month => {
        if (capacity[month] !== undefined) {
          validatedCapacity[month] = validateCapacity(capacity[month], `${month} capacity`);
        } else {
          validatedCapacity[month] = 100; // Default
        }
      });
    } else {
      // Default 100 hours per month if not provided
      validatedCapacity = createMonthObject(100);
    }
    
    // Add manager to list
    state.managers.push(validatedName);
    state.managerCapacity[validatedName] = validatedCapacity;
    
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
    
    if (!name) {
      throw new Error('Manager name is required');
    }
    
    const state = await loadState();
    
    // Check if manager exists
    if (!state.managers.includes(name)) {
      throw new Error(`Manager "${name}" not found`);
    }
    
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
    const { month, hours, allMonths, capacity } = req.body;
    
    const state = await loadState();
    
    if (!state.managers.includes(name)) {
      throw new Error(`Manager "${name}" not found`);
    }
    
    // Handle capacity object from frontend settings modal (FIX #3)
    if (capacity) {
      MONTH_NAMES.forEach(m => {
        if (capacity[m] !== undefined) {
          const validatedHours = validateCapacity(capacity[m], `${m} capacity`);
          state.managerCapacity[name][m] = validatedHours;
        }
      });
    }
    // Update all months with the same value
    else if (allMonths !== undefined) {
      const validatedHours = validateCapacity(allMonths, 'Monthly capacity');
      
      MONTH_NAMES.forEach(m => {
        state.managerCapacity[name][m] = validatedHours;
      });
    } 
    // Update specific month
    else if (month && hours !== undefined) {
      // Validate month name
      if (!MONTH_NAMES.includes(month)) {
        throw new Error(`Invalid month: ${month}. Must be one of: ${MONTH_NAMES.join(', ')}`);
      }
      
      const validatedHours = validateCapacity(hours, `${month} capacity`);
      state.managerCapacity[name][month] = validatedHours;
    } else {
      throw new Error('Must provide either capacity object, allMonths, or both month and hours');
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
    
    if (!id) {
      throw new Error('Client ID is required');
    }
    
    const state = await loadState();
    
    // Find the client
    const client = state.clients.find(c => c.id === id);
    if (!client) {
      throw new Error(`Client not found with ID: ${id}`);
    }
    
    // If assigning to a manager, validate manager exists
    if (Manager && Manager !== '') {
      if (!state.managers.includes(Manager)) {
        throw new Error(`Manager "${Manager}" not found`);
      }
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
 * PATCH /api/clients/:id/lock
 * Lock or unlock a client
 */
app.patch('/api/clients/:id/lock', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { locked } = req.body;
    
    const state = await loadState();
    
    const client = state.clients.find(c => c.id === id);
    if (!client) {
      throw new Error('Client not found');
    }
    
    client.locked = locked === true;
    
    await saveState(state);
    
    res.json({ success: true, state });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/clients/:id/unlock
 * Unlock a client (FIX #2)
 */
app.post('/api/clients/:id/unlock', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const state = await loadState();
    
    const client = state.clients.find(c => c.id === id);
    if (!client) {
      throw new Error('Client not found');
    }
    
    client.locked = false;
    
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
      throw new Error('No managers defined. Please add at least one manager before running allocation.');
    }
    
    if (state.clients.length === 0) {
      throw new Error('No clients to allocate. Please import client data first.');
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
      throw new Error('No clients to export. Please import client data first.');
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
  
  // Determine appropriate status code
  let statusCode = 500;
  if (err.message.includes('not found')) {
    statusCode = 404;
  } else if (err.message.includes('required') || 
             err.message.includes('invalid') ||
             err.message.includes('must be') ||
             err.message.includes('cannot be') ||
             err.message.includes('already exists')) {
    statusCode = 400;
  }
  
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
