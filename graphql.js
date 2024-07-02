import http from "k6/http";
import { check } from "k6";

// Utility function to make a GraphQL request
export function graphqlRequest(url, query, variables = {}) {
	// Define the payload
	const payload = JSON.stringify({
		query: query,
		variables: variables,
	});

	// Define the default headers for a GraphQL request
	const defaultHeaders = {
		"Content-Type": "application/json",
	};

	// Make the HTTP POST request to the GraphQL endpoint
	const response = http.post(url, payload, { headers: defaultHeaders });

	// Parse the response JSON
	const responseBody = JSON.parse(response.body);

	// Check for GraphQL errors
	if (responseBody.errors) {
		console.error(`GraphQL errors: ${JSON.stringify(responseBody.errors)}`);
	}

	// Optionally, add checks
	check(response, {
		"is status 200": (r) => r.status === 200,
		"no graphql errors": () => !responseBody.errors,
	});

	// Return the parsed response
	return responseBody;
}
