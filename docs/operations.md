# Running Paisa unattended

## What runs automatically

| Workflow | When | What it does |
|---|---|---|
| `.github/workflows/update-data.yml` | Every day 08:00 IST (and on demand) | `npm run update`: checks the Union Budget, CGA, PMC, MoSPI projects and Assam contracts with conditional requests, rebuilds the dataset only from validated snapshots, and writes a plain "what changed" note (`data/changes/<date>.md`). If figures changed, tests run again on the new data and a pull request is opened. A newly broken source opens one GitHub issue. |
| `.github/workflows/ci.yml` | Every pull request and push to `main` | Lint, typecheck, tests (including snapshot reproduction and every reconciliation), static build. |
| `.github/workflows/pages.yml` | Every push to `main` (so every merged data update) | Builds the static site and publishes it to GitHub Pages. |
| `.github/workflows/weekly-digest.yml` | Monday 09:00 IST, only if `ANTHROPIC_API_KEY` is set | Claude reads the week's `data/changes` notes and opens one issue with a plain English + Hindi summary. It may only read files and create that issue. It must copy numbers exactly and never calculate them. |

No server, Redis or database is needed for this. (`npm run worker` with BullMQ remains an optional alternative for self-hosting.)

## One-time setup on GitHub

The live site is <https://paisa-india.github.io/paisa/>. A fork needs the same steps.

1. **Pages:** repo Settings → Pages → Source: **GitHub Actions** (not "Deploy from a branch": the site has to be built first). The site appears at `https://<org>.github.io/<repo>/`. For a custom domain, add it in the same screen; the build adjusts the base path automatically.
1. **Let the data bot open pull requests:** organisation Settings → Actions → General → Workflow permissions → tick **Allow GitHub Actions to create and approve pull requests**, then tick the same box in the repo's Settings → Actions → General. The organisation setting comes first; until it is on, the repo option is greyed out. Keep the default **Read repository contents** permission: the update workflows request the write access they need themselves.
1. **Fork pull requests:** repo Settings → Actions → General → **Require approval for first-time contributors**, so a stranger's pull request can't run workflows until a maintainer approves it.
1. **Protect `main`:** repo Settings → Rules → Rulesets → New ruleset → **Import a ruleset** → choose [`.github/rulesets/protect-main.json`](../.github/rulesets/protect-main.json). It blocks force-pushes and deleting `main`, requires changes to arrive as pull requests, and requires CI (`check`) to pass. Repository admins can bypass it for urgent fixes.
1. **Auto-merge:** repo Settings → General → Pull Requests → **Allow auto-merge**.
1. **`DATA_BOT_TOKEN` secret** (optional, makes data updates fully hands-off): a fine-grained personal access token with access to **this repository only**, and only Contents, Pull requests and Issues read/write. Add it under repo Settings → Secrets and variables → Actions. With it, data pull requests trigger CI and merge themselves when CI passes. Without it they wait for a one-click merge, because pull requests opened with the default GitHub token don't trigger other workflows. If the organisation requires approval for fine-grained tokens, approve it under organisation Settings → Personal access tokens. Set an expiry date and a calendar reminder to renew it.
1. **Optional:** Settings → Secrets and variables → Actions → **Variables** → `CONTACT_EMAIL`, to show an email link next to the GitHub feedback link.
1. **Optional:** the **`ANTHROPIC_API_KEY`** secret, for the weekly AI summary. Set a monthly spend limit in the Anthropic console.
1. **Optional:** the **`DATA_GOV_IN_API_KEY`** secret, for connectors that read data.gov.in. Locally, put it in `.env` (never committed).

### Who can merge what

| Who | Can merge? | Notes |
|---|---|---|
| Outside contributors (pull requests from forks) | No | They can't merge or turn on auto-merge, and fork pull requests never receive secrets. No workflow uses `pull_request_target`. |
| The data bot | Only its own `data/update-*` pull requests, via auto-merge | Only after CI passes. These pull requests change only files under `data/`. |
| Maintainers | Yes | Review code changes before merging. If co-maintainers join, raise required approvals to 1 in the ruleset. |

## Things a person still does

| When | Task |
|---|---|
| Around January each year | Download RBI *State Finances* Statements 33 and 34 (the update run opens a reminder issue). RBI blocks scripted downloads. |
| When an issue says a source changed format | Review the fix (by hand or AI-drafted) and merge it. Until then the last verified data stays published. |
| New year of PMC accounts | Add the reviewed statement figures and the new pinned URL (see `connectors/pmc-accounts/`). |

## If government sites block GitHub's servers

GitHub-hosted runners are outside India. If a source refuses them (some `.gov.in` sites didn't respond during research), run the same workflow on a self-hosted runner in India: any small Linux VM with `runs-on: self-hosted`. The scripts don't change.

## Run it yourself

```sh
npm run update   # same as the daily job; prints the change note
npm run check    # lint, typecheck, tests, build
```
