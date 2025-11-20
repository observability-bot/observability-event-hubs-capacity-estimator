// Blob Store Capacity Estimator JavaScript

// Storage account limits
const STORAGE_ACCOUNT_LIMITS = {
  maxIngressGBPerSec: 60, // Maximum ingress throughput per storage account
  monthlyGrowthRate: 0.10 // 10% monthly growth
};

let storageCalculated = false;
let currentDailyVolumeTB = 0;

// Query param sync functions
function setQueryParamsFromInputs() {
  const params = new URLSearchParams();
  params.set('dailyVolumeTB', document.getElementById('dailyVolumeTB').value);
  window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
}

function setInputsFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('dailyVolumeTB')) document.getElementById('dailyVolumeTB').value = params.get('dailyVolumeTB');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
  setInputsFromQueryParams();
  
  // Add event listeners for input changes
  const element = document.getElementById('dailyVolumeTB');
  if (element) {
    element.addEventListener('input', setQueryParamsFromInputs);
    element.addEventListener('change', setQueryParamsFromInputs);
  }

  // Trigger calculations if values are present
  if (document.getElementById('dailyVolumeTB').value) {
    calculateStorageRequirements();
  }
});

// Storage calculation
document.getElementById('calculateStorageBtn').addEventListener('click', calculateStorageRequirements);

function calculateStorageRequirements() {
  const dailyVolumeTB = parseFloat(document.getElementById('dailyVolumeTB').value);
  const resultDiv = document.getElementById('storageResult');
  
  if (isNaN(dailyVolumeTB) || dailyVolumeTB <= 0) {
    resultDiv.textContent = 'Please enter a valid daily volume in TB/day.';
    storageCalculated = false;
    updateConfigTable();
    updateProjectionTable();
    return;
  }
  
  currentDailyVolumeTB = dailyVolumeTB;
  
  // Convert TB/day to GB/sec
  // 1 TB = 1000 GB (using decimal conversion for storage)
  // 1 day = 86400 seconds
  const dailyVolumeGB = dailyVolumeTB * 1000;
  const peakIngressGBPerSec = dailyVolumeGB / 86400;
  
  // Calculate number of storage accounts needed
  const requiredStorageAccounts = Math.ceil(peakIngressGBPerSec / STORAGE_ACCOUNT_LIMITS.maxIngressGBPerSec);
  
  // Calculate utilization per storage account
  const utilizationPerAccount = (peakIngressGBPerSec / requiredStorageAccounts / STORAGE_ACCOUNT_LIMITS.maxIngressGBPerSec) * 100;
  
  resultDiv.innerHTML = `
    <div><strong>Storage Account Analysis:</strong></div>
    <div>Daily Volume: ${dailyVolumeTB} TB/day</div>
    <div>Peak Ingress Rate: <strong>${peakIngressGBPerSec.toFixed(2)} GB/sec</strong></div>
    <div>Required Storage Accounts: <strong>${requiredStorageAccounts}</strong></div>
    <div>Utilization per Account: <strong>${utilizationPerAccount.toFixed(1)}%</strong></div>
    <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
      Based on maximum ingress throughput of ${STORAGE_ACCOUNT_LIMITS.maxIngressGBPerSec} GB/sec per storage account
    </div>
  `;
  
  storageCalculated = true;
  updateConfigTable();
  updateProjectionTable();
  setQueryParamsFromInputs();
}

