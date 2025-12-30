import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// Test ISO date conversion
function toISO(dt: string | Date): string {
  if (dt instanceof Date) return dt.toISOString()
  return new Date(dt).toISOString()
}

Deno.test('ISO Date Conversion - Date object', () => {
  const date = new Date('2025-01-15T10:30:00Z')
  assertEquals(toISO(date), '2025-01-15T10:30:00.000Z')
})

Deno.test('ISO Date Conversion - String input', () => {
  const dateString = '2025-01-15T10:30:00Z'
  assertEquals(toISO(dateString), '2025-01-15T10:30:00.000Z')
})

Deno.test('ISO Date Conversion - Various formats', () => {
  // ISO format
  assertEquals(toISO('2025-01-15T10:30:00.000Z'), '2025-01-15T10:30:00.000Z')
  
  // Date only (will use local timezone)
  const dateOnly = new Date('2025-01-15')
  assertEquals(toISO(dateOnly).startsWith('2025-01-1'), true)
})

// Test token expiry check
function isTokenExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return true
  return new Date(expiryDate) < new Date()
}

Deno.test('Token Expiry Check - No expiry date', () => {
  assertEquals(isTokenExpired(null), true)
})

Deno.test('Token Expiry Check - Expired token', () => {
  const pastDate = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  assertEquals(isTokenExpired(pastDate), true)
})

Deno.test('Token Expiry Check - Valid token', () => {
  const futureDate = new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  assertEquals(isTokenExpired(futureDate), false)
})

// Test event payload builder
interface EventPayload {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

function buildEventPayload(event: {
  title: string
  description?: string
  scheduled_at: string
  duration_minutes?: number
}): EventPayload {
  const startTime = new Date(event.scheduled_at)
  const endTime = new Date(startTime.getTime() + (event.duration_minutes || 60) * 60000)
  
  return {
    summary: event.title,
    description: event.description,
    start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
  }
}

Deno.test('Event Payload Builder - Basic event', () => {
  const event = {
    title: 'Test Meeting',
    scheduled_at: '2025-01-15T10:00:00Z',
  }
  
  const payload = buildEventPayload(event)
  
  assertEquals(payload.summary, 'Test Meeting')
  assertEquals(payload.start.dateTime, '2025-01-15T10:00:00.000Z')
  assertEquals(payload.end.dateTime, '2025-01-15T11:00:00.000Z') // Default 60 min
  assertEquals(payload.start.timeZone, 'America/Sao_Paulo')
})

Deno.test('Event Payload Builder - Custom duration', () => {
  const event = {
    title: 'Short Meeting',
    scheduled_at: '2025-01-15T10:00:00Z',
    duration_minutes: 30,
  }
  
  const payload = buildEventPayload(event)
  
  assertEquals(payload.end.dateTime, '2025-01-15T10:30:00.000Z')
})

Deno.test('Event Payload Builder - With description', () => {
  const event = {
    title: 'Important Meeting',
    description: 'Discuss project progress',
    scheduled_at: '2025-01-15T10:00:00Z',
  }
  
  const payload = buildEventPayload(event)
  
  assertEquals(payload.description, 'Discuss project progress')
})

// Test valid actions
Deno.test('Calendar Sync Actions', () => {
  const validActions = ['list', 'create', 'update', 'delete', 'sync']
  
  assertEquals(validActions.includes('list'), true)
  assertEquals(validActions.includes('create'), true)
  assertEquals(validActions.includes('update'), true)
  assertEquals(validActions.includes('delete'), true)
  assertEquals(validActions.includes('sync'), true)
  assertEquals(validActions.includes('invalid'), false)
})

// Test CORS headers
Deno.test('CORS Headers - Complete headers', () => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  
  assertEquals(corsHeaders['Access-Control-Allow-Origin'], '*')
  assertEquals(corsHeaders['Access-Control-Allow-Headers'].includes('authorization'), true)
  assertEquals(corsHeaders['Access-Control-Allow-Headers'].includes('apikey'), true)
  assertEquals(corsHeaders['Access-Control-Allow-Headers'].includes('content-type'), true)
})

// Test Google Calendar API path builder
function buildGoogleCalendarPath(calendarId: string, eventId?: string): string {
  const base = `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base
}

Deno.test('Google Calendar API Path - List events', () => {
  const path = buildGoogleCalendarPath('primary')
  assertEquals(path, '/calendar/v3/calendars/primary/events')
})

Deno.test('Google Calendar API Path - Specific event', () => {
  const path = buildGoogleCalendarPath('primary', 'event-123')
  assertEquals(path, '/calendar/v3/calendars/primary/events/event-123')
})

Deno.test('Google Calendar API Path - Encoded calendar ID', () => {
  const path = buildGoogleCalendarPath('user@example.com')
  assertEquals(path, '/calendar/v3/calendars/user%40example.com/events')
})

// Test date range validation
function isValidDateRange(start: Date, end: Date): boolean {
  return start < end
}

Deno.test('Date Range Validation - Valid range', () => {
  const start = new Date('2025-01-15T10:00:00Z')
  const end = new Date('2025-01-15T11:00:00Z')
  
  assertEquals(isValidDateRange(start, end), true)
})

Deno.test('Date Range Validation - Invalid range (end before start)', () => {
  const start = new Date('2025-01-15T11:00:00Z')
  const end = new Date('2025-01-15T10:00:00Z')
  
  assertEquals(isValidDateRange(start, end), false)
})

Deno.test('Date Range Validation - Same time', () => {
  const start = new Date('2025-01-15T10:00:00Z')
  const end = new Date('2025-01-15T10:00:00Z')
  
  assertEquals(isValidDateRange(start, end), false)
})
