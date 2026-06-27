"""Cut curated props from the props sheet (transparent bg) and pack into an atlas.

Reuses the border flood-fill segmentation from segment_props, maps the stable
component indices to names, then shelf-packs the cut-outs into props.png and
writes src/world/atlas.json with frame rects + collision flags.
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "/home/ubuntu/attachments/10624ec6-190d-463b-b6b3-7203ce3236ad/assets_props.png"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_IMG = f"{ROOT}/public/assets/img"
OUT_SRC = f"{ROOT}/src/world"
BG = np.array([140, 133, 123])

# component index (from segment_props ordering) -> (name, solid)
NAME_MAP = {
    0: ("house_blue", True), 1: ("house_yellow", True), 2: ("house_red", True),
    3: ("house_green", True), 4: ("tower", True), 5: ("well", True),
    6: ("stall_fruit", True), 7: ("stall_bread", True), 8: ("stall_potion", True),
    9: ("sign_post", True), 10: ("sign_hanging", True), 11: ("notice_board", True),
    14: ("fence_h", True), 15: ("fence_v", True), 17: ("gate", True),
    18: ("wall", True), 20: ("lamp", True), 22: ("barrel", True),
    24: ("sack", False), 25: ("bucket", False),
    26: ("tent_big", True), 27: ("tent_small", True), 28: ("campfire", True),
    29: ("pot", True), 30: ("table", True), 31: ("stool", False),
    32: ("woodpile", False), 35: ("bridge_wood", False), 36: ("bridge_stone", False),
    33: ("tree_oak", True), 37: ("tree_oak2", True), 38: ("tree_pine", True),
    39: ("tree_pine2", True), 40: ("tree_pine3", True), 41: ("tree_dead", True),
    34: ("tree_dead2", True),
    42: ("bush", False), 44: ("bush_white", False), 45: ("bush_pink", False),
    47: ("bush_red", False), 48: ("bush_blue", False), 50: ("grass_tuft", False),
    54: ("rock_small", False), 55: ("rock", False), 57: ("rock_big", True),
    58: ("rocks", False), 59: ("stump_big", True), 60: ("stump", False),
    61: ("log", False), 62: ("logs", False),
}


def segment():
    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im)
    dist = np.sqrt(((a.astype(int) - BG) ** 2).sum(axis=2))
    mx = a.max(axis=2).astype(int); mn = a.min(axis=2).astype(int)
    grayish = ((mx - mn) < 35) & (mx > 70)
    cand = (dist < 60) | grayish
    lbl, n = ndimage.label(cand)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))
    fg = ndimage.binary_closing(~bg, iterations=2)
    lbl, n = ndimage.label(fg)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    comps = []
    for i in range(1, n + 1):
        if sizes[i - 1] < 900:
            continue
        ys, xs = np.where(lbl == i)
        comps.append((i, int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())))
    comps.sort(key=lambda c: (c[2] // 60, c[1]))
    return im, lbl, comps


def main():
    im, lbl, comps = segment()
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).copy()
    cutouts = []  # (name, solid, PIL image)
    for idx, (i, x0, y0, x1, y1) in enumerate(comps):
        if idx not in NAME_MAP:
            continue
        name, solid = NAME_MAP[idx]
        mask = (lbl == i)
        sub_mask = mask[y0:y1 + 1, x0:x1 + 1]
        sub = arr[y0:y1 + 1, x0:x1 + 1].copy()
        sub[~sub_mask, 3] = 0
        cutouts.append((name, solid, Image.fromarray(sub, "RGBA")))

    # shelf pack
    pad = 2
    maxw = 1024
    x = y = rowh = 0
    frames = {}
    placements = []
    for name, solid, img in sorted(cutouts, key=lambda c: -c[2].height):
        w, h = img.width, img.height
        if x + w + pad > maxw:
            x = 0; y += rowh + pad; rowh = 0
        placements.append((name, solid, img, x, y))
        frames[name] = {"x": x, "y": y, "w": w, "h": h, "solid": solid}
        x += w + pad; rowh = max(rowh, h)
    atlas_h = y + rowh + pad
    atlas = Image.new("RGBA", (maxw, atlas_h), (0, 0, 0, 0))
    for name, solid, img, px, py in placements:
        atlas.paste(img, (px, py))
    os.makedirs(OUT_IMG, exist_ok=True)
    os.makedirs(OUT_SRC, exist_ok=True)
    atlas.save(f"{OUT_IMG}/props.png")
    with open(f"{OUT_SRC}/atlas.json", "w") as f:
        json.dump({"image": "/assets/img/props.png", "frames": frames}, f, indent=2)

    # Phaser JSONHash atlas for this.load.atlas()
    pframes = {}
    for name, fr in frames.items():
        pframes[name] = {
            "frame": {"x": fr["x"], "y": fr["y"], "w": fr["w"], "h": fr["h"]},
            "sourceSize": {"w": fr["w"], "h": fr["h"]},
            "spriteSourceSize": {"x": 0, "y": 0, "w": fr["w"], "h": fr["h"]},
        }
    phaser = {"frames": pframes,
              "meta": {"image": "props.png", "size": {"w": atlas.width, "h": atlas.height}, "scale": "1"}}
    with open(f"{OUT_IMG}/props.json", "w") as f:
        json.dump(phaser, f)

    atlas.resize((maxw, atlas_h), Image.NEAREST).save("/tmp/props_atlas.png")
    print("props.png", atlas.size, "frames", len(frames))


if __name__ == "__main__":
    main()
