// ADX Capacity Estimator JavaScript

// Baseline metrics for 195TB/day with instance count 300
const BASELINE_METRICS = {
  ingestTBPerDay: 195,
  avgLatencyMinutes: 1.18,
  maxLatencyMinutes: 14.02,
  cpuPercentage: 15, // CPU utilization per cluster at baseline load
  cacheUtilizationPercentage: 30,
  instanceCount: 300
};

let metricsCalculated = false;

// Query param sync functions
function setQueryParamsFromInputs() {
  const params = new URLSearchParams();
  params.set('ingestTBPerDay', document.getElementById('ingestTBPerDay').value);
  params.set('clusterCount', document.getElementById('clusterCount').value);
  window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
}

function setInputsFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('ingestTBPerDay')) document.getElementById('ingestTBPerDay').value = params.get('ingestTBPerDay');
  if (params.has('clusterCount')) document.getElementById('clusterCount').value = params.get('clusterCount');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
  setInputsFromQueryParams();
  
  // Add event listeners for input changes
  const inputs = ['ingestTBPerDay', 'clusterCount'];
  inputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', setQueryParamsFromInputs);
      element.addEventListener('change', setQueryParamsFromInputs);
    }
  });

  // Trigger calculations if values are present
  if (document.getElementById('ingestTBPerDay').value) {
    calculateMetrics();
  }
});

// Metric calculation
document.getElementById('calculateBtn').addEventListener('click', calculateMetrics);

function calculateMetrics() {
  const ingestTBPerDay = parseFloat(document.getElementById('ingestTBPerDay').value);
  const clusterCount = parseInt(document.getElementById('clusterCount').value);
  
  const resultDiv = document.getElementById('metricsResult');
  
  if (isNaN(ingestTBPerDay) || ingestTBPerDay <= 0) {
    resultDiv.textContent = 'Please enter a valid TB/day ingestion amount.';
    metricsCalculated = false;
    updateMetricsTable();
    return;
  }
  
  if (isNaN(clusterCount) || clusterCount <= 0) {
    resultDiv.textContent = 'Please enter a valid cluster count.';
    metricsCalculated = false;
    updateMetricsTable();
    return;
  }
  
  // Calculate scaling factor based on ingestion load
  const ingestScalingFactor = ingestTBPerDay / BASELINE_METRICS.ingestTBPerDay;
  
  // Calculate scaling factor based on cluster count (more clusters = better performance)
  const clusterScalingFactor = BASELINE_METRICS.instanceCount / clusterCount;
  
  // Calculate estimated metrics
  const estimatedAvgLatency = BASELINE_METRICS.avgLatencyMinutes * ingestScalingFactor / Math.sqrt(clusterCount);
  const estimatedMaxLatency = BASELINE_METRICS.maxLatencyMinutes * ingestScalingFactor / Math.sqrt(clusterCount);
  
  // CPU utilization should scale with ingestion but be divided across clusters
  const estimatedCPU = (BASELINE_METRICS.cpuPercentage * ingestScalingFactor) / clusterCount;
  
  const estimatedCacheUtilization = BASELINE_METRICS.cacheUtilizationPercentage * ingestScalingFactor;
  const instanceCountPerCluster = Math.ceil(clusterScalingFactor);
  
  // Cap values at reasonable maximums
  const cappedAvgLatency = Math.min(estimatedAvgLatency, 30);
  const cappedMaxLatency = Math.min(estimatedMaxLatency, 120);
  const cappedCPU = Math.min(estimatedCPU, 100);
  const cappedCacheUtilization = Math.min(estimatedCacheUtilization, 100);
  
  resultDiv.innerHTML = `
    <div><strong>Estimated ADX Performance Metrics:</strong></div>
    <div>Average Latency: <strong>${cappedAvgLatency.toFixed(2)} minutes</strong></div>
    <div>Maximum Latency: <strong>${cappedMaxLatency.toFixed(2)} minutes</strong></div>
    <div>CPU Utilization: <strong>${cappedCPU.toFixed(1)}%</strong></div>
    <div>Cache Utilization: <strong>${cappedCacheUtilization.toFixed(1)}%</strong></div>
    <div>Min Instance Count per Cluster: <strong>${instanceCountPerCluster}</strong></div>
    <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
      Based on scaling from baseline: ${BASELINE_METRICS.ingestTBPerDay}TB/day with ${BASELINE_METRICS.instanceCount} instances
    </div>
  `;
  
  metricsCalculated = true;
  updateMetricsTable();
  updatePerformanceAnalysis();
  updateAdxProjectionTable();
  setQueryParamsFromInputs();
}

