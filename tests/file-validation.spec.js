// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for file validation functionality (Issue #12)
 *
 * The isValidMarkdownFile() function should:
 * - Accept valid markdown MIME types: text/plain, text/markdown, text/x-markdown
 * - Accept empty MIME type (some browsers don't set it for .md files)
 * - Accept files with valid extensions: .md, .markdown, .txt, .text
 * - Reject invalid MIME types like text/html, text/css, text/javascript
 */

test.describe('File Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to initialize
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });
  });

  test.describe('MIME Type Validation', () => {
    test('should accept text/plain MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore - isValidMarkdownFile is defined in the app
        return window.isValidMarkdownFile({ type: 'text/plain', name: 'test.md' });
      });
      expect(isValid).toBe(true);
    });

    test('should accept text/markdown MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return window.isValidMarkdownFile({ type: 'text/markdown', name: 'test.md' });
      });
      expect(isValid).toBe(true);
    });

    test('should accept text/x-markdown MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return window.isValidMarkdownFile({ type: 'text/x-markdown', name: 'test.md' });
      });
      expect(isValid).toBe(true);
    });

    test('should accept empty MIME type (browser compatibility)', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return window.isValidMarkdownFile({ type: '', name: 'test.md' });
      });
      expect(isValid).toBe(true);
    });

    test('should reject text/html MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: 'text/html', name: 'test.html' });
      });
      expect(isValid).toBe(false);
    });

    test('should reject text/css MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: 'text/css', name: 'style.css' });
      });
      expect(isValid).toBe(false);
    });

    test('should reject text/javascript MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: 'text/javascript', name: 'script.js' });
      });
      expect(isValid).toBe(false);
    });

    test('should reject application/json MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: 'application/json', name: 'data.json' });
      });
      expect(isValid).toBe(false);
    });
  });

  test.describe('File Extension Validation', () => {
    test('should accept .md extension regardless of MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore - Even with unknown MIME, .md should be accepted
        return !!window.isValidMarkdownFile({ type: 'application/octet-stream', name: 'readme.md' });
      });
      expect(isValid).toBe(true);
    });

    test('should accept .markdown extension', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return window.isValidMarkdownFile({ type: '', name: 'document.markdown' });
      });
      expect(isValid).toBe(true);
    });

    test('should accept .txt extension', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return window.isValidMarkdownFile({ type: '', name: 'notes.txt' });
      });
      expect(isValid).toBe(true);
    });

    test('should accept .text extension', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return window.isValidMarkdownFile({ type: '', name: 'document.text' });
      });
      expect(isValid).toBe(true);
    });

    test('should accept uppercase extensions (.MD)', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return window.isValidMarkdownFile({ type: '', name: 'README.MD' });
      });
      expect(isValid).toBe(true);
    });

    test('should accept mixed case extensions (.Markdown)', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return window.isValidMarkdownFile({ type: '', name: 'Document.Markdown' });
      });
      expect(isValid).toBe(true);
    });

    test('should reject .html extension without valid MIME', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: '', name: 'page.html' });
      });
      expect(isValid).toBe(false);
    });

    test('should reject .js extension', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: '', name: 'script.js' });
      });
      expect(isValid).toBe(false);
    });

    test('should reject .css extension', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: '', name: 'style.css' });
      });
      expect(isValid).toBe(false);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle files with no extension', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore - No extension, but valid MIME type
        return !!window.isValidMarkdownFile({ type: 'text/plain', name: 'README' });
      });
      expect(isValid).toBe(true);
    });

    test('should handle files with multiple dots in name', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: '', name: 'my.document.notes.md' });
      });
      expect(isValid).toBe(true);
    });

    test('should handle filenames with spaces', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: 'text/plain', name: 'my document.md' });
      });
      expect(isValid).toBe(true);
    });

    test('should reject file with .md in middle of name but wrong extension', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: '', name: 'file.md.backup' });
      });
      expect(isValid).toBe(false);
    });
  });

  test.describe('Security - Blocked MIME Types', () => {
    // These tests verify that potentially dangerous file types are blocked

    test('should reject text/xml MIME type', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: 'text/xml', name: 'data.xml' });
      });
      expect(isValid).toBe(false);
    });

    test('should reject image MIME types', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: 'image/png', name: 'image.png' });
      });
      expect(isValid).toBe(false);
    });

    test('should reject application/x-httpd-php', async ({ page }) => {
      const isValid = await page.evaluate(() => {
        // @ts-ignore
        return !!window.isValidMarkdownFile({ type: 'application/x-httpd-php', name: 'script.php' });
      });
      expect(isValid).toBe(false);
    });
  });
});
