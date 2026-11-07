const { labelChanges } = require("./decide-labels.cjs");

const NOT_FOUND = 404;

async function currentIssue(github, issue) {
  const { data } = await github.rest.issues.get(issue);
  return { title: data.title, labelNames: data.labels.map((label) => label.name) };
}

async function removeLabelIfPresent(github, issue, name) {
  try {
    await github.rest.issues.removeLabel({ ...issue, name });
  } catch (error) {
    if (error.status !== NOT_FOUND) throw error;
    const { labelNames } = await currentIssue(github, issue);
    if (labelNames.includes(name)) throw error;
  }
}

module.exports = async function labelIssue({ github, context }) {
  const issue = { ...context.repo, issue_number: context.issue.number };
  const { title, labelNames } = await currentIssue(github, issue);
  const { remove, add } = labelChanges(title, labelNames);

  for (const name of remove) {
    await removeLabelIfPresent(github, issue, name);
  }
  if (add.length === 0) return;
  await github.rest.issues.addLabels({ ...issue, labels: add });
};
