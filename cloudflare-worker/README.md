# Merview GitHub OAuth Proxy

A Cloudflare Worker that proxies GitHub's OAuth Device Flow endpoints, enabling Merview to create GitHub Gists directly from the browser.

## Why This Exists

GitHub's OAuth endpoints don't support CORS, which means browser-based applications can't directly call them. This worker acts as a minimal proxy that:

1. Forwards requests to GitHub's Device Flow endpoints
2. Adds your Client ID (stored securely as a secret)
3. Returns responses with proper CORS headers

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/device/code` | POST | Request a device code for user authorization |
| `/device/token` | POST | Poll for access token (body: `{"device_code": "..."}`) |
| `/health` | GET | Health check - returns configuration status |

## Setup Instructions

### Prerequisites

1. **Cloudflare Account** (free tier works fine)
   - Sign up at [cloudflare.com](https://cloudflare.com)

2. **GitHub OAuth App**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in:
     - **Application name**: `Merview Gist Sharing`
     - **Homepage URL**: `https://merview.com`
     - **Authorization callback URL**: `https://merview.com` (not used for device flow, but required)
   - Click "Register application"
   - **Important**: Enable Device Flow in the app settings
   - Copy the **Client ID** (you'll need this)

3. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

### Deployment Steps

1. **Clone and navigate to the worker directory**
   ```bash
   cd cloudflare-worker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Cloudflare**
   ```bash
   wrangler login
   ```
   This opens a browser to authenticate.

4. **Set the GitHub Client ID secret**
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   ```
   Paste your Client ID when prompted.

5. **Deploy the worker**
   ```bash
   npm run deploy
   ```

6. **Note your worker URL**
   After deployment, you'll see something like:
   ```
   Published merview-github-oauth (1.0.0)
     https://merview-github-oauth.<your-account>.workers.dev
   ```

### Local Development

1. **Copy the example vars file**
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Edit `.dev.vars` with your Client ID**
   ```
   GITHUB_CLIENT_ID=Ov23liYourActualClientId
   ```

3. **Start local development server**
   ```bash
   npm run dev
   ```
   Worker runs at `http://localhost:8787`

### Custom Domain (Optional)

To use a custom domain like `auth.merview.com`:

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Select your worker
3. Go to **Settings** > **Triggers**
4. Add a **Custom Domain**

## Security Notes

- The Client ID is stored as an encrypted Cloudflare secret
- CORS is restricted to allowed origins (configured in `wrangler.toml`)
- No sensitive data (like access tokens) is logged
- Device Flow doesn't require a client secret for public apps

## Updating Allowed Origins

Edit `wrangler.toml` to change allowed origins:

```toml
[vars]
ALLOWED_ORIGINS = "https://merview.com,https://www.merview.com"
```

Then redeploy:
```bash
npm run deploy
```

## Monitoring

View real-time logs:
```bash
npm run tail
```

## Troubleshooting

### "Origin not allowed" error
- Check that your origin is in `ALLOWED_ORIGINS` in `wrangler.toml`
- Redeploy after changing

### "Server not configured" error
- The `GITHUB_CLIENT_ID` secret isn't set
- Run `wrangler secret put GITHUB_CLIENT_ID`

### "Device Flow is not enabled" error from GitHub
- Go to your OAuth App settings on GitHub
- Check the "Enable Device Flow" checkbox

### Health check endpoint
```bash
curl https://your-worker.workers.dev/health
```
Returns:
```json
{"status":"ok","configured":true,"timestamp":"2024-12-04T..."}
```

## License

AGPL-3.0 (same as Merview)
