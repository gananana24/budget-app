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
		throw new Error(`${command}を実行できませんでした: ${result.error.message}`);
	}

	if (result.status !== 0 && !options.allowFailure) {
		const detail = [result.stdout, result.stderr]
			.filter(Boolean)
			.map((value) => value.trim())
			.filter(Boolean)
			.join("\n");
		throw new Error(
			detail || `${command} ${args.join(" ")}が終了コード${result.status}で失敗しました。`,
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
	console.error(`\nエラー: ${message}`);
	process.exit(1);
}

function issueNumber(value) {
	if (!/^\d+$/.test(value ?? "") || Number(value) < 1) {
		fail("Issue番号を正の整数で指定してください。");
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
		return issueNumber(await readline.question("Issue番号を入力してください: "));
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
			"未コミットの変更があります。コミットまたは退避してから再実行してください。\n" +
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
			`現在のブランチ「${branch || "(detached HEAD)"}」からIssue番号を判定できません。issue/<番号>ブランチで実行してください。`,
		);
	}
	return Number(match[1]);
}

function runChecks() {
	console.log("\n品質チェックを実行します。\n");
	run("pnpm", ["check"]);
}

function startIssue(number) {
	ensureClean();

	const issue = readIssue(number);
	if (issue.state !== "OPEN") {
		fail(`Issue #${number}はOpenではありません: ${issue.url}`);
	}

	const openBlockers = issue.blockedBy.nodes.filter(
		(blocker) => blocker.state !== "CLOSED",
	);
	if (openBlockers.length > 0) {
		const details = openBlockers
			.map((blocker) => `#${blocker.number} ${blocker.title}`)
			.join("\n");
		fail(`未完了の依存Issueがあります。\n${details}`);
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

	console.log(`\nIssue #${number}の作業を開始しました。`);
	console.log(`ブランチ: ${branch}`);
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
		fail(`Issue #${number}はOpenではありません: ${issue.url}`);
	}

	const existing = existingPullRequest(branch);
	if (existing) {
		console.log(`すでにPull Requestがあります: ${existing.url}`);
		return;
	}

	const ahead = Number(
		output("git", ["rev-list", "--count", `origin/${DEFAULT_BRANCH}..HEAD`]),
	);
	if (ahead < 1) {
		fail(`${DEFAULT_BRANCH}に含まれていないコミットがありません。`);
	}

	runChecks();
	run("git", ["push", "--set-upstream", "origin", branch]);

	const directory = mkdtempSync(join(tmpdir(), "budget-app-pr-"));
	const bodyPath = join(directory, "body.md");
	const body = [
		"## 変更内容",
		"",
		"- Issueの受け入れ条件を満たす変更",
		"",
		"## 確認内容",
		"",
		"- [x] `pnpm check`",
		"- [ ] Issueの受け入れ条件を確認",
		"- [ ] 必要な仕様書を更新",
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
		fail("このブランチのOpenなPull Requestがありません。先にtask create:prを実行してください。");
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

	console.log(`\nPull RequestをReadyにし、auto-mergeを設定しました: ${pullRequest.url}`);
	console.log(`マージ後、task clean:issue ISSUE=${number}を実行してください。`);
}

function cleanIssue(number) {
	ensureClean();
	const branch = branchFor(number);
	const activeBranch = currentBranch();
	if (activeBranch !== DEFAULT_BRANCH && activeBranch !== branch) {
		fail(
			`現在のブランチ「${activeBranch}」を保護するため終了します。${DEFAULT_BRANCH}または${branch}で実行してください。`,
		);
	}

	const pullRequest = existingPullRequest(branch, "merged");
	if (!pullRequest) {
		fail(`${branch}のマージ済みPull Requestを確認できません。`);
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

	console.log(`\nIssue #${number}のローカル作業ブランチを片付けました。`);
	console.log(`Pull Request: ${pullRequest.url}`);
}

function usage() {
	console.log(`使い方:
  task start:issue -- <Issue番号>
  task create:pr
  task ready:pr
  task clean:issue -- <Issue番号>`);
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
