import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

const DEFAULT_BRANCH = "main";
const REPOSITORY = "gananana24/budget-app";

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		encoding: "utf8",
		stdio: options.capture ? "pipe" : "inherit",
	});

	if (result.error) {
		throw new Error(`Could not run ${command}: ${result.error.message}`);
	}

	if (result.status !== 0 && !options.allowFailure) {
		const detail = [result.stdout, result.stderr]
			.filter(Boolean)
			.map((value) => value.trim())
			.filter(Boolean)
			.join("\n");
		throw new Error(
			detail || `${command} ${args.join(" ")} failed with exit code ${result.status}.`,
		);
	}

	return {
		status: result.status ?? 1,
		stdout: result.stdout?.trim() ?? "",
		stderr: result.stderr?.trim() ?? "",
	};
}

function output(command, args, options = {}) {
	return run(command, args, { ...options, capture: true }).stdout;
}

const root = output("git", ["rev-parse", "--show-toplevel"], {
	cwd: process.cwd(),
});
process.chdir(root);

function fail(message) {
	console.error(`\nError: ${message}`);
	process.exit(1);
}

function issueNumber(value) {
	if (!/^\d+$/.test(value ?? "") || Number(value) < 1) {
		fail("Enter a positive integer for the issue number.");
	}
	return Number(value);
}

async function requestedIssueNumber(value) {
	if (value?.trim()) {
		return issueNumber(value.trim());
	}

	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		return issueNumber(await readline.question("Enter issue number: "));
	} finally {
		readline.close();
	}
}

function currentBranch() {
	return output("git", ["branch", "--show-current"]);
}

function branchFor(number) {
	return `issue/${number}`;
}

function ensureClean() {
	const status = output("git", ["status", "--porcelain"]);
	if (status) {
		fail(
			"The working tree has uncommitted changes. Commit or stash them before retrying.\n" +
				status,
		);
	}
}

function readIssue(number) {
	const json = output("gh", [
		"issue",
		"view",
		String(number),
		"--repo",
		REPOSITORY,
		"--json",
		"number,title,state,url,blockedBy,labels,milestone",
	]);
	return JSON.parse(json);
}

function issueNumberFromBranch() {
	const branch = currentBranch();
	const match = /^issue\/(\d+)$/.exec(branch);
	if (!match) {
		fail(
			`Cannot determine an issue number from branch "${branch || "(detached HEAD)"}". Use an issue/<number> branch.`,
		);
	}
	return Number(match[1]);
}

function runChecks() {
	console.log("\nRunning quality checks.\n");
	run("pnpm", ["check"]);
}

