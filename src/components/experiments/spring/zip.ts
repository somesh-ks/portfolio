/** A stored (uncompressed) zip: tokens are small text, so no deflate needed. */
const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(files: { path: string; content: string }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.path);
    const data = enc.encode(f.content);
    const crc = crc32(data);
    const head = (sig: number, extra: number) => {
      const b = new Uint8Array(extra + name.length);
      const v = new DataView(b.buffer);
      v.setUint32(0, sig, true);
      return { b, v };
    };
    const local = head(0x04034b50, 30);
    local.v.setUint16(4, 20, true);
    local.v.setUint16(6, 0x0800, true); // UTF-8 names
    local.v.setUint32(14, crc, true);
    local.v.setUint32(18, data.length, true);
    local.v.setUint32(22, data.length, true);
    local.v.setUint16(26, name.length, true);
    local.b.set(name, 30);
    const dir = head(0x02014b50, 46);
    dir.v.setUint16(4, 20, true);
    dir.v.setUint16(6, 20, true);
    dir.v.setUint16(8, 0x0800, true);
    dir.v.setUint32(16, crc, true);
    dir.v.setUint32(20, data.length, true);
    dir.v.setUint32(24, data.length, true);
    dir.v.setUint16(28, name.length, true);
    dir.v.setUint32(42, offset, true);
    dir.b.set(name, 46);
    parts.push(local.b, data);
    central.push(dir.b);
    offset += local.b.length + data.length;
  }
  const size = central.reduce((n, b) => n + b.length, 0);
  const end = new Uint8Array(22);
  const v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, files.length, true);
  v.setUint16(10, files.length, true);
  v.setUint32(12, size, true);
  v.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end] as BlobPart[], { type: "application/zip" });
}
