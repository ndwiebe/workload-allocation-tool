let state = {
  managers: [],
  managerCapacity: {},
  clients: []
};

// Track which groups are collapsed (default: all collapsed)
let collapsedGroups = new Set();

// Track if manager overview panel is collapsed (default: collapsed)
let managerOverviewCollapsed = true;

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('importBtn').addEventListener('click', handleImport);
  document.getElementById('importPreferencesBtn').addEventListener('click', handleImportPreferences);
  document.getElementById('addManagerBtn').addEventListener('click', showAddManagerModal);
  document.getElementById('allocateBtn').addEventListener('click', handleAllocate);
  document.getElementById('exportBtn').addEventListener('click', handleExport);
  document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
  
  document.querySelector('.close').addEventListener('click', closeModal);
  window.addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  
  // Search functionality
  document.getElementById('searchBox').addEventListener('input', handleSearch);
  
  // Event delegation for group toggle
  document.addEventListener('click', (e) => {
    const row = e.target.closest('[data-action="toggle-group"]');
    if (row) {
      const groupName = row.getAttribute('data-group-name');
      toggleGroup(groupName);
    }
  });
  
  // Event delegation for client row clicks (NEW)
  document.addEventListener('click', (e) => {
    const row = e.target.closest('.client-row');
    if (row && !e.target.classList.contains('manager-select') && 
        !e.target.classList.contains('action-btn')) {
      const clientId = row.getAttribute('data-client-id');
      if (clientId) {
        showEditClientModal(clientId);
      }
    }
  });
  
  // Handle keyboard navigation for accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const row = e.target.closest('[data-action="toggle-group"]');
      if (row) {
        e.preventDefault();
        const groupName = row.getAttribute('data-group-name');
        toggleGroup(groupName);
      }
    }
  });
}

/**
 * Show loading indicator with custom message
 * @param {string} message - Loading message to display
 */
