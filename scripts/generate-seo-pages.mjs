import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const template = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
const guides = JSON.parse(await readFile(path.join(root, 'src', 'content', 'business-guides.json'), 'utf8'));
const site = 'https://wsgestaocontabil.com';
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

for (const guide of guides) {
  const canonical = `${site}/guias/${guide.slug}`;
  const staticArticle = `<article style="max-width:800px;margin:80px auto;padding:24px;color:#f5f0e3;font-family:Arial,sans-serif"><p>${escapeHtml(guide.eyebrow)}</p><h1>${escapeHtml(guide.title)}</h1><p>${escapeHtml(guide.description)}</p><img src="${escapeHtml(guide.heroImage)}" alt="${escapeHtml(guide.heroImageAlt)}" width="1600" height="900"><p>${escapeHtml(guide.intro)}</p>${guide.sections.map((section, index) => `<section><h2>${escapeHtml(section.title)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}${index === 0 ? `<img src="${escapeHtml(guide.contentImage)}" alt="${escapeHtml(guide.contentImageAlt)}" width="1260" height="750">` : ''}${index === 1 ? `<aside><h3>${escapeHtml(guide.ctaTitle)}</h3><p>${escapeHtml(guide.ctaText)}</p><a href="https://wa.me/5582999324884">Conversar com um especialista</a></aside>` : ''}</section>`).join('')}</article>`;
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(guide.title)} | WS Gestão Contábil</title>`)
    .replace('</head>', `    <meta name="description" content="${escapeHtml(guide.description)}" />\n    <link rel="canonical" href="${canonical}" />\n    <meta property="og:type" content="article" />\n    <meta property="og:title" content="${escapeHtml(guide.title)}" />\n    <meta property="og:description" content="${escapeHtml(guide.description)}" />\n    <meta property="og:url" content="${canonical}" />\n    <meta property="og:image" content="${escapeHtml(guide.heroImage)}" />\n    <meta property="og:image:alt" content="${escapeHtml(guide.heroImageAlt)}" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:title" content="${escapeHtml(guide.title)}" />\n    <meta name="twitter:description" content="${escapeHtml(guide.description)}" />\n    <meta name="twitter:image" content="${escapeHtml(guide.heroImage)}" />\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${staticArticle}</div>`);
  const output = path.join(root, 'dist', 'guias', guide.slug);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'index.html'), html);
}

await writeFile(path.join(root, 'dist', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
const urls = ['', '/home-preview', ...guides.map((guide) => `/guias/${guide.slug}`)];
await writeFile(path.join(root, 'dist', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${site}${url || '/'}</loc></url>`).join('')}</urlset>\n`);
