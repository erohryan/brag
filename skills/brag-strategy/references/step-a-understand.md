# Step A: Understand the system (feature level)

Build a **feature-level** inventory of the product. This is deeper than `/brag`'s inspection: `/brag` reads what a product *claims and looks like* to make one video; here you map what the product *is*, feature by feature, because each feature is a candidate for its own video.

## Why feature-level

The feature is the unit of a video. Modeling at feature granularity — not "the app" or "the dashboard" as one blob — is what lets the program ship lots of content periodically, each piece focused on one thing. More features in the inventory is the goal, not a cost.

A good feature is something a user would recognize as a distinct capability: "one-click export", "collaborative cursors", "the onboarding wizard", "keyboard-driven command palette". Split a broad surface into its features rather than listing the surface once.

## What to read (investigate first)

Do the interpretive work before asking the user anything.

1. **Routes / pages** (`app/`, `pages/`, route files) — each distinct screen or flow is a lead.
2. **Feature components** — editors, forms, dashboards, panels, wizards, settings. Named components often *are* the features.
3. **README / docs** — a "features" or "how it works" section is the product's own list; reconcile it with what the code actually contains.
4. **`package.json` / deps** — integrations and capabilities implied by dependencies.
5. **Marketing copy** (`index.html`, landing page) — the claims, but treat these as marketing, not ground truth. Verify against code.
6. **Config / feature flags** — features that exist but may be gated or new.

## Produce the inventory

For each feature, record in `brag-marketing/product-profile.md`:

- **Feature name** and a stable `feature-slug` (kebab-case; becomes the video folder name).
- **What it does** — one line, concrete.
- **Where in the code** — route/component/file, so `/brag` can find real material later.
- Leave **customer outcome** and **assets on hand** as placeholders — Steps C and B fill them.

Also capture the **product's real name** and **audience** at the top of the profile (confirm the name with the user if the code is ambiguous — it's needed for market framing and messaging integrity).

## Reason, then clarify

After the inventory, form your own view and surface only genuine gaps to the user. Typical honest questions:

- "I found these 9 features in the code. Are any of these *not* things you'd market — internal tooling, deprecated, or not yet shipped?"
- "Which of these do you consider headline features vs. supporting details?" (only if the code doesn't make it obvious)
- "Is there a feature you're planning to launch soon that isn't in the code yet but should be in the content plan?"

Show what you concluded; ask only what you couldn't infer.

## Gate

Every headline and supporting feature is listed in `product-profile.md` with a one-line description and its code location. The real product name and audience are recorded.