function showLoading(message = 'Processing...') {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      text-align: center;
    `;
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.cssText = `
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    `;
    
    const text = document.createElement('div');
    text.id = 'loadingText';
    text.style.cssText = `
      color: #333;
      font-size: 16px;
      font-weight: 600;
    `;
    text.textContent = message;
    
    content.appendChild(spinner);
    content.appendChild(text);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    if (!document.getElementById('spinnerStyle')) {
      const style = document.createElement('style');
      style.id = 'spinnerStyle';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    overlay.style.display = 'flex';
    document.getElementById('loadingText').textContent = message;
  }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

async function loadState() {
  try {
    const response = await fetch('/api/state');
    const data = await response.json();
    if (data.success) {
      state = data.state;
      
      // Initialize collapsed groups - all groups start collapsed
      const groups = {};
      state.clients.forEach(client => {
        if (client.Group && !groups[client.Group]) {
          groups[client.Group] = true;
          collapsedGroups.add(client.Group);
        }
      });
      
      renderUI();
      
      // Enable import preferences button if clients exist
      document.getElementById('importPreferencesBtn').disabled = state.clients.length === 0;
    }
  } catch (error) {
    console.error('Error loading state:', error);
    alert('Error loading data: ' + error.message);
  }
}

function renderUI() {
  renderManagerOverview();
  renderTable();
  
  // Update import preferences button state
  document.getElementById('importPreferencesBtn').disabled = state.clients.length === 0;
}

/**
 * Toggle manager overview panel collapse/expand
 */
function toggleManagerOverview() {
  managerOverviewCollapsed = !managerOverviewCollapsed;
  renderManagerOverview();
}

/**
 * Calculate manager workloads by month
 * @returns {Object} Object with manager workloads and unassigned hours
 */
function calculateManagerWorkloads() {
  const workloads = {};
  const unassigned = {};
  
  // Initialize
  state.managers.forEach(manager => {
    workloads[manager] = {};
    monthNames.forEach(month => {
      workloads[manager][month] = 0;
    });
  });
  
  monthNames.forEach(month => {
    unassigned[month] = 0;
  });
  
  // Calculate workloads
  state.clients.forEach(client => {
    monthNames.forEach(month => {
      const hours = client.months[month] || 0;
      if (client.Manager && state.managers.includes(client.Manager)) {
        workloads[client.Manager][month] += hours;
      } else {
        unassigned[month] += hours;
      }
    });
  });
  
  return { workloads, unassigned };
}

/**
 * Get capacity status color class
 * @param {number} allocated - Allocated hours
 * @param {number} capacity - Capacity hours
 * @returns {string} CSS class name
 */
function getCapacityColorClass(allocated, capacity) {
  if (capacity === 0) return 'capacity-unknown';
  const percentage = (allocated / capacity) * 100;
  if (percentage < 80) return 'capacity-good';
  if (percentage <= 100) return 'capacity-warning';
  return 'capacity-over';
}

/**
 * Render manager overview panel
 */
function renderManagerOverview() {
  const overviewSection = document.getElementById('metricsGrid');
  
  if (state.clients.length === 0 || state.managers.length === 0) {
    overviewSection.innerHTML = `
      <div class="manager-overview-collapsed" 
           onclick="toggleManagerOverview()"
           onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleManagerOverview(); }"
           tabindex="0"
           role="button"
           aria-expanded="false">
        <div class="overview-header">
          <div class="overview-title">
            <span class="expand-icon">▶</span>
            📊 Manager Workload Overview
          </div>
        </div>
        <div class="overview-summary">
          ${state.managers.length === 0 ? 'No managers added yet' : 'No clients imported yet'}
        </div>
      </div>
    `;
    return;
  }
  
  const { workloads, unassigned } = calculateManagerWorkloads();
  
  // Calculate totals
  let totalAllocated = 0;
  let totalUnassigned = 0;
  const managerTotals = {};
  
  state.managers.forEach(manager => {
    managerTotals[manager] = monthNames.reduce((sum, month) => {
      return sum + workloads[manager][month];
    }, 0);
    totalAllocated += managerTotals[manager];
  });
  
  totalUnassigned = monthNames.reduce((sum, month) => sum + unassigned[month], 0);
  
  const grandTotal = totalAllocated + totalUnassigned;
  
  if (managerOverviewCollapsed) {
    overviewSection.innerHTML = `
      <div class="manager-overview-collapsed" 
           onclick="toggleManagerOverview()"
           onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleManagerOverview(); }"
           tabindex="0"
           role="button"
           aria-expanded="false"
           aria-label="Expand manager workload overview">
        <div class="overview-header">
          <div class="overview-title">
            <span class="expand-icon">▶</span>
            📊 Manager Workload Overview
          </div>
          <div class="expand-hint">Click to expand</div>
        </div>
        <div class="overview-summary">
          ${state.managers.length} Managers • ${Math.round(grandTotal).toLocaleString()} total hours • 
          ${totalUnassigned > 0 ? `<span class="unassigned-badge">${Math.round(totalUnassigned).toLocaleString()} unassigned</span>` : 'All work assigned'}
        </div>
      </div>
    `;
  } else {
    let html = `
      <div class="manager-overview-expanded">
        <div class="overview-header" 
             onclick="toggleManagerOverview()"
             onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleManagerOverview(); }"
             tabindex="0"
             role="button"
             aria-expanded="true"
             aria-label="Collapse manager workload overview">
          <div class="overview-title">
            <span class="expand-icon">▼</span>
            📊 Manager Workload Overview
          </div>
          <div class="expand-hint">Click to collapse</div>
        </div>
        
        <div class="overview-table-container">
          <table class="overview-table">
            <thead>
              <tr>
                <th class="manager-col">Manager</th>
                ${monthNames.map(month => `<th class="month-col">${month.substring(0, 3)}</th>`).join('')}
                <th class="total-col">Total</th>
                <th class="capacity-col">Capacity</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    // Manager rows
    state.managers.forEach(manager => {
      const capacity = state.managerCapacity[manager] || {};
      const totalCapacity = monthNames.reduce((sum, month) => sum + (capacity[month] || 0), 0);
      const allocated = managerTotals[manager];
      const colorClass = getCapacityColorClass(allocated, totalCapacity);
      const percentage = totalCapacity > 0 ? Math.round((allocated / totalCapacity) * 100) : 0;
      
      html += `
        <tr class="manager-row ${colorClass}">
          <td class="manager-name">${escapeHtml(manager)}</td>
          ${monthNames.map(month => {
            const monthHours = Math.round(workloads[manager][month]);
            const monthCapacity = capacity[month] || 0;
            const monthColor = getCapacityColorClass(workloads[manager][month], monthCapacity);
            return `<td class="hours-cell ${monthColor}">${monthHours}</td>`;
          }).join('')}
          <td class="total-cell ${colorClass}"><strong>${Math.round(allocated)}</strong></td>
          <td class="capacity-cell ${colorClass}">
            <div class="capacity-display">
              <span class="capacity-value">${Math.round(allocated)} / ${Math.round(totalCapacity)}</span>
              <span class="capacity-percent">${percentage}%</span>
            </div>
          </td>
        </tr>
      `;
    });
    
    // Unassigned row
    html += `
      <tr class="unassigned-row">
        <td class="manager-name">⚠️ Unassigned</td>
        ${monthNames.map(month => {
          const monthHours = Math.round(unassigned[month]);
          return `<td class="hours-cell unassigned-cell">${monthHours > 0 ? monthHours : '-'}</td>`;
        }).join('')}
        <td class="total-cell unassigned-cell"><strong>${Math.round(totalUnassigned)}</strong></td>
        <td class="capacity-cell">-</td>
      </tr>
    `;
    
    // Total row
    const monthlyTotals = monthNames.map(month => {
      let total = 0;
      state.managers.forEach(manager => {
        total += workloads[manager][month];
      });
      total += unassigned[month];
      return Math.round(total);
    });
    
    html += `
      <tr class="total-row">
        <td class="manager-name"><strong>📊 Total</strong></td>
        ${monthlyTotals.map(total => `<td class="hours-cell"><strong>${total}</strong></td>`).join('')}
        <td class="total-cell"><strong>${Math.round(grandTotal)}</strong></td>
        <td class="capacity-cell">-</td>
      </tr>
    `;
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    overviewSection.innerHTML = html;
  }
}