function updateMetricsTable() {
  const table = document.getElementById('metrics-table');
  
  if (!metricsCalculated) {
    table.style.display = 'none';
    updateAdxProjectionTable();
    return;
  }
  
  const ingestTBPerDay = parseFloat(document.getElementById('ingestTBPerDay').value);
  const clusterCount = parseInt(document.getElementById('clusterCount').value);
  
  table.style.display = 'table';
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  
  // Calculate metrics again for the table
  const ingestScalingFactor = ingestTBPerDay / BASELINE_METRICS.ingestTBPerDay;
  const clusterScalingFactor = BASELINE_METRICS.instanceCount / clusterCount;
  
  const estimatedAvgLatency = Math.min(BASELINE_METRICS.avgLatencyMinutes * ingestScalingFactor / Math.sqrt(clusterCount), 30);
  const estimatedMaxLatency = Math.min(BASELINE_METRICS.maxLatencyMinutes * ingestScalingFactor / Math.sqrt(clusterCount), 120);
  const estimatedCPU = Math.min((BASELINE_METRICS.cpuPercentage * ingestScalingFactor) / clusterCount, 100);
  const estimatedCacheUtilization = Math.min(BASELINE_METRICS.cacheUtilizationPercentage * ingestScalingFactor, 100);
  const instanceCountPerCluster = Math.ceil(clusterScalingFactor);
  
  // Create table rows
  const metrics = [
    { name: 'Average Latency', baseline: `${BASELINE_METRICS.avgLatencyMinutes} min`, estimated: `${estimatedAvgLatency.toFixed(2)} min` },
    { name: 'Maximum Latency', baseline: `${BASELINE_METRICS.maxLatencyMinutes} min`, estimated: `${estimatedMaxLatency.toFixed(2)} min` },
    { name: 'CPU Utilization', baseline: `${BASELINE_METRICS.cpuPercentage}%`, estimated: `${estimatedCPU.toFixed(1)}%` },
    { name: 'Cache Utilization', baseline: `${BASELINE_METRICS.cacheUtilizationPercentage}%`, estimated: `${estimatedCacheUtilization.toFixed(1)}%` },
    { name: 'Min Instance Count per Cluster', baseline: `${BASELINE_METRICS.instanceCount}`, estimated: `${instanceCountPerCluster}` }
  ];
  
  metrics.forEach(metric => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${metric.name}</td>
      <td>${metric.baseline}</td>
      <td>${metric.estimated}</td>
    `;
    tbody.appendChild(row);
  });
}

function updatePerformanceAnalysis() {
  const analysisDiv = document.getElementById('performanceAnalysis');
  
  if (!metricsCalculated) {
    analysisDiv.innerHTML = '<p>Complete the calculation above to see performance analysis.</p>';
    return;
  }
  
  const ingestTBPerDay = parseFloat(document.getElementById('ingestTBPerDay').value);
  const clusterCount = parseInt(document.getElementById('clusterCount').value);
  
  const ingestScalingFactor = ingestTBPerDay / BASELINE_METRICS.ingestTBPerDay;
  const clusterScalingFactor = BASELINE_METRICS.instanceCount / clusterCount;
  
  const estimatedCPU = Math.min((BASELINE_METRICS.cpuPercentage * ingestScalingFactor) / clusterCount, 100);
  const estimatedAvgLatency = Math.min(BASELINE_METRICS.avgLatencyMinutes * ingestScalingFactor / Math.sqrt(clusterCount), 30);
  
  let analysis = '<div><strong>Performance Analysis:</strong></div>';
  
  // CPU Analysis
  if (estimatedCPU < 20) {
    analysis += '<div class="analysis-good">✅ CPU utilization is low - cluster has plenty of compute headroom</div>';
  } else if (estimatedCPU < 50) {
    analysis += '<div class="analysis-warning">⚠️  CPU utilization is moderate - monitor for growth</div>';
  } else if (estimatedCPU < 80) {
    analysis += '<div class="analysis-warning">⚠️  CPU utilization is high - consider adding more clusters</div>';
  } else {
    analysis += '<div class="analysis-bad">🚨 CPU utilization is very high - additional clusters strongly recommended</div>';
  }
  
  // Latency Analysis
  if (estimatedAvgLatency < 2) {
    analysis += '<div class="analysis-good">✅ Latency is excellent</div>';
  } else if (estimatedAvgLatency < 5) {
    analysis += '<div class="analysis-warning">⚠️  Latency is acceptable but monitor for growth</div>';
  } else if (estimatedAvgLatency < 10) {
    analysis += '<div class="analysis-warning">⚠️  Latency is high - consider optimizing or adding clusters</div>';
  } else {
    analysis += '<div class="analysis-bad">🚨 Latency is very high - cluster optimization needed</div>';
  }
  
  // Scaling recommendations
  if (ingestTBPerDay > BASELINE_METRICS.ingestTBPerDay) {
    const recommendedClusters = Math.ceil(ingestScalingFactor);
    if (clusterCount < recommendedClusters) {
      analysis += `<div class="analysis-recommendation">💡 Recommendation: Consider scaling to ${recommendedClusters} clusters for optimal performance</div>`;
    }
  }
  
  analysisDiv.innerHTML = analysis;
}

function updateAdxProjectionTable() {
  const table = document.getElementById('adx-projection-table');
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  
  if (!metricsCalculated) {
    table.style.display = 'none';
    return;
  }
  
  table.style.display = 'table';
  
  const clusterCount = parseInt(document.getElementById('clusterCount').value);
  let projectedVolume = parseFloat(document.getElementById('ingestTBPerDay').value);
  
  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  const monthlyGrowthRate = 0.10; // 10% monthly growth

  for (let i = 0; i < 7; i++) {
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Calculate metrics for this month
    const ingestScalingFactor = projectedVolume / BASELINE_METRICS.ingestTBPerDay;
    const clusterScalingFactor = BASELINE_METRICS.instanceCount / clusterCount;
    
    const estimatedAvgLatency = Math.min(BASELINE_METRICS.avgLatencyMinutes * ingestScalingFactor / Math.sqrt(clusterCount), 30);
    const estimatedCPU = Math.min((BASELINE_METRICS.cpuPercentage * ingestScalingFactor) / clusterCount, 100);
    const estimatedCacheUtilization = Math.min(BASELINE_METRICS.cacheUtilizationPercentage * ingestScalingFactor, 100);
    const minInstanceCountPerCluster = Math.ceil(clusterScalingFactor);
    
    // Determine performance status
    let performanceStatus = '';
    let statusClass = '';
    if (estimatedCPU < 20 && estimatedAvgLatency < 2) {
      performanceStatus = 'Excellent';
      statusClass = 'capacity-ok';
    } else if (estimatedCPU < 50 && estimatedAvgLatency < 5) {
      performanceStatus = 'Good';
      statusClass = 'capacity-ok';
    } else if (estimatedCPU < 80 && estimatedAvgLatency < 10) {
      performanceStatus = 'Acceptable';
      statusClass = 'capacity-warning';
    } else {
      performanceStatus = 'Poor';
      statusClass = 'capacity-bad';
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${monthName}</td>
      <td>${projectedVolume.toFixed(1)} TB</td>
      <td class="${statusClass}">${estimatedAvgLatency.toFixed(2)} min</td>
      <td class="${statusClass}">${estimatedCPU.toFixed(1)}%</td>
      <td class="${statusClass}">${estimatedCacheUtilization.toFixed(1)}%</td>
      <td class="${statusClass}">${minInstanceCountPerCluster}</td>
      <td class="${statusClass}">${performanceStatus}</td>
    `;
    
    tbody.appendChild(row);

    // Apply growth for next month
    projectedVolume *= (1 + monthlyGrowthRate);
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
}
