import locations from "./locations.js";
import modes from "./modes.js";

export default {
    hopelinkStressTest: {
        from: locations.everettStation,
        to: locations.pioneerSquare,
        combinations: [
            modes.bike,
            modes.flexDirect,
            modes.transitAndFlex,
            modes.transitAndFlexAccess,
            modes.transitAndFlexAccessEgress,
            modes.transitAndFlexDirect,
            modes.transitAndFlexDirectAccess,
            modes.transitAndFlexDirectEgress,
            modes.transit,
        ]
    }
}