import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { doneChild, noParent, openChild, parentAnswer, REPO, toolsAnswering } from "./github-answers";

const closeOrReopenParents = createRequire(import.meta.url)("../../close-parent-issues/close-or-reopen-parents.cjs");

describe("closeOrReopenParents", () => {
  it("closes finished parents when an issue is closed", async () => {
    const tools = toolsAnswering([parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [doneChild] }), noParent()], "closed", 4);
    await closeOrReopenParents(tools);
    expect(tools.github.graphql).toHaveBeenNthCalledWith(1, expect.any(String), { ...REPO, number: 4 });
    expect(tools.github.rest.issues.update).toHaveBeenCalledExactlyOnceWith({ ...REPO, issue_number: 2, state: "closed", state_reason: "completed" });
  });

  it("reopens completed parents when an issue is reopened", async () => {
    const tools = toolsAnswering([parentAnswer({ number: 2, state: "CLOSED", stateReason: "COMPLETED", children: [openChild] }), noParent()], "reopened", 4);
    await closeOrReopenParents(tools);
    expect(tools.github.rest.issues.update).toHaveBeenCalledExactlyOnceWith({ ...REPO, issue_number: 2, state: "open" });
  });

  it("refuses any other event, touching nothing", async () => {
    const tools = toolsAnswering([], "labeled", 4);
    await expect(closeOrReopenParents(tools)).rejects.toThrow("Only closed and reopened issues are handled, not labeled.");
    expect(tools.github.graphql).not.toHaveBeenCalled();
  });
});
