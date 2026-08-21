import { supabase } from "@/integrations/supabase/client";

const DATABASE_NAME = "ws-lancamentos";
const DATABASE_VERSION = 1;
const FILE_STORE = "files";
const DATA_STORE = "data";

interface StoredFile {
  id: string;
  scope: string;
  file: File;
  createdAt: string;
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

export async function saveWorkspaceFiles(scope: string, files: File[]) {
  const context = parseScope(scope);
  try {
    for (const file of files) {
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
      const storagePath = `${encodeURIComponent(scope)}/${file.lastModified}-${file.size}-${safeName}`;
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
      id: `${scope}:${file.name}:${file.size}:${file.lastModified}`,
      scope,
      file,
      createdAt: new Date().toISOString(),
    };
    store.put(record);
  });
  await complete(transaction);
  database.close();
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

export async function saveWorkspaceData<T>(id: string, value: T) {
  const context = parseScope(id);
  try {
    const { error } = await (supabase as any).from("accounting_workspace_data").upsert({ scope: id, company_key: context.company, competence: context.competence, module: context.module, payload: value }, { onConflict: "scope" });
    if (error) throw error;
  } catch (error) { console.error("Falha ao salvar dados contábeis no Supabase; mantendo cópia local.", error); }
  const database = await openDatabase();
  const transaction = database.transaction(DATA_STORE, "readwrite");
  transaction.objectStore(DATA_STORE).put({ id, value, updatedAt: new Date().toISOString() });
  await complete(transaction);
  database.close();
}

export async function loadWorkspaceData<T>(id: string) {
  try {
    const { data, error } = await (supabase as any).from("accounting_workspace_data").select("payload").eq("scope", id).maybeSingle();
    if (error) throw error;
    if (data?.payload !== undefined) return data.payload as T;
  } catch (error) { console.error("Falha ao carregar dados contábeis do Supabase; buscando cópia local.", error); }
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
