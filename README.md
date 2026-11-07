# OptimusBoard

Board automation shared by the Libertas-le-Spes projects, so each project calls it instead of keeping its own copy. A fix made here reaches every project when it moves its pinned commit forward.

This README describes a project that grows in small steps: parts of it may still be planned, and whoever's change makes any of it untrue updates it in the same change.

| Action | What it does |
|---|---|
| `label-issues` | Labels an issue `epic`, `story` or `task` from its title prefix (`[EPIC]`, `[STORY]`, `[TASK]`), and swaps or removes the label when the prefix changes. It reads the issue as it is when it runs, so quick retitles end on the right label |
| `close-parent-issues` | Closes a story when its last task closes, and an epic when its last story does. Reopens a completed parent when a sub-issue is reopened. It fails rather than act when a parent is in another repository, when a parent has more sub-issues than it can read (over 100), or on any event other than closed and reopened |

## Using it in a project

Each project keeps the trigger, permissions and concurrency, and calls the action pinned to an exact commit of this repo. A tag or `@main` would let a change here run in every project before that project has reviewed it.

```yaml
name: Label issues by title

on:
  issues:
    types: [opened, edited]

permissions:
  contents: read
  issues: write

concurrency:
  group: label-issue-${{ github.event.issue.number }}
  cancel-in-progress: false

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: Libertas-le-Spes/OptimusBoard/label-issues@<commit>
```

```yaml
name: Close finished stories and epics

on:
  issues:
    types: [closed, reopened]

permissions:
  contents: read
  issues: write

concurrency:
  group: close-parent-issues
  cancel-in-progress: false
  queue: max

jobs:
  parents:
    runs-on: ubuntu-latest
    steps:
      - uses: Libertas-le-Spes/OptimusBoard/close-parent-issues@<commit>
```

This repo is private, so only **private** repositories in the Libertas-le-Spes organisation can call it. That is set under **Settings → Actions → General → Access**. A public repository can't call an action in a private one, so a public project needs this repo made public first.

## Tests

```
npm ci
npm test
```

OptimusBoard runs both actions on its own issues, so a change can be tried live here before any project moves to it.
