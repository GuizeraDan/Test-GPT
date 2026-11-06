"""Build Cell's runtime atlas from supplied PNGs and Pixelorama projects.

Originals remain untouched. Runtime sprites use nearest-neighbor at 1/4 scale;
cropping removes only transparent margins, never colors inside the artwork.
"""
from pathlib import Path
import json
import re
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/cell-original'
entries = []


def add(key, image, duration=140, effect=False):
    image = image.convert('RGBA')
    box = image.getbbox()
    if not box:
        raise ValueError(f'Empty frame: {key}')
    # Feet anchor: center of the opaque pixels in the bottom 4% of the pose.
    feet = image.crop((0, max(box[1], box[3] - max(1, image.height // 25)), image.width, box[3])).getbbox()
    pivot = image.width / 2 if effect else (feet[0] + feet[2]) / 2
    cropped = image.crop(box)
    z = 1 if key.startswith('impact') else .25
    size = (max(1, round(cropped.width * z)), max(1, round(cropped.height * z)))
    cropped = cropped.resize(size, Image.Resampling.NEAREST)
    entries.append((key, cropped, {'w': size[0], 'h': size[1],
                    'pivotX': (pivot - box[0]) * z,
                    'pivotY': size[1] / 2 if effect else size[1], 'duration': duration}))


for path in sorted(SOURCE.glob('[0-9][0-9][0-9].png')):
    n = int(path.stem)
    add(path.stem, Image.open(path), effect=n in [70, 71, 72, 73, 74, 92, 93, 94, 95, 101, 102, 105, 114, 115, 116, 117, 121, 122, 123, 124, 142, 153, 164])

for filename, prefix in [('Cell Makankosappo.pxo', 'cast'), ('Explosão Makankosappo.pxo', 'impact')]:
    with zipfile.ZipFile(SOURCE / filename) as archive:
        data = json.loads(archive.read('data.json'))
        assert len(data['layers']) == 1 and data['layers'][0]['blend_mode'] == 0
        for i, frame in enumerate(data['frames']):
            cel = frame['cels'][0]
            size = tuple(map(int, re.findall(r'-?\d+', cel['image_size'])[-2:]))
            offset = tuple(map(int, re.findall(r'-?\d+', cel['offset'])))
            image = Image.new('RGBA', (data['size_x'], data['size_y']))
            image.alpha_composite(Image.frombytes('RGBA', size, archive.read(f'image_data/frames/{i + 1}/layer_1')), offset)
            add(f'{prefix}{i}', image, round(frame['duration'] * 1000 / data['fps']), prefix == 'impact')

add('projectile', Image.open(SOURCE / 'makankosappo-projectile.png'), effect=True)
width = 2048
x = y = row_height = 0
frames = {}
placements = []
for key, image, frame in entries:
    if x + image.width + 2 > width:
        x = 0
        y += row_height + 2
        row_height = 0
    frames[key] = dict(frame, x=x, y=y)
    placements.append((image, x, y))
    x += image.width + 2
    row_height = max(row_height, image.height)
atlas = Image.new('RGBA', (width, y + row_height))
for image, x, y in placements:
    atlas.alpha_composite(image, (x, y))
atlas.save(ROOT / 'assets/cell-atlas.png')
(ROOT / 'assets/cell-atlas.json').write_text(json.dumps(frames, indent=2) + '\n')
print(f'Cell: {len(frames)} frames, atlas {atlas.width} × {atlas.height}')
