import type { Server } from "bun";
import { getInstanceInfo } from "./instancePricing";

const headers = [
	"time",
	"passed",
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
	"score"
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
				const { summary, timestamp, instanceType } = await req.json();
				const { metrics, vus } = summary;
				const instanceInfo = await getInstanceInfo(instanceType);
				const valueScore = (
					(1000 / metrics.http_req_waiting.values["p(95)"]) *
					(1 / (instanceInfo?.onDemandPrice || 0)) *
					1000
				).toFixed(2);
				const passed = metrics.http_req_failed.thresholds['rate<0.01'].ok;
				const csvLine = [
					timestamp,
					passed,
					instanceType,
					instanceInfo?.memory,
					instanceInfo?.vcpus,
					instanceInfo?.physicalProcessor,
					instanceInfo?.onDemandPrice,
					metrics.http_req_duration.values.avg,
					metrics.http_req_duration.values["p(90)"],
					metrics.http_req_duration.values["p(95)"],
					metrics.http_req_waiting.values.avg,
					metrics.http_req_waiting.values["p(90)"],
					metrics.http_req_waiting.values["p(95)"],
					valueScore
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
