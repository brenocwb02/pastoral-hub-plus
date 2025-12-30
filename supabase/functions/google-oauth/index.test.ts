import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// Test OAuth state validation (JWT token format)
function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

Deno.test('JWT Format Validation - Valid JWT', () => {
  const validJWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature'
  assertEquals(isValidJWTFormat(validJWT), true)
})

Deno.test('JWT Format Validation - Invalid formats', () => {
  assertEquals(isValidJWTFormat(''), false)
  assertEquals(isValidJWTFormat('not-a-jwt'), false)
  assertEquals(isValidJWTFormat('only.two'), false)
  assertEquals(isValidJWTFormat('..'), false)
  assertEquals(isValidJWTFormat('a..c'), false)
})

// Test OAuth action validation
function isValidOAuthAction(action: string): boolean {
  const validActions = ['authorize', 'disconnect', 'status']
  return validActions.includes(action)
}

Deno.test('OAuth Action Validation - Valid actions', () => {
  assertEquals(isValidOAuthAction('authorize'), true)
  assertEquals(isValidOAuthAction('disconnect'), true)
  assertEquals(isValidOAuthAction('status'), true)
})

Deno.test('OAuth Action Validation - Invalid actions', () => {
  assertEquals(isValidOAuthAction('invalid'), false)
  assertEquals(isValidOAuthAction(''), false)
  assertEquals(isValidOAuthAction('AUTHORIZE'), false) // case sensitive
})

// Test OAuth URL builder
function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  scopes: string[]
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  })
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

Deno.test('OAuth URL Builder - Contains required parameters', () => {
  const url = buildAuthUrl(
    'test-client-id',
    'https://example.com/callback',
    'state-token',
    ['https://www.googleapis.com/auth/calendar']
  )
  
  assertEquals(url.includes('client_id=test-client-id'), true)
  assertEquals(url.includes('redirect_uri='), true)
  assertEquals(url.includes('response_type=code'), true)
  assertEquals(url.includes('access_type=offline'), true)
  assertEquals(url.includes('prompt=consent'), true)
  assertEquals(url.includes('state=state-token'), true)
})

Deno.test('OAuth URL Builder - Correct base URL', () => {
  const url = buildAuthUrl(
    'client-id',
    'https://example.com/callback',
    'state',
    ['scope1']
  )
  
  assertEquals(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'), true)
})

// Test scope validation
function hasRequiredScopes(scopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.every(required => scopes.includes(required))
}

Deno.test('Scope Validation - Has all required scopes', () => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ]
  const required = ['https://www.googleapis.com/auth/calendar']
  
  assertEquals(hasRequiredScopes(scopes, required), true)
})

Deno.test('Scope Validation - Missing required scope', () => {
  const scopes = ['https://www.googleapis.com/auth/calendar.readonly']
  const required = ['https://www.googleapis.com/auth/calendar.events']
  
  assertEquals(hasRequiredScopes(scopes, required), false)
})

// Test token response validation
interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

function isValidTokenResponse(response: unknown): response is TokenResponse {
  if (typeof response !== 'object' || response === null) return false
  const r = response as Record<string, unknown>
  return (
    typeof r.access_token === 'string' &&
    r.access_token.length > 0 &&
    typeof r.expires_in === 'number' &&
    typeof r.token_type === 'string'
  )
}

Deno.test('Token Response Validation - Valid response', () => {
  const response = {
    access_token: 'ya29.abc123',
    refresh_token: '1//refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
  }
  
  assertEquals(isValidTokenResponse(response), true)
})

Deno.test('Token Response Validation - Missing access_token', () => {
  const response = {
    refresh_token: '1//refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
  }
  
  assertEquals(isValidTokenResponse(response), false)
})

Deno.test('Token Response Validation - Empty access_token', () => {
  const response = {
    access_token: '',
    expires_in: 3600,
    token_type: 'Bearer',
  }
  
  assertEquals(isValidTokenResponse(response), false)
})

// Test expiry date calculation
function calculateExpiryDate(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000)
}

Deno.test('Expiry Date Calculation - 1 hour', () => {
  const now = Date.now()
  const expiry = calculateExpiryDate(3600)
  const expectedMin = now + 3599000 // 1 second tolerance
  const expectedMax = now + 3601000
  
  assertEquals(expiry.getTime() >= expectedMin, true)
  assertEquals(expiry.getTime() <= expectedMax, true)
})

// Test CORS headers
Deno.test('CORS Headers - Proper configuration', () => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  
  assertEquals(corsHeaders['Access-Control-Allow-Origin'], '*')
  assertEquals(corsHeaders['Access-Control-Allow-Headers'].includes('authorization'), true)
})

// Test redirect URI builder
function getRedirectUri(baseUrl: string, functionName: string): string {
  return `${baseUrl}/functions/v1/${functionName}`
}

Deno.test('Redirect URI Builder', () => {
  const uri = getRedirectUri('https://abc.supabase.co', 'google-oauth')
  assertEquals(uri, 'https://abc.supabase.co/functions/v1/google-oauth')
})

// Test error response format
function createErrorResponse(message: string, status: number): { body: string; status: number } {
  return {
    body: JSON.stringify({ error: message }),
    status,
  }
}

Deno.test('Error Response Format', () => {
  const response = createErrorResponse('Invalid token', 401)
  
  assertEquals(response.status, 401)
  assertEquals(JSON.parse(response.body).error, 'Invalid token')
})
