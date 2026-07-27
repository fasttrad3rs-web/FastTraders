/**
 * Generate branded product placeholders.
 *
 * One SVG per top-level category, in Fast Traders navy/cyan. Products render
 * their SKU as an HTML overlay on top, so we need eight files rather than one
 * per SKU — and nothing is fetched from a third-party placeholder service.
 *
 *   node scripts/generate-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const NAVY = '#1B2A6B';
const DARK = '#0F1B4C';
const CYAN = '#00AEEF';
const SURFACE = '#F7F9FC';

/** Simple line glyphs, drawn on a 24×24 grid and scaled up. */
const GLYPHS = {
  breaker: '<rect x="7" y="3" width="10" height="18" rx="1.5"/><path d="M12 7v4M9.5 12.5h5M12 13.5v3.5"/>',
  automation: '<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M8 10h3M8 13h5M15 10h1.5M15 13h1.5"/>',
  component: '<circle cx="12" cy="12" r="7"/><path d="M12 5v3M12 16v3M5 12h3M16 12h3"/>',
  cable: '<path d="M4 8c4 0 4 8 8 8s4-8 8-8"/><rect x="2" y="6" width="3" height="4" rx="1"/><rect x="19" y="14" width="3" height="4" rx="1"/>',
  power: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  safety: '<path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z"/><path d="M9.5 12l2 2 3.5-4"/>',
  tools: '<path d="M14.5 4.5a4 4 0 0 0-5.3 5.3L4 15v5h5l5.2-5.2a4 4 0 0 0 5.3-5.3l-3 3-2.3-2.3z"/>',
  default: '<rect x="4" y="7" width="16" height="10" rx="1.5"/><path d="M8 11h8"/>',
};

/** Category slug → glyph. Anything unmapped falls back to `default`. */
const CATEGORIES = {
  'switchgear-protection': 'breaker',
  'circuit-breakers': 'breaker',
  'control-automation': 'automation',
  'control-components': 'component',
  'cables-wiring': 'cable',
  'power-motors': 'power',
  'safety-products': 'safety',
  'tools-accessories': 'tools',
  default: 'default',
};

function svg(glyphKey) {
  const glyph = GLYPHS[glyphKey] ?? GLYPHS.default;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="Product image pending">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${DARK}"/>
      <stop offset="1" stop-color="${NAVY}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0v40" fill="none" stroke="${NAVY}" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="600" height="600" fill="${SURFACE}"/>
  <rect width="600" height="600" fill="url(#grid)"/>

  <g transform="translate(180 150) scale(10)" fill="none" stroke="url(#g)" stroke-width="1.4"
     stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
    ${glyph}
  </g>

  <rect x="0" y="540" width="600" height="60" fill="${NAVY}"/>
  <rect x="0" y="536" width="600" height="4" fill="${CYAN}"/>
  <text x="300" y="578" text-anchor="middle" font-family="Inter, Arial, sans-serif"
        font-size="19" font-weight="700" letter-spacing="3" fill="#FFFFFF">FAST TRADERS</text>
</svg>`;
}

const outDir = path.resolve(process.cwd(), 'public/placeholders');
mkdirSync(outDir, { recursive: true });

for (const [slug, glyph] of Object.entries(CATEGORIES)) {
  writeFileSync(path.join(outDir, `${slug}.svg`), svg(glyph), 'utf8');
}

console.log(`Wrote ${Object.keys(CATEGORIES).length} placeholders to public/placeholders/`);
