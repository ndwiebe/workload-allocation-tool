let state = {
  managers: [],
  managerCapacity: {},
  clients: []
};

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
  document.getElementById('addManagerBtn').addEventListener('click', showAddManagerModal);
  document.getElementById('allocateBtn').addEventListener('click', handleAllocate);
  document.getElementById('exportBtn').addEventListener('click', handleExport);
  
  document.querySelector('.close').addEventListener('click', closeModal);
  window.addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
}

async function loadState() {
  try {
    const response = await fetch('/api/state');
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderUI();
    }
  } catch (error) {
    console.error('Error loading state:', error);
    alert('Error loading data');
  }
}

function renderUI() {
  renderManagers();
  renderAllocationBoard();
}

function renderManagers() {
  const managerList = document.getElementById('managerList');
  
  if (state.managers.length === 0) {
    managerList.innerHTML = '<p class="loading">No managers added yet. Click "Add Manager" to get started.</p>';
    return;
  }
  
  managerList.innerHTML = state.managers.map(manager => {
    const capacity = state.managerCapacity[manager] || {};
    const total = monthNames.reduce((sum, month) => sum + (capacity[month] || 0), 0);
    
    return `
      <div class="manager-row">
        <div class="manager-name">
          ${manager}
          <br>
          <small>Total: ${total} hrs/year</small>
        </div>
        <div class="capacity-inputs">
          ${monthNames.map(month => `
            <div class="capacity-month">
              <label>${month.substring(0, 3)}</label>
              <input 
                type="number" 
                value="${capacity[month] || 100}"
                data-manager="${manager}"
                data-month="${month}"
                onchange="updateCapacity(this)"
              >
            </div>
          `).join('')}
        </div>
        <button class="btn" onclick="deleteManager('${manager}')" style="background:#f44336;color:white;margin-left:10px;">Delete</button>
      </div>
    `;
  }).join('');
}

function renderAllocationBoard() {
  const columns = document.getElementById('columns');
  
  if (state.clients.length === 0) {
    columns.innerHTML = '<p class="loading">No clients imported yet. Click "Import Excel" to get started.</p>';
    return;
  }
  
  const unassigned = state.clients.filter(c => !c.Manager);
  const managerGroups = {};
  
  state.managers.forEach(manager => {
    managerGroups[manager] = state.clients.filter(c => c.Manager === manager);
  });
  
  let html = `
    <div class="column unassigned" data-manager="">
      <div class="column-header">
        <div class="column-title">Unassigned</div>
        <div class="column-stats">${unassigned.length} clients, ${calculateTotal(unassigned)} hrs</div>
      </div>
      ${renderCards(unassigned)}
    </div>
  `;
  
  state.managers.forEach(manager => {
    const clients = managerGroups[manager];
    const monthlyBreakdown = calculateMonthlyBreakdown(clients);
    
    html += `
      <div class="column" data-manager="${manager}">
        <div class="column-header">
          <div class="column-title">${manager}</div>
          <div class="column-stats">${clients.length} clients, ${calculateTotal(clients)} hrs</div>
          <div class="column-stats" style="margin-top:5px;font-size:10px;">
            ${monthNames.map(month => `${month.substring(0,3)}: ${Math.round(monthlyBreakdown[month])}`).join(' | ')}
          </div>
        </div>
        ${renderCards(clients)}
      </div>
    `;
  });
  
  columns.innerHTML = html;
  
  setupDragAndDrop();
}

function renderCards(clients) {
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
  
  let html = '';
  
  Object.keys(groups).forEach(groupName => {
    const groupClients = groups[groupName];
    const totalHours = groupClients.reduce((sum, c) => sum + c.Total, 0);
    const monthlyHours = calculateMonthlyBreakdown(groupClients);
    const topMonths = Object.entries(monthlyHours)
      .filter(([_, hours]) => hours > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([month, hours]) => `${month.substring(0,3)}: ${Math.round(hours)}`)
      .join(', ');
    
    html += `
      <div class="card group-card" draggable="true" data-group="${groupName}" data-client-id="${groupClients[0].id}">
        <div class="card-title">📁 Group: ${groupName}</div>
        <div class="card-detail">Total: ${Math.round(totalHours)} hrs</div>
        <div class="card-detail">${topMonths}</div>
        <div class="group-members">${groupClients.length} clients: ${groupClients.map(c => c.Client).join(', ')}</div>
      </div>
    `;
  });
  
  individuals.forEach(client => {
    const topMonths = Object.entries(client.months)
      .filter(([_, hours]) => hours > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([month, hours]) => `${month.substring(0,3)}: ${Math.round(hours)}`)
      .join(', ');
    
    html += `
      <div class="card" draggable="true" data-client-id="${client.id}">
        <div class="card-title">${client.Client}</div>
        <div class="card-detail">Partner: ${client.Partner}</div>
        <div class="card-detail">Total: ${Math.round(client.Total)} hrs</div>
        <div class="card-detail">${topMonths}</div>
      </div>
    `;
  });
  
  return html || '<p style="color:#999;text-align:center;padding:20px;">No clients</p>';
}

