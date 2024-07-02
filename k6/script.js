import { graphqlRequest } from "./graphql.js"; // Adjust the path as needed
import { sleep } from "k6";
import modes from "./modes.js";
import locations from "./locations.js";
import planQuery from "./planQuery.js";

export let options = {
	vus: 1,
	duration: "10s",
};

const url =
	"https://hopelink-qa-otp.ibi-transit.com/otp/routers/default/index/graphql";

function makePlanRequest(fromPlace, toPlace, modes) {
	const variables = {
		fromPlace,
		modes,
		toPlace,
		arriveBy: false,
		banned: {},
		date: "2024-07-02",
		numItineraries: 8,
		time: "11:27",
	};
	graphqlRequest(url, planQuery, variables);
}

export default function () {
	makePlanRequest(locations.bellevue, locations.capitolHill, modes.bike);
	sleep(1);
}
