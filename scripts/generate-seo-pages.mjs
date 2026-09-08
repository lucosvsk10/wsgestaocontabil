import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const builtTemplate = await readFile(path.join(dist, 'index.html'), 'utf8');
const template = builtTemplate
  .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  .replace(/ 'sha256-[^']+'/g, '');
const guides = JSON.parse(await readFile(path.join(root, 'src', 'content', 'business-guides.json'), 'utf8'));
const site = 'https://www.wsgestaocontabil.com';
const buildDate = '2026-09-08';
const defaultRobots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const setTitle = (html, title) => html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
const setMeta = (html, attribute, key, value) => {
  const expression = new RegExp(`<meta\\s+${attribute}=["']${escapePattern(key)}["']\\s+content=["'][^"']*["']\\s*\\/?>`, 'i');
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`;
  return expression.test(html) ? html.replace(expression, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`);
};
const setCanonical = (html, canonical) => {
  const tag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  return /<link\s+rel=["']canonical["'][^>]*>/i.test(html)
    ? html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, () => tag)
    : html.replace('</head>', () => `    ${tag}\n  </head>`);
};
const addStructuredData = (html, data) => {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const hash = createHash('sha256').update(json).digest('base64');
  return html
    .replace("script-src 'self';", () => `script-src 'self' 'sha256-${hash}';`)
    .replace('</head>', () => `    <script type="application/ld+json">${json}</script>\n  </head>`);
};
const applyMetadata = (html, { title, description, canonical, robots = defaultRobots, type = 'website', image, imageAlt }) => {
  let output = setTitle(html, title);
  output = setMeta(output, 'name', 'description', description);
  output = setMeta(output, 'name', 'robots', robots);
  output = setCanonical(output, canonical);
  output = setMeta(output, 'property', 'og:locale', 'pt_BR');
  output = setMeta(output, 'property', 'og:type', type);
  output = setMeta(output, 'property', 'og:site_name', 'WS Gestão Contábil');
  output = setMeta(output, 'property', 'og:title', title);
  output = setMeta(output, 'property', 'og:description', description);
  output = setMeta(output, 'property', 'og:url', canonical);
  output = setMeta(output, 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  output = setMeta(output, 'name', 'twitter:title', title);
  output = setMeta(output, 'name', 'twitter:description', description);
  if (image) {
    output = setMeta(output, 'property', 'og:image', image);
    output = setMeta(output, 'property', 'og:image:alt', imageAlt || title);
    output = setMeta(output, 'name', 'twitter:image', image);
  }
  return output;
};
const writeRoute = async (route, html) => {
  const output = path.join(dist, ...route.split('/').filter(Boolean));
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'index.html'), html);
};

const organizationId = `${site}/#organization`;
const organization = {
  '@type': 'Organization',
  '@id': organizationId,
  name: 'WS Gestão Contábil',
  legalName: 'Wilson de Souza Costa',
  taxID: '41.346.581/0001-03',
  url: `${site}/`,
  logo: `${site}/assets/ws-logo.png`,
  image: `${site}/assets/ws-contador.webp`,
  email: 'contabilie2010@hotmail.com',
  telephone: '+55 82 99932-4884',
  sameAs: ['https://www.instagram.com/wscontabil.co/'],
};
const localUnits = [
  {
    '@type': 'AccountingService',
    '@id': `${site}/#major-isidoro`,
    name: 'WS Gestão Contábil — Major Isidoro',
    parentOrganization: { '@id': organizationId },
    url: `${site}/`,
    telephone: '+55 82 99932-4884',
    priceRange: '$$',
    areaServed: ['Major Isidoro', 'Sertão de Alagoas'],
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '17:00' }],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Loteamento Terra do Leite, 29, Quadra 1, Centro',
      addressLocality: 'Major Isidoro',
      addressRegion: 'AL',
      postalCode: '57580-000',
      addressCountry: 'BR',
    },
  },
  {
    '@type': 'AccountingService',
    '@id': `${site}/#palmeira-dos-indios`,
    name: 'WS Gestão Contábil — Palmeira dos Índios',
    parentOrganization: { '@id': organizationId },
    url: `${site}/`,
    telephone: '+55 82 99932-4884',
    priceRange: '$$',
    areaServed: ['Palmeira dos Índios', 'Agreste de Alagoas'],
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '17:00' }],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Avenida Muniz Falcão, 391, Sala 12, São Cristóvão',
      addressLocality: 'Palmeira dos Índios',
      addressRegion: 'AL',
      postalCode: '57680-490',
      addressCountry: 'BR',
    },
  },
];

const rootStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    organization,
    ...localUnits,
    {
      '@type': 'WebSite',
      '@id': `${site}/#website`,
      url: `${site}/`,
      name: 'WS Gestão Contábil',
      inLanguage: 'pt-BR',
      publisher: { '@id': organizationId },
    },
  ],
};
await writeFile(path.join(dist, 'index.html'), addStructuredData(template, rootStructuredData));

const hubCanonical = `${site}/guias`;
const hubTitle = 'Guias para abrir e administrar uma empresa | WS Gestão Contábil';
const hubDescription = 'Guias práticos sobre abertura de empresa, custos, fluxo de caixa e organização financeira para empreendedores e gestores.';
const hubStaticContent = `<main style="max-width:1180px;margin:70px auto;padding:24px;color:#f5f0e3;font-family:Arial,sans-serif"><header><p>Conhecimento para empresas</p><h1>Guias práticos para começar e administrar melhor</h1><p>${escapeHtml(hubDescription)}</p></header><section>${guides.map((guide) => `<article><h2><a href="/guias/${escapeHtml(guide.slug)}">${escapeHtml(guide.title)}</a></h2><p>${escapeHtml(guide.description)}</p><p>${escapeHtml(guide.readingTime)}</p></article>`).join('')}</section></main>`;
let hubHtml = applyMetadata(template, { title: hubTitle, description: hubDescription, canonical: hubCanonical });
hubHtml = addStructuredData(hubHtml, {
  '@context': 'https://schema.org',
  '@graph': [
    organization,
    {
      '@type': 'CollectionPage',
      '@id': `${hubCanonical}/#page`,
      url: hubCanonical,
      name: hubTitle,
      description: hubDescription,
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${site}/#website` },
      about: { '@id': organizationId },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${site}/` },
        { '@type': 'ListItem', position: 2, name: 'Guias', item: hubCanonical },
      ],
    },
    {
      '@type': 'ItemList',
      itemListElement: guides.map((guide, index) => ({ '@type': 'ListItem', position: index + 1, url: `${site}/guias/${guide.slug}`, name: guide.title })),
    },
  ],
});
hubHtml = hubHtml.replace('<div id="root"></div>', () => `<div id="root">${hubStaticContent}</div>`);
await writeRoute('/guias', hubHtml);

for (const guide of guides) {
  const canonical = `${site}/guias/${guide.slug}`;
  const title = `${guide.title} | WS Gestão Contábil`;
  const staticArticle = `<article style="max-width:800px;margin:80px auto;padding:24px;color:#f5f0e3;font-family:Arial,sans-serif"><nav><a href="/">Início</a> · <a href="/guias">Guias</a></nav><p>${escapeHtml(guide.eyebrow)}</p><h1>${escapeHtml(guide.title)}</h1><p>${escapeHtml(guide.description)}</p><p>Publicado em ${buildDate.split('-').reverse().join('/')} · ${escapeHtml(guide.readingTime)}</p><img src="${escapeHtml(guide.heroImage)}" alt="${escapeHtml(guide.heroImageAlt)}" width="1600" height="900"><p>${escapeHtml(guide.intro)}</p>${guide.sections.map((section, index) => `<section><h2>${escapeHtml(section.title)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}${index === 0 ? `<img src="${escapeHtml(guide.contentImage)}" alt="${escapeHtml(guide.contentImageAlt)}" width="1260" height="750">` : ''}${index === 1 ? `<aside><h3>${escapeHtml(guide.ctaTitle)}</h3><p>${escapeHtml(guide.ctaText)}</p><a href="https://wa.me/5582999324884">Conversar com um especialista</a></aside>` : ''}</section>`).join('')}<section><h2>Checklist para colocar em prática</h2><ul>${guide.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><p>Fonte: <a href="${escapeHtml(guide.sourceUrl)}">${escapeHtml(guide.sourceLabel)}</a></p><p><a href="/guias">Conheça outros guias para empresas</a></p></article>`;
  let html = applyMetadata(template, { title, description: guide.description, canonical, type: 'article', image: guide.heroImage, imageAlt: guide.heroImageAlt });
  html = addStructuredData(html, {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'Article',
        '@id': `${canonical}/#article`,
        headline: guide.title,
        description: guide.description,
        image: [guide.heroImage, guide.contentImage],
        datePublished: buildDate,
        dateModified: buildDate,
        inLanguage: 'pt-BR',
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        author: { '@id': organizationId },
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${site}/` },
          { '@type': 'ListItem', position: 2, name: 'Guias', item: hubCanonical },
          { '@type': 'ListItem', position: 3, name: guide.title, item: canonical },
        ],
      },
    ],
  });
  html = html.replace('<div id="root"></div>', () => `<div id="root">${staticArticle}</div>`);
  await writeRoute(`/guias/${guide.slug}`, html);
}

const issuerCanonical = `${site}/emissor-fiscal`;
const issuerTitle = 'Emissor Fiscal WS: NF-e, NFC-e, NFS-e, CT-e e MDF-e';
const issuerDescription = 'Emita e gerencie documentos fiscais em um só lugar. Conheça o Emissor Fiscal WS, seus recursos e planos mensal e anual.';
const issuerStaticContent = `<main style="max-width:1050px;margin:70px auto;padding:24px;color:#f5f0e3;font-family:Arial,sans-serif"><nav><a href="/">Início</a> · <a href="/guias">Guias</a></nav><header><p>Emissor Fiscal WS</p><h1>Emita documentos fiscais com menos etapas</h1><p>${escapeHtml(issuerDescription)}</p><p><a href="#planos">Conheça os planos</a> · <a href="https://wa.me/5582999324884">Fale com a WS</a></p></header><section><h2>Documentos e recursos</h2><p>Emissão de NF-e, NFC-e, NFS-e, CT-e e MDF-e, cadastro de clientes, produtos e serviços, histórico de emissões, configuração fiscal, certificado A1 e relatórios operacionais.</p></section><section id="planos"><h2>Planos</h2><article><h3>Mensal</h3><p>R$ 39,90 por mês.</p></article><article><h3>Anual</h3><p>R$ 399,00 por ano, equivalente a R$ 33,25 por mês.</p></article><p><a href="/login">Começar agora</a></p></section></main>`;
let issuerHtml = applyMetadata(template, { title: issuerTitle, description: issuerDescription, canonical: issuerCanonical });
issuerHtml = addStructuredData(issuerHtml, {
  '@context': 'https://schema.org',
  '@graph': [
    organization,
    {
      '@type': 'SoftwareApplication',
      '@id': `${issuerCanonical}/#software`,
      name: 'Emissor Fiscal WS',
      url: issuerCanonical,
      description: issuerDescription,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'pt-BR',
      publisher: { '@id': organizationId },
      offers: [
        { '@type': 'Offer', name: 'Plano mensal', price: '39.90', priceCurrency: 'BRL', url: `${issuerCanonical}#precos`, availability: 'https://schema.org/InStock' },
        { '@type': 'Offer', name: 'Plano anual', price: '399.00', priceCurrency: 'BRL', url: `${issuerCanonical}#precos`, availability: 'https://schema.org/InStock' },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${site}/` },
        { '@type': 'ListItem', position: 2, name: 'Emissor Fiscal WS', item: issuerCanonical },
      ],
    },
  ],
});
issuerHtml = issuerHtml.replace('<div id="root"></div>', () => `<div id="root">${issuerStaticContent}</div>`);
await writeRoute('/emissor-fiscal', issuerHtml);

for (const route of ['/home-preview', '/nova-home']) {
  const previewHtml = applyMetadata(template, {
    title: 'Prévia da nova página | WS Gestão Contábil',
    description: 'Ambiente de pré-visualização da nova página da WS Gestão Contábil.',
    canonical: `${site}${route}`,
    robots: 'noindex, nofollow, noarchive',
  });
  await writeRoute(route, previewHtml);
}

await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /app/\nDisallow: /client/\nDisallow: /dashboard\nDisallow: /checkout/\n\nSitemap: ${site}/sitemap.xml\n`);
const sitemapUrls = ['/', '/emissor-fiscal', '/guias', ...guides.map((guide) => `/guias/${guide.slug}`)];
await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((route) => `  <url>\n    <loc>${site}${route}</loc>\n    <lastmod>${buildDate}</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`);
