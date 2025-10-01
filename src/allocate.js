/**
 * Allocate clients to managers using a balanced workload algorithm
 * @param {Array<string>} managers - List of manager names
 * @param {Array<Object>} clients - Array of client objects with monthly hours
 * @param {Object} capacities - Manager capacity limits by month
 * @returns {Array<Object>} Updated clients array with Manager assignments
 */
function allocate(managers, clients, capacities) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Calculate target hours per manager for each month
  const targets = calculateMonthlyTargets(clients, managers.length);
  
  // Initialize current loads for each manager (starts at 0 for all months)
  const loads = {};
  managers.forEach(m => {
    loads[m] = {
      January: 0, February: 0, March: 0, April: 0,
      May: 0, June: 0, July: 0, August: 0,
      September: 0, October: 0, November: 0, December: 0
    };
  });
  
  // Separate clients into groups and individuals
  const groups = {};
  const individuals = [];
  
  clients.forEach(client => {
    if (client.Group) {
      if (!groups[client.Group]) {
        groups[client.Group] = [];
      }
      groups[client.Group].push(client);
    } else {
      individuals.push(client);
    }
  });
  
  // Convert groups to array and sort by total hours (largest first)
  const groupList = Object.keys(groups).map(groupName => ({
    name: groupName,
    clients: groups[groupName],
    totalHours: groups[groupName].reduce((sum, c) => sum + c.Total, 0),
    monthlyHours: aggregateMonthlyHours(groups[groupName])
  })).sort((a, b) => b.totalHours - a.totalHours);
  
  // Allocate groups first (keep groups together with one manager)
  groupList.forEach(group => {
    const bestManager = findBestManager(group.monthlyHours, managers, loads, targets, capacities);
    group.clients.forEach(client => {
      client.Manager = bestManager;
    });
    updateLoads(loads, bestManager, group.monthlyHours);
  });
  
  // Sort individual clients by total hours (largest first)
  const sortedIndividuals = individuals.sort((a, b) => b.Total - a.Total);
  
  // Allocate individual clients
  sortedIndividuals.forEach(client => {
    const bestManager = findBestManager(client.months, managers, loads, targets, capacities);
    client.Manager = bestManager;
    updateLoads(loads, bestManager, client.months);
  });
  
  return clients;
}

/**
 * Calculate target hours per manager for each month
 * @param {Array<Object>} clients - All clients
 * @param {number} managerCount - Number of managers
 * @returns {Object} Target hours by month
 */
function calculateMonthlyTargets(clients, managerCount) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const totals = {
    January: 0, February: 0, March: 0, April: 0,
    May: 0, June: 0, July: 0, August: 0,
    September: 0, October: 0, November: 0, December: 0
  };
  
  // Sum up all client hours by month
  clients.forEach(client => {
    monthNames.forEach(month => {
      totals[month] += client.months[month] || 0;
    });
  });
  
  // Divide by number of managers to get target per manager
  const targets = {};
  monthNames.forEach(month => {
    targets[month] = totals[month] / managerCount;
  });
  
  return targets;
}

/**
 * Aggregate monthly hours for multiple clients
 * @param {Array<Object>} clients - Clients to aggregate
 * @returns {Object} Total hours by month
 */
function aggregateMonthlyHours(clients) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const totals = {
    January: 0, February: 0, March: 0, April: 0,
    May: 0, June: 0, July: 0, August: 0,
    September: 0, October: 0, November: 0, December: 0
  };
  
  clients.forEach(client => {
    monthNames.forEach(month => {
      totals[month] += client.months[month] || 0;
    });
  });
  
  return totals;
}

/**
 * Find the best manager for a client/group using cost function
 * Considers capacity constraints and workload balance
 * @param {Object} monthlyHours - Hours by month for this client/group
 * @param {Array<string>} managers - List of all managers
 * @param {Object} loads - Current loads for each manager
 * @param {Object} targets - Target loads by month
 * @param {Object} capacities - Capacity limits by manager and month
 * @returns {string} Best manager name
 */
function findBestManager(monthlyHours, managers, loads, targets, capacities) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  let bestManager = null;
  let lowestCost = Infinity;
  let lowestTotalLoad = Infinity;
  
  // Try each manager and find the one with lowest cost
  managers.forEach(manager => {
    // Check if assignment would exceed capacity in any month
    let wouldExceedCapacity = false;
    
    for (const month of monthNames) {
      const projectedLoad = loads[manager][month] + (monthlyHours[month] || 0);
      if (projectedLoad > capacities[manager][month]) {
        wouldExceedCapacity = true;
        break;
      }
    }
    
    // Skip this manager if capacity would be exceeded
    if (wouldExceedCapacity) return;
    
    // Calculate cost: sum of squared deviations from target
    // This penalizes unbalanced assignments more heavily
    let cost = 0;
    monthNames.forEach(month => {
      const projectedLoad = loads[manager][month] + (monthlyHours[month] || 0);
      const deviation = projectedLoad - targets[month];
      cost += deviation * deviation; // Squared deviation
    });
    
    // Calculate total load (for tie-breaking)
    const totalLoad = monthNames.reduce((sum, month) => sum + loads[manager][month], 0);
    
    // Pick manager with lowest cost
    // If tied, pick one with lower total load
    // If still tied, pick alphabetically first
    if (cost < lowestCost || 
        (cost === lowestCost && totalLoad < lowestTotalLoad) ||
        (cost === lowestCost && totalLoad === lowestTotalLoad && (!bestManager || manager < bestManager))) {
      lowestCost = cost;
      lowestTotalLoad = totalLoad;
      bestManager = manager;
    }
  });
  
  // If no manager can fit without exceeding capacity,
  // pick the one with smallest overage
  if (!bestManager) {
    let minOverage = Infinity;
    managers.forEach(manager => {
      let maxOverage = 0;
      monthNames.forEach(month => {
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
 * Update manager's current load with new assignment
 * @param {Object} loads - Current loads for all managers
 * @param {string} manager - Manager name
 * @param {Object} monthlyHours - Hours to add by month
 */
function updateLoads(loads, manager, monthlyHours) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  monthNames.forEach(month => {
    loads[manager][month] += monthlyHours[month] || 0;
  });
}

module.exports = { allocate };