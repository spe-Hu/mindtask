/**
 * Natural language date parser
 * Parses: 今天, 明天, 后天, 下周一, 3天后, 下周, 今晚8点, 明天下午3点, etc.
 * Also English: today, tomorrow, next monday, in 3 days, etc.
 */

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const DAY_NAMES_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

export function formatDate(d: Date): string {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

export function parseNaturalDate(input: string): { date: string | null; remainder: string } {
  const text = input.trim()
  if (!text) return { date: null, remainder: text }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Chinese patterns
  const patterns: [RegExp, (m: RegExpMatchArray) => Date | null][] = [
    [/今天|today/i, () => today],
    [/明天|tomorrow/i, () => { const d = new Date(today); d.setDate(d.getDate() + 1); return d }],
    [/后天/i, () => { const d = new Date(today); d.setDate(d.getDate() + 2); return d }],
    [/大后天/i, () => { const d = new Date(today); d.setDate(d.getDate() + 3); return d }],
    [/昨天|yesterday/i, () => { const d = new Date(today); d.setDate(d.getDate() - 1); return d }],
    [/下周|next\s*week/i, () => { const d = new Date(today); d.setDate(d.getDate() + 7); return d }],
    [/下个月|next\s*month/i, () => { const d = new Date(today); d.setMonth(d.getMonth() + 1); return d }],
    [/(\d+)\s*天[后内]|in\s*(\d+)\s*days?/i, (m) => {
      const days = parseInt(m[1] || m[2])
      const d = new Date(today); d.setDate(d.getDate() + days); return d
    }],
    [/(\d+)\s*周[后内]|in\s*(\d+)\s*weeks?/i, (m) => {
      const weeks = parseInt(m[1] || m[2])
      const d = new Date(today); d.setDate(d.getDate() + weeks * 7); return d
    }],
    [/(\d+)\s*(?:个)?月[后内]|in\s*(\d+)\s*months?/i, (m) => {
      const months = parseInt(m[1] || m[2])
      const d = new Date(today); d.setMonth(d.getMonth() + months); return d
    }],
  ]

  // Day of week patterns
  for (let i = 0; i < 7; i++) {
    const cnDay = DAY_NAMES[i]
    const enDay = DAY_NAMES_EN[i]
    patterns.push([
      new RegExp('下' + cnDay + '|next\\s*' + enDay, 'i'),
      () => {
        const d = new Date(today)
        const diff = (i - d.getDay() + 7) % 7
        d.setDate(d.getDate() + (diff === 0 ? 7 : diff))
        return d
      }
    ])
    patterns.push([
      new RegExp('这' + cnDay + '|this\\s*' + enDay, 'i'),
      () => {
        const d = new Date(today)
        const diff = (i - d.getDay() + 7) % 7
        d.setDate(d.getDate() + diff)
        return d
      }
    ])
  }

  // YYYY-MM-DD pattern
  patterns.push([
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    (m) => {
      const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
      return isNaN(d.getTime()) ? null : d
    }
  ])

  // MM/DD or MM-DD pattern (current year)
  patterns.push([
    /(?<!\d)(\d{1,2})[\/\-](\d{1,2})(?!\d)/,
    (m) => {
      const month = parseInt(m[1])
      const day = parseInt(m[2])
      if (month < 1 || month > 12 || day < 1 || day > 31) return null
      const d = new Date(now.getFullYear(), month - 1, day)
      if (d < today) d.setFullYear(d.getFullYear() + 1)
      return d
    }
  ])

  for (const [regex, handler] of patterns) {
    const match = text.match(regex)
    if (match) {
      const date = handler(match)
      if (date) {
        const remainder = text.replace(match[0], '').trim()
        return { date: formatDate(date), remainder }
      }
    }
  }

  return { date: null, remainder: text }
}

/** Parse priority from natural language */
export function parsePriority(input: string): { priority: string | null; remainder: string } {
  const text = input.trim()
  const patterns: [RegExp, string][] = [
    [/[!！]{3,}|(?:^|\s)p1(?:\s|$)|(?<!#)urgent(?:\s|$)|紧急|最紧急/i, 'urgent'],
    [/[!！]{2}|(?:^|\s)p2(?:\s|$)|(?<!#)high(?:\s|$)|高优先|(?<!#)高|重要/i, 'high'],
    [/[!！]|(?:^|\s)p3(?:\s|$)|(?<!#)medium(?:\s|$)|中优先|(?<!#)中/i, 'medium'],
    [/(?:^|\s)p4(?:\s|$)|(?<!#)low(?:\s|$)|低优先|(?<!#)低/i, 'low'],
  ]
  for (const [regex, priority] of patterns) {
    if (regex.test(text)) {
      return { priority, remainder: text.replace(regex, '').trim() }
    }
  }
  return { priority: null, remainder: text }
}

/** Parse tags from #tag pattern */
export function parseTags(input: string): { tags: string[]; remainder: string } {
  const tags: string[] = []
  const remainder = input.replace(/#([\w\u4e00-\u9fa5]+)/g, (_, tag) => {
    tags.push(tag)
    return ''
  }).trim()
  return { tags, remainder }
}

/** Full natural language task parser: title + date + priority + tags */
export function parseQuickAdd(input: string): {
  title: string
  dueDate: string | null
  priority: string | null
  tags: string[]
} {
  let text = input.trim()

  const dateResult = parseNaturalDate(text)
  if (dateResult.date) text = dateResult.remainder

  const priorityResult = parsePriority(text)
  if (priorityResult.priority) text = priorityResult.remainder

  const tagsResult = parseTags(text)
  if (tagsResult.tags.length) text = tagsResult.remainder

  return {
    title: text.trim() || input.trim(),
    dueDate: dateResult.date,
    priority: priorityResult.priority,
    tags: tagsResult.tags,
  }
}

/** Date helper functions */
export function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
}

export function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)
  return d >= today && d < weekEnd
}

export function isOverdue(dateStr: string): boolean {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm'
  if (minutes > 0) return minutes + 'm'
  return seconds + 's'
}
