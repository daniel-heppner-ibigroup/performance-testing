import type { Server } from "bun";
import { getInstanceInfo } from "./instancePricing";

const headers = [
	"time",
	"instance_type",
	"memory",
	"vcpus",
	"processor",
	"onDemandPrice",
	"avg_http_req_duration",
	"p90_http_req_duration",
	"p95_http_req_duration",
	"avg_http_req_waiting",
	"p90_http_req_waiting",
	"p95_http_req_waiting",
	"scoreP95",
	"scoreAvg",
].join(",");

// Function to get the next available results file name
export async function getNextResultsFileName(): Promise<string> {
	let counter = 1;
	let fileName: string;

	do {
		fileName = `results/results-${counter}.csv`;
		counter++;
	} while (await Bun.file(fileName).exists());

	return fileName;
}

export async function runResultsServer(): Promise<Server> {
	const resultsFileWriter = Bun.file(await getNextResultsFileName()).writer();
	resultsFileWriter.write(headers);
	resultsFileWriter.write("\n");
	// Bun server for receiving k6 datares
	const server = Bun.serve({
		port: 3000,
		async fetch(req) {
			if (
				req.method === "POST" &&
				new URL(req.url).pathname === "/append-csv"
			) {
				const body = await req.json();
				const { summary, timestamp, instanceType } = body;
				const { metrics } = summary;
				Bun.file("results/latest.json").writer().write(JSON.stringify(body));
				const testFailed = metrics.checks.values.fails > 0 || metrics.http_req_failed.values.passes > 0;
				const valOrFail = (val: string | number) => (testFailed ? "fail" : val);
				const instanceInfo = await getInstanceInfo(instanceType);
				const valueScore = (
					(1000 / metrics.http_req_waiting.values["p(95)"]) *
					(1 / (instanceInfo?.onDemandPrice || 0)) *
					1000
				).toFixed(2);
				const valueScoreAvg = (
					(1000 / metrics.http_req_waiting.values.avg) *
					(1 / (instanceInfo?.onDemandPrice || 0)) *
					1000
				).toFixed(2);
				const csvLine = [
					timestamp,
					instanceType,
					instanceInfo?.memory,
					instanceInfo?.vcpus,
					instanceInfo?.physicalProcessor,
					instanceInfo?.onDemandPrice,
					valOrFail(metrics.http_req_duration.values.avg),
					valOrFail(metrics.http_req_duration.values["p(90)"]),
					valOrFail(metrics.http_req_duration.values["p(95)"]),
					valOrFail(metrics.http_req_waiting.values.avg),
					valOrFail(metrics.http_req_waiting.values["p(90)"]),
					valOrFail(metrics.http_req_waiting.values["p(95)"]),
					valOrFail(valueScore),
					valOrFail(valueScoreAvg),
				].join(",");
				console.log(csvLine);
				resultsFileWriter.write(csvLine);
				resultsFileWriter.write("\n");
				resultsFileWriter.flush();
				return new Response("OK", { status: 200 });
			}
			return new Response("Not Found", { status: 404 });
		},
	});
	console.log("Results server running on port", server.port);

	return server;
}
