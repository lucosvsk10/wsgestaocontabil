(() => {
  const applyHomeFixes = async () => {
    const root = document.querySelector('.home-preview');
    if (!root) return;

    const title = root.querySelector('.preview-hero-title');
    if (title) {
      [title, ...title.querySelectorAll('span,strong')].forEach((el) => {
        el.style.setProperty('font-family', "'Poppins','Inter','Helvetica Neue',Arial,sans-serif", 'important');
        el.style.setProperty('font-weight', '400', 'important');
        el.style.setProperty('font-synthesis', 'none', 'important');
      });
    }

    const portrait = root.querySelector('.preview-founder-image');
    if (portrait && portrait.dataset.wsFounderResolved !== '1') {
      try {
        const response = await fetch('/assets/ws-contador-home-clean.svg', { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const svg = await response.text();
        const match = svg.match(/data:image\/webp;base64,[^"']+/);
        if (!match) throw new Error('Embedded WebP not found');
        portrait.src = match[0];
        portrait.dataset.wsFounderResolved = '1';
      } catch (error) {
        console.error('WS founder portrait load failed', error);
      }
    }
  };

  const start = () => {
    applyHomeFixes();
    const observer = new MutationObserver(() => applyHomeFixes());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
