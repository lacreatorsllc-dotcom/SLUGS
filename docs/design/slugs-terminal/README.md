# SLUGS Terminal designs

22 screens for the new signed-in platform, saved from the design canvas on 2026-10-30.

- `screens/*.dc.html`: one file per screen. Inline styles are the spec; `{{…}}`, `<sc-for>`, `<sc-if>` and the `DCLogic` script are mockup templating (loops/conditions), not production code.
- `canvas.json`: screen list, titles and canvas layout.
- Logo: `web/public/slugs-logo-orange.png` (the screens link to it).
- Live canvas (private, ask the owner for access): https://claude.ai/artifact/WtkX5dsVEfZSBPLvngt7V2

Onboarding and SLUGs (added later on 2026-10-30):
- `SlugCards`: the first-time welcome tour, redesigned from the April cards. The live version is `web/src/components/terminal/WelcomeTour.tsx`. Its last card ("Claim your SLUG.") sets the profile username and names the first Baum agent with a Pons-style name (Adjective + Color + Animal), which people can shuffle or edit.
- `SlugConcepts`: three ways to show a SLUG (A address chip, B handle line, C labelled field) on profiles, agent pages, leaderboard rows and search. A SLUG is a username you copy like a contract address: `goobz` for a person, `goobz/dca-agent` for their agent. It is always shown in full and shown or copied without `@`. Search uses `@`.
- `OnboardingCards`: an earlier Baum-only take on the welcome cards. `OldOnboarding`: the April original, for reference.
- Still open with Baum: today Baum's agent slugs are fixed at launch and formatted `goobz-dca-agent`; the designs assume `goobz/dca-agent`, renamable in Settings.

Build guide: [`docs/handoffs/2026-10-30-slugs-terminal-codex.md`](../../handoffs/2026-10-30-slugs-terminal-codex.md).
