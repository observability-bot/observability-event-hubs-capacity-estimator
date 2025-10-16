let lastPartitionCount = null;
let lastNumTopics = 1;
let lastNumClusters = 1;
let lastTier = 'dedicated';
let lastCusPerCluster = 10;
let lastMaxPartitionsPerTopic = 1024; // Default for dedicated

// Listen for max partitions per topic input changes
const maxPartitionsPerTopicInput = document.getElementById('maxPartitionsPerTopic');
maxPartitionsPerTopicInput.addEventListener('input', function() {
  lastMaxPartitionsPerTopic = parseInt(maxPartitionsPerTopicInput.value, 10) || (lastTier === 'dedicated' ? 1024 : 1008);
  updateProjectionTable(lastPartitionCount, lastNumTopics, lastNumClusters, lastTier, lastCusPerCluster, lastMaxPartitionsPerTopic);
  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(lastPartitionCount, numCUsNeeded, lastNumTopics, lastNumClusters, lastTier, lastMaxPartitionsPerTopic);
});

document.getElementById('estimateBtn').addEventListener('click', function() {
   // Convert TiB/day to MB/day (1 TiB = 1,048,576 MB)
  const ingressTiB = parseFloat(document.getElementById('ingress').value);
  const ingressMB = Math.ceil(ingressTiB * 1099511.62 / 86400);
  const numTopics = parseInt(document.getElementById('numTopics').value, 10) || 1;
  const resultDiv = document.getElementById('result');
  if (isNaN(ingressMB) || ingressMB <= 0) {
    resultDiv.textContent = 'Please enter a valid number greater than 0 for MB/sec ingress.';
    updateProjectionTable(null, numTopics, lastNumClusters, lastTier, lastCusPerCluster, lastMaxPartitionsPerTopic);
    updateCapacityTable(null, null, numTopics, lastNumClusters, lastTier, lastMaxPartitionsPerTopic);
    lastPartitionCount = null;
    lastNumTopics = numTopics;
    return;
  }
 
  // Number of partitions PER TOPIC
  const partitionsPerTopic = ingressMB / numTopics;
  resultDiv.textContent = `Required number of partitions per topic: ${partitionsPerTopic} (across ${numTopics} topic${numTopics > 1 ? 's' : ''})`;
  lastPartitionCount = partitionsPerTopic;
  lastNumTopics = numTopics;
  const numClusters = parseInt(document.getElementById('numClusters').value, 10) || 1;
  const tier = document.getElementById('tier').value;
  const cusPerCluster = parseInt(document.getElementById('cusPerCluster').value, 10) || (tier === 'dedicated' ? 10 : 36);
  lastNumClusters = numClusters;
  lastCusPerCluster = cusPerCluster;
  updateProjectionTable(partitionsPerTopic, numTopics, numClusters, tier, cusPerCluster, lastMaxPartitionsPerTopic);
  const totalIngressNeeded = partitionsPerTopic * numTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(partitionsPerTopic, numCUsNeeded, numTopics, numClusters, tier, lastMaxPartitionsPerTopic);
});

const tierSelect = document.getElementById('tier');
const cusPerClusterInput = document.getElementById('cusPerCluster');
const numClustersInput = document.getElementById('numClusters');

// Set initial default on page load
if (tierSelect.value === 'dedicated') {
  maxPartitionsPerTopicInput.value = 1024;
  lastMaxPartitionsPerTopic = 1024;
} else {
  maxPartitionsPerTopicInput.value = 1008;
  lastMaxPartitionsPerTopic = 1008;
}

