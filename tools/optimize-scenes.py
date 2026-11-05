#!/usr/bin/env python3
"""Rebuild assets/opt/*.webp from the JPEG sources listed in assets/scene-sources.json.

The JPEG stays in place. Quality and pixel size come from the recipe in that
file. Portrait paths are recorded for later; this script does not invent them.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
MANIFEST = ASSETS / 'scene-sources.json'


def main():
    spec = json.loads(MANIFEST.read_text())
    recipe = spec['recipe']
    if recipe.get('resize'):
        sys.exit('recipe.resize must stay false')
    quality = int(recipe['quality'])
    method = int(recipe['method'])
    for scene in spec['scenes']:
        src = ASSETS / scene['source']
        dst = ASSETS / scene['webp']
        if not src.is_file():
            sys.exit('missing source ' + scene['source'])
        im = Image.open(src).convert('RGB')
        if im.size != (1600, 893):
            sys.exit(scene['source'] + ' is ' + str(im.size) + ', expected 1600x893')
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, 'WEBP', quality=quality, method=method)
        dec = Image.open(dst)
        if dec.size != im.size:
            sys.exit(scene['webp'] + ' decoded as ' + str(dec.size))
        print(f"{scene['source']} {src.stat().st_size} -> {scene['webp']} {dst.stat().st_size}")


if __name__ == '__main__':
    main()
