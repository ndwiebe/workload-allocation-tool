/**
 * Shared constants used across the application
 * 
 * This file centralizes commonly used values to follow the DRY principle
 * (Don't Repeat Yourself) and make maintenance easier.
 */

/**
 * Standard month names in order
 * @constant {Array<string>}
 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Create an empty month object with all months initialized to zero
 * @returns {Object} Object with all months set to 0
 */
function createEmptyMonthObject() {
  const obj = {};
  MONTH_NAMES.forEach(month => {
    obj[month] = 0;
  });
  return obj;
}

/**
 * Create a month object with all months set to a specific value
 * @param {number} value - Value to set for all months
 * @returns {Object} Object with all months set to the specified value
 */
function createMonthObject(value) {
  const obj = {};
  MONTH_NAMES.forEach(month => {
    obj[month] = value;
  });
  return obj;
}

module.exports = {
  MONTH_NAMES,
  createEmptyMonthObject,
  createMonthObject
};