function setupDragAndDrop() {
  const cards = document.querySelectorAll('.card');
  const columns = document.querySelectorAll('.column');
  
  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
  
  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
  });
}

function handleDragStart(e) {
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('clientId', e.target.dataset.clientId);
  e.dataTransfer.setData('group', e.target.dataset.group || '');
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const clientId = e.dataTransfer.getData('clientId');
  const group = e.dataTransfer.getData('group');
  const targetManager = e.currentTarget.dataset.manager;
  
  if (group) {
    await moveGroup(group, targetManager);
  } else {
    await moveClient(clientId, targetManager);
  }
}

async function moveClient(clientId, manager, skipRender = false) {
  try {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Manager: manager })
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      if (!skipRender) {
        renderUI();
      }
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error moving client:', error);
    alert('Error moving client');
  }
}

async function moveGroup(groupName, manager) {
  const groupClients = state.clients.filter(c => c.Group === groupName);
  
  try {
    // Make all API calls in parallel for better performance
    await Promise.all(
      groupClients.map(client => 
        moveClient(client.id, manager, true) // skipRender = true
      )
    );
    
    // Reload state once after all moves complete
    await loadState();
  } catch (error) {
    console.error('Error moving group:', error);
    alert('Error moving group');
  }
}

function calculateTotal(clients) {
  return Math.round(clients.reduce((sum, c) => sum + c.Total, 0));
}

function calculateMonthlyBreakdown(clients) {
  const breakdown = {
    January: 0, February: 0, March: 0, April: 0,
    May: 0, June: 0, July: 0, August: 0,
    September: 0, October: 0, November: 0, December: 0
  };
  
  clients.forEach(client => {
    monthNames.forEach(month => {
      breakdown[month] += client.months[month] || 0;
    });
  });
  
  return breakdown;
}

async function updateCapacity(input) {
  const manager = input.dataset.manager;
  const month = input.dataset.month;
  const hours = parseFloat(input.value);
  
  try {
    const response = await fetch(`/api/managers/${manager}/capacity`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, hours })
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderManagers();
    }
  } catch (error) {
    console.error('Error updating capacity:', error);
  }
}

async function deleteManager(manager) {
  if (!confirm(`Delete manager ${manager}? Assigned clients will be unassigned.`)) return;
  
  try {
    const response = await fetch(`/api/managers/${manager}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    if (data.success) {
      state = data.state;
      renderUI();
    }
  } catch (error) {
    console.error('Error deleting manager:', error);
  }
}

function handleImport() {
  document.getElementById('fileInput').click();
  
  document.getElementById('fileInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/import', {
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
      console.error('Error importing:', error);
      alert('Error importing file');
    }
  };
}

function showAddManagerModal() {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div class="form-group">
      <label>Manager Name</label>
      <input type="text" id="managerName" placeholder="Enter name">
    </div>
    <div class="form-group">
      <label>Default Monthly Capacity (hours)</label>
      <input type="number" id="managerCapacity" value="100" placeholder="100">
    </div>
    <button class="btn btn-primary" onclick="addManager()">Add Manager</button>
  `;
  
  modal.style.display = 'block';
}

async function addManager() {
  const name = document.getElementById('managerName').value.trim();
  const capacityValue = parseInt(document.getElementById('managerCapacity').value);
  
  if (!name) {
    alert('Please enter a manager name');
    return;
  }
  
  const capacity = {};
  monthNames.forEach(month => {
    capacity[month] = capacityValue;
  });
  
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
    alert('Error adding manager');
  }
}

async function handleAllocate() {
  if (state.managers.length === 0) {
    alert('Please add managers first');
    return;
  }
  
  if (state.clients.length === 0) {
    alert('Please import clients first');
    return;
  }
  
  if (!confirm('Run automatic allocation? This will reassign all clients.')) return;
  
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
    alert('Error running allocation');
  }
}

async function handleExport() {
  if (state.clients.length === 0) {
    alert('No clients to export');
    return;
  }
  
  try {
    window.location.href = '/api/export';
  } catch (error) {
    console.error('Error exporting:', error);
    alert('Error exporting file');
  }
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}