tierSelect.addEventListener('change', function() {
  if (tierSelect.value === 'dedicated') {
    cusPerClusterInput.value = 10;
    cusPerClusterInput.max = 10;
    lastTier = 'dedicated';
    lastCusPerCluster = 10;
    maxPartitionsPerTopicInput.value = 1024;
    lastMaxPartitionsPerTopic = 1024;
  } else {
    cusPerClusterInput.value = 36;
    cusPerClusterInput.max = 36;
    lastTier = 'custom';
    lastCusPerCluster = 36;
    maxPartitionsPerTopicInput.value = 1008;
    lastMaxPartitionsPerTopic = 1008;
  }
  const numClusters = parseInt(numClustersInput.value, 10) || 1;
  lastNumClusters = numClusters;
  updateProjectionTable(lastPartitionCount, lastNumTopics, numClusters, tierSelect.value, lastCusPerCluster, lastMaxPartitionsPerTopic);
  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(lastPartitionCount, numCUsNeeded, lastNumTopics, numClusters, tierSelect.value, lastMaxPartitionsPerTopic);
});


cusPerClusterInput.addEventListener('input', function() {
  lastCusPerCluster = parseInt(cusPerClusterInput.value, 10) || (tierSelect.value === 'dedicated' ? 10 : 36);
  updateProjectionTable(lastPartitionCount, lastNumTopics, lastNumClusters, tierSelect.value, lastCusPerCluster, lastMaxPartitionsPerTopic);
  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(lastPartitionCount, numCUsNeeded, lastNumTopics, lastNumClusters, tierSelect.value, lastMaxPartitionsPerTopic);
});

numClustersInput.addEventListener('input', function() {
  lastNumClusters = parseInt(numClustersInput.value, 10) || 1;
  updateProjectionTable(lastPartitionCount, lastNumTopics, lastNumClusters, tierSelect.value, lastCusPerCluster, lastMaxPartitionsPerTopic);
  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  updateCapacityTable(lastPartitionCount, numCUsNeeded, lastNumTopics, lastNumClusters, tierSelect.value, lastMaxPartitionsPerTopic);
});

document.getElementById('cuBtn').addEventListener('click', function() {
  const cuResultDiv = document.getElementById('cuResult');
  const cuConclusionDiv = document.getElementById('cuConclusion');
  const numClusters = parseInt(numClustersInput.value, 10) || 1;
  const cusPerCluster = parseInt(cusPerClusterInput.value, 10);
  lastNumClusters = numClusters;
  lastCusPerCluster = cusPerCluster;
  const tier = tierSelect.value;
  const maxPartitionsPerTopic = lastMaxPartitionsPerTopic;
  const maxCUsPerCluster = tier === 'dedicated' ? 10 : 36;

  if (
    isNaN(numClusters) || numClusters < 1 ||
    isNaN(cusPerCluster) || cusPerCluster < 1
  ) {
    cuResultDiv.textContent = 'Please enter valid numbers for clusters and CUs per cluster.';
    cuConclusionDiv.textContent = '';
    updateCapacityTable(null, null, lastNumTopics, numClusters, tier, maxPartitionsPerTopic);
    return;
  }
  if (!lastPartitionCount || lastPartitionCount < 1) {
    cuResultDiv.textContent = 'Please estimate partition count first.';
    cuConclusionDiv.textContent = '';
    updateCapacityTable(null, null, lastNumTopics, numClusters, tier, maxPartitionsPerTopic);
    return;
  }

  const overallMaxPartitions = maxPartitionsPerTopic * numClusters * lastNumTopics;

  const totalIngressNeeded = lastPartitionCount * lastNumTopics * 1;
  const numCUsNeeded = Math.ceil(totalIngressNeeded / 150);
  const clusterConfigCUs = numClusters * cusPerCluster;

  cuResultDiv.innerHTML = `
    <div>Number of CUs needed today (based on partition count): <strong>${numCUsNeeded}</strong></div>
    <div>Your cluster config supports: <strong>${clusterConfigCUs}</strong> CUs</div>
    <div>Max partitions supported: <strong>${overallMaxPartitions}</strong> (${maxPartitionsPerTopic} per topic, per cluster)</div>
    ${partitionWarning ? `<div style="color:#e63946;">${partitionWarning}</div>` : ''}
  `;

  updateCapacityTable(
    lastPartitionCount,
    numCUsNeeded,
    lastNumTopics,
    numClusters,
    tier,
    maxPartitionsPerTopic
  );
});

