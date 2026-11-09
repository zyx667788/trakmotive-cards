import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const ROOT_DIR = process.cwd();
const CARDS_DIR = path.join(ROOT_DIR, 'cards');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Configurable base URL for production deployment (e.g. Cloudflare Pages or custom domain)
// Can be overridden via env variable BASE_URL
const BASE_URL = process.env.BASE_URL || 'https://zyx667788.github.io/trakmotive-cards';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function build() {
  console.log('🚀 Starting build for TrakMotive Digital Cards...');

  // Setup directories
  ensureDir(DIST_DIR);
  ensureDir(path.join(DIST_DIR, 'c'));
  ensureDir(path.join(DIST_DIR, 'qrcodes'));
  ensureDir(path.join(DIST_DIR, 'assets'));

  // Copy static files
  fs.copyFileSync(path.join(SRC_DIR, 'style.css'), path.join(DIST_DIR, 'style.css'));
  fs.copyFileSync(path.join(SRC_DIR, 'card.js'), path.join(DIST_DIR, 'card.js'));
  
  if (fs.existsSync(path.join(ASSETS_DIR, 'logo.svg'))) {
    fs.copyFileSync(path.join(ASSETS_DIR, 'logo.svg'), path.join(DIST_DIR, 'assets', 'logo.svg'));
  }

  // Load templates
  const cardTemplate = fs.readFileSync(path.join(SRC_DIR, 'template.html'), 'utf-8');
  const portalTemplate = fs.readFileSync(path.join(SRC_DIR, 'portal-template.html'), 'utf-8');

  // Read cards
  const cardFiles = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.json')).sort();
  console.log(`Found ${cardFiles.length} card data files.`);

  const cardsSummary = [];

  for (const file of cardFiles) {
    const filePath = path.join(CARDS_DIR, file);
    const card = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const slug = card.slug || path.basename(file, '.json');

    const cardDir = path.join(DIST_DIR, 'c', slug);
    ensureDir(cardDir);

    // Avatar HTML (Photo vs Initials Circle)
    let avatarHtml = '';
    if (card.avatar && card.avatar.trim()) {
      avatarHtml = `<img src="${card.avatar}" alt="${card.name}" class="avatar-img">`;
    } else {
      const initials = card.initials || getInitials(card.name);
      avatarHtml = `<div class="avatar-initials">${initials}</div>`;
    }

    // Quick Actions Bar HTML
    const cleanPhone = (card.phone || '').replace(/[^\d+]/g, '');
    const quickActions = [
      card.phone ? `
        <a href="tel:${cleanPhone}" class="quick-action-btn" title="拨打电话">
          <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </a>` : '',
      card.phone ? `
        <a href="sms:${cleanPhone}" class="quick-action-btn" title="发送短信">
          <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
        </a>` : '',
      card.email ? `
        <a href="mailto:${card.email}" class="quick-action-btn" title="发送邮件">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </a>` : '',
      (card.address_map_url || card.address) ? `
        <a href="${card.address_map_url || `https://maps.google.com/?q=${encodeURIComponent(card.address)}`}" target="_blank" rel="noopener" class="quick-action-btn" title="导航位置">
          <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </a>` : ''
    ].filter(Boolean).join('\n');

    // Detail Items HTML
    const detailItems = [
      card.phone ? `
        <a href="tel:${cleanPhone}" class="detail-item">
          <div class="detail-icon">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          </div>
          <div class="detail-content">
            <div class="detail-label">${card.phone_label || 'Mobile'}</div>
            <div class="detail-value">${card.phone}</div>
          </div>
        </a>` : '',
      card.email ? `
        <a href="mailto:${card.email}" class="detail-item">
          <div class="detail-icon">
            <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          </div>
          <div class="detail-content">
            <div class="detail-label">Email</div>
            <div class="detail-value">${card.email}</div>
          </div>
        </a>` : '',
      card.website ? `
        <a href="${card.website}" target="_blank" rel="noopener" class="detail-item">
          <div class="detail-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <div class="detail-content">
            <div class="detail-label">Website</div>
            <div class="detail-value">${card.website.replace(/^https?:\/\//, '')}</div>
          </div>
        </a>` : '',
      card.address ? `
        <a href="${card.address_map_url || `https://maps.google.com/?q=${encodeURIComponent(card.address)}`}" target="_blank" rel="noopener" class="detail-item">
          <div class="detail-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <div class="detail-content">
            <div class="detail-label">Address</div>
            <div class="detail-value">${card.address}</div>
          </div>
        </a>` : ''
    ].filter(Boolean).join('\n');

    // Replace in template
    let html = cardTemplate
      .replace(/{{SLUG}}/g, slug)
      .replace(/{{NAME}}/g, card.name || '')
      .replace(/{{TITLE}}/g, card.title || '')
      .replace(/{{COMPANY}}/g, card.company || 'Advanced Innovative Technology Corp.')
      .replace(/{{AVATAR_HTML}}/g, avatarHtml)
      .replace(/{{QUICK_ACTIONS_HTML}}/g, quickActions)
      .replace(/{{DETAILS_HTML}}/g, detailItems)
      .replace(/{{CARD_JSON}}/g, JSON.stringify(card));

    fs.writeFileSync(path.join(cardDir, 'index.html'), html, 'utf-8');

    // Generate Print-ready High-Resolution QR Code (Pure B&W SVG & PNG without logo)
    const targetUrl = `${BASE_URL}/c/${slug}/`;
    const qrSvgPath = path.join(DIST_DIR, 'qrcodes', `${slug}.svg`);
    const qrPngPath = path.join(DIST_DIR, 'qrcodes', `${slug}.png`);

    const svgString = await QRCode.toString(targetUrl, {
      type: 'svg',
      errorCorrectionLevel: 'Q',
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
    fs.writeFileSync(qrSvgPath, svgString, 'utf-8');

    await QRCode.toFile(qrPngPath, targetUrl, {
      width: 1024,
      errorCorrectionLevel: 'Q',
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    cardsSummary.push({
      slug,
      name: card.name,
      title: card.title,
      url: `./c/${slug}/`,
      qrSvg: `./qrcodes/${slug}.svg`,
      qrPng: `./qrcodes/${slug}.png`
    });

    console.log(`✅ Built card [${slug}] -> ${card.name} (${targetUrl})`);
  }

  // Build Portal Overview Page
  const gridHtml = cardsSummary.map(c => `
    <div class="card-item">
      <span class="badge">编号: ${c.slug}</span>
      <h3 class="name">${c.name}</h3>
      <p class="title">${c.title}</p>
      <div class="qr-preview">
        <img src="${c.qrSvg}" alt="${c.name} 印刷二维码">
      </div>
      <div class="links">
        <a href="${c.url}" target="_blank" class="btn btn-view">预览网页</a>
        <a href="${c.qrPng}" download="${c.slug}-${c.name}-qr.png" class="btn btn-download">下载印刷码</a>
      </div>
    </div>
  `).join('\n');

  const portalHtml = portalTemplate
    .replace('{{TOTAL_COUNT}}', cardsSummary.length)
    .replace('{{CARDS_GRID_HTML}}', gridHtml);

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), portalHtml, 'utf-8');
  console.log(`🎉 Build complete! Generated ${cardsSummary.length} cards in ${DIST_DIR}`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