function startIssue(number) {
	ensureClean();

	const issue = readIssue(number);
	if (issue.state !== "OPEN") {
		fail(`Issue #${number} is not open: ${issue.url}`);
	}

	const openBlockers = issue.blockedBy.nodes.filter(
		(blocker) => blocker.state !== "CLOSED",
	);
	if (openBlockers.length > 0) {
		const details = openBlockers
			.map((blocker) => `#${blocker.number} ${blocker.title}`)
			.join("\n");
		fail(`There are unresolved blocked-by issues.\n${details}`);
	}

	if (currentBranch() !== DEFAULT_BRANCH) {
		run("git", ["switch", DEFAULT_BRANCH]);
	}

	run("git", ["fetch", "origin", DEFAULT_BRANCH]);
	run("git", ["merge", "--ff-only", `origin/${DEFAULT_BRANCH}`]);

	const branch = branchFor(number);
	const localBranch = run(
		"git",
		["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
		{ capture: true, allowFailure: true },
	);
	if (localBranch.status === 0) {
		run("git", ["switch", branch]);
	} else {
		run("gh", [
			"issue",
			"develop",
			String(number),
			"--repo",
			REPOSITORY,
			"--base",
			DEFAULT_BRANCH,
			"--name",
			branch,
			"--checkout",
		]);
	}

	console.log(`\nStarted work on Issue #${number}.`);
	console.log(`Branch: ${branch}`);
	console.log(`Issue: ${issue.url}`);
}

function existingPullRequest(branch, state = "open") {
	const json = output("gh", [
		"pr",
		"list",
		"--repo",
		REPOSITORY,
		"--head",
		branch,
		"--state",
		state,
		"--limit",
		"1",
		"--json",
		"number,url,state,isDraft,mergedAt",
	]);
	return JSON.parse(json)[0] ?? null;
}

function createPullRequest() {
	ensureClean();
	const number = issueNumberFromBranch();
	const branch = currentBranch();
	const issue = readIssue(number);

	if (issue.state !== "OPEN") {
		fail(`Issue #${number} is not open: ${issue.url}`);
	}

	const existing = existingPullRequest(branch);
	if (existing) {
		console.log(`A Pull Request already exists: ${existing.url}`);
		return;
	}

	const ahead = Number(
		output("git", ["rev-list", "--count", `origin/${DEFAULT_BRANCH}..HEAD`]),
	);
	if (ahead < 1) {
		fail(`There are no commits ahead of ${DEFAULT_BRANCH}.`);
	}

	runChecks();
	run("git", ["push", "--set-upstream", "origin", branch]);

	const directory = mkdtempSync(join(tmpdir(), "budget-app-pr-"));
	const bodyPath = join(directory, "body.md");
	const body = [
		"## Changes",
		"",
		"- Changes that address the Issue acceptance criteria",
		"",
		"## Verification",
		"",
		"- [x] `pnpm check`",
		"- [ ] Confirm the Issue acceptance criteria",
		"- [ ] Update relevant specifications",
		"",
		`Closes #${number}`,
		"",
	].join("\n");
	writeFileSync(bodyPath, body);

	const args = [
		"pr",
		"create",
		"--repo",
		REPOSITORY,
		"--draft",
		"--base",
		DEFAULT_BRANCH,
		"--head",
		branch,
		"--title",
		issue.title,
		"--body-file",
		bodyPath,
	];
	for (const label of issue.labels) {
		args.push("--label", label.name);
	}
	if (issue.milestone?.title) {
		args.push("--milestone", issue.milestone.title);
	}

	try {
		run("gh", args);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

function readyPullRequest() {
	ensureClean();
	const number = issueNumberFromBranch();
	const branch = currentBranch();
	const pullRequest = existingPullRequest(branch);
	if (!pullRequest) {
		fail("There is no open Pull Request for this branch. Run task create:pr first.");
	}

	runChecks();
	run("git", ["push"]);
	if (pullRequest.isDraft) {
		run("gh", ["pr", "ready", String(pullRequest.number), "--repo", REPOSITORY]);
	}
	run("gh", [
		"pr",
		"merge",
		String(pullRequest.number),
		"--repo",
		REPOSITORY,
		"--auto",
		"--squash",
	]);

	console.log(`\nThe Pull Request is ready and squash auto-merge is enabled: ${pullRequest.url}`);
	console.log(`After it merges, run task clean:issue -- ${number}.`);
}

function cleanIssue(number) {
	ensureClean();
	const branch = branchFor(number);
	const activeBranch = currentBranch();
	if (activeBranch !== DEFAULT_BRANCH && activeBranch !== branch) {
		fail(
			`Stopping to protect branch "${activeBranch}". Run this from ${DEFAULT_BRANCH} or ${branch}.`,
		);
	}

	const pullRequest = existingPullRequest(branch, "merged");
	if (!pullRequest) {
		fail(`Could not find a merged Pull Request for ${branch}.`);
	}

	if (activeBranch === branch) {
		run("git", ["switch", DEFAULT_BRANCH]);
	}
	run("git", ["fetch", "--prune", "origin"]);
	run("git", ["merge", "--ff-only", `origin/${DEFAULT_BRANCH}`]);

	const localBranch = run(
		"git",
		["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
		{ capture: true, allowFailure: true },
	);
	if (localBranch.status === 0) {
		run("git", ["branch", "-D", branch]);
	}

	console.log(`\nCleaned up the local branch for Issue #${number}.`);
	console.log(`Pull Request: ${pullRequest.url}`);
}

function usage() {
	console.log(`Usage:
  task start:issue -- <issue-number>
  task create:pr
  task ready:pr
  task clean:issue -- <issue-number>`);
}

async function main() {
	const [command, argument] = process.argv.slice(2);
	switch (command) {
		case "start":
			startIssue(await requestedIssueNumber(argument));
			break;
		case "create-pr":
			createPullRequest();
			break;
		case "ready-pr":
			readyPullRequest();
			break;
		case "clean":
			cleanIssue(await requestedIssueNumber(argument));
			break;
		default:
			usage();
			process.exitCode = 1;
	}
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error));
});
