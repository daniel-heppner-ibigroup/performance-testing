export default {
	bike: [
		{
			mode: "BICYCLE",
		},
	],
	walk: [
		{
			mode: "WALK",
		},
	],
	transit: [
		{
			mode: "BUS",
		},
		{
			mode: "TRAM",
		},
		{
			mode: "FERRY",
		},
		{
			mode: "RAIL",
		},
	],
	transitAndFlex: [
		{
			mode: "BUS",
		},
		{
			mode: "TRAM",
		},
		{
			mode: "FERRY",
		},
		{
			mode: "RAIL",
		},
		{
			mode: "FLEX",
			qualifier: "ACCESS",
		},
		{
			mode: "FLEX",
			qualifier: "EGRESS",
		},
		{
			mode: "FLEX",
			qualifier: "DIRECT",
		},
	],
	flexDirect: [
		{
			mode: "FLEX",
			qualifier: "DIRECT",
		},
	],
};
