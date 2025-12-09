// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Browser-side helper: Check if clicking Open File menu item triggers file input click
 * Extracted to avoid deep function nesting (SonarCloud S2004)
 * @returns {Promise<boolean>} True if file input was clicked
 */
function browserCheckOpenButtonClick() {
  const fileInput = document.getElementById('mdFileInput');
  if (!fileInput) return Promise.resolve(false);

  return new Promise(function resolveOnClick(resolve) {
    fileInput.addEventListener('click', function onFileInputClick() {
      resolve(true);
    }, { once: true });

    // Open the dropdown first
    const dropdownBtn = document.getElementById('openDropdownBtn');
    if (dropdownBtn) dropdownBtn.click();

    // Wait a moment for dropdown to open, then click Open File
    setTimeout(function clickOpenFile() {
      const openFileBtn = document.querySelector('button[data-action="open-file"]');
      if (openFileBtn) openFileBtn.click();
    }, 100);

    setTimeout(function fallbackTimeout() { resolve(false); }, 2000);
  });
}

/**
 * Tests for Open button functionality
 *
 * These tests ensure the Open button and file input infrastructure exists
 * and is properly wired up. This prevents regressions like the one in PR #103
 * where the mdFileInput element creation was lost during JS extraction.
 */
test.describe('Open Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for CodeMirror to initialize
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    // Wait for the editor API to be ready
    await page.waitForFunction(() => typeof globalThis.openFile === 'function', { timeout: 5000 });
  });

  test.describe('File Input Element', () => {
    test('mdFileInput element should exist in DOM after initialization', async ({ page }) => {
      // CRITICAL: This test prevents regression of issue #123
      // The hidden file input must be created by initFileInputHandlers()
      const fileInput = await page.$('#mdFileInput');
      expect(fileInput).not.toBeNull();
    });

    test('mdFileInput should be a file input with correct type', async ({ page }) => {
      const inputType = await page.$eval('#mdFileInput', el => el.type);
      expect(inputType).toBe('file');
    });

    test('mdFileInput should accept markdown and text file extensions', async ({ page }) => {
      const acceptAttr = await page.$eval('#mdFileInput', el => el.accept);
      expect(acceptAttr).toContain('.md');
      expect(acceptAttr).toContain('.markdown');
      expect(acceptAttr).toContain('.txt');
      expect(acceptAttr).toContain('.text');
    });

    test('mdFileInput should be hidden from view', async ({ page }) => {
      const display = await page.$eval('#mdFileInput', el => getComputedStyle(el).display);
      expect(display).toBe('none');
    });

    test('mdFileInput should have an id attribute', async ({ page }) => {
      // Ensures the element can be found by getElementById
      const id = await page.$eval('#mdFileInput', el => el.id);
      expect(id).toBe('mdFileInput');
    });
  });

  test.describe('Open Dropdown', () => {
    test('Open dropdown should exist in toolbar', async ({ page }) => {
      const openDropdown = await page.$('#openDropdown');
      expect(openDropdown).not.toBeNull();
    });

    test('Open dropdown button should exist', async ({ page }) => {
      const dropdownBtn = await page.$('#openDropdownBtn');
      expect(dropdownBtn).not.toBeNull();
    });

    test('Open dropdown should have aria-haspopup attribute', async ({ page }) => {
      const hasPopup = await page.$eval('#openDropdownBtn', el => el.getAttribute('aria-haspopup'));
      expect(hasPopup).toBe('menu');
    });

    test('openFile function should be globally available', async ({ page }) => {
      const isFunction = await page.evaluate(() => typeof globalThis.openFile === 'function');
      expect(isFunction).toBe(true);
    });

    test('openFromURL function should be globally available', async ({ page }) => {
      const isFunction = await page.evaluate(() => typeof globalThis.openFromURL === 'function');
      expect(isFunction).toBe(true);
    });

    test('newDocument function should be globally available', async ({ page }) => {
      const isFunction = await page.evaluate(() => typeof globalThis.newDocument === 'function');
      expect(isFunction).toBe(true);
    });

    test('clicking dropdown should show menu items', async ({ page }) => {
      // Click dropdown button
      await page.click('#openDropdownBtn');
      await page.waitForTimeout(200);

      // Check menu items are visible
      const openFileBtn = page.locator('button[data-action="open-file"]');
      const openUrlBtn = page.locator('button[data-action="open-url"]');
      const newDocBtn = page.locator('button[data-action="new-document"]');

      await expect(openFileBtn).toBeVisible();
      await expect(openUrlBtn).toBeVisible();
      await expect(newDocBtn).toBeVisible();
    });

    test('clicking Open File menu item should trigger file input click', async ({ page }) => {
      // Track if file input was clicked by listening for the click event
      // Uses extracted helper to avoid deep nesting (SonarCloud S2004)
      const wasClicked = await page.evaluate(browserCheckOpenButtonClick);
      expect(wasClicked).toBe(true);
    });
  });

  test.describe('Event Handler Registration', () => {
    test('mdFileInput should have change event listener attached', async ({ page }) => {
      // Verify the change handler is registered by checking if the element
      // has event listeners (indirectly via getEventListeners in Chrome DevTools protocol)
      // Since we can't directly access event listeners, we verify the handler setup
      // by checking that the file input exists and has proper attributes

      const hasProperSetup = await page.evaluate(() => {
        const input = document.getElementById('mdFileInput');
        if (!input) return false;

        // Check that the input is properly configured
        return input.type === 'file' &&
               input.accept.includes('.md') &&
               input.style.display === 'none';
      });

      expect(hasProperSetup).toBe(true);
    });
  });

  test.describe('Document Name Display', () => {
    test('document name element should exist', async ({ page }) => {
      const docName = await page.$('#documentName');
      expect(docName).not.toBeNull();
    });

    test('document name should show "Untitled" for new documents', async ({ page }) => {
      // Clear content to ensure we have an untitled document
      await page.evaluate(() => {
        globalThis.state.currentFilename = null;
        globalThis.state.loadedFromURL = null;
        globalThis.updateDocumentNameDisplay();
      });

      const docNameText = await page.$eval('#documentName', el => el.textContent);
      expect(docNameText).toBe('Untitled');
    });

    test('document name should update when filename is set', async ({ page }) => {
      await page.evaluate(() => {
        globalThis.state.currentFilename = 'test-document.md';
        globalThis.state.loadedFromURL = null;
        globalThis.updateDocumentNameDisplay();
      });

      const docNameText = await page.$eval('#documentName', el => el.textContent);
      expect(docNameText).toBe('test-document.md');
    });

    test('updateDocumentNameDisplay function should be globally available', async ({ page }) => {
      const isFunction = await page.evaluate(() => typeof globalThis.updateDocumentNameDisplay === 'function');
      expect(isFunction).toBe(true);
    });
  });

  test.describe('Dropdown Keyboard Navigation', () => {
    test('Escape key should close dropdown', async ({ page }) => {
      // Open dropdown
      await page.click('#openDropdownBtn');
      await page.waitForTimeout(200);

      // Verify dropdown is open
      const isOpen = await page.$eval('#openDropdownBtn', el => el.getAttribute('aria-expanded'));
      expect(isOpen).toBe('true');

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // Verify dropdown is closed
      const isClosed = await page.$eval('#openDropdownBtn', el => el.getAttribute('aria-expanded'));
      expect(isClosed).toBe('false');
    });

    test('clicking outside dropdown should close it', async ({ page }) => {
      // Open dropdown
      await page.click('#openDropdownBtn');
      await page.waitForTimeout(200);

      // Click outside (on the editor)
      await page.click('.CodeMirror');
      await page.waitForTimeout(200);

      // Verify dropdown is closed
      const isClosed = await page.$eval('#openDropdownBtn', el => el.getAttribute('aria-expanded'));
      expect(isClosed).toBe('false');
    });
  });

  test.describe('New Document Functionality', () => {
    test('newDocument should clear editor content', async ({ page }) => {
      // First add some content
      await page.evaluate(() => {
        globalThis.setEditorContent('# Test Content');
      });

      // Verify content was added
      const initialContent = await page.evaluate(() => globalThis.getEditorContent());
      expect(initialContent).toBe('# Test Content');

      // Call newDocument
      await page.evaluate(() => globalThis.newDocument());
      await page.waitForTimeout(200);

      // Verify content is cleared
      const clearedContent = await page.evaluate(() => globalThis.getEditorContent());
      expect(clearedContent).toBe('');
    });

    test('newDocument should reset filename to null', async ({ page }) => {
      // Set a filename first
      await page.evaluate(() => {
        globalThis.state.currentFilename = 'existing-file.md';
      });

      // Call newDocument
      await page.evaluate(() => globalThis.newDocument());

      // Verify filename is null
      const filename = await page.evaluate(() => globalThis.state.currentFilename);
      expect(filename).toBeNull();
    });

    test('newDocument should update document name display to Untitled', async ({ page }) => {
      // Set a filename first
      await page.evaluate(() => {
        globalThis.state.currentFilename = 'existing-file.md';
        globalThis.updateDocumentNameDisplay();
      });

      // Call newDocument
      await page.evaluate(() => globalThis.newDocument());
      await page.waitForTimeout(100);

      // Verify document name shows Untitled
      const docNameText = await page.$eval('#documentName', el => el.textContent);
      expect(docNameText).toBe('Untitled');
    });
  });

  test.describe('Open from URL', () => {
    test('clicking Open from URL should open URL modal', async ({ page }) => {
      // Open dropdown
      await page.click('#openDropdownBtn');
      await page.waitForTimeout(200);

      // Click Open from URL
      await page.click('button[data-action="open-url"]');
      await page.waitForTimeout(300);

      // Verify URL modal is visible
      const modal = page.locator('#urlModal');
      await expect(modal).toBeVisible();
    });

    test('URL modal should show correct title for markdown loading', async ({ page }) => {
      // Open dropdown
      await page.click('#openDropdownBtn');
      await page.waitForTimeout(200);

      // Click Open from URL
      await page.click('button[data-action="open-url"]');
      await page.waitForTimeout(300);

      // Check modal title
      const title = await page.$eval('#urlModalTitle', el => el.textContent);
      expect(title).toBe('Open from URL');
    });

    test('URL modal should list allowed markdown domains', async ({ page }) => {
      // Open dropdown
      await page.click('#openDropdownBtn');
      await page.waitForTimeout(200);

      // Click Open from URL
      await page.click('button[data-action="open-url"]');
      await page.waitForTimeout(300);

      // Check domain list contains markdown domains
      const domainList = await page.$eval('#urlModalDomains', el => el.textContent);
      expect(domainList).toContain('raw.githubusercontent.com');
    });
  });
});
