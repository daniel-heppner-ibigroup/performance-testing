import {
	EC2Client,
	RunInstancesCommand,
	DescribeInstancesCommand,
	TerminateInstancesCommand,
	waitUntilInstanceRunning,
	waitUntilInstanceTerminated,
	type RunInstancesCommandInput,
	type Instance,
	_InstanceType,
} from "@aws-sdk/client-ec2";
import { getInstanceInfo } from "./instancePricing";

// Configuration
const AMI_ID_X86 = "ami-04a81a99f5ec58529";
const AMI_ID_ARM = "ami-0c14ff330901e49ff";
const KEY_NAME = "transit-data-team";
const SECURITY_GROUP = "sg-063fd6aeccd3a5c0e";
const REGION = "us-east-1";
const SUBNET_ID = "subnet-012742316147064d3";
const ANSIBLE_PLAYBOOK_PATH = "instance-manager/setup_otp.yml";
const K6_SCRIPT_PATH = "k6/script.js";
const RESULTS_FILE = "k6_results.json";
const INSTANCE_NAME = "OTP Performance Testing Server"; // Replace with your desired name
const IAM_ROLE_NAME = "OTPPerformanceTesting_InstanceRunner";

// Initialize AWS SDK v3 client
const client = new EC2Client({ region: REGION });

const headers = [
	"time",
	"instance_type",
	"memory",
	"vcpus",
	"onDemandPrice",
	"vus",
	"avg_http_req_duration",
	"p90_http_req_duration",
	"p95_http_req_duration",
].join(",");
const resultsFileWriter = Bun.file("results.csv").writer();
resultsFileWriter.write(headers);
resultsFileWriter.write("\n");

// Bun server for receiving k6 datares
const server = Bun.serve({
	port: 3000,
	async fetch(req) {
		if (req.method === "POST" && new URL(req.url).pathname === "/append-csv") {
			const { summary, timestamp, instanceType } = await req.json();
			const { metrics, vus } = summary;
			const instanceInfo = await getInstanceInfo(instanceType);
			const csvLine = [
				timestamp,
				instanceType,
				vus,
				instanceInfo?.memory,
				instanceInfo?.vcpus,
				instanceInfo?.onDemandPrice,
				metrics.http_req_duration.values.avg,
				metrics.http_req_duration.values["p(90)"],
				metrics.http_req_duration.values["p(95)"],
				metrics.http_req_waiting.values.avg,
				metrics.http_req_waiting.values["p(90)"],
				metrics.http_req_waiting.values["p(95)"],
			].join(",");
			resultsFileWriter.write(csvLine);
			resultsFileWriter.write("\n");
			resultsFileWriter.flush();
			return new Response("OK", { status: 200 });
		}
		return new Response("Not Found", { status: 404 });
	},
});

console.log(`Listening on http://localhost:${server.port}`);

// Create a new EC2 instance
async function createEC2Instance(
	instanceType: _InstanceType,
): Promise<Instance | undefined> {
	const params: RunInstancesCommandInput = {
		ImageId: AMI_ID_X86,
		InstanceType: instanceType,
		MinCount: 1,
		MaxCount: 1,
		KeyName: KEY_NAME,
		TagSpecifications: [
			{
				ResourceType: "instance",
				Tags: [
					{
						Key: "Name",
						Value: INSTANCE_NAME,
					},
					{
						Key: "ibi:team-name",
						Value: "otp-dt",
					},
				],
			},
		],
		NetworkInterfaces: [
			{
				AssociatePublicIpAddress: true,
				DeviceIndex: 0,
				DeleteOnTermination: true,
				SubnetId: SUBNET_ID,
				Groups: [SECURITY_GROUP],
			},
		],
		// Use the IAM role name directly
		IamInstanceProfile: {
			Name: IAM_ROLE_NAME,
		},
	};

	const command = new RunInstancesCommand(params);
	const data = await client.send(command);
	const instanceId = data.Instances?.[0].InstanceId;
	if (!instanceId) {
		console.warn("Problem creating instance");
		return;
	}
	console.log(`Created instance ${instanceId}`);

	// Wait until the instance is running
	const waiter = {
		minDelay: 15,
		maxDelay: 120,
	};
	await waitUntilInstanceRunning(
		{ client, maxWaitTime: waiter.maxDelay },
		{ InstanceIds: [instanceId] },
	);

	// Get the public IP address of the instance
	const describeCommand = new DescribeInstancesCommand({
		InstanceIds: [instanceId],
	});
	const instanceData = await client.send(describeCommand);
	const instance = instanceData.Reservations?.[0].Instances?.[0];

	if (!instance) {
		console.warn("Problem getting instance information.");
		return;
	}
	console.log(
		`Instance ${instanceId} is running with public IP ${instance.PublicIpAddress}`,
	);
	return instance;
}

