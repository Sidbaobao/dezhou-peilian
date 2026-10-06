/* 合成单文件：
 *   dist/德州陪练.html   独立版本，本地双击即可玩
 *   dist/artifact.html   发布到 claude.ai 的版本（无 doctype / html / head / body 外壳）
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function inlineBlock(src, startMark, endMark, build) {
  const start = src.indexOf(startMark);
  const end = src.indexOf(endMark, start);
  if (start < 0 || end < 0) throw new Error('找不到标记 ' + startMark);
  const block = src.slice(start, end + endMark.length);
  return src.slice(0, start) + build(block) + src.slice(end + endMark.length);
}

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

let out = inlineBlock(html, '<!-- build:css -->', '<!-- endbuild -->', block => {
  const files = [...block.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  return '<style>\n' + files.map(read).join('\n') + '\n</style>';
});
out = inlineBlock(out, '<!-- build:js -->', '<!-- endbuild -->', block => {
  const files = [...block.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  return '<script>\n' + files.map(read).join('\n;\n') + '\n</script>';
});

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', '德州陪练.html'), out);

// Artifact 版本：从 <!-- artifact:start --> 到 </head> 之间的 title / link / style，加上 body 内容
const headStart = out.indexOf('<!-- artifact:start -->') + '<!-- artifact:start -->'.length;
const headEnd = out.indexOf('</head>');
const head = out.slice(headStart, headEnd).trim();
const bodyStart = out.indexOf('<body>') + '<body>'.length;
const bodyEnd = out.lastIndexOf('</body>');
const body = out.slice(bodyStart, bodyEnd).trim();
const artifact = head + '\n' + body + '\n';
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), artifact);

const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log('dist/德州陪练.html', kb(Buffer.byteLength(out)));
console.log('dist/artifact.html', kb(Buffer.byteLength(artifact)));
