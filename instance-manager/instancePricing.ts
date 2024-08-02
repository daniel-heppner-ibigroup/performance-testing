import { Instance, _InstanceType } from "@aws-sdk/client-ec2";
import { parse } from "csv-parse/sync";

interface InstancePricingCsv {
	Name: string;
	"API Name": _InstanceType;
	"On Demand": string;
	vCPUs: string;
	"Instance Memory": string;
}

interface InstancePricing {
	memory: number;
	vcpus: number;
	onDemandPrice: number;
}

export async function getInstanceInfo(
	instanceType: _InstanceType,
): Promise<InstancePricing | null> {
	// Read the CSV file using Bun.file()
	const file = Bun.file("instance-manager/ec2pricing.csv");
	const fileContent = await file.text();

	// Parse the CSV content
	const records: InstancePricingCsv[] = parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
	});

	// Find the matching instance type
	const instance = records.find(
		(record) => record["API Name"] === instanceType,
	);

	if (instance) {
		// Extract the price and convert it to a number
		const price = Number.parseFloat(
			instance["On Demand"].replace("$", "").replace(" hourly", ""),
		);
		const vcpus = Number.parseFloat(instance.vCPUs.replace(" vCPUs", ""));
        const memory = Number.parseFloat(instance["Instance Memory"].replace(" GiB", ""))
		return {
            onDemandPrice: price,
            vcpus,
            memory
        };
	}

	return null;
}
