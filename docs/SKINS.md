# AiMI art & modding

Since v0.3.0 a unicorn's coat color is ROLLED AT HATCH (rarity-weighted) and
can never be changed in-app — that's the point. It also grows through four
stages with its level: foal, yearling, unicorn, legendary.

All art is generated: `npm run sprites` renders 8 colors x 4 stages x 10
animations from `scripts/generate-sprites.ts`. To mod the look, edit the
palettes in COLOR_SKINS or the stage anatomy in STAGES and regenerate — the
sheets land in `src/renderer/public/skins/<color>-s<stage>/` with manifests
(frame counts, fps, per-frame hat anchors) written for you.

Colors and rarity weights are mirrored in `src/shared/types.ts`
(UNICORN_COLORS) — keep both lists in sync if you add a color.
