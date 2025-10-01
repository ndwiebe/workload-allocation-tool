const fs = require('fs').promises;
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/state.json');

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path to ensure exists
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Load application state from JSON file
 * @returns {Promise<Object>} State object with managers, capacity, and clients
 */
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default state
    if (error.code === 'ENOENT') {
      return {
        managers: [],
        managerCapacity: {},
        clients: []
      };
    }
    throw error;
  }
}

/**
 * Save application state to JSON file
 * Uses atomic write operation (write to temp file, then rename)
 * @param {Object} state - State object to save
 */
async function saveState(state) {
  const tempPath = `${STATE_FILE}.tmp`;
  
  try {
    // Ensure data directory exists
    await ensureDirectory(path.dirname(STATE_FILE));
    
    // Write to temporary file first
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8');
    
    // Atomic rename (replaces original file)
    await fs.rename(tempPath, STATE_FILE);
  } catch (error) {
    // Clean up temp file if something went wrong
    try {
      await fs.unlink(tempPath);
    } catch {}
    throw error;
  }
}

module.exports = { loadState, saveState };