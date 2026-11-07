import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const closeOrReopenParents = createRequire(import.meta.url)("../../close-parent-issues/close-or-reopen-parents.cjs");

type State = "OPEN" | "CLOSED";
type Reason = "COMPLETED" | "NOT_PLANNED" | "DUPLICATE" | null;

interface FakeIssue {
  state: State;
  stateReason: Reason;
  parent?: number;
}

function open(parent?: number): FakeIssue {
  return { state: "OPEN", stateReason: null, parent };
}

function closed(stateReason: Reason, parent?: number): FakeIssue {
  return { state: "CLOSED", stateReason, parent };
}

async function act(issues: Record<number, FakeIssue>, action: "closed" | "reopened", number: number) {
  const childrenOf = (parent: number) => Object.values(issues).filter((issue) => issue.parent === parent);
  const github = {
    graphql: async (_query: string, { number: asked }: { number: number }) => {
      const parentNumber = issues[asked]?.parent;
      if (parentNumber === undefined) return { repository: { issue: { parent: null } } };
      const parent = issues[parentNumber]!;
      const nodes = childrenOf(parentNumber).map(({ state, stateReason }) => ({ state, stateReason }));
      return { repository: { issue: { parent: { number: parentNumber, state: parent.state, stateReason: parent.stateReason, subIssues: { nodes } } } } };
    },
    rest: {
      issues: {
        update: async ({ issue_number, state, state_reason }: { issue_number: number; state: string; state_reason?: string }) => {
          const issue = issues[issue_number]!;
          issue.state = state.toUpperCase() as State;
          issue.stateReason = state_reason === undefined ? null : (state_reason.toUpperCase() as Reason);
        },
      },
    },
  };
  await closeOrReopenParents({ github, context: { repo: { owner: "libertas", repo: "dinthla" }, payload: { action }, issue: { number } }, core: { info: () => {} } });
}

describe("closeOrReopenParents", () => {
  it("closes the story and then the epic when the last task closes", async () => {
    const issues = { 1: open(), 2: open(1), 3: closed("COMPLETED", 2), 4: closed("COMPLETED", 2) };
    await act(issues, "closed", 4);
    expect(issues[2]).toMatchObject({ state: "CLOSED", stateReason: "COMPLETED" });
    expect(issues[1]).toMatchObject({ state: "CLOSED", stateReason: "COMPLETED" });
  });

  it("leaves the story open while another task is still open", async () => {
    const issues = { 2: open(), 3: open(2), 4: closed("COMPLETED", 2) };
    await act(issues, "closed", 4);
    expect(issues[2]!.state).toBe("OPEN");
  });

  it("closes the story as not planned when every task was dropped", async () => {
    const issues = { 2: open(), 3: closed("NOT_PLANNED", 2), 4: closed("NOT_PLANNED", 2) };
    await act(issues, "closed", 4);
    expect(issues[2]).toMatchObject({ state: "CLOSED", stateReason: "NOT_PLANNED" });
  });

  it("closes the story as completed when some tasks were done and some dropped", async () => {
    const issues = { 2: open(), 3: closed("NOT_PLANNED", 2), 4: closed("COMPLETED", 2) };
    await act(issues, "closed", 4);
    expect(issues[2]).toMatchObject({ state: "CLOSED", stateReason: "COMPLETED" });
  });

  it("reopens the completed story and epic above a reopened task", async () => {
    const issues = { 1: closed("COMPLETED"), 2: closed("COMPLETED", 1), 4: open(2) };
    await act(issues, "reopened", 4);
    expect(issues[2]!.state).toBe("OPEN");
    expect(issues[1]!.state).toBe("OPEN");
  });

  it("leaves a parent that was dropped as not planned closed", async () => {
    const issues = { 1: closed("NOT_PLANNED"), 2: closed("COMPLETED", 1), 4: open(2) };
    await act(issues, "reopened", 4);
    expect(issues[2]!.state).toBe("OPEN");
    expect(issues[1]).toMatchObject({ state: "CLOSED", stateReason: "NOT_PLANNED" });
  });

  it("leaves a parent that was closed as a duplicate closed", async () => {
    const issues = { 1: closed("DUPLICATE"), 2: closed("COMPLETED", 1), 4: open(2) };
    await act(issues, "reopened", 4);
    expect(issues[2]!.state).toBe("OPEN");
    expect(issues[1]).toMatchObject({ state: "CLOSED", stateReason: "DUPLICATE" });
  });

  it("does nothing for an issue without a parent", async () => {
    const issues = { 1: closed("COMPLETED") };
    await act(issues, "closed", 1);
    expect(issues[1]).toMatchObject({ state: "CLOSED", stateReason: "COMPLETED" });
  });
});
