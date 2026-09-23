# Step C: Customer outcomes

A feature is *what the product does*. An outcome is *what the customer gets*. Every video must communicate an outcome — the feature is just how it's demonstrated. This is the difference between "our export supports 12 formats" and "ship a shareable link the moment you're done."

For each feature in `product-profile.md`, fill in the customer outcome.

## The frame

For each feature, answer in one or two lines each:

- **Job-to-be-done** — what is the user trying to accomplish when they reach for this feature?
- **Value / benefit** — what changes for them because the feature exists? (time saved, friction removed, capability unlocked, confidence gained.)
- **Who benefits** — which audience segment cares most. Features often serve different segments; name the one this feature wins.
- **Outcome statement** — one sentence, in the customer's terms, that a video for this feature must land.

## Investigate first

Derive outcomes from evidence before asking:

- The feature's own copy, empty states, tooltips, and onboarding text often state the benefit.
- Testimonials and metrics found in Step B are outcome gold — use the product's real claims.
- The audience from Step A tells you whose outcome matters.

## Then clarify

Ask only what you can't infer. Good honest questions:

- "I read [feature] as mainly saving setup time for new users — is the bigger win actually the collaboration it unlocks for teams?"
- "Which outcome matters most to the business right now: getting new users activated, or deepening usage for existing ones?" (this steers marketing goals in Step E.)

## Record

Add the outcome under each feature in `product-profile.md`:

```markdown
### One-click export — `export`
- What it does: renders the project to a shareable link in one click.
- Where in the code: app/export/route.ts, components/ExportButton.tsx
- Customer outcome: JTBD — "share my work without a handoff." Value — zero export friction, instant link. Who — solo creators and power users. Outcome: "Done means shared, in one click."
- Assets on hand: export UI screenshot (★), logo (★); gap: screen recording of the click→link flow.
```

## Gate

Every headline feature has a stated customer outcome (job → value → who → one-sentence outcome). Supporting features have at least a value line.
