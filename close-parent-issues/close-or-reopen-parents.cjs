const PARENT_QUERY = `query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      parent { number state stateReason subIssues(first: 100) { nodes { state stateReason } } }
    }
  }
}`;

async function parentOf({ github, context }, number) {
  const { repository } = await github.graphql(PARENT_QUERY, { ...context.repo, number });
  return repository.issue.parent;
}

function closeReason(children) {
  if (children.every((child) => child.stateReason === "NOT_PLANNED")) return "not_planned";
  return "completed";
}

async function closeParentIfFinished({ github, context, core }, parent) {
  const children = parent.subIssues.nodes;
  if (parent.state === "CLOSED" || children.some((child) => child.state === "OPEN")) return false;
  const reason = closeReason(children);
  await github.rest.issues.update({
    ...context.repo,
    issue_number: parent.number,
    state: "closed",
    state_reason: reason,
  });
  core.info(`Closed #${parent.number} (${reason}): every sub-issue is closed.`);
  return true;
}

async function reopenParentIfCompleted({ github, context, core }, parent, reopenedChild) {
  if (parent.state === "OPEN" || parent.stateReason !== "COMPLETED") return false;
  await github.rest.issues.update({ ...context.repo, issue_number: parent.number, state: "open" });
  core.info(`Reopened #${parent.number}: #${reopenedChild} was reopened.`);
  return true;
}

async function closeFinishedParents(tools, number) {
  let parent = await parentOf(tools, number);
  while (parent && (await closeParentIfFinished(tools, parent))) {
    parent = await parentOf(tools, parent.number);
  }
}

async function reopenCompletedParents(tools, number) {
  let child = number;
  let parent = await parentOf(tools, child);
  while (parent && (await reopenParentIfCompleted(tools, parent, child))) {
    child = parent.number;
    parent = await parentOf(tools, child);
  }
}

module.exports = async function closeOrReopenParents(tools) {
  const number = tools.context.issue.number;
  if (tools.context.payload.action === "closed") await closeFinishedParents(tools, number);
  else await reopenCompletedParents(tools, number);
};
