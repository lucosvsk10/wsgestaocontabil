export const MAX_CERTIFICATE_BYTES = 2 * 1024 * 1024;
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}
export async function readJsonLimited(
  req: Request,
  maxBytes = 32768
): Promise<Record<string, any>> {
  if (Number(req.headers.get('content-length')) > maxBytes)
    throw new RequestError('Arquivo ou solicitação muito grande.', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError('Envie os dados da solicitação.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestError('Arquivo ou solicitação muito grande.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new RequestError('Dados inválidos. Revise o preenchimento.');
  }
}
export function validateCertificateInput(pfx: unknown, password: unknown, name: unknown) {
  if (typeof pfx !== 'string' || typeof password !== 'string' || !pfx || !password)
    throw new RequestError('Selecione o certificado A1 e informe a senha.', 422);
  if (pfx.length > Math.ceil(MAX_CERTIFICATE_BYTES / 3) * 4)
    throw new RequestError('O certificado deve ter no máximo 2 MB.', 413);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(pfx) || pfx.length % 4 !== 0)
    throw new RequestError('Arquivo A1 inválido. Selecione um arquivo .pfx ou .p12.', 422);
  if (password.length > 1024) throw new RequestError('A senha informada é muito longa.', 422);
  if (typeof name !== 'string' || name.length > 200 || !/\.(pfx|p12)$/i.test(name))
    throw new RequestError('Selecione um certificado .pfx ou .p12.', 422);
}
export function safeCsvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function validDateRange(start: string, end: string, maxDays = 366) {
  const valid = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  return (
    valid(start) &&
    valid(end) &&
    start <= end &&
    (Date.parse(end) - Date.parse(start)) / 86400000 < maxDays
  );
}
