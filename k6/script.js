import presets from "./presets.js";
import { sleep } from "k6";
import http from "k6/http";
import { runPreset } from "./queries.js";

const RESULTS_URL = __ENV.RESULTS_URL;
const INSTANCE_TYPE = __ENV.INSTANCE_TYPE;

export const options = {
	vus: 1,
	duration: "5m",
	thresholds: {
		http_req_failed: [
			{ threshold: "rate < 0.01", abortOnFail: true, delayAbortEval: "1m" },
		], // Error rate should be less than 1%
		checks: [
			{ threshold: "rate > 0.99", abortOnFail: true, delayAbortEval: "1m" },
		], // Error rate should be less than 1%
	},
};

export default function () {
	runPreset(presets[__ENV.TEST_PRESET]);
	sleep(1);
}

export function handleSummary(data) {
	console.log(data.metrics.http_req_failed)
    if (RESULTS_URL) {
        const payload = JSON.stringify({
            timestamp: new Date().toISOString(),
			instanceType: INSTANCE_TYPE,
			summary: data
        });
        const headers = { 'Content-Type': 'application/json' };
        http.post(RESULTS_URL, payload, { headers });
    }
    return {
        'stdout': JSON.stringify(data)
    };
}