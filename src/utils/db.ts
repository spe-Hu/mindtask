/**
 * IndexedDB persistence layer
 * Stores: mindmaps, tasks, projects, comments, activities, time-entries, sections, board-columns, tags
 */

const DB_NAME = 'todo-pm'
const DB_VERSION = 3

export const STORE_MINDMAP = 'mindmaps'
export const STORE_TASKS = 'tasks'
export const STORE_PROJECTS = 'projects'
export const STORE_COMMENTS = 'comments'
export const STORE_ACTIVITIES = 'activities'
export const STORE_TIME_ENTRIES = 'timeEntries'
export const STORE_SECTIONS = 'sections'
export const STORE_BOARD_COLUMNS = 'boardColumns'
export const STORE_TAGS = 'tags'

const ALL_STORES = [
  STORE_MINDMAP,
  STORE_TASKS,
  STORE_PROJECTS,
  STORE_COMMENTS,
  STORE_ACTIVITIES,
  STORE_TIME_ENTRIES,
  STORE_SECTIONS,
  STORE_BOARD_COLUMNS,
  STORE_TAGS,
]

let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      ALL_STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' })
        }
      })
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onerror = () => reject(request.error)
  })
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly') {
  const db = await openDB()
  const tx = db.transaction(storeName, mode)
  return tx.objectStore(storeName)
}

export async function dbPut(storeName: string, data: Record<string, unknown>): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  const plain = JSON.parse(JSON.stringify(data))
  return new Promise((resolve, reject) => {
    const req = store.put(plain)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const store = await getStore(storeName)
  return new Promise((resolve, reject) => {
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName)
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

export async function dbDelete(storeName: string, key: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function dbClear(storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function dbDeleteMany(storeName: string, keys: string[]): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const tx = store.transaction
    keys.forEach(key => store.delete(key))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function dbQuery<T>(
  storeName: string,
  filterFn: (item: T) => boolean
): Promise<T[]> {
  const all = await dbGetAll<T>(storeName)
  return all.filter(filterFn)
}
