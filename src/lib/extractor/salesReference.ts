const ACCESS_KEY = /\d{44}/g;

export type SalesReferenceMethod = 'key' | 'xml' | 'danfe' | 'qr';

export type SalesReferenceCandidate = {
  accessKey: string;
  method: SalesReferenceMethod;
  xml?: string;
};

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

export function accessKeyFromText(value: string) {
  const direct = digits(value);
  if (direct.length === 44) return direct;

  const queryMatch = value.match(/[?&](?:p|chNFe)=([0-9]{44})(?:\||&|$)/i)?.[1];
  if (queryMatch) return queryMatch;

  return value.match(ACCESS_KEY)?.find(candidate => candidate.length === 44) || '';
}

async function accessKeyFromImageSource(source: ImageBitmapSource) {
  const Detector = (window as any).BarcodeDetector;
  if (!Detector || typeof createImageBitmap !== 'function') return '';

  const detector = new Detector({ formats: ['qr_code', 'code_128', 'data_matrix'] });
  const bitmap = await createImageBitmap(source);
  try {
    const detected = await detector.detect(bitmap);
    for (const item of detected || []) {
      const key = accessKeyFromText(String(item?.rawValue || ''));
      if (key) return key;
    }
    return '';
  } finally {
    bitmap.close?.();
  }
}

async function accessKeyFromPdf(file: File) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = Math.min(pdfDocument.numPages, 3);

  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map(item => ('str' in item ? item.str : '')).join(' ');
    const textKey = accessKeyFromText(text);
    if (textKey) return textKey;

    if ((window as any).BarcodeDetector) {
      const viewport = page.getViewport({ scale: 2 });
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const barcodeKey = await accessKeyFromImageSource(canvas);
        if (barcodeKey) return barcodeKey;
      }
    }
  }
  return '';
}

export async function salesReferenceFromFile(file: File): Promise<SalesReferenceCandidate> {
  if (file.size > 10 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 10 MB.');

  const lowerName = file.name.toLowerCase();
  const isXml = file.type.includes('xml') || lowerName.endsWith('.xml');
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type.includes('pdf') || lowerName.endsWith('.pdf');

  if (isImage) {
    const accessKey = await accessKeyFromImageSource(file);
    if (!accessKey) throw new Error('Não consegui ler a chave nesta imagem. Fotografe o QR Code ou o código de barras mais de perto.');
    return { accessKey, method: 'qr' };
  }

  if (isPdf) {
    const accessKey = await accessKeyFromPdf(file);
    if (!accessKey) throw new Error('Não encontrei a chave neste DANFE. Você pode fotografar o QR Code ou colar os 44 dígitos.');
    return { accessKey, method: 'danfe' };
  }

  const text = await file.text();
  const accessKey = accessKeyFromText(text);
  if (!accessKey) {
    throw new Error('Não encontrei a chave de 44 dígitos neste arquivo. Você pode colá-la manualmente.');
  }

  return {
    accessKey,
    method: isXml ? 'xml' : 'danfe',
    ...(isXml ? { xml: text } : {}),
  };
}
