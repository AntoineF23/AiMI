# AiMI — your pixel pet, powered by any AI

A tiny pixel-art cat that lives on top of your screen. It wanders along the bottom of your desktop, naps, does zoomies, asks what you're up to, learns about you over time — and turns your day into a gentle little game.

**Zero pressure by design.** Nothing decays, nothing dies, nothing guilts you. Every interaction only *adds*: XP for everything, confetti level-ups, surprise gifts, rare stickers, evolutions. Ignore it for a week — it greets you back with a present.

## Features

- **A living pet** — walks, sleeps at night, blinks, does zoomies; drag it around, throw it, it bounces. Click it for treats, pets, games and chat.
- **Any AI brain (bring your own)** — Anthropic, OpenAI, Google, Mistral, any OpenAI-compatible endpoint (OpenRouter, LM Studio...), or **Ollama for a free, 100% local brain**. One toggle in Settings.
- **It learns about you** — chats are remembered in a local SQLite database, periodically consolidated into a profile. See and delete everything it knows in Settings → Memory.
- **It can (politely) look at your screen** — only when you say yes, only one downscaled screenshot, sent straight to your chosen provider and never stored.
- **Web-aware** — paste a YouTube link or article, it fetches the title and chats about it. No search API key needed.
- **Super gamified** — XP toasts, level-ups, coins, sticker album (21 to collect, 5 rarity tiers), daily gifts, streaks that never punish, three minigames (Catch the Treat, Pong vs Pet, Tic Tac Paw), hats to unlock, and evolutions: hatchling → kiddo → chonk.
- **100% pixel art** — every icon, sticker and panel is generated pixel art. No emoji were harmed.
- **Private by default** — no account, no telemetry, no cloud. Your API key is stored encrypted (macOS Keychain-backed). Everything lives on your machine.

## Install (macOS)

1. Grab the latest `.dmg` from [Releases](../../releases).
2. Open it and drag **AiMI** to Applications.
3. First launch: **right-click the app → Open** (the build is unsigned; macOS asks once).
4. Hatch your egg, name your pet, optionally plug in a brain. Done — it lives in your menu bar (cat icon).

### Give it a brain

Any of these works, in Settings (tray icon → Settings… or click your pet → SETUP):

| Provider | What you need |
|---|---|
| **Ollama** (recommended to start) | Install [ollama.com](https://ollama.com), `ollama pull ministral-3:8b` — free, local, private. Vision models let your pet *see* your screen. |
| Anthropic / OpenAI / Google / Mistral | An API key from their console |
| Custom | Any OpenAI-compatible base URL (OpenRouter, LM Studio, llama.cpp, vLLM...) |

No brain? It's still a full virtual pet — the AI is a layer, never a requirement.

## Development

```bash
npm install
npm run sprites    # regenerate all pixel art (sprites, icons, app icon)
npm run dev        # run with hot reload
npm run dist       # build the .dmg
```

Electron + TypeScript + React. The pet is a deterministic local simulation (state machine + physics at 60fps) — the AI is an async brain on top, so the pet never freezes waiting for a model. Main-process modules: `ai/` (Vercel AI SDK provider registry), `brain/` (thought ticks + JSON actions), `memory/` (node:sqlite), `capture/`, `tools/`.

## Custom skins

Your pet's look is a folder: `skin.json` + one PNG strip per animation. Drop folders into
`~/Library/Application Support/aimi/skins/` and they appear in Settings → Pet.
See [docs/SKINS.md](docs/SKINS.md) for the full format — palette swaps take five minutes.

## Privacy

- API keys: encrypted via Electron `safeStorage`, never leave your machine except toward the provider you chose.
- Memory: local SQLite file; inspect/delete per-fact or wipe everything in Settings → Memory.
- Screenshots: opt-in per screenshot, downscaled, never written to disk.
- Frontmost-app awareness: off by default.
- Network traffic: your AI provider + any URL you explicitly share with the pet. That's it.

## License

[MIT](LICENSE) — the pet is yours now.