/**
 * Toggle group collapse/expand state
 * @param {string} groupName - Name of the group to toggle
 */
function toggleGroup(groupName) {
  if (collapsedGroups.has(groupName)) {
    collapsedGroups.delete(groupName);
  } else {
    collapsedGroups.add(groupName);
  }
  renderTable();
}

/**
 * Calculate aggregated monthly hours for a group of clients
 * @param {Array} clients - Array of client objects
 * @returns {Object} Object with monthly hours
 */
function calculateGroupMonthlyHours(clients) {
  const monthlyHours = {};
  monthNames.forEach(month => {
    monthlyHours[month] = clients.reduce((sum, client) => {
      return sum + (client.months[month] || 0);
    }, 0);
  });
  return monthlyHours;
}

/**
 * Render allocation table
 */
function renderTable() {
  const tableBody = document.getElementById('tableBody');
  
  if (state.clients.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="16" class="loading">
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-title">No Clients Imported</div>
            <div class="empty-state-description">Click "📥 Import Workload" to get started</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Group clients by group name
  const groups = {};
  const individuals = [];
  
  state.clients.forEach(client => {
    if (client.Group) {
      if (!groups[client.Group]) {
        groups[client.Group] = [];
      }
      groups[client.Group].push(client);
    } else {
      individuals.push(client);
    }
  });
  
  let html = '';
  
  // Render groups
  Object.keys(groups).sort().forEach(groupName => {
    const groupClients = groups[groupName];
    const isLocked = groupClients.some(c => c.locked);
    const isCollapsed = collapsedGroups.has(groupName);
    const lockIcon = isLocked ? '<span class="lock-icon">🔒</span>' : '';
    const expandIcon = isCollapsed ? '▶' : '▼';
    
    // Calculate aggregated hours for the group
    const groupMonthlyHours = calculateGroupMonthlyHours(groupClients);
    const groupTotal = monthNames.reduce((sum, month) => sum + groupMonthlyHours[month], 0);
    
    // Group header row - using data attributes for event delegation
    html += `
      <tr class="group-header ${isLocked ? 'locked-row' : ''} ${isCollapsed ? 'collapsed' : 'expanded'}" 
          data-group-name="${escapeHtml(groupName)}"
          data-action="toggle-group"
          tabindex="0"
          role="button"
          aria-expanded="${!isCollapsed}"
          aria-label="${isCollapsed ? 'Expand' : 'Collapse'} group ${escapeHtml(groupName)}">
        <td class="group-cell" colspan="2">
          <span class="expand-icon">${expandIcon}</span>
          ${lockIcon}<strong>📁 ${escapeHtml(groupName)}</strong> (${groupClients.length} clients)
        </td>
        <td></td>
        ${isCollapsed ? monthNames.map(month => `
          <td class="hours-cell">${Math.round(groupMonthlyHours[month])}</td>
        `).join('') : '<td colspan="12"></td>'}
        ${isCollapsed ? `<td class="total-cell">${Math.round(groupTotal)}</td>` : '<td></td>'}
      </tr>
    `;
    
    // Individual client rows in group (hidden when collapsed)
    if (!isCollapsed) {
      groupClients.forEach(client => {
        html += renderClientRow(client, true);
      });
    }
  });
  
  // Render individual clients
  individuals.forEach(client => {
    html += renderClientRow(client, false);
  });
  
  tableBody.innerHTML = html;
}

/**
 * Render a single client row
 * @param {Object} client - Client data
 * @param {boolean} isInGroup - Whether client is part of a group
 * @returns {string} HTML string
 */
function renderClientRow(client, isInGroup) {
  const lockIcon = client.locked ? '<span class="lock-icon">🔒</span>' : '';
  const rowClass = client.locked ? 'locked-row' : '';
  
  return `
    <tr class="client-row ${rowClass}" data-client-id="${client.id}" style="cursor:pointer;" title="Click to edit client details">
      <td class="client-cell">
        ${isInGroup ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : ''}${lockIcon}${escapeHtml(client.Client)}
      </td>
      <td>${escapeHtml(client.Partner)}</td>
      <td>
        <select class="manager-select" onchange="updateClientManager('${client.id}', this.value)" ${client.locked ? 'disabled' : ''}>
          <option value="">Unassigned</option>
          ${state.managers.map(m => `
            <option value="${escapeHtml(m)}" ${client.Manager === m ? 'selected' : ''}>
              ${escapeHtml(m)}
            </option>
          `).join('')}
        </select>
        ${client.locked ? `
          <button class="action-btn unlock-btn" onclick="unlockClient('${client.id}')">
            🔓 Unlock
          </button>
        ` : ''}
      </td>
      ${monthNames.map(month => `
        <td class="hours-cell">${Math.round(client.months[month] || 0)}</td>
      `).join('')}
      <td class="total-cell">${Math.round(client.Total)}</td>
    </tr>
  `;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show edit client modal (NEW FEATURE)
 * @param {string} clientId - Client ID to edit
 */
function showEditClientModal(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;
  
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  modalTitle.textContent = '✏️ Edit Client Details';
  
  modalBody.innerHTML = `
    <div class="form-group">
      <label>Client Name</label>
      <input type="text" value="${escapeHtml(client.Client)}" disabled style="background:#f5f5f5;cursor:not-allowed;">
      <small style="color:#666;display:block;margin-top:5px;">Client names cannot be edited</small>
    </div>
    <div class="form-group">
      <label>Group</label>
      <input type="text" id="editGroup" value="${escapeHtml(client.Group || '')}" placeholder="Leave blank for individual client" maxlength="200">
      <small style="color:#666;display:block;margin-top:5px;">
        💡 Tip: Type a group name to join/create a group. Clients in the same group will be assigned to the same manager automatically.
      </small>
    </div>
    <div class="form-group">
      <label>Partner</label>
      <input type="text" id="editPartner" value="${escapeHtml(client.Partner || '')}" placeholder="Enter partner name" maxlength="200">
    </div>
    <div class="form-group">
      <label>Manager</label>
      <select id="editManager" ${client.locked ? 'disabled' : ''}>
        <option value="">Unassigned</option>
        ${state.managers.map(m => `
          <option value="${escapeHtml(m)}" ${client.Manager === m ? 'selected' : ''}>
            ${escapeHtml(m)}
          </option>
        `).join('')}
      </select>
      ${client.locked ? `
        <small style="color:#e63946;display:block;margin-top:5px;">
          🔒 This client is locked. Manager cannot be changed.
        </small>
      ` : `
        <small style="color:#666;display:block;margin-top:5px;">
          ℹ️ Note: If you join an existing group, the manager will be auto-assigned to match the group
        </small>
      `}
    </div>
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button class="btn btn-primary" onclick="saveClientEdit('${client.id}')" style="flex: 1;">
        💾 Save Changes
      </button>
      <button class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">
        ❌ Cancel
      </button>
    </div>
  `;
  
  modal.style.display = 'block';
  
  // Focus on first editable field
  setTimeout(() => {
    document.getElementById('editGroup').focus();
  }, 100);
}

/**
 * Save client edit changes (NEW FEATURE)
 * @param {string} clientId - Client ID to save
 */
async function saveClientEdit(clientId) {
  const group = document.getElementById('editGroup').value.trim();
  const partner = document.getElementById('editPartner').value.trim();
  const manager = document.getElementById('editManager').value;
  
  const client = state.clients.find(c => c.id === clientId);
  if (!client) {
    alert('Client not found');
    return;
  }
  
  showLoading('Saving changes...');
  
  try {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        Group: group,
        Partner: partner,
        Manager: manager
      })
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderUI();
      closeModal();
      
      // Show success message with what changed
      let changes = [];
      if (group !== (client.Group || '')) {
        if (group) {
          changes.push(`joined group "${group}"`);
        } else {
          changes.push('removed from group');
        }
      }
      if (partner !== (client.Partner || '')) changes.push('partner updated');
      if (manager !== (client.Manager || '')) {
        if (manager) {
          changes.push(`assigned to ${manager}`);
        } else {
          changes.push('unassigned');
        }
      }
      
      if (changes.length > 0) {
        alert(`✅ Client updated successfully!\n\n${changes.join(', ')}`);
      }
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error updating client:', error);
    alert('Error updating client: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Update client manager assignment
 * @param {string} clientId - Client ID
 * @param {string} manager - Manager name
 */
async function updateClientManager(clientId, manager) {
  showLoading('Updating assignment...');
  
  try {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Manager: manager })
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderUI();
    } else {
      alert('Error: ' + data.error);
      await loadState(); // Reload to revert UI
    }
  } catch (error) {
    console.error('Error updating manager:', error);
    alert('Error updating manager: ' + error.message);
    await loadState();
  } finally {
    hideLoading();
  }
}

