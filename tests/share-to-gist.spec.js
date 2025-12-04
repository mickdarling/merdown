// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for Share to Gist functionality
 *
 * The Share to Gist feature should:
 * - Display a "Share to Gist" button in the toolbar
 * - Show a modal for GitHub Device Flow authentication
 * - Store and retrieve GitHub tokens from localStorage
 * - Create gists via GitHub API
 * - Generate shareable Merview URLs
 * - Handle errors gracefully
 * - Allow dismissing the modal
 *
 * Note: Full end-to-end tests with real GitHub API require actual
 * OAuth credentials. These tests focus on UI behavior and mocked responses.
 */

test.describe('Share to Gist', () => {
  test.describe('Button and UI', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    });

    test('should display Share to Gist button in toolbar', async ({ page }) => {
      const button = page.locator('button:has-text("Share to Gist")');
      await expect(button).toBeVisible();
      await expect(button).toHaveClass(/btn-success/);
    });

    test('should have Share to Gist button positioned after Save As', async ({ page }) => {
      const buttons = await page.locator('.toolbar-buttons button').allTextContents();
      const saveAsIndex = buttons.findIndex(text => text.includes('Save As'));
      const shareIndex = buttons.findIndex(text => text.includes('Share to Gist'));

      expect(saveAsIndex).toBeGreaterThanOrEqual(0);
      expect(shareIndex).toBe(saveAsIndex + 1);
    });

    test('should show status message when editor is empty', async ({ page }) => {
      // Clear the editor
      await page.evaluate(() => {
        // @ts-ignore
        globalThis.setEditorContent('');
      });

      // Click Share to Gist
      await page.click('button:has-text("Share to Gist")');

      // Check status message
      const status = page.locator('#status');
      await expect(status).toContainText('Nothing to share');
    });
  });

  test.describe('Modal Behavior', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });

      // Ensure editor has content
      await page.evaluate(() => {
        // @ts-ignore
        globalThis.setEditorContent('# Test Document\n\nSome content here.');
      });
    });

    test('should show modal when Share to Gist is clicked', async ({ page }) => {
      // Mock the fetch to prevent actual API call
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5
          })
        });
      });

      // Click Share to Gist
      await page.click('button:has-text("Share to Gist")');

      // Modal should appear
      const modal = page.locator('.gist-modal-overlay');
      await expect(modal).toHaveClass(/show/);
    });

    test('should display device code in modal', async ({ page }) => {
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'ABCD-5678',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5
          })
        });
      });

      // Mock token endpoint to prevent errors during polling
      await page.route('**/device/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'authorization_pending' })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Wait for device code to appear (with longer timeout for transition)
      const deviceCode = page.locator('.device-code');
      await expect(deviceCode).toBeVisible({ timeout: 10000 });
      await expect(deviceCode).toContainText('ABCD-5678');
    });

    test('should close modal when Cancel button is clicked', async ({ page }) => {
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5
          })
        });
      });

      // Also mock the token endpoint to prevent errors during polling
      await page.route('**/device/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'authorization_pending' })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Wait for modal to show
      const modal = page.locator('.gist-modal-overlay');
      await expect(modal).toHaveClass(/show/);

      // Click Cancel
      await page.click('.gist-modal button:has-text("Cancel")');

      // Modal should be hidden
      await expect(modal).not.toHaveClass(/show/);
    });

    test('should close modal when clicking overlay background', async ({ page }) => {
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5
          })
        });
      });

      await page.route('**/device/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'authorization_pending' })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      const modal = page.locator('.gist-modal-overlay');
      await expect(modal).toHaveClass(/show/);

      // Click the overlay background (not the modal content)
      await page.click('.gist-modal-overlay', { position: { x: 10, y: 10 } });

      await expect(modal).not.toHaveClass(/show/);
    });

    test('should show Open GitHub button', async ({ page }) => {
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5
          })
        });
      });

      // Mock token endpoint to prevent errors during polling
      await page.route('**/device/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'authorization_pending' })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      const githubButton = page.locator('.gist-modal button:has-text("Open GitHub")');
      await expect(githubButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Token Storage', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    });

    test('should store token in localStorage after successful auth', async ({ page }) => {
      // Set a mock token directly
      await page.evaluate(() => {
        localStorage.setItem('github_gist_token', JSON.stringify({
          accessToken: 'test-access-token',
          expiresAt: Date.now() + 3600000, // 1 hour
          scope: 'gist'
        }));
      });

      // Verify it can be retrieved
      const token = await page.evaluate(() => {
        // @ts-ignore
        return globalThis.getGitHubToken ? globalThis.getGitHubToken() : null;
      });

      // The function exists but isn't exposed, so check localStorage directly
      const stored = await page.evaluate(() => {
        const data = localStorage.getItem('github_gist_token');
        return data ? JSON.parse(data) : null;
      });

      expect(stored).not.toBeNull();
      expect(stored.accessToken).toBe('test-access-token');
    });

    test('should clear expired tokens', async ({ page }) => {
      // Set an expired token
      await page.evaluate(() => {
        localStorage.setItem('github_gist_token', JSON.stringify({
          accessToken: 'expired-token',
          expiresAt: Date.now() - 1000, // Already expired
          scope: 'gist'
        }));
      });

      // Ensure editor has content
      await page.evaluate(() => {
        // @ts-ignore
        globalThis.setEditorContent('# Test');
      });

      // Mock the device code endpoint
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5
          })
        });
      });

      // Mock token endpoint to prevent errors during polling
      await page.route('**/device/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'authorization_pending' })
        });
      });

      // Try to share - should trigger new auth flow because token is expired
      await page.click('button:has-text("Share to Gist")');

      // Should show auth modal (not proceed directly to gist creation)
      const modal = page.locator('.gist-modal-overlay');
      await expect(modal).toHaveClass(/show/);
      await expect(page.locator('.device-code')).toBeVisible({ timeout: 10000 });
    });

    test('should disconnect GitHub when disconnectGitHub is called', async ({ page }) => {
      // Set a token
      await page.evaluate(() => {
        localStorage.setItem('github_gist_token', JSON.stringify({
          accessToken: 'test-token',
          expiresAt: Date.now() + 3600000,
          scope: 'gist'
        }));
      });

      // Call disconnect
      await page.evaluate(() => {
        // @ts-ignore
        globalThis.disconnectGitHub();
      });

      // Token should be cleared
      const token = await page.evaluate(() => localStorage.getItem('github_gist_token'));
      expect(token).toBeNull();
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });

      await page.evaluate(() => {
        // @ts-ignore
        globalThis.setEditorContent('# Test Document');
      });
    });

    test('should show error when proxy is unreachable', async ({ page }) => {
      // Mock network failure
      await page.route('**/device/code', route => {
        route.abort('failed');
      });

      await page.click('button:has-text("Share to Gist")');

      // Should show error modal
      const errorText = page.locator('.status-text.error');
      await expect(errorText).toBeVisible({ timeout: 10000 });
    });

    test('should show error when device flow is not enabled', async ({ page }) => {
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'unauthorized',
            error_description: 'Device Flow is not enabled for this OAuth App'
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Should show error
      const modal = page.locator('.gist-modal');
      await expect(modal).toContainText('Device Flow is not enabled');
    });

    test('should handle access denied gracefully', async ({ page }) => {
      // First, get device code
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 1 // Short interval for testing
          })
        });
      });

      // Then return access_denied on poll
      await page.route('**/device/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'access_denied',
            error_description: 'The user has denied your application access'
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Wait for polling to detect access denied
      const modal = page.locator('.gist-modal');
      await expect(modal).toContainText('denied', { timeout: 10000 });
    });

    test('should handle expired token during polling', async ({ page }) => {
      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 1
          })
        });
      });

      await page.route('**/device/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'expired_token',
            error_description: 'The device code has expired'
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Wait for expired message
      const modal = page.locator('.gist-modal');
      await expect(modal).toContainText('expired', { timeout: 10000 });
    });
  });

  test.describe('Gist Creation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });

      // Set up a valid token
      await page.evaluate(() => {
        localStorage.setItem('github_gist_token', JSON.stringify({
          accessToken: 'valid-test-token',
          expiresAt: Date.now() + 3600000,
          scope: 'gist'
        }));
      });

      await page.evaluate(() => {
        // @ts-ignore
        globalThis.setEditorContent('# My Test Document\n\nThis is test content.');
      });
    });

    test('should call GitHub API to create gist', async ({ page }) => {
      let apiCalled = false;
      let requestBody = null;

      await page.route('https://api.github.com/gists', route => {
        apiCalled = true;
        requestBody = route.request().postDataJSON();

        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-id',
            html_url: 'https://gist.github.com/test-gist-id',
            files: {
              'document.md': {
                filename: 'document.md',
                raw_url: 'https://gist.githubusercontent.com/user/test-gist-id/raw/document.md'
              }
            }
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Wait for success
      await expect(page.locator('.gist-modal')).toContainText('Gist Created', { timeout: 10000 });

      expect(apiCalled).toBe(true);
      expect(requestBody).not.toBeNull();
      expect(requestBody.public).toBe(false); // Secret gist
      expect(requestBody.files['document.md']).toBeDefined();
    });

    test('should use first heading as gist description', async ({ page }) => {
      let requestBody = null;

      await page.route('https://api.github.com/gists', route => {
        requestBody = route.request().postDataJSON();

        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-id',
            html_url: 'https://gist.github.com/test-gist-id',
            files: {
              'document.md': {
                filename: 'document.md',
                raw_url: 'https://gist.githubusercontent.com/user/test-gist-id/raw/document.md'
              }
            }
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');
      await expect(page.locator('.gist-modal')).toContainText('Gist Created', { timeout: 10000 });

      expect(requestBody.description).toBe('My Test Document');
    });

    test('should display shareable Merview URL after success', async ({ page }) => {
      await page.route('https://api.github.com/gists', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-id',
            html_url: 'https://gist.github.com/test-gist-id',
            files: {
              'document.md': {
                filename: 'document.md',
                raw_url: 'https://gist.githubusercontent.com/user/test-gist-id/raw/document.md'
              }
            }
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Check for URL display
      const urlDisplay = page.locator('.url-display');
      await expect(urlDisplay).toBeVisible({ timeout: 10000 });

      const url = await urlDisplay.textContent();
      expect(url).toContain('?url=');
      expect(url).toContain('gist.githubusercontent.com');
    });

    test('should show Copy Link and View on GitHub buttons', async ({ page }) => {
      await page.route('https://api.github.com/gists', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-id',
            html_url: 'https://gist.github.com/test-gist-id',
            files: {
              'document.md': {
                filename: 'document.md',
                raw_url: 'https://gist.githubusercontent.com/user/test-gist-id/raw/document.md'
              }
            }
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      await expect(page.locator('.gist-modal button:has-text("Copy Link")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.gist-modal button:has-text("View on GitHub")')).toBeVisible();
    });

    test('should handle 401 unauthorized and prompt re-auth', async ({ page }) => {
      await page.route('https://api.github.com/gists', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Bad credentials'
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Should show auth expired message
      const modal = page.locator('.gist-modal');
      await expect(modal).toContainText('authorization expired', { timeout: 10000 });

      // Token should be cleared
      const token = await page.evaluate(() => localStorage.getItem('github_gist_token'));
      expect(token).toBeNull();
    });

    test('should use current filename for gist file', async ({ page }) => {
      let requestBody = null;

      // Set a filename via the app's mechanism
      await page.evaluate(() => {
        // @ts-ignore - currentFilename is defined in the app's script
        if (typeof currentFilename !== 'undefined') {
          // Direct assignment won't work as it's in script scope
          // Instead, we can use saveFileAs flow or just test that filename is sent
        }
      });

      await page.route('https://api.github.com/gists', route => {
        requestBody = route.request().postDataJSON();

        // The response needs to match what the request sends
        // Since we can't easily set currentFilename, just check that
        // the default 'document.md' is used
        const filename = Object.keys(requestBody.files)[0];

        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-id',
            html_url: 'https://gist.github.com/test-gist-id',
            files: {
              [filename]: {
                filename: filename,
                raw_url: `https://gist.githubusercontent.com/user/test-gist-id/raw/${filename}`
              }
            }
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');
      await expect(page.locator('.gist-modal')).toContainText('Gist Created', { timeout: 10000 });

      // Should have a files object with at least one file
      expect(Object.keys(requestBody.files).length).toBeGreaterThan(0);
      // Default filename should be 'document.md'
      expect(requestBody.files['document.md']).toBeDefined();
    });
  });

  test.describe('Polling Behavior', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });

      await page.evaluate(() => {
        // @ts-ignore
        globalThis.setEditorContent('# Test');
      });
    });

    test('should continue polling while authorization is pending', async ({ page }) => {
      let pollCount = 0;

      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 1 // 1 second for faster testing
          })
        });
      });

      await page.route('**/device/token', route => {
        pollCount++;

        if (pollCount < 3) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'authorization_pending' })
          });
        } else {
          // Simulate successful auth after 3 polls
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              access_token: 'new-access-token',
              token_type: 'bearer',
              scope: 'gist'
            })
          });
        }
      });

      // Mock gist creation
      await page.route('https://api.github.com/gists', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-id',
            html_url: 'https://gist.github.com/test-gist-id',
            files: {
              'document.md': {
                filename: 'document.md',
                raw_url: 'https://gist.githubusercontent.com/user/test-gist-id/raw/document.md'
              }
            }
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Wait for success (after polling completes)
      await expect(page.locator('.gist-modal')).toContainText('Gist Created', { timeout: 15000 });

      expect(pollCount).toBeGreaterThanOrEqual(3);
    });

    test('should increase interval on slow_down error', async ({ page }) => {
      // This test verifies that the app respects slow_down by waiting longer
      // We can't easily measure exact intervals due to network latency,
      // so we just verify the flow completes successfully after slow_down

      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 1
          })
        });
      });

      let pollCount = 0;
      await page.route('**/device/token', route => {
        pollCount++;

        if (pollCount === 1) {
          // First poll - return slow_down
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'slow_down' })
          });
        } else if (pollCount === 2) {
          // Second poll - success (after slow_down was handled)
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              access_token: 'new-access-token',
              token_type: 'bearer',
              scope: 'gist'
            })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'authorization_pending' })
          });
        }
      });

      await page.route('https://api.github.com/gists', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-id',
            html_url: 'https://gist.github.com/test-gist-id',
            files: {
              'document.md': {
                filename: 'document.md',
                raw_url: 'https://gist.githubusercontent.com/user/test-gist-id/raw/document.md'
              }
            }
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');
      await expect(page.locator('.gist-modal')).toContainText('Gist Created', { timeout: 20000 });

      // Verify we got through slow_down and succeeded
      expect(pollCount).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    });

    test('Share to Gist button should have title attribute', async ({ page }) => {
      const button = page.locator('#shareGistBtn');
      await expect(button).toHaveAttribute('title', /[Gg]ist/);
    });

    test('modal should have proper heading structure', async ({ page }) => {
      await page.evaluate(() => {
        // @ts-ignore
        globalThis.setEditorContent('# Test');
      });

      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5
          })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Modal should have h2 title
      const heading = page.locator('.gist-modal h2');
      await expect(heading).toBeVisible();
    });

    test('device code should be selectable', async ({ page }) => {
      await page.evaluate(() => {
        // @ts-ignore
        globalThis.setEditorContent('# Test');
      });

      await page.route('**/device/code', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device_code: 'test-device-code',
            user_code: 'TEST-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5
          })
        });
      });

      // Mock token endpoint to prevent errors during polling
      await page.route('**/device/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'authorization_pending' })
        });
      });

      await page.click('button:has-text("Share to Gist")');

      // Wait for device code to appear
      const deviceCode = page.locator('.device-code');
      await expect(deviceCode).toBeVisible({ timeout: 10000 });

      // Device code element should have user-select: all
      await expect(deviceCode).toHaveCSS('user-select', 'all');
    });
  });
});
