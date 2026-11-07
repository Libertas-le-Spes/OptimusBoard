const { parentOf } = require("./parent-of.cjs");

function wasCompleted(parent) {
  return parent.state === "CLOSED" && parent.stateReason === "COMPLETED";
}

async function reopenParent({ github, context, core }, parent, reopenedChild) {
  await github.rest.issues.update({ ...context.repo, issue_number: parent.number, state: "open" });
  core.info(`Reopened #${parent.number}: #${reopenedChild} was reopened.`);
}

async function reopenCompletedParents(tools, number) {
  let child = number;
  let parent = await parentOf(tools, child);
  while (parent !== null && wasCompleted(parent)) {
    await reopenParent(tools, parent, child);
    child = parent.number;
    parent = await parentOf(tools, child);
  }
}

module.exports = { reopenCompletedParents };