/**
 * Unlock a client
 * @param {string} clientId - Client ID
 */
async function unlockClient(clientId) {
  if (!confirm('Unlock this client? It will be available for automatic allocation.')) return;
  
  showLoading('Unlocking client...');
  
  try {
    const response = await fetch(`/api/clients/${clientId}/unlock`, {
      method: 'POST'
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderUI();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error unlocking client:', error);
    alert('Error unlocking client: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Handle search functionality
 * Filters client rows and shows/hides group headers based on visibility of their children
 */
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#tableBody tr');
  
  // First pass: filter client rows (non-group-header rows)
  rows.forEach(row => {
    // Skip group header rows in first pass
    if (row.classList.contains('group-header')) {
      return;
    }
    
    const text = row.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
  
  // Second pass: show/hide group headers based on their children's visibility
  rows.forEach((row, index) => {
    if (row.classList.contains('group-header')) {
      // This is a group header row
      // Check if any of the following rows (until next group header) are visible
      let hasVisibleChildren = false;
      
      for (let i = index + 1; i < rows.length; i++) {
        const nextRow = rows[i];
        
        // Stop if we hit another group header
        if (nextRow.classList.contains('group-header')) {
          break;
        }
        
        // Check if this child row is visible
        if (nextRow.style.display !== 'none') {
          hasVisibleChildren = true;
          break;
        }
      }
      
      // Show group header only if it has visible children
      row.style.display = hasVisibleChildren ? '' : 'none';
    }
  });
}

/**
 * Handle Excel workload import
 */
function handleImport() {
  document.getElementById('fileInput').click();
  
  document.getElementById('fileInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (state.clients.length > 0) {
      const proceed = confirm(
        `Warning: You currently have ${state.clients.length} clients loaded.\n\n` +
        'Importing a new file will REPLACE all existing client data.\n\n' +
        'Do you want to continue?'
      );
      
      if (!proceed) {
        e.target.value = '';
        return;
      }
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    showLoading('Importing workload...');
    
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        state = data.state;
        
        // Reset collapsed groups - all groups start collapsed
        collapsedGroups.clear();
        const groups = {};
        state.clients.forEach(client => {
          if (client.Group && !groups[client.Group]) {
            groups[client.Group] = true;
            collapsedGroups.add(client.Group);
          }
        });
        
        renderUI();
        alert(data.message);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Error importing file: ' + error.message);
    } finally {
      e.target.value = '';
      hideLoading();
    }
  };
}

/**
 * Handle partner preferences import
 */
function handleImportPreferences() {
  document.getElementById('preferencesInput').click();
  
  document.getElementById('preferencesInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    showLoading('Importing preferences...');
    
    try {
      const response = await fetch('/api/preferences/import', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        state = data.state;
        renderUI();
        alert(data.message);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error importing preferences:', error);
      alert('Error importing preferences: ' + error.message);
    } finally {
      e.target.value = '';
      hideLoading();
    }
  };
}

/**
 * Show settings modal
 */
function showSettingsModal() {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  modalTitle.textContent = '⚙️ Settings';
  
  if (state.managers.length === 0) {
    modalBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-title">No Managers Yet</div>
        <div class="empty-state-description">Add managers to manage their capacity</div>
        <button class="btn btn-primary" onclick="closeModal(); showAddManagerModal();">
          ➕ Add First Manager
        </button>
      </div>
    `;
  } else {
    modalBody.innerHTML = `
      <h3 style="margin-bottom: 20px; color: #374151;">Manager Capacity</h3>
      <div class="manager-list">
        ${state.managers.map(manager => renderManagerSettings(manager)).join('')}
      </div>
      <button class="btn btn-primary" onclick="showAddManagerModal()" style="margin-top: 20px; width: 100%;">
        ➕ Add Another Manager
      </button>
    `;
  }
  
  modal.style.display = 'block';
}

/**
 * Render manager settings item
 * @param {string} manager - Manager name
 * @returns {string} HTML string
 */
function renderManagerSettings(manager) {
  const capacity = state.managerCapacity[manager] || {};
  const total = monthNames.reduce((sum, month) => sum + (capacity[month] || 0), 0);
  
  return `
    <div class="manager-item">
      <div class="manager-info">
        <div class="manager-name-text">${escapeHtml(manager)}</div>
        <div class="manager-stats">Total Capacity: ${total} hours/year</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" onclick="editManagerCapacity('${escapeHtml(manager)}')">
          ✏️ Edit
        </button>
        <button class="delete-manager-btn" onclick="deleteManager('${escapeHtml(manager)}')">
          🗑️ Delete
        </button>
      </div>
    </div>
  `;
}

/**
 * Edit manager capacity
 * @param {string} manager - Manager name
 */
function editManagerCapacity(manager) {
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  const capacity = state.managerCapacity[manager] || {};
  
  modalTitle.textContent = `Edit Capacity: ${manager}`;
  
  modalBody.innerHTML = `
    <div class="form-group">
      <label>Monthly Capacity (hours)</label>
      <div class="capacity-grid">
        ${monthNames.map(month => `
          <div class="capacity-item">
            <label>${month.substring(0, 3)}</label>
            <input 
              type="number" 
              id="capacity-${month}"
              value="${capacity[month] || 100}"
              min="0"
              max="10000"
            >
          </div>
        `).join('')}
      </div>
    </div>
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button class="btn btn-primary" onclick="saveManagerCapacity('${escapeHtml(manager)}')" style="flex: 1;">
        💾 Save Changes
      </button>
      <button class="btn btn-secondary" onclick="showSettingsModal()" style="flex: 1;">
        ← Back
      </button>
    </div>
  `;
}

/**
 * Save manager capacity
 * @param {string} manager - Manager name
 */
async function saveManagerCapacity(manager) {
  const capacity = {};
  const errors = [];
  
  // VALIDATE ALL INPUTS FIRST
  for (const month of monthNames) {
    const input = document.getElementById(`capacity-${month}`);
    const value = parseFloat(input.value);
    
    if (isNaN(value) || value < 0) {
      errors.push(`Invalid capacity for ${month}`);
    } else {
      capacity[month] = value;
    }
  }
  
  // If ANY validation fails, show ALL errors and abort
  if (errors.length > 0) {
    alert('Validation errors:\n\n' + errors.join('\n'));
    return;
  }
  
  // All validations passed - proceed with save
  showLoading('Saving capacity...');
  
  try {
    const response = await fetch(`/api/managers/${encodeURIComponent(manager)}/capacity`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacity })
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      showSettingsModal(); // Refresh settings modal
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error saving capacity:', error);
    alert('Error saving capacity: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Show add manager modal
 */
function showAddManagerModal() {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  modalTitle.textContent = '➕ Add Manager';
  
  modalBody.innerHTML = `
    <div class="form-group">
      <label>Manager Name</label>
      <input type="text" id="managerName" placeholder="Enter manager name" maxlength="100">
    </div>
    <div class="form-group">
      <label>Default Monthly Capacity (hours)</label>
      <input type="number" id="managerCapacity" value="100" placeholder="100" min="0" max="10000">
    </div>
    <div style="display: flex; gap: 12px;">
      <button class="btn btn-primary" onclick="addManager()" style="flex: 1;">
        ➕ Add Manager
      </button>
      ${state.managers.length > 0 ? `
        <button class="btn btn-secondary" onclick="showSettingsModal()" style="flex: 1;">
          ← Back
        </button>
      ` : ''}
    </div>
  `;
  
  modal.style.display = 'block';
  
  setTimeout(() => {
    document.getElementById('managerName').focus();
  }, 100);
}

/**
 * Add new manager
 */
async function addManager() {
  const name = document.getElementById('managerName').value.trim();
  const capacityValue = parseInt(document.getElementById('managerCapacity').value);
  
  if (!name) {
    alert('Please enter a manager name');
    return;
  }
  
  if (isNaN(capacityValue) || capacityValue < 0) {
    alert('Capacity must be a non-negative number');
    return;
  }
  
  if (capacityValue > 10000) {
    alert('Capacity cannot exceed 10,000 hours');
    return;
  }
  
  const capacity = {};
  monthNames.forEach(month => {
    capacity[month] = capacityValue;
  });
  
  showLoading('Adding manager...');
  
  try {
    const response = await fetch('/api/managers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, capacity })
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderUI();
      closeModal();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error adding manager:', error);
    alert('Error adding manager: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Delete manager
 * @param {string} manager - Manager name
 */
async function deleteManager(manager) {
  if (!confirm(`Delete manager ${manager}? Assigned clients will be unassigned.`)) return;
  
  showLoading('Deleting manager...');
  
  try {
    const response = await fetch(`/api/managers/${encodeURIComponent(manager)}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderUI();
      closeModal();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error deleting manager:', error);
    alert('Error deleting manager: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Handle allocation
 */
async function handleAllocate() {
  if (state.managers.length === 0) {
    alert('Please add managers first');
    return;
  }
  
  if (state.clients.length === 0) {
    alert('Please import clients first');
    return;
  }
  
  const lockedCount = state.clients.filter(c => c.locked).length;
  const unlockedCount = state.clients.length - lockedCount;
  
  if (unlockedCount === 0) {
    alert('All clients are locked. No clients available for automatic allocation.');
    return;
  }
  
  const message = lockedCount > 0
    ? `Run automatic allocation?\n\n🔒 ${lockedCount} locked clients will keep their assignments\n✅ ${unlockedCount} unlocked clients will be reallocated`
    : 'Run automatic allocation? This will assign all clients based on workload balancing.';
  
  if (!confirm(message)) return;
  
  showLoading('Running allocation algorithm...');
  
  try {
    const response = await fetch('/api/allocate', {
      method: 'POST'
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderUI();
      alert('Allocation complete!');
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error allocating:', error);
    alert('Error running allocation: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Handle export
 */
async function handleExport() {
  if (state.clients.length === 0) {
    alert('No clients to export');
    return;
  }
  
  showLoading('Generating Excel file...');
  
  try {
    setTimeout(() => {
      window.location.href = '/api/export';
      setTimeout(hideLoading, 2000);
    }, 100);
  } catch (error) {
    console.error('Error exporting:', error);
    alert('Error exporting file: ' + error.message);
    hideLoading();
  }
}

/**
 * Close modal
 */
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}