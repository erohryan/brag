# The `brag-marketing/` workspace

Everything `/brag-strategy` produces is durable and lives here, at the project root. This is what makes the program compound over time instead of restarting every run.

## Layout

```
brag-marketing/
  product-profile.md    # feature-level understanding + customer outcomes (living doc)
  asset-inventory.md    # catalog of reusable assets, mapped to features (living doc)
  assets/               # persistent asset repo: discovered + user-contributed material
  market-notes.md       # light current-trend cues
  content-plan.md       # the roadmap: one row per planned video + status + history
  videos/
    <feature-slug>/     # one folder per rendered video (written by /brag)
      brag-plan.md · composition-brief.md · composition/ · brag.mp4 · brag.jpg · share-copy.txt
```

## Persistence rules

**Read before you write.** At the start of every run, read whatever already exists in `brag-marketing/`. Extend and update — never clobber a prior run's work.

**The asset repo grows.** `brag-marketing/assets/` holds discovered assets worth keeping and anything the user contributes. Later runs — including future product releases — reuse what's there and add to it. Never delete a user-contributed asset.

**History drives avoid-recent.** `content-plan.md` is also the production history: rows marked `done` record what's already been made. Blank-mode ideation (Step E) reads this to steer away from recently-covered features and to show true remaining coverage.

## First run vs. later runs

- **First run:** create the directory and the three living docs from the templates below. The `videos/` folder is created by `/brag` on first render.
- **Later runs:** load the existing docs, reconcile them with the current code/assets (features added? assets added? videos shipped?), and update in place.

```bash
mkdir -p brag-marketing/assets brag-marketing/videos
```

## Template: `product-profile.md`

Bundled at `<skill-dir>/templates/product-profile.md`. Structure:

```markdown
# Product Profile: [Real Product Name]

## What it is
[One paragraph. The real product, in plain terms.]

## Audience
[Who it's for. Primary and, if relevant, secondary.]

## Features (feature-level inventory)
### [Feature name] — `feature-slug`
- **What it does:** [one line]
- **Where in the code:** [route / component / file]
- **Customer outcome:** [job-to-be-done → value → who benefits] (filled in Step C)
- **Assets on hand:** [links into asset-inventory.md] (cross-referenced in Step B)

[... one block per feature ...]

## Notes / open questions
[Anything you could not infer and asked the user, plus their answers.]
```

## Template: `asset-inventory.md`

Bundled at `<skill-dir>/templates/asset-inventory.md`. Structure:

```markdown
# Asset Inventory: [Real Product Name]

_Last swept: [date]. Assets marked ★ are stored in `brag-marketing/assets/`._

| Asset | Type | Source / path | Serves feature(s) | Usability | Caveat |
|---|---|---|---|---|---|
| Logo (SVG) | brand | public/logo.svg | all | ★ ready | — |
| Editor screenshot | imagery | docs/assets/editor.png | editor | low-res, recapture | — |
| Demo screen recording | motion | (user to share) | export | gap | — |

## User-contributed (saved for reuse)
[Assets the user shared this run, now in brag-marketing/assets/. Note which are for now vs. later releases.]

## Gaps
[Assets a planned video needs but that don't exist yet.]
```

## Template: `content-plan.md`

Bundled at `<skill-dir>/templates/content-plan.md`. Structure:

```markdown
# Content Plan: [Real Product Name]

_The roadmap. One row per video. Status: planned → in-progress → done._

| # | Feature | Goal | Audience | Channel | Core message | Tone | Assets on hand | Gaps | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | export | activation | power users | X / LinkedIn | "one click to shareable" | polished | logo, export UI | screen recording | planned |

## Produced (history)
[Move done rows here with the date and the videos/<slug>/ path. This is the avoid-recent memory.]
```

## What not to store here

Same secrecy rule as `/brag`: nothing that ends up on screen or in a public post may contain secrets, API keys, tokens, internal hostnames, real customer/user PII, or credentials. If real UI holds such data, note a fictional stand-in in the plan.
