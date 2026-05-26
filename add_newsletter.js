const fs = require('fs');
const f = 'app/page.tsx';
let c = fs.readFileSync(f, 'utf8');

const newItem = `  {
    img: "/assets/images/Home/News/newsletter_june2026.webp",
    alt: "bioERGOtech Newsletter — Founding Edition",
    date: "June 2026",
    title: "Newsletter — Founding Edition",
    desc: "bioERGOtech is live. Read our founding newsletter covering our launch, research pillars, first members, and upcoming events.",
    href: "/articles/newsletter-june-2026",
  },
  `;

const marker = 'const NEWS_ITEMS = [\n';
if (!c.includes(marker)) {
  console.error('NEWS_ITEMS marker not found');
  process.exit(1);
}

c = c.replace(marker, marker + newItem);
fs.writeFileSync(f, c, 'utf8');
console.log('Done — newsletter added as first NEWS_ITEMS entry');
