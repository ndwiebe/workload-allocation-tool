let state = {
  managers: [],
  managerCapacity: {},
  clients: []
};

// Track which groups are collapsed (default: all collapsed)
let collapsedGroups = new Set();

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
  renderMetrics();
  renderTable();
  
  // Update import preferences button state
  document.getElementById('importPreferencesBtn').disabled = state.clients.length === 0;
}

/**
 * Render metrics dashboard
 */
function renderMetrics() {
  const metricsGrid = document.getElementById('metricsGrid');
  
  const totalClients = state.clients.length;
  const lockedClients = state.clients.filter(c => c.locked).length;
  const unlockedClients = totalClients - lockedClients;
  const totalManagers = state.managers.length;
  
  metricsGrid.innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Total Clients</div>
      <div class="metric-value">${totalClients}</div>
      <div class="metric-change neutral">All imported clients</div>
    </div>
    
    <div class="metric-card">
      <div class="metric-label">Locked Clients</div>
      <div class="metric-value">${lockedClients}</div>
      <div class="metric-change ${lockedClients > 0 ? 'positive' : 'neutral'}">
        🔒 Fixed assignments
      </div>
    </div>
    
    <div class="metric-card">
      <div class="metric-label">Unlocked Clients</div>
      <div class="metric-value">${unlockedClients}</div>
      <div class="metric-change ${unlockedClients > 0 ? 'positive' : 'neutral'}">
        Available for allocation
      </div>
    </div>
    
    <div class="metric-card">
      <div class="metric-label">Active Managers</div>
      <div class="metric-value">${totalManagers}</div>
      <div class="metric-change neutral">Managing workload</div>
    </div>
  `;
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
    
    // Group header row with collapse/expand functionality
    html += `
      <tr class="group-header ${isLocked ? 'locked-row' : ''} ${isCollapsed ? 'collapsed' : 'expanded'}" 
          onclick="toggleGroup('${escapeHtml(groupName).replace(/'/g, "\\'")}')"
          onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleGroup('${escapeHtml(groupName).replace(/'/g, "\\'")}')); }"
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
    <tr class="client-row ${rowClass}" data-client-id="${client.id}">
      <td class="client-cell">
        ${isInGroup ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : ''}${lockIcon}${escapeHtml(client.Client)}
      </td>
      <td>${escapeHtml(client.Partner)}</td>
      <td>
        <select class="manager-select" onchange="updateClientManager('${client.id}', this.value)" ${client.locked ? '' : ''}>
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
  let hasError = false;
  
  monthNames.forEach(month => {
    const input = document.getElementById(`capacity-${month}`);
    const value = parseFloat(input.value);
    
    if (isNaN(value) || value < 0) {
      alert(`Invalid capacity for ${month}`);
      hasError = true;
      return;
    }
    
    capacity[month] = value;
  });
  
  if (hasError) return;
  
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
