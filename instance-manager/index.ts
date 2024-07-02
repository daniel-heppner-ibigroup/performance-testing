import {
	EC2Client,
	RunInstancesCommand,
	DescribeInstancesCommand,
	TerminateInstancesCommand,
	WaiterConfiguration,
	waitUntilInstanceRunning,
	waitUntilInstanceTerminated,
	RunInstancesCommandInput,
} from "@aws-sdk/client-ec2";
const { exec } = require("child_process");
const fs = require("fs");

// Configuration
const AMI_ID = "ami-0c55b159cbfafe1f0"; // Example AMI, replace with your own
const INSTANCE_TYPE = "t2.micro";
const KEY_NAME = "your-key-pair";
const SECURITY_GROUP = "your-security-group";
const REGION = "us-west-2";
const ANSIBLE_PLAYBOOK_PATH = "path/to/your/playbook.yml";
const K6_SCRIPT_PATH = "path/to/your/load_test.js";
const RESULTS_FILE = "k6_results.json";

// Initialize AWS SDK v3 client
const client = new EC2Client({ region: REGION });

// Create a new EC2 instance
async function createEC2Instance() {
	const params: RunInstancesCommandInput = {
		ImageId: AMI_ID,
		InstanceType: INSTANCE_TYPE,
		MinCount: 1,
		MaxCount: 1,
		KeyName: KEY_NAME,
		SecurityGroups: [SECURITY_GROUP],
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
function runAnsible(instanceIp) {
	return new Promise((resolve, reject) => {
		const command = `ansible-playbook ${ANSIBLE_PLAYBOOK_PATH} -i ${instanceIp}, --private-key ${KEY_NAME}.pem -u ec2-user`;
		exec(command, (error, stdout, stderr) => {
			console.log(stdout);
			console.error(stderr);
			if (error) {
				return reject(error);
			}
			resolve();
		});
	});
}

// Run k6 test
function runK6Test() {
	return new Promise((resolve, reject) => {
		const command = `k6 run ${K6_SCRIPT_PATH} --out json=${RESULTS_FILE}`;
		exec(command, (error, stdout, stderr) => {
			console.log(stdout);
			console.error(stderr);
			if (error) {
				return reject(error);
			}
			resolve();
		});
	});
}

// Main workflow
async function main() {
	let instance;
	try {
		instance = await createEC2Instance();
		const instanceIp = instance.PublicIpAddress;

		console.log("Running Ansible playbook...");
		await runAnsible(instanceIp);

		console.log("Running k6 test...");
		await runK6Test();

		console.log("Recording results...");
		const results = JSON.parse(fs.readFileSync(RESULTS_FILE));
		console.log(JSON.stringify(results, null, 2));
	} catch (error) {
		console.error("An error occurred:", error);
	} finally {
		if (instance) {
			console.log("Terminating instance...");
			await terminateEC2Instance(instance.InstanceId);
		}
	}
}

main();
