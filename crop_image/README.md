# Crop & Compress Studio

Bulk image tool for wedding assets: load many files, center-crop by aspect ratio, or fine-tune one image in the browser, then compress **down to a target size** (default **5 MB**, works well for 40 MB originals).

Runs locally only — nothing is uploaded to the cloud.

## Setup

```bash
cd crop_image
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
python3 app.py
```

Open **http://127.0.0.1:8766**

## Features

| Step | What it does |
|------|----------------|
| **Load** | Drag & drop or pick multiple images |
| **Editor** | **Pan** (✋ / hold Space) to drag the zoomed image · **Crop frame** to resize the box · scroll to zoom |
| **Drafts** | Crop each image → set name (presets: `hero.jpg`, `groom.jpg`, …) → **Save draft** → **Download all drafts (ZIP)** |
| **Quick batch** | Same frame on every file without per-image drafts |
| **Compress** | Target max MB, JPEG/WebP/PNG per image in draft workflow |

Compression lowers JPEG/WebP quality and, if needed, scales down until each file is under your limit.

## API (optional)

- `POST /api/process` — batch
- `POST /api/crop-one` — manual normalized crop box

## Notes

- HEIC on macOS may need Pillow with HEIF support; convert to JPEG in Photos if load fails.
- For invitation folders, use **4:5** for couple portraits and **16:9** for hero backgrounds.