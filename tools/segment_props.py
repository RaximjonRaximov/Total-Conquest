"""Segment individual props from the gray-background AI props sheet.

Strategy: flood-fill the gray background (and its soft shadow) from the image
borders, then label the remaining connected components. Emits a labeled preview
(boxes + indices) so we can curate which components to pack into the atlas.
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = "/home/ubuntu/attachments/10624ec6-190d-463b-b6b3-7203ce3236ad/assets_props.png"
BG = np.array([140, 133, 123])


def bg_mask(a):
    # distance to background gray
    dist = np.sqrt(((a.astype(int) - BG) ** 2).sum(axis=2))
    # also catch grayish shadow: low saturation + mid/low brightness
    mx = a.max(axis=2).astype(int)
    mn = a.min(axis=2).astype(int)
    sat = mx - mn
    grayish = (sat < 35) & (mx > 70)
    cand = (dist < 60) | grayish
    # keep only candidate pixels connected to the border (true background)
    lbl, n = ndimage.label(cand)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))
    return bg


def main():
    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im)
    bg = bg_mask(a)
    fg = ~bg
    fg = ndimage.binary_closing(fg, iterations=2)
    lbl, n = ndimage.label(fg)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    prev = im.convert("RGBA").copy()
    d = ImageDraw.Draw(prev)
    comps = []
    for i in range(1, n + 1):
        if sizes[i - 1] < 900:
            continue
        ys, xs = np.where(lbl == i)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        comps.append((i, int(x0), int(y0), int(x1), int(y1)))
    comps.sort(key=lambda c: (c[2] // 60, c[1]))
    for idx, (i, x0, y0, x1, y1) in enumerate(comps):
        d.rectangle([x0, y0, x1, y1], outline=(255, 0, 0, 255), width=2)
        d.text((x0 + 2, y0 + 2), str(idx), fill=(255, 255, 0, 255))
    prev.save("/tmp/props_labeled.png")
    print("components:", len(comps))
    for idx, (i, x0, y0, x1, y1) in enumerate(comps):
        print(idx, x0, y0, x1, y1, f"{x1-x0}x{y1-y0}")


if __name__ == "__main__":
    main()
