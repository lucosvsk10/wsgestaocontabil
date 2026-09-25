const REGISTER_SECTIONS = new Set([
  'Clientes',
  'Fornecedores',
  'Produtos',
  'Serviços',
  'Transportadoras',
]);

type RegisterDraft = {
  form: Record<string, unknown>;
  imageRemoved: boolean;
  savedAt: string;
};

const scoped = (value: string) => encodeURIComponent(value);

function storage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function registerDraftKey(userId: string, organizationId: string, section: string) {
  return `ws:saas-register-draft:${scoped(userId)}:${scoped(organizationId)}:${scoped(section)}`;
}

function activeKey(userId: string, organizationId: string) {
  return `ws:saas-register-active:${scoped(userId)}:${scoped(organizationId)}`;
}

export function readRegisterDraft(
  userId: string,
  organizationId: string,
  section: string,
): RegisterDraft | null {
  try {
    const store = storage();
    if (!store) return null;
    const raw = store.getItem(registerDraftKey(userId, organizationId, section));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegisterDraft>;
    if (!parsed?.form || typeof parsed.form !== 'object' || Array.isArray(parsed.form)) return null;
    return {
      form: parsed.form as Record<string, unknown>,
      imageRemoved: parsed.imageRemoved === true,
      savedAt:
        typeof parsed.savedAt === 'string' && Number.isFinite(Date.parse(parsed.savedAt))
          ? parsed.savedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeRegisterDraft(
  userId: string,
  organizationId: string,
  section: string,
  form: Record<string, unknown>,
  imageRemoved = false,
) {
  const store = storage();
  if (!store || !userId || !organizationId || !REGISTER_SECTIONS.has(section)) return;

  const serializableForm = { ...form };
  delete serializableForm.__imageUrl;

  const draft: RegisterDraft = {
    form: serializableForm,
    imageRemoved,
    savedAt: new Date().toISOString(),
  };

  try {
    store.setItem(registerDraftKey(userId, organizationId, section), JSON.stringify(draft));
    store.setItem(activeKey(userId, organizationId), section);
  } catch {
    // Registration editing must keep working even if browser storage is unavailable/full.
  }
}

export function clearRegisterDraft(userId: string, organizationId: string, section: string) {
  const store = storage();
  if (!store || !userId || !organizationId) return;
  try {
    store.removeItem(registerDraftKey(userId, organizationId, section));
    if (store.getItem(activeKey(userId, organizationId)) === section) {
      store.removeItem(activeKey(userId, organizationId));
    }
  } catch {
    // Best effort only.
  }
}

export function readRegisterActiveSection(userId: string, organizationId: string) {
  const store = storage();
  if (!store || !userId || !organizationId) return null;
  try {
    const section = store.getItem(activeKey(userId, organizationId));
    return section && REGISTER_SECTIONS.has(section) ? section : null;
  } catch {
    return null;
  }
}
