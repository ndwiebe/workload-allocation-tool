const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');

/**
 * Import Excel file and convert to client data structure
 * @param {string} filePath - Path to Excel file
 * @returns {Array} Array of client objects with monthly hours
 */
function importExcel(filePath) {
  // Read the Excel file with proper options per SheetJS documentation
  // cellFormula: Extract formulas from cells
  // cellDates: Parse dates correctly
  // sheetRows: 0 means read all rows
  const workbook = XLSX.readFile(filePath, {
    cellFormula: true,
    cellDates: true,
    sheetRows: 0
  });
  
  // Get the first sheet
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const headerRow = findHeaderRow(sheet);
  
  // Convert sheet to array of objects using SheetJS sheet_to_json
  const rows = XLSX.utils.sheet_to_json(sheet, {
    range: headerRow,
    raw: false,
    defval: null
  });
  
  // Clean up and normalize the data
  const normalized = rows.map(row => {
    const trimmedRow = {};
    Object.keys(row).forEach(key => {
      const value = row[key];
      trimmedRow[key.trim()] = typeof value === 'string' ? value.trim() : value;
    });
    
    return {
      Client: trimmedRow['Client Name'] || '',
      Group: trimmedRow['Group'] || '',
      Partner: trimmedRow['Primary Partner'] || '',
      YearEnd: parseInt(trimmedRow['FYE (Month 1-12)']) || 1,
      Type: trimmedRow['Work Type'] || '',
      hours: parseFloat(trimmedRow['PTD BHrs']) || 0,
      month: parseWIPDate(trimmedRow['WIP Date'], parseInt(trimmedRow['FYE (Month 1-12)']))
    };
  });
  
  // Group by client and sum monthly hours
  const aggregated = aggregateByClientAndMonth(normalized);
  
  // Create final client objects with all 12 months
  const clients = aggregated.map(agg => ({
    id: uuidv4(),
    Group: agg.Group,
    Client: agg.Client,
    YearEnd: agg.YearEnd,
    Type: agg.Type,
    Partner: agg.Partner,
    Manager: '',
    months: {
      January: agg.monthlyHours['January'] || 0,
      February: agg.monthlyHours['February'] || 0,
      March: agg.monthlyHours['March'] || 0,
      April: agg.monthlyHours['April'] || 0,
      May: agg.monthlyHours['May'] || 0,
      June: agg.monthlyHours['June'] || 0,
      July: agg.monthlyHours['July'] || 0,
      August: agg.monthlyHours['August'] || 0,
      September: agg.monthlyHours['September'] || 0,
      October: agg.monthlyHours['October'] || 0,
      November: agg.monthlyHours['November'] || 0,
      December: agg.monthlyHours['December'] || 0
    },
    Total: sumAllMonths(agg.monthlyHours)
  }));
  
  return clients;
}

/**
 * Find the row containing headers in the Excel sheet
 * @param {Object} worksheet - Excel worksheet object
 * @returns {number} Row number where headers are found
 */
function findHeaderRow(worksheet) {
  if (!worksheet['!ref']) return 0;
  
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const headerKeywords = ['Client Name', 'PTD BHrs', 'WIP Date'];
  
  // Search first 10 rows for header keywords
  for (let row = 0; row <= Math.min(10, range.e.r); row++) {
    for (let col = 0; col <= Math.min(5, range.e.c); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v) {
        const cellValue = String(cell.v);
        if (headerKeywords.some(keyword => cellValue.includes(keyword))) {
          return row;
        }
      }
    }
  }
  
  return 0;
}

/**
 * Parse WIP Date and determine which month it belongs to
 * @param {string|Date} wipDate - WIP date from Excel
 * @param {number} yearEnd - Fiscal year end month (1-12)
 * @returns {string} Month name
 */
function parseWIPDate(wipDate, yearEnd) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // If no WIP date, default to month after year end
  if (!wipDate) {
    const monthIndex = (yearEnd + 1) % 12;
    return monthNames[monthIndex];
  }
  
  // Try to parse the date
  const date = wipDate instanceof Date ? wipDate : new Date(wipDate);
  
  // If invalid date, use default
  if (isNaN(date.getTime())) {
    const monthIndex = (yearEnd + 1) % 12;
    return monthNames[monthIndex];
  }
  
  // Return the month name
  return monthNames[date.getMonth()];
}

/**
 * Aggregate rows by client and sum hours by month
 * @param {Array} rows - Normalized row data
 * @returns {Array} Aggregated client data
 */
function aggregateByClientAndMonth(rows) {
  const clientMap = new Map();
  
  rows.forEach(row => {
    if (!row.Client) return;
    
    // Create client entry if it doesn't exist
    if (!clientMap.has(row.Client)) {
      clientMap.set(row.Client, {
        Client: row.Client,
        Group: row.Group,
        Partner: row.Partner,
        YearEnd: row.YearEnd,
        Type: row.Type,
        monthlyHours: {}
      });
    }
    
    // Add hours to the appropriate month
    const client = clientMap.get(row.Client);
    const month = row.month;
    client.monthlyHours[month] = (client.monthlyHours[month] || 0) + row.hours;
  });
  
  return Array.from(clientMap.values());
}

/**
 * Sum all monthly hours to get total
 * @param {Object} monthlyHours - Object with month names as keys
 * @returns {number} Total hours across all months
 */
function sumAllMonths(monthlyHours) {
  return Object.values(monthlyHours).reduce((sum, hours) => sum + hours, 0);
}

module.exports = { importExcel };