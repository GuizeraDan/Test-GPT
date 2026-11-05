"""Lossless export of normal RGBA Aseprite cels, including frame durations.

Usage: python tools/export_aseprite.py assets/Kamehameha.ase assets/base-kame-ase
Requires Pillow. Unsupported color depths/blend modes fail explicitly.
"""
import json
import struct
import sys
import zlib
from pathlib import Path
from PIL import Image


def export(source, prefix):
    data = Path(source).read_bytes()
    size, magic, count, width, height, depth = struct.unpack_from('<IHHHHH', data)
    if magic != 0xA5E0 or size != len(data) or depth != 32:
        raise ValueError('Expected a valid 32-bit RGBA Aseprite file')
    layers, frames, cel_history, metadata = [], [], [], []
    position = 128
    for index in range(count):
        frame_size, frame_magic, old_count, duration = struct.unpack_from('<IHHH', data, position)
        if frame_magic != 0xF1FA or frame_size < 16:
            raise ValueError('Invalid frame header')
        chunks = struct.unpack_from('<I', data, position + 12)[0] or old_count
        offset, cels = position + 16, {}
        for _ in range(chunks):
            chunk_size, chunk_type = struct.unpack_from('<IH', data, offset)
            if chunk_size < 6 or offset + chunk_size > position + frame_size:
                raise ValueError('Invalid chunk size')
            body = data[offset + 6:offset + chunk_size]
            if chunk_type == 0x2004:
                flags, kind, child = struct.unpack_from('<HHH', body)
                blend = struct.unpack_from('<H', body, 10)[0]
                if kind != 0 or blend != 0 or child != 0:
                    raise ValueError('Exporter supports flat normal image layers only')
                layers.append({'visible': bool(flags & 1), 'opacity': body[12]})
            elif chunk_type == 0x2005:
                layer, x, y, opacity, kind = struct.unpack_from('<HhhBH', body)
                if struct.unpack_from('<h', body, 9)[0] != 0:
                    raise ValueError('Cel z-index override is unsupported')
                if kind in (0, 2):
                    w, h = struct.unpack_from('<HH', body, 16)
                    raw = body[20:] if kind == 0 else zlib.decompress(body[20:])
                    if len(raw) != w * h * 4:
                        raise ValueError('RGBA cel byte count mismatch')
                    image = Image.frombytes('RGBA', (w, h), raw)
                elif kind == 1:
                    linked = struct.unpack_from('<H', body, 16)[0]
                    image = cel_history[linked][layer]['image'].copy()
                else:
                    raise ValueError('Tilemap cels are unsupported')
                cels[layer] = {'image': image, 'x': x, 'y': y, 'opacity': opacity}
            offset += chunk_size
        frame = Image.new('RGBA', (width, height))
        for layer_index, layer in enumerate(layers):
            cel = cels.get(layer_index)
            if not layer['visible'] or cel is None:
                continue
            image = cel['image'].copy()
            opacity = cel['opacity'] * layer['opacity'] / 255
            if opacity != 255:
                image.putalpha(image.getchannel('A').point(lambda a: round(a * opacity / 255)))
            frame.alpha_composite(image, (cel['x'], cel['y']))
        frames.append(frame)
        cel_history.append(cels)
        metadata.append({'index': index, 'x': index * width, 'y': 0,
                         'width': width, 'height': height, 'duration': duration})
        position += frame_size
    if position != len(data):
        raise ValueError('Unexpected trailing bytes')
    sheet = Image.new('RGBA', (width * count, height))
    for index, frame in enumerate(frames):
        sheet.paste(frame, (index * width, 0))
    prefix = Path(prefix)
    sheet.save(prefix.with_suffix('.png'))
    result = {'source': Path(source).name, 'width': width, 'height': height,
              'columns': count, 'rows': 1, 'frames': metadata}
    prefix.with_suffix('.json').write_text(json.dumps(result, indent=2) + '\n')
    print(f'Exported {count} frames, {width}x{height}, durations {[f["duration"] for f in metadata]}')
    return result


if __name__ == '__main__':
    export(sys.argv[1], sys.argv[2])
