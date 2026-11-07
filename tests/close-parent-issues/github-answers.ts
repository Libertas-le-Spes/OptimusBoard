import { vi } from "vitest";

type State = "OPEN" | "CLOSED";
type Reason = "COMPLETED" | "NOT_PLANNED" | "DUPLICATE" | "REOPENED" | null;

interface Child {
  state: State;
  stateReason: Reason;
}

interface ParentAnswer {
  number: number;
  state: State;
  stateReason: Reason;
  children: Child[];
  repository?: string;
  totalCount?: number;
}

export const REPO = { owner: "primary", repo: "board" };

export const openChild: Child = { state: "OPEN", stateReason: null };
export const doneChild: Child = { state: "CLOSED", stateReason: "COMPLETED" };
export const droppedChild: Child = { state: "CLOSED", stateReason: "NOT_PLANNED" };

export function parentAnswer({ number, state, stateReason, children, repository = "primary/board", totalCount = children.length }: ParentAnswer) {
  return {
    repository: {
      issue: {
        parent: {
          number,
          state,
          stateReason,
          repository: { nameWithOwner: repository },
          subIssues: { totalCount, nodes: children },
        },
      },
    },
  };
}

export function noParent() {
  return { repository: { issue: { parent: null } } };
}

export function toolsAnswering(answers: unknown[], action = "closed", number = 4) {
  const graphql = vi.fn();
  for (const answer of answers) graphql.mockResolvedValueOnce(answer);
  return {
    github: { graphql, rest: { issues: { update: vi.fn() } } },
    context: { repo: REPO, payload: { action }, issue: { number } },
    core: { info: vi.fn() },
  };
}