function updateProjectionTable(currentPartitions, numTopics, numClusters, tier, cusPerCluster, maxPartitionsPerTopic) {
  const tbody = document.querySelector('#projection-table tbody');
  tbody.innerHTML = '';
  if (!currentPartitions) {
    return;
  }
  // Per-topic partition and CU limits
  const maxPartitionsPerTopicEffective = maxPartitionsPerTopic * numClusters;
  const maxCUs = cusPerCluster * numClusters;

  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  let projectedPartitions = currentPartitions;

  for (let i = 0; i < 7; i++) {
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const row = document.createElement('tr');
    // Month cell
    const monthCell = document.createElement('td');
    monthCell.textContent = monthName;

    // Projected partition count (per topic)
    const partitionsCount = Math.ceil(projectedPartitions);
    const partitionsCell = document.createElement('td');
    partitionsCell.textContent = partitionsCount;

    // Projected Required CUs
    const projectedCUs = Math.ceil(partitionsCount * numTopics / 150);
    const cuCell = document.createElement('td');
    cuCell.textContent = projectedCUs;

    // Remaining Capacity Calculations (show negatives)
    let partitionCapacityRemaining = ((maxPartitionsPerTopicEffective - partitionsCount) / maxPartitionsPerTopicEffective) * 100;
    let cuCapacityRemaining = ((maxCUs - projectedCUs) / maxCUs) * 100;
    partitionCapacityRemaining = partitionCapacityRemaining.toFixed(2);
    cuCapacityRemaining = cuCapacityRemaining.toFixed(2);

    const partitionRemCell = document.createElement('td');
    partitionRemCell.textContent = `${partitionCapacityRemaining}%`;
    const cuRemCell = document.createElement('td');
    cuRemCell.textContent = `${cuCapacityRemaining}%`;

    // Capacity coloring logic
    const partitionClass = partitionsCount <= maxPartitionsPerTopicEffective ? 'capacity-ok' : 'capacity-bad';
    const cuClass = projectedCUs <= maxCUs ? 'capacity-ok' : 'capacity-bad';
    partitionsCell.className = partitionClass;
    cuCell.className = cuClass;
    partitionRemCell.className = partitionClass;
    cuRemCell.className = cuClass;

    row.appendChild(monthCell);
    row.appendChild(partitionsCell);
    row.appendChild(partitionRemCell);
    row.appendChild(cuCell);
    row.appendChild(cuRemCell);

    tbody.appendChild(row);

    projectedPartitions *= 1.1;
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
}

function updateCapacityTable(reqPartitionsPerTopic, reqCUs, numTopics, numClusters, tier, maxPartitionsPerTopic) {
  const tableBody = document.querySelector('#capacity-table tbody');
  tableBody.innerHTML = '';
  if (reqPartitionsPerTopic == null || reqCUs == null || numTopics == null || numClusters == null || tier == null) {
    return;
  }
  const maxPartitionsPerTopicEffective = maxPartitionsPerTopic * numClusters;
  const maxPartitionsOverall = maxPartitionsPerTopicEffective * numTopics;
  const totalReqPartitions = reqPartitionsPerTopic * numTopics;
  const maxCUs = (tier === 'dedicated' ? 10 : 36) * numClusters;

  const partitionClass = totalReqPartitions <= maxPartitionsOverall ? 'capacity-ok' : 'capacity-bad';
  const cuClass = reqCUs <= maxCUs ? 'capacity-ok' : 'capacity-bad';

  const row = document.createElement('tr');
  const reqPartCell = document.createElement('td');
  reqPartCell.textContent = `${totalReqPartitions} (${reqPartitionsPerTopic} per topic)`;
  reqPartCell.className = partitionClass;
  const maxPartCell = document.createElement('td');
  maxPartCell.textContent = `${maxPartitionsOverall} (${maxPartitionsPerTopicEffective} per topic)`;
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