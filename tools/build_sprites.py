"""Process generated assets into clean, game-ready files.

1. Remove the (checkerboard/gray) background from the knight sheet and the
   banner via a border-seeded flood fill that keys out light, low-saturation
   pixels but stops at the dark pixel-art outlines (so interior armour stays).
2. Split the knight sheet into individual run frames (by transparent gaps),
   normalize them to a uniform frame size (centered horizontally,
   bottom-aligned) and recompose into a tidy even strip.
3. Trim the banner to its visible bounding box.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

IMG_DIR = "public/assets/img"


def remove_bg(src_path, dst_path, lum_min=216, sat_max=22):
    im = Image.open(src_path).convert("RGBA")
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.int16)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = mx - mn
    bg_like = (mx >= lum_min) & (sat <= sat_max)

    # connected background must be reachable from the border
    labels, _ = ndimage.label(bg_like)
    border = np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ])
    border_ids = np.unique(border)
    border_ids = border_ids[border_ids != 0]
    bg_mask = np.isin(labels, border_ids)

    out = arr.copy()
    out[bg_mask, 3] = 0
    res = Image.fromarray(out, "RGBA")
    res.save(dst_path)
    return res


def find_segments(visible_cols, min_gap=6, min_width=20):
    segs = []
    start = None
    gap = 0
    for x, c in enumerate(visible_cols):
        if c:
            if start is None:
                start = x
            gap = 0
        else:
            if start is not None:
                gap += 1
                if gap >= min_gap:
                    end = x - gap + 1
                    if end - start >= min_width:
                        segs.append((start, end))
                    start = None
                    gap = 0
    if start is not None and len(visible_cols) - start >= min_width:
        segs.append((start, len(visible_cols)))
    return segs


def largest_component(sub):
    """Keep only the biggest opaque blob in a frame (drops stray specks)."""
    a = np.array(sub)
    mask = a[:, :, 3] > 24
    labels, n = ndimage.label(mask)
    if n <= 1:
        return sub
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    keep = int(np.argmax(sizes)) + 1
    a[labels != keep, 3] = 0
    return Image.fromarray(a, "RGBA")


def build_knight(n_frames=6):
    src = remove_bg(f"{IMG_DIR}/knight_run_raw.png", f"{IMG_DIR}/knight_run.png")
    w, h = src.size
    slice_w = w // n_frames
    crops = []
    for i in range(n_frames):
        sub = src.crop((i * slice_w, 0, (i + 1) * slice_w, h))
        sub = largest_component(sub)
        bbox = sub.getbbox()
        if bbox:
            crops.append(sub.crop(bbox))
    print("frame count:", len(crops))
    if not crops:
        sys.exit("no frames found")
    fw = max(c.width for c in crops)
    fh = max(c.height for c in crops)
    pad = 6
    fw += pad * 2
    fh += pad * 2
    n = len(crops)
    sheet = Image.new("RGBA", (fw * n, fh), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        ox = i * fw + (fw - c.width) // 2
        oy = fh - c.height - pad
        sheet.paste(c, (ox, oy), c)
    sheet.save(f"{IMG_DIR}/knight_sheet.png")
    print(f"knight_sheet.png {sheet.size} frames={n} frame={fw}x{fh}")
    return n, fw, fh


def trim_banner():
    b = remove_bg(f"{IMG_DIR}/banner_raw.png", f"{IMG_DIR}/banner.png")
    bbox = b.getbbox()
    if bbox:
        b.crop(bbox).save(f"{IMG_DIR}/banner.png")
        print("banner trimmed to", b.crop(bbox).size)


if __name__ == "__main__":
    build_knight()
    trim_banner()
