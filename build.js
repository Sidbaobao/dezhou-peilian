/* 合成单文件与离线缓存脚本：
 *   dist/德州陪练.html   独立版本，本地双击即可玩
 *   dist/artifact.html   发布到 claude.ai 的版本（无 doctype / html / head / body 外壳）
 *   sw.js                GitHub Pages 用的离线缓存脚本，版本号为构建时间
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function replaceBlock(src, startMark, endMark, build) {
  const start = src.indexOf(startMark);
  const end = src.indexOf(endMark, start);
  if (start < 0 || end < 0) throw new Error('找不到标记 ' + startMark);
  const block = src.slice(start, end + endMark.length);
  return src.slice(0, start) + build(block) + src.slice(end + endMark.length);
}

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

let out = replaceBlock(html, '<!-- build:css -->', '<!-- endbuild -->', block => {
  const files = [...block.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  return '<style>\n' + files.map(read).join('\n') + '\n</style>';
});
out = replaceBlock(out, '<!-- build:js -->', '<!-- endbuild -->', block => {
  const files = [...block.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  return '<script>\n' + files.map(read).join('\n;\n') + '\n</script>';
});
// 单文件版本没有 manifest 和图标文件
out = replaceBlock(out, '<!-- pwa:start -->', '<!-- pwa:end -->', () => '');

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

// 离线缓存脚本
const version = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
fs.writeFileSync(path.join(root, 'sw.js'), read('tools/sw.template.js').split('__VERSION__').join(version));

const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log('dist/德州陪练.html', kb(Buffer.byteLength(out)));
console.log('dist/artifact.html', kb(Buffer.byteLength(artifact)));
console.log('sw.js version', version);
