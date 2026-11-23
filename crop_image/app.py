#!/usr/bin/env python3
"""Bulk image crop & compress studio — run from crop_image/."""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from typing import Any, List, Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

from processor import AspectPreset, Format, crop_pixels, open_image, parse_aspect, process_file
from processor import crop_center_aspect, compress_to_target


def _parse_crop_norm(raw: Optional[str]) -> Optional[tuple[float, float, float, float]]:
    if not raw:
        return None
    try:
        o: Any = json.loads(raw)
        return (float(o["x"]), float(o["y"]), float(o["w"]), float(o["h"]))
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None


def _parse_per_file_crops(raw: Optional[str]) -> list[Optional[tuple[int, int, int, int]]]:
    if not raw:
        return []
    try:
        arr: Any = json.loads(raw)
        if not isinstance(arr, list):
            return []
        out: list[Optional[tuple[int, int, int, int]]] = []
        for item in arr:
            if not item:
                out.append(None)
                continue
            px = item.get("px") if isinstance(item, dict) else None
            if not px:
                out.append(None)
                continue
            out.append(
                (
                    int(px["x"]),
                    int(px["y"]),
                    int(px["w"]),
                    int(px["h"]),
                )
            )
        return out
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return []

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"

app = FastAPI(title="Crop & Compress Studio", version="1.0.0")
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    return HTMLResponse((STATIC / "index.html").read_text(encoding="utf-8"))


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/preview")
async def preview_one(
    file: UploadFile = File(...),
    aspect: str = Form("free"),
    max_mb: float = Form(5.0),
    out_format: str = Form("JPEG"),
    max_edge: int = Form(0),
):
    raw = await file.read()
    img = open_image(io.BytesIO(raw))
    ratio = parse_aspect(aspect)  # type: ignore[arg-type]
    if ratio is not None:
        img = crop_center_aspect(img, ratio)
    edge = max_edge if max_edge > 0 else None
    data, quality, w, h = compress_to_target(
        img,
        max_bytes=int(max_mb * 1024 * 1024),
        fmt=out_format,  # type: ignore[arg-type]
        max_edge=edge,
    )
    return {
        "original_bytes": len(raw),
        "output_bytes": len(data),
        "quality": quality,
        "width": w,
        "height": h,
        "preview_b64_hint": "Use /api/process for download",
    }


@app.post("/api/process")
async def process_batch(
    files: List[UploadFile] = File(...),
    aspect: str = Form("free"),
    max_mb: float = Form(5.0),
    out_format: str = Form("JPEG"),
    max_edge: int = Form(0),
    as_zip: bool = Form(True),
    crop_global: Optional[str] = Form(None),
    per_file_crops: Optional[str] = Form(None),
    use_editor_crop: bool = Form(True),
):
    max_bytes = int(max_mb * 1024 * 1024)
    edge = max_edge if max_edge > 0 else None
    fmt: Format = out_format if out_format in ("JPEG", "WEBP", "PNG") else "JPEG"  # type: ignore[assignment]
    preset: AspectPreset = aspect if aspect in ("free", "1:1", "4:5", "3:4", "16:9", "4:3") else "free"  # type: ignore[assignment]
    global_norm = _parse_crop_norm(crop_global) if use_editor_crop else None
    file_crops = _parse_per_file_crops(per_file_crops)

    results = []
    for i, f in enumerate(files):
        raw = await f.read()
        name = f.filename or "image.jpg"
        crop_px = file_crops[i] if i < len(file_crops) else None
        crop_norm = None if crop_px is not None else global_norm
        try:
            pr = process_file(
                raw,
                name,
                aspect=preset,
                crop_px=crop_px,
                crop_norm=crop_norm,
                max_bytes=max_bytes,
                out_format=fmt,
                max_edge=edge,
            )
            results.append(pr)
        except Exception as exc:  # noqa: BLE001
            results.append(None)
            print(f"Skip {name}: {exc}")

    ok = [r for r in results if r is not None]
    if not ok:
        return Response(content="No images processed", status_code=400)

    if len(ok) == 1 and not as_zip:
        r = ok[0]
        return Response(
            content=r.data,
            media_type=r.mime,
            headers={"Content-Disposition": f'attachment; filename="{r.filename}"'},
        )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for r in ok:
            zf.writestr(r.filename, r.data)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="optimized_images.zip"'},
    )


@app.post("/api/crop-one")
async def crop_one_interactive(
    file: UploadFile = File(...),
    x: float = Form(...),
    y: float = Form(...),
    w: float = Form(...),
    h: float = Form(...),
    max_mb: float = Form(5.0),
    out_format: str = Form("JPEG"),
    max_edge: int = Form(0),
    unit: str = Form("pixels"),
    out_name: Optional[str] = Form(None),
):
    raw = await file.read()
    img = open_image(io.BytesIO(raw))
    if unit == "pixels":
        img = crop_pixels(img, int(round(x)), int(round(y)), int(round(w)), int(round(h)))
    else:
        from processor import crop_box

        img = crop_box(img, x, y, w, h)
    edge = max_edge if max_edge > 0 else None
    fmt: Format = out_format if out_format in ("JPEG", "WEBP", "PNG") else "JPEG"  # type: ignore[assignment]
    data, _q, width, height = compress_to_target(
        img, max_bytes=int(max_mb * 1024 * 1024), fmt=fmt, max_edge=edge
    )
    ext = {"JPEG": ".jpg", "WEBP": ".webp", "PNG": ".png"}[fmt]
    if out_name and out_name.strip():
        base = out_name.strip().replace("\\", "").replace("/", "")
        if not base.lower().endswith((".jpg", ".jpeg", ".webp", ".png")):
            base += ext
        name = base
    else:
        name = (file.filename or "crop.jpg").rsplit(".", 1)[0] + "_crop" + ext
    mime = {"JPEG": "image/jpeg", "WEBP": "image/webp", "PNG": "image/png"}[fmt]
    return Response(
        content=data,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{name}"',
            "X-Image-Width": str(width),
            "X-Image-Height": str(height),
            "X-Output-Bytes": str(len(data)),
        },
    )


def main() -> None:
    import uvicorn

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8766,
        reload=False,
    )


if __name__ == "__main__":
    main()