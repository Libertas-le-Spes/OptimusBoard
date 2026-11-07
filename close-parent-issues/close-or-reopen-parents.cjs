const { closeFinishedParents } = require("./close-finished.cjs");
const { reopenCompletedParents } = require("./reopen-completed.cjs");

const FOLLOW_UPS = new Map([
  ["closed", closeFinishedParents],
  ["reopened", reopenCompletedParents],
]);

module.exports = async function closeOrReopenParents(tools) {
  const action = tools.context.payload.action;
  const followUp = FOLLOW_UPS.get(action);
  if (followUp === undefined) throw new Error(`Only closed and reopened issues are handled, not ${action}.`);
  await followUp(tools, tools.context.issue.number);
};
