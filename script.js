let lastPartitionCount = null;
let lastNumTopics = 1;
let lastNumClusters = 1;
let lastTier = 'dedicated';
let lastCusPerCluster = 10;

document.getElementById('estimateBtn').addEventListener('click', function() {
  const ingressGiB = parseFloat(document.getElementById('ingress').value);
  const numTopics = parseInt(document.getElementById('numTopics').value, 10) || 1;
  const resultDiv = document.getElementById('result');
  if (isNaN(ingressGiB) || ingressGiB <= 0) {
    resultDiv.textContent = 'Please enter a valid number greater than 0 for GiB/sec ingress.';
    updateProjectionTable(null, numTopics, lastNumClusters, lastTier, lastCusPerCluster);
    updateCapacityTable(null, null, numTopics, lastNumClusters, lastTier);
    lastPartitionCount = null;
    lastNumTopics = numTopics;
    return;
  }
  // GiB/sec to bytes/sec (1 GiB = 1,073,741,824 bytes)
  const bytesPerSec = ingressGiB * 1073741824;
  // Number of partitions PER TOPIC
  const partitionsPerTopic = Math.ceil(bytesPerSec / (1e6 * 60) / numTopics);
  resultDiv.textContent = `Required number of partitions per topic: ${partitionsPerTopic} (across ${numTopics} topic${numTopics > 1 ? 's' : ''})`;
  lastPartitionCount = partitionsPerTopic;
  lastNumTopics = numTopics;
  const numClusters = parseInt(document.getElementById('numClusters').value, 10) || 1;
  const tier = document.getElementById('tier').value;
  const cusPerCluster = parseInt(document.getElementById('cusPerCluster').value, 10) || (tier === 'dedicated' ? 10 : 36);
  lastNumClusters = numClusters;
  lastCusPerCluster = cusPerCluster;
  updateProjectionTable(partitionsPerTopic, numTopics, numClusters, tier, cusPerCluster);
  const totalIngressNeeded = partitionsPerTopic * numTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(partitionsPerTopic, numCUsNeeded, numTopics, numClusters, tier);
});

// CU section
const tierSelect = document.getElementById('tier');
const cusPerClusterInput = document.getElementById('cusPerCluster');
const numClustersInput = document.getElementById('numClusters');

tierSelect.addEventListener('change', function() {
  if (tierSelect.value === 'dedicated') {
    cusPerClusterInput.value = 10;
    cusPerClusterInput.max = 10;
    lastTier = 'dedicated';
    lastCusPerCluster = 10;
  } else {
    cusPerClusterInput.value = 36;
    cusPerClusterInput.max = 36;
    lastTier = 'custom';
    lastCusPerCluster = 36;
  }
  const numClusters = parseInt(numClustersInput.value, 10) || 1;
  lastNumClusters = numClusters;
  updateProjectionTable(lastPartitionCount, lastNumTopics, numClusters, tierSelect.value, lastCusPerCluster);
  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(lastPartitionCount, numCUsNeeded, lastNumTopics, numClusters, tierSelect.value);
});

cusPerClusterInput.addEventListener('input', function() {
  lastCusPerCluster = parseInt(cusPerClusterInput.value, 10) || (tierSelect.value === 'dedicated' ? 10 : 36);
  updateProjectionTable(lastPartitionCount, lastNumTopics, lastNumClusters, tierSelect.value, lastCusPerCluster);
  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(lastPartitionCount, numCUsNeeded, lastNumTopics, lastNumClusters, tierSelect.value);
});

numClustersInput.addEventListener('input', function() {
  lastNumClusters = parseInt(numClustersInput.value, 10) || 1;
  updateProjectionTable(lastPartitionCount, lastNumTopics, lastNumClusters, tierSelect.value, lastCusPerCluster);
  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(lastPartitionCount, numCUsNeeded, lastNumTopics, lastNumClusters, tierSelect.value);
});

document.getElementById('cuBtn').addEventListener('click', function() {
  const cuResultDiv = document.getElementById('cuResult');
  const cuConclusionDiv = document.getElementById('cuConclusion');
  const numClusters = parseInt(numClustersInput.value, 10) || 1;
  const cusPerCluster = parseInt(cusPerClusterInput.value, 10);
  lastNumClusters = numClusters;
  lastCusPerCluster = cusPerCluster;
  const tier = tierSelect.value;
  const maxPartitionsPerTopic = tier === 'dedicated' ? 1024 : 1008;
  const maxCUsPerCluster = tier === 'dedicated' ? 10 : 36;

  if (
    isNaN(numClusters) || numClusters < 1 ||
    isNaN(cusPerCluster) || cusPerCluster < 1
  ) {
    cuResultDiv.textContent = 'Please enter valid numbers for clusters and CUs per cluster.';
    cuConclusionDiv.textContent = '';
    updateCapacityTable(null, null, lastNumTopics, numClusters, tier);
    return;
  }
  if (!lastPartitionCount || lastPartitionCount < 1) {
    cuResultDiv.textContent = 'Please estimate partition count first.';
    cuConclusionDiv.textContent = '';
    updateCapacityTable(null, null, lastNumTopics, numClusters, tier);
    return;
  }

  const overallMaxPartitions = maxPartitionsPerTopic * numClusters * lastNumTopics;

  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  const clusterConfigCUs = numClusters * cusPerCluster;
  const overallMaxCUs = maxCUsPerCluster * numClusters;

  cuResultDiv.innerHTML = `
    <div>Number of CUs needed today (based on partition count): <strong>${numCUsNeeded}</strong></div>
    <div>Your cluster config supports: <strong>${clusterConfigCUs}</strong> CUs</div>
    <div>Max partitions supported: <strong>${overallMaxPartitions}</strong> (${maxPartitionsPerTopic} per topic, per cluster)</div>
  `;


  updateCapacityTable(
    lastPartitionCount,
    numCUsNeeded,
    lastNumTopics,
    numClusters,
    tier
  );
});

