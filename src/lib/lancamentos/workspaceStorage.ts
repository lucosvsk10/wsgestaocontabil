import { supabase } from "@/integrations/supabase/client";

const DATABASE_NAME = "ws-lancamentos";
const DATABASE_VERSION = 1;
const FILE_STORE = "files";
const DATA_STORE = "data";

export const WRONG_COMPETENCE_IMPORT_EVENT = "ws:wrong-competence-import";

export interface WrongCompetenceImportRequest {
  currentCompetence: string;
  detectedCompetence: string;
  module: string;
  fileNames: string[];
  resolve: (keep: boolean) => void;
}

export class WrongCompetenceImportCancelledError extends Error {
  constructor() {
    super("Importação removida pelo usuário após detectar competência diferente.");
    this.name = "WrongCompetenceImportCancelledError";
  }
}

interface StoredFile {
  id: string;
  scope: string;
  file: File;
  createdAt: string;
}

export interface WorkspaceSaveResult {
  synced: boolean;
  error?: string;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_STORE)) {
        const store = database.createObjectStore(FILE_STORE, { keyPath: "id" });
        store.createIndex("scope", "scope", { unique: false });
      }
      if (!database.objectStoreNames.contains(DATA_STORE)) {
        database.createObjectStore(DATA_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function complete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function safeFileName(file: File) {
  return file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function storagePathFor(scope: string, file: File) {
  return `${encodeURIComponent(scope)}/${file.lastModified}-${file.size}-${safeFileName(file)}`;
}

function localFileId(scope: string, file: File) {
  return `${scope}:${file.name}:${file.size}:${file.lastModified}`;
}

function selectedContext(company: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`ws:lancamentos:last-context:${company}`);
    if (!raw) return null;
    return JSON.parse(raw) as { year?: string; selectedMonth?: string; selectedModule?: string };
  } catch {
    return null;
  }
}

function displayCompetence(value: string | null) {
  const match = /^(20\d{2})-(\d{2})$/.exec(value || "");
  return match ? `${match[2]}/${match[1]}` : value || "";
}

async function confirmDifferentCompetence(context: ReturnType<typeof parseScope>, files: File[]) {
  if (typeof window === "undefined") return true;
  if (!context.competence || !context.module || !["folha", "compras", "faturamento"].includes(context.module)) return true;

  const current = selectedContext(context.company);
  if (!current?.year || !current.selectedMonth || current.selectedModule !== context.module) return true;
  const currentCompetence = `${current.year}-${current.selectedMonth}`;
  if (currentCompetence === context.competence) return true;

  return await new Promise<boolean>((resolve) => {
    const detail: WrongCompetenceImportRequest = {
      currentCompetence: displayCompetence(currentCompetence),
      detectedCompetence: displayCompetence(context.competence),
      module: context.module!,
      fileNames: files.map(file => file.name),
      resolve,
    };
    window.dispatchEvent(new CustomEvent<WrongCompetenceImportRequest>(WRONG_COMPETENCE_IMPORT_EVENT, { detail }));
  });
}

export async function saveWorkspaceFiles(scope: string, files: File[]) {
  const context = parseScope(scope);
  try {
    for (const file of files) {
      const storagePath = storagePathFor(scope, file);
      const { error: uploadError } = await supabase.storage.from("accounting-documents").upload(storagePath, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const { error: metadataError } = await (supabase as any).from("accounting_workspace_documents").upsert({ scope, company_key: context.company, competence: context.competence, module: context.module, original_name: file.name, storage_path: storagePath, mime_type: file.type || null, size_bytes: file.size }, { onConflict: "storage_path" });
      if (metadataError) throw metadataError;
    }
  } catch (error) {
    console.error("Falha ao salvar documentos no Supabase; mantendo cópia local.", error);
  }
  const database = await openDatabase();
  const transaction = database.transaction(FILE_STORE, "readwrite");
  const store = transaction.objectStore(FILE_STORE);
  files.forEach((file) => {
    const record: StoredFile = {
      id: localFileId(scope, file),
      scope,
      file,
      createdAt: new Date().toISOString(),
    };
    store.put(record);
  });
  await complete(transaction);
  database.close();

  const keep = await confirmDifferentCompetence(context, files);
  if (!keep) {
    await removeWorkspaceFiles(scope, files);
    throw new WrongCompetenceImportCancelledError();
  }
}

export async function loadWorkspaceFiles(scope: string) {
  try {
    const { data, error } = await (supabase as any).from("accounting_workspace_documents").select("original_name, storage_path, mime_type").eq("scope", scope).order("created_at");
    if (error) throw error;
    if (data?.length) {
      const downloaded = await Promise.all(data.map(async (record: any) => {
        const { data: blob, error: downloadError } = await supabase.storage.from("accounting-documents").download(record.storage_path);
        if (downloadError) throw downloadError;
        return new File([blob], record.original_name, { type: record.mime_type || blob.type });
      }));
      return downloaded;
    }
  } catch (error) { console.error("Falha ao carregar documentos do Supabase; buscando cópia local.", error); }
  const database = await openDatabase();
  const transaction = database.transaction(FILE_STORE, "readonly");
  const request = transaction.objectStore(FILE_STORE).index("scope").getAll(scope);
  const records = await new Promise<StoredFile[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredFile[]);
    request.onerror = () => reject(request.error);
  });
  await complete(transaction);
  database.close();
  return records.map((record) => record.file);
}

