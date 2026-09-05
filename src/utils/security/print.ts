const PRINT_CSP = "default-src 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; script-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:";

export function openPrintWindow(features: string): Window | null {
  const popup = window.open('', '_blank', features);
  if (popup) popup.opener = null;
  return popup;
}

export function showPrintPlaceholder(popup: Window, message: string): void {
  popup.document.open();
  popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Documento fiscal</title></head><body></body></html>');
  popup.document.close();
  popup.document.body.style.cssText = 'font-family:Arial,sans-serif;padding:24px';
  popup.document.body.textContent = message;
}

export function renderPrintableDocument(popup: Window, html: string, autoPrint = true): void {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv],form').forEach((node) => node.remove());

  parsed.querySelectorAll('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc' || value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  const csp = parsed.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = PRINT_CSP;
  parsed.head.prepend(csp);

  popup.document.open();
  popup.document.write(`<!doctype html>${parsed.documentElement.outerHTML}`);
  popup.document.close();
  if (autoPrint) window.setTimeout(() => { popup.focus(); popup.print(); }, 650);
}