function updateProjectionTable(currentPartitions, numTopics, numClusters, tier, cusPerCluster) {
  const tbody = document.querySelector('#projection-table tbody');
  tbody.innerHTML = '';
  if (!currentPartitions) {
    return;
  }
  const maxPartitionsPerTopic = (tier === 'dedicated' ? 1024 : 1008) * numClusters;
  const maxCUs = cusPerCluster * numClusters;
  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  let projectedPartitions = currentPartitions;
  for (let i = 0; i < 7; i++) {
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const row = document.createElement('tr');
    const monthCell = document.createElement('td');
    monthCell.textContent = monthName;
    const partitionsCount = Math.ceil(projectedPartitions);
    const partitionsCell = document.createElement('td');
    partitionsCell.textContent = partitionsCount;
    const projectedCUs = Math.ceil(partitionsCount * numTopics / 150);
    const cuCell = document.createElement('td');

    // Compare to cluster config, not just max per tier
    const partitionClass = partitionsCount <= maxPartitionsPerTopic ? 'capacity-ok' : 'capacity-bad';
    const cuClass = projectedCUs <= maxCUs ? 'capacity-ok' : 'capacity-bad';
    partitionsCell.className = partitionClass;
    cuCell.className = cuClass;
    cuCell.textContent = projectedCUs;

    row.appendChild(monthCell);
    row.appendChild(partitionsCell);
    row.appendChild(cuCell);
    tbody.appendChild(row);
    projectedPartitions *= 1.1;
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
}

function updateCapacityTable(reqPartitionsPerTopic, reqCUs, numTopics, numClusters, tier) {
  const tableBody = document.querySelector('#capacity-table tbody');
  tableBody.innerHTML = '';
  if (reqPartitionsPerTopic == null || reqCUs == null || numTopics == null || numClusters == null || tier == null) {
    return;
  }
  const maxPartitionsPerTopic = (tier === 'dedicated' ? 1024 : 1008) * numClusters;
  const maxPartitionsOverall = maxPartitionsPerTopic * numTopics;
  const totalReqPartitions = reqPartitionsPerTopic * numTopics;
  const maxCUs = (tier === 'dedicated' ? 10 : 36) * numClusters;

  const partitionClass = totalReqPartitions <= maxPartitionsOverall ? 'capacity-ok' : 'capacity-bad';
  const cuClass = reqCUs <= maxCUs ? 'capacity-ok' : 'capacity-bad';

  const row = document.createElement('tr');
  const reqPartCell = document.createElement('td');
  reqPartCell.textContent = `${totalReqPartitions} (${reqPartitionsPerTopic} per topic)`;
  reqPartCell.className = partitionClass;
  const maxPartCell = document.createElement('td');
  maxPartCell.textContent = `${maxPartitionsOverall} (${maxPartitionsPerTopic} per topic)`;
  maxPartCell.className = partitionClass;
  const reqCUCell = document.createElement('td');
  reqCUCell.textContent = reqCUs;
  reqCUCell.className = cuClass;
  const maxCUCell = document.createElement('td');
  maxCUCell.textContent = maxCUs;
  maxCUCell.className = cuClass;
  row.appendChild(reqPartCell);
  row.appendChild(maxPartCell);
  row.appendChild(reqCUCell);
  row.appendChild(maxCUCell);
  tableBody.appendChild(row);
}

function findOverCapacityMonth(initialPartitions, clusterConfigCUs, tier, numClusters, numTopics) {
  let projectedPartitions = initialPartitions;
  for (let i = 0; i < 7; i++) {
    const projectedCUs = Math.ceil(projectedPartitions * numTopics / 150);
    if (projectedCUs > clusterConfigCUs) {
      const now = new Date();
      let targetMonth = now.getMonth() + i;
      let year = now.getFullYear();
      if (targetMonth > 11) {
        targetMonth -= 12;
        year += 1;
      }
      return new Date(year, targetMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    projectedPartitions *= 1.1;
  }
  return "the next 7 months";
}