export async function removeWorkspaceFiles(scope: string, files: File[]) {
  if (!files.length) return;
  const storagePaths = files.map(file => storagePathFor(scope, file));
  try {
    await supabase.storage.from("accounting-documents").remove(storagePaths);
    const { error } = await (supabase as any).from("accounting_workspace_documents").delete().in("storage_path", storagePaths);
    if (error) throw error;
  } catch (error) {
    console.error("Falha ao remover os documentos selecionados do Supabase.", error);
  }

  const database = await openDatabase();
  const transaction = database.transaction(FILE_STORE, "readwrite");
  const store = transaction.objectStore(FILE_STORE);
  files.forEach(file => store.delete(localFileId(scope, file)));
  await complete(transaction);
  database.close();
}

export async function clearWorkspaceFiles(scope: string) {
  try {
    const { data, error } = await (supabase as any).from("accounting_workspace_documents").select("storage_path").eq("scope", scope);
    if (error) throw error;
    if (data?.length) await supabase.storage.from("accounting-documents").remove(data.map((record: any) => record.storage_path));
    await (supabase as any).from("accounting_workspace_documents").delete().eq("scope", scope);
  } catch (error) { console.error("Falha ao remover documentos do Supabase.", error); }
  const database = await openDatabase();
  const transaction = database.transaction(FILE_STORE, "readwrite");
  const store = transaction.objectStore(FILE_STORE);
  const request = store.index("scope").openKeyCursor(IDBKeyRange.only(scope));
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    store.delete(cursor.primaryKey);
    cursor.continue();
  };
  await complete(transaction);
  database.close();
}

export async function saveWorkspaceData<T>(id: string, value: T): Promise<WorkspaceSaveResult> {
  const context = parseScope(id);
  let syncError: string | undefined;
  try {
    const { error } = await (supabase as any).from("accounting_workspace_data").upsert({ scope: id, company_key: context.company, competence: context.competence, module: context.module, payload: value }, { onConflict: "scope" });
    if (error) throw error;
  } catch (error) {
    syncError = error instanceof Error ? error.message : "Falha desconhecida ao sincronizar com o Supabase.";
    console.error("Falha ao salvar dados contábeis no Supabase; mantendo cópia local.", error);
  }
  const database = await openDatabase();
  const transaction = database.transaction(DATA_STORE, "readwrite");
  transaction.objectStore(DATA_STORE).put({ id, value, updatedAt: new Date().toISOString() });
  await complete(transaction);
  database.close();
  return { synced: !syncError, error: syncError };
}

export async function loadWorkspaceData<T>(id: string) {
  try {
    const { data, error } = await (supabase as any).from("accounting_workspace_data").select("payload").eq("scope", id).maybeSingle();
    if (error) throw error;
    if (data?.payload !== undefined) return data.payload as T;
  } catch (error) { console.error("Falha ao carregar dados contábeis do Supabase; buscando cópia local.", error); }
  const localValue = await loadLocalWorkspaceData<T>(id);
  if (localValue !== undefined) {
    void saveWorkspaceData(id, localValue);
  }
  return localValue;
}

export async function isWorkspaceDataSynced(id: string) {
  try {
    const { data, error } = await (supabase as any)
      .from("accounting_workspace_data")
      .select("scope")
      .eq("scope", id)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data?.scope);
  } catch (error) {
    console.error("Falha ao verificar sincronização dos dados contábeis.", error);
    return false;
  }
}

export async function loadLocalWorkspaceData<T>(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(DATA_STORE, "readonly");
  const request = transaction.objectStore(DATA_STORE).get(id);
  const record = await new Promise<{ value: T } | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as { value: T } | undefined);
    request.onerror = () => reject(request.error);
  });
  await complete(transaction);
  database.close();
  return record?.value;
}

function parseScope(scope: string) {
  const parts = scope.split(":");
  const yearIndex = parts.findIndex((part) => /^20\d{2}$/.test(part));
  const company = yearIndex > 0 ? parts.slice(0, yearIndex).join(":") : parts[0] || "unknown";
  const year = yearIndex >= 0 ? parts[yearIndex] : "";
  const month = yearIndex >= 0 && /^\d{2}$/.test(parts[yearIndex + 1] || "") ? parts[yearIndex + 1] : "";
  const module = parts.find((part) => ["despesas", "folha", "compras", "faturamento", "balancete", "chart-of-accounts"].includes(part)) || null;
  return { company, competence: year && month ? `${year}-${month}` : year || null, module };
}
