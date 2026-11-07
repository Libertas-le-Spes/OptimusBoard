const KINDS = ["epic", "story", "task"];
const KIND_FROM_TITLE = /^\[(EPIC|STORY|TASK)\]/;

function kindOf(title) {
  const match = title.match(KIND_FROM_TITLE);
  if (match === null) return null;
  return match[1].toLowerCase();
}

function labelChanges(title, labelNames) {
  const kind = kindOf(title);
  const remove = KINDS.filter((other) => other !== kind && labelNames.includes(other));
  const add = [];
  if (kind !== null && !labelNames.includes(kind)) add.push(kind);
  return { remove, add };
}

module.exports = { labelChanges };
