const XLSX = require('xlsx');
const path = require('path');

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Export state to Excel file with 3 sheets
 * @param {Object} state - Application state with managers and clients
 * @param {string} outputPath - Where to save the Excel file
 */
function exportToExcel(state, outputPath) {
  const workbook = XLSX.utils.book_new();
  
  // Create all 3 sheets
  const masterData = createMasterDataSheet(state.clients);
  const managerTimeByMonth = createManagerTimeByMonthSheet(state.clients, state.managers);
  const managerTimeByPartner = createManagerTimeByPartnerSheet(state.clients, state.managers);
  
  // Add sheets to workbook
  XLSX.utils.book_append_sheet(workbook, masterData, 'Master Data');
  XLSX.utils.book_append_sheet(workbook, managerTimeByMonth, 'Manager Time By Month');
  XLSX.utils.book_append_sheet(workbook, managerTimeByPartner, 'Manager Time By Partner');
  
  // Write file to disk
  XLSX.writeFile(workbook, outputPath);
}

/**
 * Create Master Data sheet with all clients and monthly breakdowns
 * @param {Array} clients - Array of client objects
 * @returns {Object} XLSX worksheet object
 */
function createMasterDataSheet(clients) {
  // Build data array with all columns
  const data = clients.map(client => ({
    'Group': client.Group || '',
    'Client': client.Client,
    'Year-End': client.YearEnd,
    'Type': client.Type,
    'Partner': client.Partner,
    '2027': '',
    'Manager': client.Manager || '',
    'January': client.months.January || '',
    'February': client.months.February || '',
    'March': client.months.March || '',
    'April': client.months.April || '',
    'May': client.months.May || '',
    'June': client.months.June || '',
    'July': client.months.July || '',
    'August': client.months.August || '',
    'September': client.months.September || '',
    'October': client.months.October || '',
    'November': client.months.November || '',
    'December': client.months.December || '',
    'Total': ''
  }));
  
  // Convert to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Add SUM formulas to Total column (column T, index 19)
  // Formulas sum columns H through S (January through December)
  for (let i = 0; i < clients.length; i++) {
    const rowNum = i + 2; // +2 because row 1 is headers, and we're 0-indexed
    const cellAddress = XLSX.utils.encode_cell({ r: rowNum - 1, c: 19 });
    worksheet[cellAddress] = {
      f: `SUM(H${rowNum}:S${rowNum})`,
      t: 'n'
    };
  }
  
  return worksheet;
}

/**
 * Create Manager Time By Month sheet (pivot-style summary)
 * @param {Array} clients - Array of client objects
 * @param {Array} managers - Array of manager names
 * @returns {Object} XLSX worksheet object
 */
function createManagerTimeByMonthSheet(clients, managers) {
  const managerData = managers.map(manager => {
    const managerClients = clients.filter(c => c.Manager === manager);
    
    const row = {
      'Row Labels': manager
    };
    
    let totalHours = 0;
    
    // Sum up hours for each month
    monthNames.forEach(month => {
      const monthTotal = managerClients.reduce((sum, client) => {
        return sum + (client.months[month] || 0);
      }, 0);
      row[`Sum of ${month}`] = monthTotal;
      totalHours += monthTotal;
    });
    
    row['Sum of Total'] = totalHours;
    
    return row;
  });
  
  // Add Grand Total row
  const grandTotalRow = {
    'Row Labels': 'Grand Total'
  };
  
  let grandTotal = 0;
  
  monthNames.forEach(month => {
    const monthGrandTotal = clients.reduce((sum, client) => {
      return sum + (client.months[month] || 0);
    }, 0);
    grandTotalRow[`Sum of ${month}`] = monthGrandTotal;
    grandTotal += monthGrandTotal;
  });
  
  grandTotalRow['Sum of Total'] = grandTotal;
  
  managerData.push(grandTotalRow);
  
  return XLSX.utils.json_to_sheet(managerData);
}

/**
 * Create Manager Time By Partner sheet (hierarchical breakdown)
 * @param {Array} clients - Array of client objects
 * @param {Array} managers - Array of manager names
 * @returns {Object} XLSX worksheet object
 */
function createManagerTimeByPartnerSheet(clients, managers) {
  const data = [];
  
  // For each manager, create a section
  managers.forEach(manager => {
    const managerClients = clients.filter(c => c.Manager === manager);
    
    // Group clients by partner
    const partnerGroups = {};
    managerClients.forEach(client => {
      if (!partnerGroups[client.Partner]) {
        partnerGroups[client.Partner] = [];
      }
      partnerGroups[client.Partner].push(client);
    });
    
    // Add manager header row (empty values for monthly columns)
    data.push({
      'Row Labels': manager,
      'Sum of January': '',
      'Sum of February': '',
      'Sum of March': '',
      'Sum of April': '',
      'Sum of May': '',
      'Sum of June': '',
      'Sum of July': '',
      'Sum of August': '',
      'Sum of September': '',
      'Sum of October': '',
      'Sum of November': '',
      'Sum of December': '',
      'Sum of Total': ''
    });
    
    // Add partner breakdown rows (indented with 2 spaces)
    Object.keys(partnerGroups).forEach(partner => {
      const partnerClients = partnerGroups[partner];
      
      const row = {
        'Row Labels': `  ${partner}` // 2 spaces for indentation
      };
      
      let totalHours = 0;
      
      monthNames.forEach(month => {
        const monthTotal = partnerClients.reduce((sum, client) => {
          return sum + (client.months[month] || 0);
        }, 0);
        row[`Sum of ${month}`] = monthTotal;
        totalHours += monthTotal;
      });
      
      row['Sum of Total'] = totalHours;
      
      data.push(row);
    });
  });
  
  // Add Grand Total row
  const grandTotalRow = {
    'Row Labels': 'Grand Total'
  };
  
  let grandTotal = 0;
  
  monthNames.forEach(month => {
    const monthGrandTotal = clients.reduce((sum, client) => {
      return sum + (client.months[month] || 0);
    }, 0);
    grandTotalRow[`Sum of ${month}`] = monthGrandTotal;
    grandTotal += monthGrandTotal;
  });
  
  grandTotalRow['Sum of Total'] = grandTotal;
  
  data.push(grandTotalRow);
  
  return XLSX.utils.json_to_sheet(data);
}

module.exports = { exportToExcel };