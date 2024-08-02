import presets from "./presets.js";
import { sleep } from "k6";
import { runPreset } from "./queries.js";

export const options = {
	vus: 2,
	duration: "5m",
	thresholds: {
		http_req_failed: [
			{ threshold: "rate < 0.01", abortOnFail: true, delayAbortEval: "1m" },
		], // Error rate should be less than 10%
	},
};

export default function () {
	runPreset(presets[__ENV.TEST_PRESET]);
	sleep(1);
}
