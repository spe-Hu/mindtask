/**
 * IndexedDB 持久化层
 * 用于存储思维导图数据和任务数据，确保刷新后数据不丢失
 */

const DB_NAME = 'todo-pm'
const DB_VERSION = 1

/** 思维导图数据存储 */
const STORE_MINDMAP = 'mindmaps'
/** 任务数据存储 */
const STORE_TASKS = 'tasks'

let dbInstance: IDBDatabase | null = null

/** 打开/创建数据库 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_MINDMAP)) {
        db.createObjectStore(STORE_MINDMAP, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        db.createObjectStore(STORE_TASKS, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onerror = () => reject(request.error)
  })
}

/** 通用：获取事务中的 store */
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly') {
  const db = await openDB()
  const tx = db.transaction(storeName, mode)
  return tx.objectStore(storeName)
}

/** 保存一条记录（put = 有则更新，无则新增） */
export async function dbPut(storeName: string, data: Record<string, unknown>): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  // 深拷贝以剥离 Vue 响应式 Proxy，避免 IndexedDB DataCloneError
  const plain = JSON.parse(JSON.stringify(data))
  return new Promise((resolve, reject) => {
    const req = store.put(plain)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** 根据 key 获取一条记录 */
export async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const store = await getStore(storeName)
  return new Promise((resolve, reject) => {
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

/** 获取某个 store 的全部记录 */
export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName)
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

/** 删除一条记录 */
export async function dbDelete(storeName: string, key: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** 清空某个 store */
export async function dbClear(storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export { STORE_MINDMAP, STORE_TASKS }
