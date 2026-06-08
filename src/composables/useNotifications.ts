/**
 * Browser notification support for task reminders
 */
import { ref } from 'vue'

const permissionGranted = ref(false)

export function useNotifications() {
  async function requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') {
      permissionGranted.value = true
      return true
    }
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission()
      permissionGranted.value = result === 'granted'
      return permissionGranted.value
    }
    return false
  }

  function notify(title: string, body?: string, tag?: string) {
    if (!permissionGranted.value) return
    try {
      new Notification(title, { body, tag, icon: '/favicon.svg' })
    } catch (e) {
      // Service worker needed for background notifications
    }
  }

  function checkDueTasks(tasks: { id: string; title: string; dueDate: string | null; status: string }[]) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    tasks.forEach(task => {
      if (task.status === 'done' || !task.dueDate) return
      const due = new Date(task.dueDate)
      if (due >= today && due < tomorrow) {
        notify('Task due today', task.title, 'due_' + task.id)
      }
      const overdue = new Date(today)
      overdue.setDate(overdue.getDate() - 1)
      if (due < today && due >= overdue) {
        notify('Task overdue', task.title, 'overdue_' + task.id)
      }
    })
  }

  return { permissionGranted, requestPermission, notify, checkDueTasks }
}
