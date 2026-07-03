# Making AiMI skins

A skin is a folder containing `skin.json` and one horizontal sprite-sheet PNG per animation.
Drop it in `~/Library/Application Support/aimi/skins/<your-skin-name>/` and pick it in
**Settings → Pet → Skin** (restart not required).

## The fast way: palette swap

Copy `src/renderer/public/skins/default/` (or extract it from the app), keep every PNG's
shapes and just recolor, or regenerate from source: edit the `SKINS` table in
`scripts/generate-sprites.ts` and run `npm run sprites`.

## skin.json

```json
{
  "name": "My Cool Skin",
  "version": 1,
  "frameSize": 32,
  "palette": { "body": "#a78bfa", "...": "informational only" },
  "animations": {
    "idle":  { "file": "idle.png",  "frames": 6, "fps": 5,  "loop": true,  "headDy": [0,0,1,1,0,0] },
    "walk":  { "file": "walk.png",  "frames": 6, "fps": 8,  "loop": true,  "headDy": [-1,0,0,-1,0,0] },
    "run":   { "file": "run.png",   "frames": 4, "fps": 12, "loop": true,  "headDy": [-3,-5,1,-3] },
    "sleep": { "file": "sleep.png", "frames": 4, "fps": 2,  "loop": true,  "headDy": [4,5,5,4] },
    "happy": { "file": "happy.png", "frames": 6, "fps": 10, "loop": false, "headDy": [1,-5,-9,-8,-4,1] },
    "eat":   { "file": "eat.png",   "frames": 6, "fps": 8,  "loop": false, "headDy": [0,0,1,1,0,1] },
    "think": { "file": "think.png", "frames": 4, "fps": 4,  "loop": true,  "headDy": [0,0,1,0] },
    "wave":  { "file": "wave.png",  "frames": 4, "fps": 8,  "loop": true,  "headDy": [0,0,0,0] },
    "drag":  { "file": "drag.png",  "frames": 2, "fps": 4,  "loop": true,  "headDy": [-2,-1] },
    "land":  { "file": "land.png",  "frames": 2, "fps": 12, "loop": false, "headDy": [2,1] }
  }
}
```

Rules:

- **All ten animations are required** (the engine plays them all). Frame counts and fps are up to you.
- Each PNG is a horizontal strip: `frames × frameSize` wide, `frameSize` tall. Any `frameSize` works (16, 32, 64...) — the pet is drawn pixelated at `frameSize × stage scale`.
- The pet should face **right** in your art (the engine mirrors it when walking left).
- Leave ~2px of transparent margin under the feet — the engine aligns the sprite bottom to the screen edge.
- `headDy` (optional): per-frame vertical offset of the head, in sprite pixels, relative to your idle pose. It's how unlocked hats bounce along with your animation. Omit it and hats just stay put.
- Keep it pixel art. That's the whole vibe.

## Share it

Open a PR adding a preview GIF + a link to your skin repo in this file, or publish the folder anywhere — installing is just dropping it in the skins directory.
