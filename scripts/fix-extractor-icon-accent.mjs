import fs from 'node:fs';
const path = 'src/styles/fiscal-extractor.css';
let css = fs.readFileSync(path, 'utf8');
if (!css.includes('color:var(--ex-accent)')) throw new Error('accent token not found');
css = css.replace('color:var(--ex-accent)', 'color:var(--ex-gold)');
fs.writeFileSync(path, css);
