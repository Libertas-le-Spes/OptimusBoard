import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const labelIssue = createRequire(import.meta.url)("../../label-issues/label-issue.cjs");

const ISSUE = { owner: "primary", repo: "board", issue_number: 7 };

function issueData(title: string, labels: string[]) {
  return { data: { title, labels: labels.map((name) => ({ name })) } };
}

function failure(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

function githubWith(issues: { get: unknown; removeLabel?: unknown }) {
  return {
    rest: {
      issues: {
        removeLabel: vi.fn(),
        addLabels: vi.fn(),
        ...issues,
      },
    },
  };
}

function run(github: unknown) {
  return labelIssue({
    github,
    context: {
      repo: { owner: "primary", repo: "board" },
      issue: { number: 7 },
      payload: { issue: { title: "[TASK] Out of date", labels: [{ name: "task" }] } },
    },
  });
}

describe("labelIssue", () => {
  it("reads the issue as it is now and makes the changes its title calls for", async () => {
    const get = vi.fn().mockResolvedValue(issueData("[EPIC] Quests", ["story"]));
    const github = githubWith({ get });
    await run(github);
    expect(get).toHaveBeenCalledExactlyOnceWith(ISSUE);
    expect(github.rest.issues.removeLabel).toHaveBeenCalledExactlyOnceWith({ ...ISSUE, name: "story" });
    expect(github.rest.issues.addLabels).toHaveBeenCalledExactlyOnceWith({ ...ISSUE, labels: ["epic"] });
  });

  it("asks for nothing when no label needs to change", async () => {
    const github = githubWith({ get: vi.fn().mockResolvedValue(issueData("[EPIC] Quests", ["epic"])) });
    await run(github);
    expect(github.rest.issues.removeLabel).not.toHaveBeenCalled();
    expect(github.rest.issues.addLabels).not.toHaveBeenCalled();
  });

  it("carries on when a label it removes was taken off in the meantime", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(issueData("[EPIC] Quests", ["story"]))
      .mockResolvedValueOnce(issueData("[EPIC] Quests", []));
    const github = githubWith({ get, removeLabel: vi.fn().mockRejectedValue(failure(404)) });
    await run(github);
    expect(get).toHaveBeenNthCalledWith(2, ISSUE);
    expect(github.rest.issues.addLabels).toHaveBeenCalledExactlyOnceWith({ ...ISSUE, labels: ["epic"] });
  });

  it("fails when removing a label is refused but the label is still there", async () => {
    const notFound = failure(404);
    const get = vi.fn().mockResolvedValue(issueData("[EPIC] Quests", ["story"]));
    const github = githubWith({ get, removeLabel: vi.fn().mockRejectedValue(notFound) });
    await expect(run(github)).rejects.toBe(notFound);
    expect(github.rest.issues.addLabels).not.toHaveBeenCalled();
  });

  it("fails when the issue is gone by the time a label is removed", async () => {
    const gone = failure(410);
    const get = vi
      .fn()
      .mockResolvedValueOnce(issueData("[EPIC] Quests", ["story"]))
      .mockRejectedValueOnce(gone);
    const github = githubWith({ get, removeLabel: vi.fn().mockRejectedValue(failure(404)) });
    await expect(run(github)).rejects.toBe(gone);
    expect(github.rest.issues.addLabels).not.toHaveBeenCalled();
  });

  it("fails on any other error removing a label", async () => {
    const forbidden = failure(403);
    const get = vi.fn().mockResolvedValue(issueData("[EPIC] Quests", ["story"]));
    const github = githubWith({ get, removeLabel: vi.fn().mockRejectedValue(forbidden) });
    await expect(run(github)).rejects.toBe(forbidden);
    expect(get).toHaveBeenCalledOnce();
  });
});
