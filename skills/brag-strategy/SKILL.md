---
name: brag-strategy
description: Plan an ongoing marketing-content program for a product — understand its features, the customer outcomes each one drives, and light current-market framing, then propose brag videos to make. Use when someone says "/brag-strategy", "plan marketing content", "what should we make videos about", "build a content plan", or wants a repeatable content roadmap rather than a single video. Reads the project code and assets directly. Hands each chosen idea to /brag to render.
---

# /brag-strategy

The brain behind `/brag`. Where `/brag` makes one video, `/brag-strategy` decides **what videos to make and why** — steadily, over time, aligned to marketing outcomes.

It understands the product at the feature level, maps the customer outcome each feature drives, adds light current-market framing, and proposes a set of component-centered brag videos. It never renders video itself — it produces a durable plan and hands chosen ideas to `/brag`.

## Working method (this governs everything below)

**Investigate → reason → clarify, in that order.**

1. **Investigate.** Read the code, the assets, the README, the marketing copy. Do the interpretive work yourself.
2. **Reason.** Form your own view of what the product is, its features, who it's for, and what each feature does for them.
3. **Clarify.** Only then bring the user *specific* questions about what you genuinely cannot infer from the dataset.

Questions are the residue of honest investigation. Never open with "tell me about your product." Never ask what you could have found yourself. When you do ask, show what you already concluded and ask only the gap: *"I read the editor and the export flow as your two headline features — is the collaboration panel also a headline feature or a supporting detail?"*

## What this skill does

1. Builds a **feature-level** understanding of the system.
2. Discovers **reusable assets** on hand — and clarifies with the user what else exists.
3. Maps each feature to the **customer outcome** it drives.
4. Adds **light current-market framing** (what language/angles resonate now).
5. **Ideates**, has the user **select**, and commits chosen ideas to a **content plan**.

The plan and its supporting docs live in a persistent `brag-marketing/` workspace so the program compounds across runs instead of starting over.

## Invocation dispatch (must happen first)

Parse the full invocation before doing anything else.

```
/brag-strategy
/brag-strategy "onboarding flow"
/brag-strategy focus on the new export feature, aimed at power users
```

Two modes:

| Mode | Trigger | Behavior |
|---|---|---|
| **Prompted** | any text after the command | Focus ideation on that angle/feature/theme. Generate several concrete ideas for it. |
| **Blank** | no text | Survey the whole product. Generate a **top 5** ideas, **mark one recommended**, and **avoid topics produced recently** (read the workspace history). |

Either way, **the user selects before any full-stack generation.** Selection is a hard gate — see Step E.

## Skill directory

`<skill-dir>` is the directory containing this `SKILL.md`. Bundled templates are under `<skill-dir>/templates/` and reference docs under `<skill-dir>/references/`. The sibling `brag` skill (the render engine) is what you hand selected ideas to.

## Workspace

All durable output goes to a `brag-marketing/` directory at the project root. It persists across runs — read it at the start of every run and extend it, never clobber it.

**Read:** [references/workspace.md](references/workspace.md) for the full layout, file templates, and the persistence rules (asset repo + production history).

---

## Step A: Understand the system (feature level)

**Read:** [references/step-a-understand.md](references/step-a-understand.md)

Build a **feature-level** component inventory. The feature is the unit of a video: granular enough that each video focuses on one feature and the library can ship steadily.

Write / update `brag-marketing/product-profile.md`.

**Gate:** Every headline and supporting feature is listed with a one-line description of what it does.

---

## Step B: Discover assets

**Read:** [references/step-b-assets.md](references/step-b-assets.md)

Sweep for reusable material (logos, screenshots, footage, illustrations, real copy). Map each asset to the feature(s) it can support. Then **clarify with the user**: what else is available to share now, and what to save for later releases. Copy contributed assets into the persistent `brag-marketing/assets/` repo.

Write / update `brag-marketing/asset-inventory.md`.

**Gate:** Every reusable asset is cataloged with path, type, feature mapping, and usability note; the user has been asked about assets not in the repo.

---

## Step C: Customer outcomes

**Read:** [references/step-c-outcomes.md](references/step-c-outcomes.md)

For each feature: the job-to-be-done, the value prop, who benefits, and the outcome it drives. This is what each video must *communicate* — the point, not just the visual.

Record outcomes in `brag-marketing/product-profile.md` alongside each feature.

**Gate:** Every headline feature has a stated customer outcome.

---

## Step D: Light market framing

**Read:** [references/step-d-market.md](references/step-d-market.md)

A few `WebSearch` passes on the product's category for current-trend language and angles that resonate now. Light framing, not a competitive analysis. Uses the product's real name (confirm it if not obvious). Skip gracefully if offline.

Write / update `brag-marketing/market-notes.md`.

**Gate:** `market-notes.md` exists with a short list of current angles/phrases, or a one-line note that market framing was skipped and why.

---

## Step E: Ideate → select → plan

**Read:** [references/step-e-ideate.md](references/step-e-ideate.md)

Generate candidate video ideas (focused in prompted mode; a top-5 with one recommended in blank mode, avoiding recent topics). Present them to the user and **wait for a selection**. Only after the user picks do you commit the chosen ideas as rows in `brag-marketing/content-plan.md`.

Each committed row carries: feature · marketing goal · audience · channel · core message · suggested tone · assets-on-hand · gaps · status.

**Gate:** The user has selected ideas, and each selected idea is a row in `content-plan.md` with status `planned`.

---

## Handoff to `/brag`

`/brag-strategy` owns strategy and planning. The `brag` engine owns rendering. For each selected idea, hand `/brag` the content-plan row (feature, outcome/message, tone, assets-on-hand, gaps). The engine renders into `brag-marketing/videos/<feature-slug>/` and flips the row's status to `done`.

Do not render video from this skill. Do not enter the `hyperframes` workflow here — that happens inside `/brag`.

## Creative laws (inherited from /brag)

The content this plans still obeys `/brag`'s laws: short, readable, specific, show the real thing, no generic SaaS language, the hook is everything. The difference is scope — a *program* of specific videos, each earning its place against a marketing outcome, not one hype clip.
