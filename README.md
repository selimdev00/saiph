# Reel

An accessible, keyboard-driven HTML5 video player built in vanilla JavaScript. No frameworks, no dependencies, no build step.

The interface takes an editing-console point of view: a warm-graphite control surface, a single amber signal color for everything interactive, a monospace tabular timecode, and a tick-marked seek scrubber with a thin playhead.

## Features

- Play / pause as a single toggle, stop, and a real previous / next playlist
- Click-and-drag seek scrubber with buffered underlay, tick marks, and a hover time tooltip
- Volume slider plus mute that remembers and restores the previous level
- Remaining or total time readout (click the timecode to switch)
- Fullscreen on the player surface, with picture-in-picture where supported
- Captions via a WebVTT `<track>` and a CC toggle
- Loading, ready, buffering, ended (with auto-advance), and error states

## Accessibility

- Every control is a real `<button>` or native range input with an accurate, state-aware accessible name
- Full keyboard support: `Space` / `K` play, `←` `→` seek, `↑` `↓` volume, `M` mute, `F` fullscreen, `C` captions, `N` / `P` next / previous
- Visible amber focus rings, a skip link, a single `<h1>`, landmark regions, and a polite live region for status
- Honors `prefers-reduced-motion`

## State is event-driven

The native `<video>` element is the single source of truth. The UI is a projection of media events (`play`, `pause`, `volumechange`, `timeupdate`, `progress`, `fullscreenchange`, `ended`), never a parallel boolean that can drift. The visual progress fill is driven by `requestAnimationFrame` while playing for smoothness; the text timecode and ARIA values come from `timeupdate`.

## Run locally

```bash
npm run dev      # serves on http://localhost:4321
# or open index.html directly
```

The first clip is self-hosted; the rest of the playlist streams from a public sample bucket.

## Structure

```
index.html                 markup + inline icon sprite
assets/styles/style.css     design system + components
assets/scripts/script.js    player logic
assets/captions/reel.en.vtt captions for the first clip
```
