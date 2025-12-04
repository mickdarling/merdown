/**
 * Merview GitHub OAuth Device Flow Proxy
 *
 * This Cloudflare Worker proxies GitHub's Device Flow OAuth endpoints
 * to bypass CORS restrictions for browser-based applications.
 *
 * Endpoints:
 *   POST /device/code  - Request a device code for user authorization
 *   POST /device/token - Poll for access token after user authorizes
 *   GET  /health       - Health check endpoint
 *
 * Environment Variables:
 *   GITHUB_CLIENT_ID   - Your GitHub OAuth App's Client ID (secret)
 *   ALLOWED_ORIGINS    - Comma-separated list of allowed origins for CORS
 */

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * Main fetch handler for the Worker
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCORSPreflight(request, env, origin);
    }

    try {
      // Route requests
      switch (url.pathname) {
        case '/device/code':
          return await handleDeviceCode(request, env, origin);

        case '/device/token':
          return await handleTokenPoll(request, env, origin);

        case '/health':
          return handleHealthCheck(env, origin);

        default:
          return createErrorResponse(404, 'Not Found', origin, env);
      }
    } catch (error) {
      console.error('Worker error:', error.message, error.stack);
      return createErrorResponse(500, 'Internal Server Error', origin, env);
    }
  }
};

/**
 * Check if an origin is allowed based on environment configuration
 */
function isOriginAllowed(origin, env) {
  if (!origin) return false;

  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
  return allowedOrigins.includes(origin);
}

/**
 * Get CORS headers for a response
 */
function getCORSHeaders(origin, env) {
  // Only set specific origin if it's in the allowed list
  const allowedOrigin = isOriginAllowed(origin, env) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight (OPTIONS) requests
 */
function handleCORSPreflight(request, env, origin) {
  if (!isOriginAllowed(origin, env)) {
    return new Response('Origin not allowed', { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin, env),
  });
}

/**
 * Create a JSON error response with CORS headers
 */
function createErrorResponse(status, message, origin, env) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(origin, env),
      },
    }
  );
}

/**
 * Create a JSON success response with CORS headers
 */
function createJSONResponse(data, origin, env, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(origin, env),
      },
    }
  );
}

/**
 * Health check endpoint
 */
function handleHealthCheck(env, origin) {
  const hasClientId = !!env.GITHUB_CLIENT_ID;

  return createJSONResponse({
    status: 'ok',
    configured: hasClientId,
    timestamp: new Date().toISOString(),
  }, origin, env);
}

/**
 * Handle device code request
 * POST /device/code
 *
 * Proxies to GitHub's device code endpoint with the configured client_id
 */
async function handleDeviceCode(request, env, origin) {
  // Validate request method
  if (request.method !== 'POST') {
    return createErrorResponse(405, 'Method not allowed. Use POST.', origin, env);
  }

  // Validate origin
  if (!isOriginAllowed(origin, env)) {
    return createErrorResponse(403, 'Origin not allowed', origin, env);
  }

  // Validate configuration
  if (!env.GITHUB_CLIENT_ID) {
    console.error('GITHUB_CLIENT_ID not configured');
    return createErrorResponse(500, 'Server not configured', origin, env);
  }

  // Build request to GitHub
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: 'gist', // Only request gist scope for creating gists
  });

  try {
    const response = await fetch(GITHUB_DEVICE_CODE_URL, {
      method: 'POST',
      body: params,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    // Forward GitHub's response (success or error)
    return createJSONResponse(data, origin, env, response.ok ? 200 : response.status);

  } catch (error) {
    console.error('GitHub device code request failed:', error.message);
    return createErrorResponse(502, 'Failed to contact GitHub', origin, env);
  }
}

/**
 * Handle token polling request
 * POST /device/token
 * Body: { "device_code": "..." }
 *
 * Proxies to GitHub's token endpoint for polling
 */
async function handleTokenPoll(request, env, origin) {
  // Validate request method
  if (request.method !== 'POST') {
    return createErrorResponse(405, 'Method not allowed. Use POST.', origin, env);
  }

  // Validate origin
  if (!isOriginAllowed(origin, env)) {
    return createErrorResponse(403, 'Origin not allowed', origin, env);
  }

  // Validate configuration
  if (!env.GITHUB_CLIENT_ID) {
    console.error('GITHUB_CLIENT_ID not configured');
    return createErrorResponse(500, 'Server not configured', origin, env);
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, 'Invalid JSON body', origin, env);
  }

  // Validate device_code
  if (!body.device_code || typeof body.device_code !== 'string') {
    return createErrorResponse(400, 'device_code is required', origin, env);
  }

  // Basic validation of device_code format (should be a long string)
  if (body.device_code.length < 10 || body.device_code.length > 500) {
    return createErrorResponse(400, 'Invalid device_code format', origin, env);
  }

  // Build request to GitHub
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    device_code: body.device_code,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  });

  try {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      body: params,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    // Forward GitHub's response
    // Note: GitHub returns 200 even for pending/error states
    // The client should check for 'error' field in response
    return createJSONResponse(data, origin, env);

  } catch (error) {
    console.error('GitHub token poll request failed:', error.message);
    return createErrorResponse(502, 'Failed to contact GitHub', origin, env);
  }
}
