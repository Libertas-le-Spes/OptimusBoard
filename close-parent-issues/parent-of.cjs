const PARENT_QUERY = `query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      parent {
        number
        state
        stateReason
        repository { nameWithOwner }
        subIssues(first: 100) { totalCount nodes { state stateReason } }
      }
    }
  }
}`;

function checkInSameRepository(parent, repo) {
  const here = `${repo.owner}/${repo.repo}`;
  const there = parent.repository.nameWithOwner;
  if (there !== here) throw new Error(`#${parent.number} is in ${there}, not ${here}, so it is left alone.`);
}

function checkEverySubIssueRead(parent) {
  const { totalCount, nodes } = parent.subIssues;
  if (nodes.length !== totalCount) {
    throw new Error(`#${parent.number} has ${totalCount} sub-issues, but only ${nodes.length} could be read.`);
  }
}

async function parentOf({ github, context }, number) {
  const { repository } = await github.graphql(PARENT_QUERY, { ...context.repo, number });
  const parent = repository.issue.parent;
  if (parent === null) return null;
  checkInSameRepository(parent, context.repo);
  checkEverySubIssueRead(parent);
  return parent;
}

module.exports = { parentOf };
