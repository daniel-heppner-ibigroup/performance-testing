import { sleep } from 'k6';
import http from 'k6/http';
import { check, fail } from 'k6';
import { Rate } from 'k6/metrics';
import presets from './presets.js';
import { runPreset } from './queries.js';

// Custom metric to track error rate
const errorRate = new Rate('errors');

// Options for the load test
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 VUs over 2 minutes
    { duration: '3m', target: 20 },   // Ramp up to 20 VUs over 3 minutes
    { duration: '5m', target: 50 },   // Ramp up to 50 VUs over 5 minutes
    { duration: '5m', target: 100 },  // Ramp up to 100 VUs over 5 minutes
    { duration: '5m', target: 200 },  // Ramp up to 200 VUs over 5 minutes
    { duration: '5m', target: 300 },  // Ramp up to 300 VUs over 5 minutes
    { duration: '5m', target: 0 },    // Ramp down to 0 VUs over 5 minutes
  ],
  thresholds: {
    'http_req_failed': [{ threshold: 'rate < 0.01', abortOnFail: true, delayAbortEval: '1m' }],  // Error rate should be less than 10%
  },
};

export default function () {
  const preset = presets.hopelinkStressTest;  // You can change this to use different presets
  
  const result = runPreset(preset);
  
  // Check if the runPreset function returned any errors
  errorRate.add(!result);
  
  if (!result) {
    console.error('Request failed or timed out');
  }
  
  // Add a small sleep to prevent hammering the server too hard
  sleep(1);
}

// This function is called when the test ends
export function handleSummary(data) {
  console.log('Test finished');
  if (data.metrics.errors.rate > 0.1) {
    console.log('Error rate exceeded 10%, consider this the breaking point');
  }
  return {
    'stdout': JSON.stringify(data),  // Write the full test result to stdout
  };
}