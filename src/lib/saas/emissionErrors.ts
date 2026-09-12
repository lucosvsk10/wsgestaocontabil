/** Extract actionable fiscal rejections without showing raw XML or HTML responses. */
export function fiscalErrorMessage(body: unknown, fallback = 'Não foi possível concluir a emissão.') {
  const messages = new Set<string>();
  const visit = (value: unknown, depth = 0) => {
    if (!value || depth > 5) return;
    if (typeof value === 'string') {
      if (!/[<>]/.test(value)) messages.add(value.slice(0, 500));
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 20).forEach(item => visit(item, depth + 1));
      return;
    }
    if (typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    for (const key of ['error', 'message', 'Descricao', 'descricao', 'xMotivo', 'errors', 'erros', 'response', 'protocol']) {
      visit(record[key], depth + 1);
    }
  };
  visit(body);
  return [...messages].join(' · ') || fallback;
}

export async function readFiscalError(error: unknown, issuing: boolean) {
  const e = error as { context?: Response; message?: string; name?: string };
  if (e?.context && typeof e.context.clone === 'function') {
    try {
      return fiscalErrorMessage(await e.context.clone().json());
    } catch { /* The server may return an empty body or an HTML gateway response. */ }
  }
  if (/Functions(Fetch|Relay)Error/.test(e?.name || '') || /fetch|network|timeout/i.test(e?.message || '')) {
    return issuing
      ? 'A conexão foi interrompida. Confira o histórico antes de transmitir novamente: o documento pode ter sido recebido. Seu rascunho foi mantido.'
      : 'Não foi possível conectar para gerar a prévia. Tente novamente; seu rascunho foi mantido.';
  }
  return fiscalErrorMessage(e?.message);
}

