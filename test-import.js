const { importExcel } = require('./src/import');

// Replace 'Team_A_Sample.xlsx' with your actual Excel file name
// Make sure the file is in the same folder as this test script

try {
  const result = importExcel('./Team_A_Sample.xlsx');
  
  console.log('✅ Import successful!');
  console.log('Imported clients:', result.length);
  console.log('\nFirst client example:');
  console.log(JSON.stringify(result[0], null, 2));
  
  if (result.length > 0) {
    console.log('\n📊 Summary:');
    console.log('Total clients:', result.length);
    console.log('Total hours:', result.reduce((sum, c) => sum + c.Total, 0).toFixed(2));
    console.log('Groups:', [...new Set(result.map(c => c.Group).filter(g => g))].join(', '));
    console.log('Partners:', [...new Set(result.map(c => c.Partner))].join(', '));
  }
} catch (error) {
  console.error('❌ Error importing Excel file:');
  console.error(error.message);
  console.error('\nMake sure:');
  console.error('1. You have an Excel file named "Team_A_Sample.xlsx" in this folder');
  console.error('2. The file has columns: Client Name, PTD BHrs, WIP Date, etc.');
  console.error('3. You ran "npm install" to install dependencies');
}