// TraktMotive Digital Business Card - Frontend Logic

// Generate & Download vCard (RFC 2426 vCard 3.0)
function downloadVCard() {
  const card = window.__CARD_DATA__;
  if (!card) return;

  const names = (card.name || '').trim().split(' ');
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';

  const vcardLines = [
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

  const blob = new Blob([vcardLines], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(card.name || 'contact').replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('正在调起手机通讯录保存...');
}

// Modal Sheet Management
function openExchangeModal() {
  const modal = document.getElementById('exchangeModal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeExchangeModal() {
  const modal = document.getElementById('exchangeModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Toast notification
function showToast(message, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

// Handle Lead Form Submission (Exchange Contacts)
async function submitExchangeForm(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const card = window.__CARD_DATA__ || {};

  const formData = {
    card_slug: card.slug,
    card_owner_name: card.name,
    card_owner_email: card.email,
    visitor_name: form.name.value,
    visitor_phone: form.phone.value,
    visitor_email: form.email.value,
    visitor_company: form.company ? form.company.value : '',
    visitor_notes: form.notes ? form.notes.value : '',
    timestamp: new Date().toISOString()
  };

  submitBtn.disabled = true;
  submitBtn.innerText = '提交中...';

  try {
    const res = await fetch('/api/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      showToast('互换成功！您的信息已发送');
      form.reset();
      setTimeout(closeExchangeModal, 1500);
    } else {
      // Even if serverless endpoint isn't deployed yet, save to localStorage
      saveLeadLocally(formData);
      showToast('信息已提交并已离线保存');
      setTimeout(closeExchangeModal, 1500);
    }
  } catch (err) {
    console.warn('Network submit failed, saving locally:', err);
    saveLeadLocally(formData);
    showToast('信息已提交并已离线保存');
    setTimeout(closeExchangeModal, 1500);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = '发送我的名片';
  }
}

function saveLeadLocally(data) {
  try {
    const list = JSON.parse(localStorage.getItem('saved_leads') || '[]');
    list.push(data);
    localStorage.setItem('saved_leads', JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

// Global click-outside listener
window.addEventListener('click', (e) => {
  const modal = document.getElementById('exchangeModal');
  if (e.target === modal) {
    closeExchangeModal();
  }
});

// Smart Map Link Handler (Adapts for iPhone/iPad vs Android/PC without VPN)
function initMapLinks() {
  const card = window.__CARD_DATA__;
  if (!card || !card.address) return;

  const isIOS = /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent) && !window.MSStream;
  const encodedAddr = encodeURIComponent(card.address);
  
  // On iOS (iPhone/iPad), Apple Maps opens the native Maps App seamlessly in China
  // On Android/Windows/PC, Bing Maps opens the full satellite/street map directly in China
  const smartMapUrl = isIOS 
    ? `https://maps.apple.com/?q=${encodedAddr}`
    : `https://cn.bing.com/maps?q=${encodedAddr}`;

  document.querySelectorAll('.map-link').forEach(el => {
    el.href = smartMapUrl;
    el.target = '_blank';
    el.rel = 'noopener';
  });
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMapLinks);
} else {
  initMapLinks();
}
