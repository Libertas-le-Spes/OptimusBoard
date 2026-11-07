import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { doneChild, noParent, parentAnswer, REPO, toolsAnswering } from "./github-answers";

const { parentOf } = createRequire(import.meta.url)("../../close-parent-issues/parent-of.cjs");

describe("parentOf", () => {
  it("asks for the parent of the given issue in this repository", async () => {
    const tools = toolsAnswering([noParent()]);
    await parentOf(tools, 4);
    expect(tools.github.graphql).toHaveBeenCalledExactlyOnceWith(expect.any(String), { ...REPO, number: 4 });
  });

  it("gives nothing for an issue without a parent", async () => {
    expect(await parentOf(toolsAnswering([noParent()]), 4)).toBeNull();
  });

  it("gives the parent with its sub-issues", async () => {
    const answer = parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [doneChild] });
    expect(await parentOf(toolsAnswering([answer]), 4)).toMatchObject({ number: 2, subIssues: { nodes: [doneChild] } });
  });

  it("refuses a parent in another repository", async () => {
    const answer = parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [doneChild], repository: "primary/other" });
    await expect(parentOf(toolsAnswering([answer]), 4)).rejects.toThrow("#2 is in primary/other, not primary/board");
  });

  it("refuses a parent in a repository of the same name under another owner", async () => {
    const answer = parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [doneChild], repository: "other/board" });
    await expect(parentOf(toolsAnswering([answer]), 4)).rejects.toThrow("#2 is in other/board, not primary/board");
  });

  it("refuses a parent whose sub-issues couldn't all be read", async () => {
    const answer = parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [doneChild], totalCount: 101 });
    await expect(parentOf(toolsAnswering([answer]), 4)).rejects.toThrow("#2 has 101 sub-issues, but only 1 could be read");
  });
});