// Terminate the EC2 instance
async function terminateEC2Instance(instanceId) {
	const params = { InstanceIds: [instanceId] };
	const command = new TerminateInstancesCommand(params);
	await client.send(command);
	console.log(`Terminating instance ${instanceId}...`);

	// Wait until the instance is terminated
	const waiter = {
		minDelay: 15,
		maxDelay: 120,
	};
	await waitUntilInstanceTerminated(
		{ client, maxWaitTime: waiter.maxDelay },
		params,
	);
	console.log(`Instance ${instanceId} terminated`);
}

// Run Ansible playbook
async function runAnsible(instanceIp) {
	console.log(
		"About to run Ansible with command:",
		[
			"ansible-playbook",
			ANSIBLE_PLAYBOOK_PATH,
			"-i",
			`${instanceIp},`,
			"--private-key",
			`~/.ssh/${KEY_NAME}.pem`,
			"-u",
			"ubuntu",
		].join(" "),
	);
	const proc = Bun.spawn(
		[
			"ansible-playbook",
			ANSIBLE_PLAYBOOK_PATH,
			"-i",
			`${instanceIp},`,
			"--private-key",
			`~/.ssh/${KEY_NAME}.pem`,
			"-u",
			"ubuntu",
		],
		{
			env: {
				ANSIBLE_HOST_KEY_CHECKING: "False",
				PATH: `${process.env.PATH}:/usr/bin:/usr/local/bin`,
			},
		},
	);

	// Capture and display stdout

	await proc.exited;
	const output = await new Response(proc.stdout).text();
	console.log(output);
}

// Run k6 test
async function runK6Test(url: string, instanceType: string) {
	const proc = Bun.spawn([
		"k6",
		"run",
		K6_SCRIPT_PATH,
		"-e",
		"TEST_PRESET=hopelinkStressTest",
		"-e",
		`URL=${url}`,
		"-e",
		`INSTANCE_TYPE=${instanceType}`,
		"-e",
		`RESULTS_URL=http://localhost:${server.port}/append-csv`,
	]);
	await proc.exited;
}

// Main workflow
async function main(instanceType: _InstanceType) {
	let instance: Instance | undefined;
	try {
		instance = await createEC2Instance(instanceType);
		const instanceIp = instance?.PublicIpAddress;

		console.log("Waiting for instance to complete boot process...");
		await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 second delay

		console.log("Running Ansible playbook...");
		await runAnsible(instanceIp);

		console.log("Running k6 test...");
		const url = `http://${instanceIp}:8080/otp/gtfs/v1`;
		await runK6Test(url, instanceType);
	} catch (error) {
		console.error("An error occurred:", error);
	} finally {
		if (instance) {
			console.log("Terminating instance...");
			await terminateEC2Instance(instance.InstanceId);
		}
		server.stop();
		console.log("Webserver stopped");
	}
}

main("c7a.2xlarge");
// main("r5d.2xlarge");
