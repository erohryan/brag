# brag → marketing-content engine — pivot design

**Status:** built (Phases 1–4 implemented; see §5)
**Decisions locked:** suite of skills · light market-trend framing · keep the `brag` name & voice · feature-level granularity · investigate-then-clarify planning · asset-first with a persistent repo · ideation-then-selection gate

---

## 1. The shift in one sentence

Today `brag` makes **one** hype video of a whole product, statelessly. The pivot makes `brag` a **durable marketing-content engine**: it understands the system's components and the customer outcomes each one drives, adds light current-market framing, and produces an ongoing **library** of component-centered videos aligned to marketing goals — not a single one-off promo.

## 2. What we keep vs. change

| Keep (proven, reuse as-is) | Change / add |
|---|---|
| Hyperframes handoff (steps 3–4) | Depth of "understand function" — model the system by **component** |
| 7-tone system, creative laws, audio system | Model **customer outcomes** (JTBD / value / benefit) per component |
| `examples/` benchmark suite, docs launch site | Add **light market-trend** framing from web research |
| The playful `brag` name & voice | One video → a **set** of component videos |
| | **Persistence** across runs (a content plan that tracks what's made) |
| | Each video framed around a **marketing outcome + component**, not just a hook |
| | **Asset-first production** — discover and reuse real assets before recreating anything |

## 3. Target architecture — a two-skill suite

### `brag-strategy` (new — the brain)
Understands the product deeply and decides *what videos to make and why*. Produces durable planning artifacts; does not render video.

**Working method — investigate → reason → clarify (in that order).** The skill must do the interpretive work itself before asking anything: read the code/assets, form its own view, and only then bring the user *specific* clarifying questions about what it genuinely cannot infer from the dataset. No lazy "tell me about your product" interviews — questions are the residue of honest investigation, and it never asks what it could have found itself.

Steps:
- **A. System understanding** — go past marketing copy into routes/components/README-architecture/deps to build a **feature-level component inventory** (§3.2): fine-grained, so each video can focus on one feature and the library ships steadily.
- **B. Asset discovery** — a dedicated sweep for reusable material (see §3.1). Build an **asset inventory**, map every asset to the feature(s) it can support, then **clarify with the user** about assets not in the repo (see §3.1).
- **C. Customer outcomes** — for each feature: job-to-be-done, value prop, who benefits, the outcome it drives.
- **D. Light market framing** — a few `WebSearch` passes on the product's category for current-trend language/angles that resonate now (not a full competitive analysis). Uses the product's **real name** (§6.2).
- **E. Ideate → select → plan** (§3.3) — generate candidate video ideas, get the user to pick, *then* commit the chosen ideas to the content plan. This is the gate before any full-stack video generation.

Each `content-plan.md` row maps: feature · marketing goal (awareness / activation / conversion / retention) · audience · channel · core message · suggested tone · **assets on hand vs. gaps to fill** · status.

Outputs (to `brag-marketing/`): `product-profile.md`, `asset-inventory.md`, `market-notes.md`, `content-plan.md`.

### 3.1 Asset discovery (first-class)
The engine's instinct today is to *recreate* UI in HTML. For marketing content that's backwards: **find what already exists and prefer it**, recreate only to fill gaps. This step catalogs, per asset: path/source · type · which component it serves · quality/usability for video · any usage caveat (e.g. contains PII, low-res, placeholder).

What to hunt for:
- **Brand** — logos (SVG/PNG), wordmarks, icon sets, favicon, brand color tokens, licensed fonts.
- **Imagery** — screenshots, product photos, illustrations, hero art, Open Graph / social preview images, `public/`, `assets/`, `static/`, `docs/assets/`.
- **Motion** — existing videos, screen recordings, GIFs, Lottie/animation JSON, `.mp4`/`.webm`/`.mov` anywhere in the repo.
- **Copy assets** — testimonials, real metrics, case studies, press quotes, taglines already written.
- **External-but-declared** — asset paths referenced in code/CDN, a design-system package, a `brand/` or `press-kit/` folder.

Beyond the repo, the step **clarifies with the user**: after cataloging directly-connected assets, it asks whether there's relevant material to share now (logos, footage, screenshots, brand kit) and whether to **save assets for later marketing releases**. Contributed assets are copied into a **persistent asset repo** (§3.4) so they're available to every future run, not just this one.

Each content-plan row then declares **assets on hand** vs. **gaps**, so production reuses first and the plan surfaces what's missing rather than silently faking it.

### 3.2 Feature-level granularity
Components are modeled at **feature level**, not major-surface level. Rationale: granular marketing — each piece of content can focus on a single feature — which lets the library **ship lots of content periodically** rather than a few broad overviews. A feature is the unit of a video. The trade-off (more rows in the plan) is desired, not a cost.

### 3.3 Ideation → selection gate
`brag-strategy` never jumps straight to full-stack generation. It first proposes ideas and waits for the user to choose:
- **Prompted** (`/brag-strategy "<what to look for>"`) — focus ideation on that angle/feature/theme, generate several concrete ideas, and have the user select which to build before generation.
- **Blank** (`/brag-strategy`) — generate a **top 5** ideas across the product, **mark one recommended**, and ideally **avoid what's been produced recently** (§3.4 history). User selects; only then does it commit to the plan and hand off to the engine.

### 3.4 Persistent state (asset repo + history)
Two things must survive across runs, stored in the workspace (§ Persistence):
- **Asset repo** — a durable store of discovered + user-contributed assets, reused by every run and added to over time as new releases bring new material.
- **Production history** — what's already been made, so blank-mode ideation can steer away from recent topics and the plan reflects true remaining coverage.

### `brag` (evolved — the engine)
Today's 4-step video pipeline, re-rooted to take **one component brief** as input.
- **Input:** a row from `content-plan.md` (component + goal + message + tone) — or, back-compat, no plan → behaves like today (one video of the whole product).
- **Step 1 Inspect:** narrowed to the target component; reuses `product-profile.md` if present.
- **Step 2 Plan:** storyboard for *this* component; message = the customer outcome, not just the joke. **Assets-on-hand (from `asset-inventory.md`) are the default source; recreate in HTML only to fill a declared gap.** The "Choosing what to show" order in `step-2-plan.md` flips: reuse real asset → recreate UI → animate concept → text-forward.
- **Steps 3–4:** unchanged mechanics; output to `brag-marketing/videos/<component-slug>/`; mark that plan row done.

### Persistence — `brag-marketing/` workspace
```
brag-marketing/
  product-profile.md        # deep understanding: features + outcomes (living doc)
  asset-inventory.md        # catalog of reusable assets, mapped to features (living doc)
  assets/                   # persistent asset repo: discovered + user-contributed, reused every run
  market-notes.md           # light current-trend cues
  content-plan.md           # the roadmap: one row per planned video + status + history
  videos/
    <feature-slug>/         # today's brag-output/ structure, one per feature
      brag-plan.md · composition-brief.md · composition/ · brag.mp4 · brag.jpg · share-copy.txt
```
Long-run alignment lives here: the plan records what's planned, made, and pending (production history), so re-runs extend the library — and steer blank-mode ideation away from recent topics — instead of overwriting one file. The `assets/` repo grows across releases so later runs reuse earlier material.

## 4. The new flow

```
brag-strategy  →  product-profile.md + market-notes.md + content-plan.md
                        │  (a set of component video briefs)
                        ▼
brag  (run per feature)   →  videos/<feature>/brag.mp4  + plan row marked done
                        │
                        ▼
re-run strategy to refresh profile/plan; run brag to fill remaining features
```

## 5. Migration plan (phased, non-breaking)

- **Phase 0 — this doc.** ✅ Approved.
- **Phase 1 — strategy skill + workspace.** ✅ `skills/brag-strategy/` (SKILL + 6 references + 3 templates), workspace convention + symlinks. Add `skills/brag-strategy/` (steps A–E: feature-level understanding, asset discovery §3.1, outcomes, investigate-then-clarify method, ideation→selection gate §3.3) and the `brag-marketing/` convention: `product-profile.md`, `asset-inventory.md`, `assets/` repo, `content-plan.md` (with history). Existing `/brag` keeps working standalone.
- **Phase 2 — re-root the engine.** ✅ `brag/SKILL.md` gains feature-brief mode + `--feature` + workspace output; `step-1-inspect.md` / `step-2-plan.md` flipped to asset-first. Standalone one-shot mode preserved.
- **Phase 3 — wire market framing.** ✅ Light `WebSearch` framing lives in `references/step-d-market.md`, uses the real product name, skips gracefully offline.
- **Phase 4 — packaging & docs.** ✅ README (suite section), plugin/marketplace manifests (v0.4.0), `other-agents.md`, and discovery symlinks updated. _Remaining: a marketing-oriented example project (optional, not built yet)._

## 6. Settled decisions

1. **Granularity → feature-level.** Model the product at feature granularity so each video focuses on one feature and the library ships lots of content periodically (§3.2). More plan rows is the goal, not a cost.
2. **Real product identity → available.** The real product name is accessible and used for market framing and messaging integrity; no stubbing for real products (the fake `examples/` still get stub identities for the benchmark suite).
3. **Content plan is built through investigate-then-clarify discussion.** The agent investigates and forms its own view first, then asks the user only the specific things it cannot infer from the dataset (§3 working method). It never assumes what it should confirm, and never asks what it could find itself. Row schema: feature · goal · audience · channel · message · tone · assets-on-hand · gaps · status.
4. **Asset scope → connected assets + user contribution, persisted.** Look through all directly-connected assets, then clarify with the user about assets to share now and assets to save for later releases; contributed assets are stored in a persistent asset repo (`brag-marketing/assets/`) available to every future run (§3.1, §3.4).
5. **Invocation → ideation-then-selection gate.** `/brag-strategy "<prompt>"` focuses ideation on the given angle and generates several ideas for the user to pick from before generation. `/brag-strategy` (blank) generates a top-5 with one recommended, avoiding recently-produced topics. Selection always precedes full-stack generation (§3.3).
