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
			mode: "TRANSIT",
		}
	],
	transitAndFlexEgress: [
		{
			mode: "TRANSIT",
		},
		{
			mode: "FLEX",
			qualifier: "EGRESS",
		}
	],
	transitAndFlexAccess: [
		{
			mode: "TRANSIT",
		},
		{
			mode: "FLEX",
			qualifier: "ACCESS",
		}
	],
	transitAndFlexAccessEgress: [
		{
			mode: "TRANSIT",
		},
		{
			mode: "FLEX",
			qualifier: "ACCESS",
		},
		{
			mode: "FLEX",
			qualifier: "EGRESS",
		}
	],
	transitAndFlex: [
		{
			mode: "TRANSIT",
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
	transitAndFlexDirect: [
		{
			mode: "TRANSIT",
		},
		{
			mode: "FLEX",
			qualifier: "DIRECT",
		},
	],
	transitAndFlexDirectEgress: [
		{
			mode: "TRANSIT",
		},
		{
			mode: "FLEX",
			qualifier: "DIRECT",
		},
		{
			mode: "FLEX",
			qualifier: "EGRESS",
		},
	],
	transitAndFlexDirectAccess: [
		{
			mode: "TRANSIT",
		},
		{
			mode: "FLEX",
			qualifier: "ACCESS",
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
