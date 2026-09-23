# Step E: Ideate → select → plan

The payoff step. Turn the understanding, assets, outcomes, and market cues into concrete video ideas, let the user choose, and commit the chosen ones to the content plan. **Selection is a hard gate: never proceed to full-stack generation on ideas the user hasn't picked.**

## Read the history first

Read `content-plan.md` (including the Produced/history section). You need to know what's already been made so you don't propose it again.

## Generate ideas — two modes

### Prompted mode (`/brag-strategy "<angle>"`)
Focus ideation on the given angle, feature, or theme. Generate **several concrete ideas** (3–5) that explore it from different directions — different features, outcomes, tones, or channels. Don't pad with unrelated ideas.

### Blank mode (`/brag-strategy`)
Survey the whole product. Generate a **top 5** across features, and **mark exactly one recommended**. Bias the recommendation toward:
- A headline feature with a strong outcome and assets already on hand (low friction to ship).
- A current-market angle from Step D.
- A feature **not covered recently** (from history) — freshness and coverage.

State *why* the recommended one is recommended in one line.

## Shape of each idea

Present each idea compactly so the user can choose fast:

```
[n] <short title>
    Feature: <feature-slug>   Goal: <awareness|activation|conversion|retention>
    Audience: <who>           Channel: <where it'll be posted>
    Message: <the one-sentence customer outcome it lands>
    Tone: <one of /brag's presets or a freeform direction>
    Assets: on hand — <...>; gap — <...>
    Why now: <market/coverage rationale, one line>
```

Marketing goal vocabulary: **awareness** (top-of-funnel reach), **activation** (get signups using a feature), **conversion** (drive purchase/upgrade), **retention** (deepen usage / re-engage). Pick the one the feature+audience best serves.

## Present and wait for selection

Show the ideas and ask the user to pick which to build. In blank mode, lead with the recommended one but let them choose freely (including "all of them" or "none, regenerate"). **Do not write plan rows or hand anything to `/brag` until the user has selected.**

If the user wants changes ("more like #2 but for teams", "regenerate with a chaotic tone"), iterate on the ideas — still before committing.

## Commit the selection

For each selected idea, write a row into `content-plan.md` with status `planned`:

`# · feature · goal · audience · channel · core message · tone · assets-on-hand · gaps · status`

Keep unselected ideas out of the plan (optionally note them in a "parking lot" section for next time).

## Hand off to `/brag`

Once rows are committed, offer to render. For each selected row, hand `/brag` the row's contents (feature, outcome/message, tone, assets-on-hand, gaps). `/brag` renders into `brag-marketing/videos/<feature-slug>/` and flips the row to `done` (moving it into the history section).

Render one at a time or batch, per the user's preference. The plan is the contract; the engine executes it.

## Gate

The user has selected ideas, and each selected idea is a row in `content-plan.md` with status `planned`. Nothing was handed to `/brag` before selection.
