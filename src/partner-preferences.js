const XLSX = require('xlsx');

/**
 * Import partner preferences from Excel file
 * @param {string} filePath - Path to the Excel file
 * @returns {Array} Array of preference objects
 */
function importPartnerPreferences(filePath) {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    cellFormula: true,
    sheetRows: 0
  });
  
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null
  });
  
  const preferences = rows.map(row => {
    const trimmedRow = {};
    Object.keys(row).forEach(key => {
      const value = row[key];
      trimmedRow[key.trim()] = typeof value === 'string' ? value.trim() : value;
    });
    
    return {
      Group: trimmedRow['Group'] || '',
      Client: trimmedRow['Client Name'] || trimmedRow['Client'] || '',
      Partner: trimmedRow['Partner'] || '',
      ProposedManager: trimmedRow['Proposed Manager'] || trimmedRow['Manager'] || ''
    };
  }).filter(pref => pref.ProposedManager);
  
  return preferences;
}

/**
 * Apply partner preferences to clients
 * @param {Array} clients - Array of client objects
 * @param {Array} preferences - Array of preference objects
 * @param {Array} managers - Array of manager names
 * @returns {Object} Result with matched/unmatched counts
 */
function applyPartnerPreferences(clients, preferences, managers) {
  const results = {
    matched: 0,
    unmatchedClients: [],
    unmatchedManagers: [],
    lockedClients: []
  };
  
  preferences.forEach(pref => {
    if (!managers.includes(pref.ProposedManager)) {
      results.unmatchedManagers.push({
        manager: pref.ProposedManager,
        client: pref.Client || pref.Group
      });
      return;
    }
    
    let matched = false;
    
    if (pref.Group) {
      const groupClients = clients.filter(c => c.Group === pref.Group);
      
      if (groupClients.length > 0) {
        groupClients.forEach(client => {
          client.Manager = pref.ProposedManager;
          client.locked = true;
          results.lockedClients.push({
            client: client.Client,
            group: client.Group,
            manager: pref.ProposedManager
          });
        });
        results.matched += groupClients.length;
        matched = true;
      }
    }
    
    if (pref.Client && !matched) {
      const client = clients.find(c => 
        c.Client.toLowerCase() === pref.Client.toLowerCase()
      );
      
      if (client) {
        client.Manager = pref.ProposedManager;
        client.locked = true;
        results.lockedClients.push({
          client: client.Client,
          group: client.Group,
          manager: pref.ProposedManager
        });
        results.matched++;
        matched = true;
      }
    }
    
    if (!matched) {
      results.unmatchedClients.push({
        client: pref.Client || '',
        group: pref.Group || '',
        manager: pref.ProposedManager
      });
    }
  });
  
  return results;
}

module.exports = { importPartnerPreferences, applyPartnerPreferences };