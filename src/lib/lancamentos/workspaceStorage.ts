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
  const database = await openDatabase();
  const transaction = database.transaction(DATA_STORE, "readwrite");
  transaction.objectStore(DATA_STORE).put({ id, value, updatedAt: new Date().toISOString() });
  await complete(transaction);
  database.close();
}

export async function loadWorkspaceData<T>(id: string) {
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
