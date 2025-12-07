// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');
const {
  waitForPageReady,
  getCodeMirrorContent,
  WAIT_TIMES
} = require('./helpers/test-utils');

/**
 * Tests for Fresh Visit behavior (Issue #137)
 *
 * Fresh visits (new tab/window) should always load the sample document.
 * Same-session refreshes should preserve localStorage content.
 *
 * This uses sessionStorage to detect fresh visits since sessionStorage
 * is cleared when the tab/window is closed.
 */
test.describe('Fresh Visit Behavior', () => {
  /**
   * Helper to clear all storage for a clean test state
   */
  async function clearAllStorage(page) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Helper to set localStorage content without session marker
   */
  async function setLocalStorageContent(page, content) {
    await page.evaluate((text) => {
      localStorage.setItem('markdown-content', text);
    }, content);
  }

  /**
   * Helper to get sessionStorage marker
   */
  async function getSessionMarker(page) {
    return page.evaluate(() => {
      return sessionStorage.getItem('merview-session-initialized');
    });
  }

  /**
   * Helper to check if content contains sample document markers
   */
  function isSampleContent(content) {
    return content && content.includes('Comprehensive Markdown + Mermaid Feature Demo');
  }

  test.describe('Fresh Visit Detection', () => {
    test('fresh visit with no localStorage should load sample document', async ({ page }) => {
      // Clear everything to simulate truly fresh visit
      await page.goto('/');
      await clearAllStorage(page);

      // Reload to trigger fresh visit logic
      await page.reload();
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
      await page.waitForTimeout(WAIT_TIMES.LONG);

      const content = await getCodeMirrorContent(page);
      expect(isSampleContent(content)).toBe(true);
    });

    test('fresh visit with existing localStorage should still load sample document', async ({ page }) => {
      // Set up localStorage content but NO session marker
      await page.goto('/');
      await clearAllStorage(page);
      await setLocalStorageContent(page, '# My Custom Document\n\nThis is cached content.');

      // Reload - should be treated as fresh visit
      await page.reload();
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
      await page.waitForTimeout(WAIT_TIMES.LONG);

      const content = await getCodeMirrorContent(page);
      // Should load sample, NOT the cached localStorage content
      expect(isSampleContent(content)).toBe(true);
      expect(content).not.toContain('My Custom Document');
    });

    test('session marker should be set after initial load', async ({ page }) => {
      await page.goto('/');
      await clearAllStorage(page);

      // Reload for fresh visit
      await page.reload();
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      const marker = await getSessionMarker(page);
      expect(marker).toBe('true');
    });
  });

  test.describe('Same-Session Refresh', () => {
    test('refresh within same session should preserve edited content', async ({ page }) => {
      // Initial fresh visit
      await waitForPageReady(page);
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      // Edit content in the editor
      const customContent = '# My Edited Document\n\nThis content was edited.';
      await page.evaluate((text) => {
        const cmElement = document.querySelector('.CodeMirror');
        const cmEditor = cmElement?.CodeMirror;
        if (cmEditor) {
          cmEditor.setValue(text);
          // Trigger render to save to localStorage
          if (typeof globalThis.renderMarkdown === 'function') {
            globalThis.renderMarkdown();
          }
        }
      }, customContent);
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      // Refresh (same session - session marker still exists)
      await page.reload();
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
      await page.waitForTimeout(WAIT_TIMES.LONG);

      const content = await getCodeMirrorContent(page);
      // Should preserve edited content, NOT load sample
      expect(content).toContain('My Edited Document');
      expect(isSampleContent(content)).toBe(false);
    });

    test('multiple refreshes should continue preserving content', async ({ page }) => {
      await waitForPageReady(page);

      // Set custom content
      const customContent = '# Persistent Content\n\nThis should persist.';
      await page.evaluate((text) => {
        const cmElement = document.querySelector('.CodeMirror');
        const cmEditor = cmElement?.CodeMirror;
        if (cmEditor) {
          cmEditor.setValue(text);
          if (typeof globalThis.renderMarkdown === 'function') {
            globalThis.renderMarkdown();
          }
        }
      }, customContent);
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      // Multiple refreshes
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForSelector('.CodeMirror', { timeout: 15000 });
        await page.waitForTimeout(WAIT_TIMES.MEDIUM);

        const content = await getCodeMirrorContent(page);
        expect(content).toContain('Persistent Content');
      }
    });
  });

  test.describe('URL Parameter Behavior', () => {
    test('URL with ?md= parameter should load inline content and mark session', async ({ page }) => {
      const inlineContent = '# Inline Content';
      const encodedContent = encodeURIComponent(inlineContent);

      await page.goto(`/?md=${encodedContent}`);
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      const content = await getCodeMirrorContent(page);
      expect(content).toContain('Inline Content');

      // Session should be marked
      const marker = await getSessionMarker(page);
      expect(marker).toBe('true');
    });

    test('refresh after URL parameter load should preserve content', async ({ page }) => {
      const inlineContent = '# URL Loaded Content\n\nFrom query parameter.';
      const encodedContent = encodeURIComponent(inlineContent);

      await page.goto(`/?md=${encodedContent}`);
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      // Navigate to base URL (simulates removing the parameter)
      // But within same session, should keep localStorage content
      await page.goto('/');
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      const content = await getCodeMirrorContent(page);
      // Since session is initialized, should load from localStorage
      expect(content).toContain('URL Loaded Content');
    });
  });

  test.describe('Storage Functions', () => {
    test('isFreshVisit should return true when no session marker exists', async ({ page }) => {
      await page.goto('/');
      await clearAllStorage(page);

      const isFresh = await page.evaluate(() => {
        // Direct check since we're testing the storage logic
        return !sessionStorage.getItem('merview-session-initialized');
      });

      expect(isFresh).toBe(true);
    });

    test('isFreshVisit should return false after session is initialized', async ({ page }) => {
      await waitForPageReady(page);
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      const isFresh = await page.evaluate(() => {
        return !sessionStorage.getItem('merview-session-initialized');
      });

      expect(isFresh).toBe(false);
    });

    test('localStorage content should persist across page loads', async ({ page }) => {
      await waitForPageReady(page);

      // Set custom content
      const testContent = '# Test Persistence';
      await page.evaluate((text) => {
        localStorage.setItem('markdown-content', text);
      }, testContent);

      // Reload and check localStorage directly
      await page.reload();
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });

      const storedContent = await page.evaluate(() => {
        return localStorage.getItem('markdown-content');
      });

      expect(storedContent).toContain('Test Persistence');
    });
  });

  test.describe('Edge Cases', () => {
    test('empty localStorage with session marker should load sample', async ({ page }) => {
      await page.goto('/');

      // Set session marker but clear localStorage content
      await page.evaluate(() => {
        sessionStorage.setItem('merview-session-initialized', 'true');
        localStorage.removeItem('markdown-content');
      });

      await page.reload();
      await page.waitForSelector('.CodeMirror', { timeout: 15000 });
      await page.waitForTimeout(WAIT_TIMES.LONG);

      const content = await getCodeMirrorContent(page);
      // Should fall back to sample since no localStorage content exists
      expect(isSampleContent(content)).toBe(true);
    });

    test('Load Sample button should work regardless of session state', async ({ page }) => {
      await waitForPageReady(page);

      // Set custom content
      await page.evaluate(() => {
        const cmElement = document.querySelector('.CodeMirror');
        const cmEditor = cmElement?.CodeMirror;
        if (cmEditor) {
          cmEditor.setValue('# Custom Content');
        }
      });

      // Click Load Sample
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(WAIT_TIMES.MEDIUM);

      const content = await getCodeMirrorContent(page);
      expect(isSampleContent(content)).toBe(true);
    });
  });
});
