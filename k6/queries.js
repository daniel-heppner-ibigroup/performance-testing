import { sleep, check } from "k6";
import http from "k6/http";
import query from "./planQuery.js";

function createPlanRequestsFromPreset(preset) {
	const reqs = [];
	for (const combo of preset.combinations) {
		const variables = {
			fromPlace: preset.from,
			modes: combo,
			toPlace: preset.to,
			arriveBy: false,
			banned: {},
			date: "2024-08-15",
			numItineraries: 8,
			time: "11:27",
		};
		reqs.push({
			method: "POST",
			url: __ENV.URL,
			body: JSON.stringify({
				variables,
				query,
			}),
			params: {
				headers: {
					"Content-Type": "application/json",
				},
				timeout: "2m",
			},
		});
	}
	return reqs;
}

export function runPreset(preset) {
	const requests = createPlanRequestsFromPreset(preset);
	const responses = http.batch(requests);
	let allPass = true;
	for (const resp of responses) {
		allPass =
			allPass &&
			check(resp, {
				"is status 200": (r) => r.status === 200,
				"has response body": (r) => r.body,
				"no response error": (r) => !r.error,
			});
		const responseBody = JSON.parse(resp.body).data;
		const requestVariables = JSON.parse(resp.request.body).variables;

		allPass =
			allPass &&
			check(responseBody, {
				"has plan object": (r) => r.plan,
				"no graphql errors": (r) => !r.errors,
				"no routing errors": (r) => !r.plan.routingErrors.length > 0,
				"has itineraries": (r) => r.plan.itineraries.length > 0,
			});
		if (responseBody.plan.itineraries.length === 0) {
			console.warn("No itineraries for modes:", requestVariables.modes);
		}
		if (responseBody.errors) {
			console.error(`GraphQL errors: ${JSON.stringify(responseBody.errors)}`);
		}
		if (responseBody.plan && responseBody.plan.routingErrors.length > 0) {
			console.error("Rounting errors");
			console.error(responseBody.plan.routingErrors);
		}
		// console.log(
		// 	"Ran for",
		// 	requestVariables.modes,
		// 	"received",
		// 	responseBody.plan.itineraries.length,
		// 	"itineraries.",
		// );
	}
	return allPass;
}
