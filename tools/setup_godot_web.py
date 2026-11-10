"""Install only official Godot 4.6.3 single-threaded Web export templates.

HTTP ranges avoid downloading the 1.25 GB multi-platform template archive.
Requires Python 3 and curl. Never runs code from the downloaded archive.
"""
from pathlib import Path
import re
import struct
import subprocess
import zlib

ROOT = Path(__file__).resolve().parents[1]
VERSION = "4.6.3"
URL = (f"https://github.com/godotengine/godot-builds/releases/download/"
       f"{VERSION}-stable/Godot_v{VERSION}-stable_export_templates.tpz")
DEST = ROOT / f".toolchain/share/godot/export_templates/{VERSION}.stable"
NAMES = {"web_nothreads_release.zip", "web_nothreads_debug.zip"}


def curl(*args):
    return subprocess.check_output([
        "curl", "--fail", "--silent", "--show-error", "--location",
        "--connect-timeout", "30", "--max-time", "180", *args, URL,
    ])


def read_range(start, end):
    data = curl("--range", f"{start}-{end}")
    if len(data) != end - start + 1:
        raise RuntimeError("O servidor não retornou o intervalo HTTP solicitado.")
    return data


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    if all((DEST / name).is_file() for name in NAMES):
        print(f"Templates Web já instalados em {DEST}")
        return
    headers = curl("--head").decode()
    lengths = re.findall(r"^content-length:\s*(\d+)\s*$", headers, re.I | re.M)
    if not lengths:
        raise RuntimeError("Não foi possível obter o tamanho do arquivo oficial.")
    total = int(lengths[-1])
    tail_start = max(0, total - 65536)
    tail = read_range(tail_start, total - 1)
    end = tail.rfind(b"PK\x05\x06")
    if end < 0:
        raise RuntimeError("Diretório ZIP não encontrado.")
    directory_size, directory_offset = struct.unpack_from("<II", tail, end + 12)
    directory = (tail[directory_offset - tail_start:directory_offset - tail_start + directory_size]
                 if directory_offset >= tail_start
                 else read_range(directory_offset, directory_offset + directory_size - 1))
    position = 0
    installed = set()
    while directory[position:position + 4] == b"PK\x01\x02":
        method = struct.unpack_from("<H", directory, position + 10)[0]
        crc, compressed, size = struct.unpack_from("<III", directory, position + 16)
        name_len, extra_len, comment_len = struct.unpack_from("<HHH", directory, position + 28)
        offset = struct.unpack_from("<I", directory, position + 42)[0]
        name = directory[position + 46:position + 46 + name_len].decode()
        filename = name.removeprefix("templates/")
        position += 46 + name_len + extra_len + comment_len
        if filename not in NAMES:
            continue
        print(f"Baixando {filename} ({compressed / 1_000_000:.1f} MB)…", flush=True)
        header = read_range(offset, offset + 29)
        if header[:4] != b"PK\x03\x04":
            raise RuntimeError("Cabeçalho ZIP inválido.")
        local_name, local_extra = struct.unpack_from("<HH", header, 26)
        start = offset + 30 + local_name + local_extra
        payload = read_range(start, start + compressed - 1)
        if method == 8:
            payload = zlib.decompress(payload, -15)
        elif method != 0:
            raise RuntimeError(f"Compressão não suportada: {method}")
        if len(payload) != size or zlib.crc32(payload) != crc:
            raise RuntimeError(f"Falha na verificação CRC/tamanho de {filename}.")
        temporary = DEST / (filename + ".tmp")
        temporary.write_bytes(payload)
        temporary.replace(DEST / filename)
        installed.add(filename)
    if installed != NAMES:
        raise RuntimeError("O pacote oficial não contém todos os templates necessários.")
    print(f"Templates Web instalados em {DEST}")


if __name__ == "__main__":
    main()