function updateConfigTable() {
  const table = document.getElementById('storage-config-table');
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  
  if (!storageCalculated) {
    return;
  }
  
  const dailyVolumeGB = currentDailyVolumeTB * 1000;
  const peakIngressGBPerSec = dailyVolumeGB / 86400;
  const requiredStorageAccounts = Math.ceil(peakIngressGBPerSec / STORAGE_ACCOUNT_LIMITS.maxIngressGBPerSec);
  const utilizationPerAccount = (peakIngressGBPerSec / requiredStorageAccounts / STORAGE_ACCOUNT_LIMITS.maxIngressGBPerSec) * 100;
  
  const configData = [
    { metric: 'Daily Ingress Volume', value: `${currentDailyVolumeTB} TB/day`, details: 'Input volume' },
    { metric: 'Peak Ingress Rate', value: `${peakIngressGBPerSec.toFixed(2)} GB/sec`, details: 'Calculated from daily volume' },
    { metric: 'Required Storage Accounts', value: requiredStorageAccounts.toString(), details: 'To stay below 60 GB/sec limit' },
    { metric: 'Utilization per Account', value: `${utilizationPerAccount.toFixed(1)}%`, details: 'Average ingress load per account' },
    { metric: 'Total Capacity', value: `${requiredStorageAccounts * STORAGE_ACCOUNT_LIMITS.maxIngressGBPerSec} GB/sec`, details: 'Maximum theoretical throughput' }
  ];
  
  configData.forEach(item => {
    const row = document.createElement('tr');
    
    // Add appropriate styling based on utilization
    let rowClass = '';
    if (item.metric === 'Utilization per Account') {
      const util = parseFloat(item.value);
      if (util < 60) {
        rowClass = 'capacity-ok';
      } else if (util < 80) {
        rowClass = 'capacity-warning';
      } else {
        rowClass = 'capacity-bad';
      }
    }
    
    row.innerHTML = `
      <td>${item.metric}</td>
      <td class="${rowClass}">${item.value}</td>
      <td>${item.details}</td>
    `;
    tbody.appendChild(row);
  });
}

function updateProjectionTable() {
  const tbody = document.querySelector('#projection-table tbody');
  tbody.innerHTML = '';
  
  if (!storageCalculated) {
    return;
  }
  
  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  let projectedVolume = currentDailyVolumeTB;

  for (let i = 0; i < 7; i++) {
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Calculate metrics for this month
    const dailyVolumeGB = projectedVolume * 1000;
    const peakIngressGBPerSec = dailyVolumeGB / 86400;
    const requiredStorageAccounts = Math.ceil(peakIngressGBPerSec / STORAGE_ACCOUNT_LIMITS.maxIngressGBPerSec);
    const utilizationPerAccount = (peakIngressGBPerSec / requiredStorageAccounts / STORAGE_ACCOUNT_LIMITS.maxIngressGBPerSec) * 100;
    
    const row = document.createElement('tr');
    
    // Month cell
    const monthCell = document.createElement('td');
    monthCell.textContent = monthName;
    
    // Volume cell
    const volumeCell = document.createElement('td');
    volumeCell.textContent = `${projectedVolume.toFixed(1)} TB`;
    
    // Ingress cell
    const ingressCell = document.createElement('td');
    ingressCell.textContent = `${peakIngressGBPerSec.toFixed(2)} GB/sec`;
    
    // Storage accounts cell
    const accountsCell = document.createElement('td');
    accountsCell.textContent = requiredStorageAccounts.toString();
    
    // Utilization cell with color coding
    const utilizationCell = document.createElement('td');
    utilizationCell.textContent = `${utilizationPerAccount.toFixed(1)}%`;
    
    // Color coding based on utilization
    let utilizationClass = '';
    if (utilizationPerAccount < 60) {
      utilizationClass = 'capacity-ok';
    } else if (utilizationPerAccount < 80) {
      utilizationClass = 'capacity-warning';
    } else {
      utilizationClass = 'capacity-bad';
    }
    
    accountsCell.className = utilizationClass;
    utilizationCell.className = utilizationClass;
    
    row.appendChild(monthCell);
    row.appendChild(volumeCell);
    row.appendChild(ingressCell);
    row.appendChild(accountsCell);
    row.appendChild(utilizationCell);
    
    tbody.appendChild(row);

    // Apply growth for next month
    projectedVolume *= (1 + STORAGE_ACCOUNT_LIMITS.monthlyGrowthRate);
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
}
