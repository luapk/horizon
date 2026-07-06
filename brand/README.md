# Longview brand assets

- `longview-logo-source.png` — original supplied logo (white artwork on black).
- `longview-wordmark.png` — chroma-keyed version (luminance→alpha) so the white
  wordmark, horizon line, and glowing dot composite cleanly over the app's
  gradient backgrounds. This is the mark used in-app.

The keyed wordmark is also inlined as a base64 data URI in
`frontend/src/logo.ts` so the single-file demo build works under its
no-network CSP. To regenerate after editing the source, see
`scratchpad/keylogo.py`.
