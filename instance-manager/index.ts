import {
	EC2Client,
	RunInstancesCommand,
	DescribeInstancesCommand,
	TerminateInstancesCommand,
	waitUntilInstanceRunning,
	waitUntilInstanceTerminated,
	type RunInstancesCommandInput,
	type Instance,
} from "@aws-sdk/client-ec2";

// Configuration
const AMI_ID_X86 = "ami-04a81a99f5ec58529";
const AMI_ID_ARM = "ami-0c14ff330901e49ff";
const INSTANCE_TYPE = "t2.micro";
const KEY_NAME = "transit-data-team";
const SECURITY_GROUP = "sg-063fd6aeccd3a5c0e";
const REGION = "us-east-1";
const SUBNET_ID = "subnet-012742316147064d3";
const ANSIBLE_PLAYBOOK_PATH = "setup_otp.yml";
const K6_SCRIPT_PATH = "../k6/script.js";
const RESULTS_FILE = "k6_results.json";
const INSTANCE_NAME = "OTP Performance Testing Server"; // Replace with your desired name
const IAM_ROLE_NAME = "OTPPerformanceTesting_InstanceRunner";

// Initialize AWS SDK v3 client
const client = new EC2Client({ region: REGION });

// Create a new EC2 instance
async function createEC2Instance(): Promise<Instance | undefined> {
	const params: RunInstancesCommandInput = {
		ImageId: AMI_ID_X86,
		InstanceType: INSTANCE_TYPE,
		MinCount: 1,
		MaxCount: 1,
		KeyName: KEY_NAME,
		TagSpecifications: [
            {
                ResourceType: "instance",
                Tags: [
                    {
                        Key: "Name",
                        Value: INSTANCE_NAME
                    },
					{
						Key: "ibi:team-name",
						Value: "otp-dt"
					}
                ]
            }
        ],
		NetworkInterfaces: [
            {
                AssociatePublicIpAddress: true,
                DeviceIndex: 0,
                DeleteOnTermination: true,
                SubnetId: SUBNET_ID,
                Groups: [SECURITY_GROUP]
            }
        ],
        // Use the IAM role name directly
        IamInstanceProfile: {
            Name: IAM_ROLE_NAME
        }
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
	const proc = Bun.spawn([
		"ansible-playbook",
		ANSIBLE_PLAYBOOK_PATH,
		"-i",
		instanceIp,
		"--private-key",
		`${KEY_NAME}.pem`,
		"-u",
		"ubuntu",
	]);

	await proc.exited;
}

// Run k6 test
async function runK6Test() {
	const proc = Bun.spawn([
		"k6",
		"run",
		K6_SCRIPT_PATH,
		"--out",
		`json=${RESULTS_FILE}`,
	]);
	await proc.exited;
}

// Main workflow
async function main() {
	let instance: Instance | undefined;
	try {
		instance = await createEC2Instance();
		const instanceIp = instance?.PublicIpAddress;

		// console.log("Running Ansible playbook...");
		// await runAnsible(instanceIp);

		// console.log("Running k6 test...");
		// await runK6Test();

		console.log("Recording results...");
		// const file = Bun.file(RESULTS_FILE);
		// const results = JSON.parse(await file.text());
		// console.log(JSON.stringify(results, null, 2));
	} catch (error) {
		console.error("An error occurred:", error);
	} finally {
		if (instance) {
			// console.log("Terminating instance...");
			// await terminateEC2Instance(instance.InstanceId);
		}
	}
}

main();
