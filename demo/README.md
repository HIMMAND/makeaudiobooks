# Demo video

3D promo for the main README, built with [Remotion](https://www.remotion.dev) + react-three-fiber.

```bash
npm install
CARTESIA_KEY=... python3 narrate.py   # regenerates public/narration.wav + timing.json (optional; both are committed)
npm run render                         # -> out/demo.mp4
```

If Remotion's bundled headless Chrome crashes ("Target closed"), render with your installed Chrome:
`npm run render -- --chrome-mode=chrome-for-testing --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`
