# Passport Photo Builder (Browser-only)

A simple, privacy-friendly passport photo maker that runs entirely in the browser.

What it does:
- Upload an image (no server upload)
- Choose a preset photo size or enter custom size + DPI
- Crop with manual controls + Auto Center Face
- Optional Auto Enhance (brightness/contrast/saturation baseline)
- Background removal (selfie segmentation) + choose background color
- Download:
  - Single photo (PNG / JPEG)
  - Print sheet (A4 / A3 / 4x6 / Custom) with auto-pack + cut lines

Deployed example (your Vercel URL):
- Add your URL here

https://passport-maker-ten.vercel.app/

---

## Tech Stack

- React + TypeScript
- Vite
- Zustand (state management)
- react-easy-crop (crop UI)
- MediaPipe Tasks Vision (face detection + selfie segmentation)

Everything is client-side.


---

## Features

### Step 1: Upload + Size
- Presets: choose common passport sizes (configurable via `utils/presets.ts`)
- Custom size:
  - width / height
  - units: mm, cm, inch, px
  - DPI (stored in URL so you can share settings)

### Step 2: Crop
- Manual crop (pan/zoom/rotate)
- Auto Center Face:
  - detects a face and centers crop around it
  - adds a slight “shoulder bias” (face slightly higher) to match typical passport framing
- Auto Enhance:
  - estimates good brightness/contrast/saturation defaults

### Step 3: Background
- Original vs Background (removed)
- Background color picker
- Feather (edge smoothing)
- Dehalo (reduce halo/edge glow)

### Step 4: Download
- Single image export (PNG/JPEG)
- Print sheet export (PNG/JPEG):
  - A4, A3, 4x6 inch, Custom
  - auto-pack with user-requested count
  - cut lines + outer crop marks


---

## Privacy

This tool is **browser-only**:
- Images never leave your device.
- No backend and no storage.
- Models are downloaded by the browser at runtime (MediaPipe model assets).

If you want “offline / self-hosted models” later, see the notes in the “MediaPipe models” section below.


---

## Setup

### Prerequisites
- Node.js 18+ (recommended)
- npm (or pnpm/yarn)

### Install
```bash
npm install
