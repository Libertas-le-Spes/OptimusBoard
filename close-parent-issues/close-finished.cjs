const { parentOf } = require("./parent-of.cjs");

function isFinished(parent) {
  const children = parent.subIssues.nodes;
  return parent.state === "OPEN" && children.every((child) => child.state === "CLOSED");
}

function closeReason(children) {
  if (children.every((child) => child.stateReason === "NOT_PLANNED")) return "not_planned";
  return "completed";
}

async function closeParent({ github, context, core }, parent) {
  const reason = closeReason(parent.subIssues.nodes);
  await github.rest.issues.update({
    ...context.repo,
    issue_number: parent.number,
    state: "closed",
    state_reason: reason,
  });
  core.info(`Closed #${parent.number} (${reason}): every sub-issue is closed.`);
}

async function closeFinishedParents(tools, number) {
  let parent = await parentOf(tools, number);
  while (parent !== null && isFinished(parent)) {
    await closeParent(tools, parent);
    parent = await parentOf(tools, parent.number);
  }
}

module.exports = { closeFinishedParents };
