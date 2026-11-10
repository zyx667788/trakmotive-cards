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

    // Quick Actions Bar HTML (Red Box 1: Call, Email, Location)
    const cleanPhone = (card.phone || '').replace(/[^\d+]/g, '');
    const quickActions = [
      card.phone ? `
        <a href="tel:${cleanPhone}" class="quick-action-btn" title="拨打电话">
          <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </a>` : '',
      card.email ? `
        <a href="mailto:${card.email}" class="quick-action-btn" title="发送邮件">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </a>` : '',
      (card.address_map_url || card.address) ? `
        <a href="${card.address_map_url || `https://cn.bing.com/maps?q=${encodeURIComponent(card.address)}`}" target="_blank" rel="noopener" class="quick-action-btn map-link" title="导航位置">
          <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </a>` : ''
    ].filter(Boolean).join('\n');

    // Social Links HTML (Red Box 2: YouTube, Facebook, LinkedIn, Instagram)
    const socials = card.socials || {};
    const socialButtons = [
      socials.youtube ? `
        <a href="${socials.youtube}" target="_blank" rel="noopener" class="social-link-btn youtube" title="YouTube">
          <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </a>` : '',
      socials.facebook ? `
        <a href="${socials.facebook}" target="_blank" rel="noopener" class="social-link-btn facebook" title="Facebook">
          <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </a>` : '',
      socials.linkedin ? `
        <a href="${socials.linkedin}" target="_blank" rel="noopener" class="social-link-btn linkedin" title="LinkedIn">
          <svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        </a>` : '',
      socials.instagram ? `
        <a href="${socials.instagram}" target="_blank" rel="noopener" class="social-link-btn instagram" title="Instagram">
          <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>` : ''
    ].filter(Boolean);

    const socialsHtml = socialButtons.length > 0 ? `
      <section class="social-links-bar" aria-label="社交媒体">
        ${socialButtons.join('\n')}
      </section>` : '';

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
        <a href="${card.address_map_url || `https://cn.bing.com/maps?q=${encodeURIComponent(card.address)}`}" target="_blank" rel="noopener" class="detail-item map-link">
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
      .replace(/{{SOCIALS_HTML}}/g, socialsHtml)
      .replace(/{{CARD_JSON}}/g, JSON.stringify(card));

    fs.writeFileSync(path.join(cardDir, 'index.html'), html, 'utf-8');

    // Generate static contact.vcf file
    const names = (card.name || '').trim().split(/\s+/);
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';
    const vcardContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${card.name || ''}`,
      `ORG:${card.company || 'Advanced Innovative Technology Corp.'}`,
      `TITLE:${card.title || ''}`,
      card.phone ? `TEL;TYPE=CELL,VOICE:${card.phone}` : '',
      card.email ? `EMAIL;TYPE=WORK,INTERNET:${card.email}` : '',
      card.website ? `URL:${card.website}` : '',
      card.address ? `ADR;TYPE=WORK:;;${card.address};;;;` : '',
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    fs.writeFileSync(path.join(cardDir, 'contact.vcf'), vcardContent, 'utf-8');

    // Generate vCard QR Code (for WeChat native long-press save)
    const vcardQrSvg = await QRCode.toString(vcardContent, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
    fs.writeFileSync(path.join(cardDir, 'vcard-qr.svg'), vcardQrSvg, 'utf-8');

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
