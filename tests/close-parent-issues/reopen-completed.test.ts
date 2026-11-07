import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { doneChild, noParent, openChild, parentAnswer, REPO, toolsAnswering } from "./github-answers";

const { reopenCompletedParents } = createRequire(import.meta.url)("../../close-parent-issues/reopen-completed.cjs");

describe("reopenCompletedParents", () => {
  it("reopens the completed story and epic above a reopened task", async () => {
    const tools = toolsAnswering([
      parentAnswer({ number: 2, state: "CLOSED", stateReason: "COMPLETED", children: [openChild] }),
      parentAnswer({ number: 1, state: "CLOSED", stateReason: "COMPLETED", children: [doneChild] }),
      noParent(),
    ]);
    await reopenCompletedParents(tools, 4);
    expect(tools.github.graphql).toHaveBeenNthCalledWith(2, expect.any(String), { ...REPO, number: 2 });
    expect(tools.github.rest.issues.update.mock.calls).toEqual([
      [{ ...REPO, issue_number: 2, state: "open" }],
      [{ ...REPO, issue_number: 1, state: "open" }],
    ]);
  });

  it("leaves a parent that was dropped as not planned closed", async () => {
    const tools = toolsAnswering([parentAnswer({ number: 2, state: "CLOSED", stateReason: "NOT_PLANNED", children: [openChild] })]);
    await reopenCompletedParents(tools, 4);
    expect(tools.github.rest.issues.update).not.toHaveBeenCalled();
  });

  it("leaves a parent that was closed as a duplicate closed", async () => {
    const tools = toolsAnswering([parentAnswer({ number: 2, state: "CLOSED", stateReason: "DUPLICATE", children: [openChild] })]);
    await reopenCompletedParents(tools, 4);
    expect(tools.github.rest.issues.update).not.toHaveBeenCalled();
  });

  it("leaves a parent that is already open, and stops there", async () => {
    const tools = toolsAnswering([parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [openChild] })]);
    await reopenCompletedParents(tools, 4);
    expect(tools.github.rest.issues.update).not.toHaveBeenCalled();
    expect(tools.github.graphql).toHaveBeenCalledOnce();
  });
});
