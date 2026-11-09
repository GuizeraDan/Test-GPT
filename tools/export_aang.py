"""Extract the supplied SFF v1 / AIR package without running MUGEN scripts.

Character pixels stay at native resolution. Large effect sprites use 50%
nearest-neighbor; originals, axes, frame timing and AIR flags are retained.
"""
from pathlib import Path
import io
import json
import re
import struct
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/aang-original'
data = (SOURCE / 'aang.sff').read_bytes()
assert data[:12] == b'ElecbyteSpr\0' and data[15] == 1
count, offset = struct.unpack_from('<II', data, 20)
act = (SOURCE / 'Aang.act').read_bytes()
palette = b''.join(act[i:i + 3] for i in range(765, -1, -3))
previous_palette = None
sprites = []
lookup = {}
for i in range(count):
    next_offset, length, x, y, group, number, link, same = struct.unpack_from('<IIhhHHHB', data, offset)
    if length:
        raw = data[offset + 32:offset + 32 + length]
        if raw[-769:-768] == b'\x0c':
            previous_palette = raw[-768:]
        elif previous_palette:
            raw += b'\x0c' + previous_palette
        image = Image.open(io.BytesIO(raw))
        image.load()
        if same and group < 7000:
            image.putpalette(palette)
        image.info['transparency'] = 0
        image = image.convert('RGBA')
    else:
        image = sprites[link]['image'].copy()
    sprite = dict(image=image, pivotX=x, pivotY=y)
    sprites.append(sprite)
    lookup[(group, number)] = sprite
    offset = next_offset

parts = re.split(r'\[Begin Action\s+(\d+)\]', (SOURCE / 'aang.air').read_text(encoding='cp1252'), flags=re.I)
actions, packed = {}, {}
for i in range(1, len(parts), 2):
    frames = []
    loop = 0
    for line in parts[i + 1].splitlines():
        line = line.split(';')[0].strip()
        if line.lower() == 'loopstart':
            loop = len(frames)
        if not re.match(r'^-?\d+\s*,', line):
            continue
        fields = [v.strip() for v in line.split(',')]
        group, number, dx, dy, ticks = map(int, fields[:5])
        if group < 0:
            continue
        flip = fields[5].upper() if len(fields) > 5 else ''
        blend = fields[6].upper() if len(fields) > 6 else ''
        key = f'{group}:{number}:{flip}'
        z = .5 if group >= 7000 else 1
        if key not in packed:
            sprite = lookup[(group, number)]
            image = sprite['image'].copy()
            px, py = sprite['pivotX'], sprite['pivotY']
            if 'H' in flip:
                image = ImageOps.mirror(image)
                px = image.width - px
            if 'V' in flip:
                image = ImageOps.flip(image)
                py = image.height - py
            image = image.resize((max(1, round(image.width * z)), max(1, round(image.height * z))), Image.Resampling.NEAREST)
            packed[key] = dict(image=image, pivotX=px * z, pivotY=py * z)
        frames.append(dict(sprite=key, offsetX=dx * z, offsetY=dy * z,
                           ticks=ticks, duration=round(max(1, ticks) * 1000 / 60, 3),
                           hold=ticks < 0, additive=blend.startswith('A')))
    actions[parts[i]] = dict(frames=frames, loop=loop)

width, x, y, row = 2048, 0, 0, 0
placements, metadata = [], {}
for key, item in packed.items():
    image = item['image']
    if x + image.width + 2 > width:
        x = 0
        y += row + 2
        row = 0
    metadata[key] = dict(x=x, y=y, w=image.width, h=image.height,
                         pivotX=item['pivotX'], pivotY=item['pivotY'])
    placements.append((image, x, y))
    x += image.width + 2
    row = max(row, image.height)
atlas = Image.new('RGBA', (width, y + row))
for image, x, y in placements:
    atlas.alpha_composite(image, (x, y))
atlas.save(ROOT / 'assets/aang-atlas.png')
(ROOT / 'assets/aang-atlas.json').write_text(json.dumps(dict(sprites=metadata, actions=actions), separators=(',', ':')) + '\n')
print(f'Aang: {len(actions)} actions, {len(packed)} sprite variants; atlas {atlas.size}')
