import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { doneChild, droppedChild, noParent, openChild, parentAnswer, REPO, toolsAnswering } from "./github-answers";

const { closeFinishedParents } = createRequire(import.meta.url)("../../close-parent-issues/close-finished.cjs");

describe("closeFinishedParents", () => {
  it("closes the story and then the epic when the last task closes", async () => {
    const tools = toolsAnswering([
      parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [doneChild, doneChild] }),
      parentAnswer({ number: 1, state: "OPEN", stateReason: null, children: [doneChild] }),
      noParent(),
    ]);
    await closeFinishedParents(tools, 4);
    expect(tools.github.graphql).toHaveBeenNthCalledWith(2, expect.any(String), { ...REPO, number: 2 });
    expect(tools.github.rest.issues.update.mock.calls).toEqual([
      [{ ...REPO, issue_number: 2, state: "closed", state_reason: "completed" }],
      [{ ...REPO, issue_number: 1, state: "closed", state_reason: "completed" }],
    ]);
  });

  it("leaves the story open while another task is still open", async () => {
    const tools = toolsAnswering([parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [openChild, doneChild] })]);
    await closeFinishedParents(tools, 4);
    expect(tools.github.rest.issues.update).not.toHaveBeenCalled();
    expect(tools.github.graphql).toHaveBeenCalledOnce();
  });

  it("closes the story as not planned when every task was dropped", async () => {
    const tools = toolsAnswering([
      parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [droppedChild, droppedChild] }),
      noParent(),
    ]);
    await closeFinishedParents(tools, 4);
    expect(tools.github.rest.issues.update).toHaveBeenCalledExactlyOnceWith({ ...REPO, issue_number: 2, state: "closed", state_reason: "not_planned" });
  });

  it("closes the story as completed when some tasks were done and some dropped", async () => {
    const tools = toolsAnswering([
      parentAnswer({ number: 2, state: "OPEN", stateReason: null, children: [droppedChild, doneChild] }),
      noParent(),
    ]);
    await closeFinishedParents(tools, 4);
    expect(tools.github.rest.issues.update).toHaveBeenCalledExactlyOnceWith({ ...REPO, issue_number: 2, state: "closed", state_reason: "completed" });
  });

  it("leaves a story that is already closed, and stops there", async () => {
    const tools = toolsAnswering([parentAnswer({ number: 2, state: "CLOSED", stateReason: "COMPLETED", children: [doneChild] })]);
    await closeFinishedParents(tools, 4);
    expect(tools.github.rest.issues.update).not.toHaveBeenCalled();
    expect(tools.github.graphql).toHaveBeenCalledOnce();
  });

  it("does nothing for an issue without a parent", async () => {
    const tools = toolsAnswering([noParent()]);
    await closeFinishedParents(tools, 4);
    expect(tools.github.rest.issues.update).not.toHaveBeenCalled();
  });
});
