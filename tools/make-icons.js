/* 生成 PWA 图标（纯 node，不依赖图像库）：绒布绿圆角方块上一个金色黑桃 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(width, height, rgba) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0]));
    rows.push(rgba.subarray(y * width * 4, (y + 1) * width * 4));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* 形状：坐标归一化到 [-1, 1] */
function inRoundedSquare(x, y, r) {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ax > 1 || ay > 1) return false;
  if (ax < 1 - r || ay < 1 - r) return true;
  const dx = ax - (1 - r), dy = ay - (1 - r);
  return dx * dx + dy * dy <= r * r;
}
function inSpade(x, y) {
  // 黑桃 = 尖朝上的心形（屏幕坐标 y 向下，所以心形的两瓣落在下方）+ 底部的柄
  const X = x / 0.52, Y = (y + 0.02) / 0.52;
  const heart = Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y <= 0;
  const stemW = 0.07 + 0.4 * Math.max(0, (y - 0.5));
  const stem = y > 0.46 && y < 0.82 && Math.abs(x) < stemW;
  return heart || stem;
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const ss = 3; // 超采样
  const bg = [24, 59, 46], gold = [232, 199, 106], glow = [40, 90, 70];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const x = ((px + (sx + 0.5) / ss) / size) * 2 - 1;
        const y = ((py + (sy + 0.5) / ss) / size) * 2 - 1;
        let c = null;
        if (inRoundedSquare(x, y, 0.42)) {
          c = bg;
          const d = Math.sqrt(x * x + y * y);
          if (d < 0.9) c = [bg[0] + (glow[0] - bg[0]) * (1 - d / 0.9) * 0.6, bg[1] + (glow[1] - bg[1]) * (1 - d / 0.9) * 0.6, bg[2] + (glow[2] - bg[2]) * (1 - d / 0.9) * 0.6];
          if (inSpade(x, y)) c = gold;
        }
        if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
      }
      const n = ss * ss, i = (py * size + px) * 4;
      buf[i] = Math.round(r / n); buf[i + 1] = Math.round(g / n); buf[i + 2] = Math.round(b / n); buf[i + 3] = Math.round(a / n);
    }
  }
  return png(size, size, buf);
}

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  fs.writeFileSync(path.join(out, name), render(size));
  console.log(name, size + 'px');
}
