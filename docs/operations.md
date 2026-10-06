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

1. Push the repository to GitHub (for example `paisa-india/paisa`) and enable Actions.
1. Settings → Pages → Source: **GitHub Actions**. The site appears at `https://<org>.github.io/<repo>/`. For a custom domain, add it in the same screen; the build adjusts the base path automatically.
1. Optional: Settings → Secrets and variables → Actions → **Variables**: `CONTACT_EMAIL`, to show an email link next to the GitHub feedback link.
1. Settings → General → enable **Allow auto-merge**.
1. Add a **`DATA_BOT_TOKEN`** secret: a fine-grained token limited to this repository with Contents, Pull requests and Issues read/write. With it, data pull requests trigger CI and merge themselves when CI passes. Without it they wait for a one-click merge, because pull requests opened with the default GitHub token don't trigger other workflows.
1. Optional: add **`ANTHROPIC_API_KEY`** for the weekly AI summary, and set a monthly spend limit in the Anthropic console.
1. Protect `main`: require CI to pass.

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
