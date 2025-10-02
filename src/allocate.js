const { MONTH_NAMES } = require('./constants');

/**
 * Allocate clients to managers with workload balancing
 * @param {Array} managers - Array of manager names
 * @param {Array} clients - Array of client objects
 * @param {Object} capacities - Manager capacity by month
 * @returns {Array} Updated clients array with manager assignments
 */
function allocate(managers, clients, capacities) {
  const targets = calculateMonthlyTargets(clients, managers.length);
  
  const loads = {};
  managers.forEach(m => {
    loads[m] = {
      January: 0, February: 0, March: 0, April: 0,
      May: 0, June: 0, July: 0, August: 0,
      September: 0, October: 0, November: 0, December: 0
    };
  });
  
  // Initialize loads with locked clients
  clients.forEach(client => {
    if (client.locked && client.Manager) {
      updateLoads(loads, client.Manager, client.months);
    }
  });
  
  const groups = {};
  const individuals = [];
  
  clients.forEach(client => {
    if (client.locked) {
      return; // Skip locked clients
    }
    
    if (client.Group) {
      if (!groups[client.Group]) {
        groups[client.Group] = [];
      }
      groups[client.Group].push(client);
    } else {
      individuals.push(client);
    }
  });
  
  const groupList = Object.keys(groups).map(groupName => ({
    name: groupName,
    clients: groups[groupName],
    totalHours: groups[groupName].reduce((sum, c) => sum + c.Total, 0),
    monthlyHours: aggregateMonthlyHours(groups[groupName])
  })).sort((a, b) => b.totalHours - a.totalHours);
  
  groupList.forEach(group => {
    const bestManager = findBestManager(group.monthlyHours, managers, loads, targets, capacities);
    group.clients.forEach(client => {
      client.Manager = bestManager;
    });
    updateLoads(loads, bestManager, group.monthlyHours);
  });
  
  const sortedIndividuals = individuals.sort((a, b) => b.Total - a.Total);
  
  sortedIndividuals.forEach(client => {
    const bestManager = findBestManager(client.months, managers, loads, targets, capacities);
    client.Manager = bestManager;
    updateLoads(loads, bestManager, client.months);
  });
  
  return clients;
}

/**
 * Calculate monthly target hours per manager
 * @param {Array} clients - Array of client objects
 * @param {number} managerCount - Number of managers
 * @returns {Object} Target hours per month
 */
function calculateMonthlyTargets(clients, managerCount) {
  const totals = {
    January: 0, February: 0, March: 0, April: 0,
    May: 0, June: 0, July: 0, August: 0,
    September: 0, October: 0, November: 0, December: 0
  };
  
  clients.forEach(client => {
    MONTH_NAMES.forEach(month => {
      totals[month] += client.months[month] || 0;
    });
  });
  
  const targets = {};
  MONTH_NAMES.forEach(month => {
    targets[month] = totals[month] / managerCount;
  });
  
  return targets;
}

/**
 * Aggregate monthly hours for multiple clients
 * @param {Array} clients - Array of client objects
 * @returns {Object} Aggregated monthly hours
 */
function aggregateMonthlyHours(clients) {
  const totals = {
    January: 0, February: 0, March: 0, April: 0,
    May: 0, June: 0, July: 0, August: 0,
    September: 0, October: 0, November: 0, December: 0
  };
  
  clients.forEach(client => {
    MONTH_NAMES.forEach(month => {
      totals[month] += client.months[month] || 0;
    });
  });
  
  return totals;
}

/**
 * Find best manager for assignment based on capacity and balance
 * @param {Object} monthlyHours - Hours needed per month
 * @param {Array} managers - Available managers
 * @param {Object} loads - Current manager loads
 * @param {Object} targets - Target loads per manager
 * @param {Object} capacities - Manager capacities
 * @returns {string} Best manager name
 */
function findBestManager(monthlyHours, managers, loads, targets, capacities) {
  let bestManager = null;
  let lowestCost = Infinity;
  let lowestTotalLoad = Infinity;
  
  managers.forEach(manager => {
    let wouldExceedCapacity = false;
    
    for (const month of MONTH_NAMES) {
      const projectedLoad = loads[manager][month] + (monthlyHours[month] || 0);
      if (projectedLoad > capacities[manager][month]) {
        wouldExceedCapacity = true;
        break;
      }
    }
    
    if (wouldExceedCapacity) return;
    
    let cost = 0;
    MONTH_NAMES.forEach(month => {
      const projectedLoad = loads[manager][month] + (monthlyHours[month] || 0);
      const deviation = projectedLoad - targets[month];
      cost += deviation * deviation;
    });
    
    const totalLoad = MONTH_NAMES.reduce((sum, month) => sum + loads[manager][month], 0);
    
    if (cost < lowestCost || 
        (cost === lowestCost && totalLoad < lowestTotalLoad) ||
        (cost === lowestCost && totalLoad === lowestTotalLoad && (!bestManager || manager < bestManager))) {
      lowestCost = cost;
      lowestTotalLoad = totalLoad;
      bestManager = manager;
    }
  });
  
  if (!bestManager) {
    let minOverage = Infinity;
    managers.forEach(manager => {
      let maxOverage = 0;
      MONTH_NAMES.forEach(month => {
        const projectedLoad = loads[manager][month] + (monthlyHours[month] || 0);
        const overage = Math.max(0, projectedLoad - capacities[manager][month]);
        maxOverage = Math.max(maxOverage, overage);
      });
      if (maxOverage < minOverage) {
        minOverage = maxOverage;
        bestManager = manager;
      }
    });
  }
  
  return bestManager || managers[0];
}

/**
 * Update manager loads with new assignment
 * @param {Object} loads - Current manager loads
 * @param {string} manager - Manager name
 * @param {Object} monthlyHours - Hours to add
 */
function updateLoads(loads, manager, monthlyHours) {
  MONTH_NAMES.forEach(month => {
    loads[manager][month] += monthlyHours[month] || 0;
  });
}

module.exports = { allocate };