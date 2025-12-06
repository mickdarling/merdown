// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');
const {
  waitForPageReady,
  waitForGlobalFunctions,
  isGlobalFunctionAvailable,
  loadSampleContent,
  WAIT_TIMES
} = require('./helpers/test-utils');

/**
 * Browser-side helper: Mock window.print and test exportToPDF()
 * Extracted to avoid deep function nesting (SonarCloud S2004)
 * @returns {Promise<{printCalled: boolean, errorStatus: string | null}>}
 */
function browserTestExportToPDF() {
  return new Promise(function resolveAfterTest(resolve) {
    let printCalled = false;
    let errorStatus = null;

    // Mock window.print
    const originalPrint = globalThis.print;
    globalThis.print = function mockPrint() {
      printCalled = true;
    };

    // Capture status messages
    const statusElement = document.getElementById('status');
    const observer = new MutationObserver(function onStatusChange() {
      const statusText = statusElement.textContent;
      if (statusText && statusText.includes('Error')) {
        errorStatus = statusText;
      }
    });
    observer.observe(statusElement, { childList: true, subtree: true, characterData: true });

    // Call exportToPDF
    globalThis.exportToPDF();

    // Wait for async operations to complete
    setTimeout(function checkResults() {
      observer.disconnect();
      globalThis.print = originalPrint;
      resolve({ printCalled, errorStatus });
    }, 200);
  });
}

/**
 * Browser-side helper: Mock window.open and test exportToPDFDirect()
 * Extracted to avoid deep function nesting (SonarCloud S2004)
 * @returns {Promise<{openCalled: boolean, errorStatus: string | null}>}
 */
function browserTestExportToPDFDirect() {
  return new Promise(function resolveAfterTest(resolve) {
    let openCalled = false;
    let errorStatus = null;

    // Mock window.open
    const originalOpen = globalThis.open;
    globalThis.open = function mockOpen() {
      openCalled = true;
      // Return a mock window object
      return {
        document: {
          open: function() {},
          write: function() {},
          close: function() {}
        },
        onload: null
      };
    };

    // Capture status messages
    const statusElement = document.getElementById('status');
    const observer = new MutationObserver(function onStatusChange() {
      const statusText = statusElement.textContent;
      if (statusText && statusText.includes('Error')) {
        errorStatus = statusText;
      }
    });
    observer.observe(statusElement, { childList: true, subtree: true, characterData: true });

    // Call exportToPDFDirect
    globalThis.exportToPDFDirect();

    // Wait for async operations to complete
    setTimeout(function checkResults() {
      observer.disconnect();
      globalThis.open = originalOpen;
      resolve({ openCalled, errorStatus });
    }, 200);
  });
}

/**
 * Browser-side helper: Test exportToPDF with no content
 * Extracted to avoid deep function nesting (SonarCloud S2004)
 * @returns {Promise<{printCalled: boolean, errorStatus: string | null}>}
 */
function browserTestExportToPDFNoContent() {
  return new Promise(function resolveAfterTest(resolve) {
    let printCalled = false;
    let errorStatus = null;

    // Clear wrapper content
    const wrapper = document.getElementById('wrapper');
    const originalContent = wrapper.innerHTML;
    wrapper.innerHTML = '';

    // Mock window.print
    const originalPrint = globalThis.print;
    globalThis.print = function mockPrint() {
      printCalled = true;
    };

    // Capture status messages
    const statusElement = document.getElementById('status');
    const observer = new MutationObserver(function onStatusChange() {
      const statusText = statusElement.textContent;
      if (statusText && statusText.includes('Error')) {
        errorStatus = statusText;
      }
    });
    observer.observe(statusElement, { childList: true, subtree: true, characterData: true });

    // Call exportToPDF
    globalThis.exportToPDF();

    // Wait for async operations to complete
    setTimeout(function checkResults() {
      observer.disconnect();
      globalThis.print = originalPrint;
      wrapper.innerHTML = originalContent;
      resolve({ printCalled, errorStatus });
    }, 200);
  });
}

/**
 * Browser-side helper: Test exportToPDFDirect with no content
 * Extracted to avoid deep function nesting (SonarCloud S2004)
 * @returns {Promise<{openCalled: boolean, errorStatus: string | null}>}
 */
function browserTestExportToPDFDirectNoContent() {
  return new Promise(function resolveAfterTest(resolve) {
    let openCalled = false;
    let errorStatus = null;

    // Clear wrapper content
    const wrapper = document.getElementById('wrapper');
    const originalContent = wrapper.innerHTML;
    wrapper.innerHTML = '';

    // Mock window.open
    const originalOpen = globalThis.open;
    globalThis.open = function mockOpen() {
      openCalled = true;
      return {
        document: {
          open: function() {},
          write: function() {},
          close: function() {}
        },
        onload: null
      };
    };

    // Capture status messages
    const statusElement = document.getElementById('status');
    const observer = new MutationObserver(function onStatusChange() {
      const statusText = statusElement.textContent;
      if (statusText && statusText.includes('Error')) {
        errorStatus = statusText;
      }
    });
    observer.observe(statusElement, { childList: true, subtree: true, characterData: true });

    // Call exportToPDFDirect
    globalThis.exportToPDFDirect();

    // Wait for async operations to complete
    setTimeout(function checkResults() {
      observer.disconnect();
      globalThis.open = originalOpen;
      wrapper.innerHTML = originalContent;
      resolve({ openCalled, errorStatus });
    }, 200);
  });
}

/**
 * Tests for Export to PDF functionality
 *
 * These tests ensure the PDF export buttons and functions exist and work correctly.
 * Tests cover both exportToPDF() (print dialog) and exportToPDFDirect() (new tab)
 * including proper error handling when no content exists.
 */
test.describe('Export PDF Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageReady(page);
    await waitForGlobalFunctions(page, ['exportToPDF', 'exportToPDFDirect']);
  });

  test.describe('Export Buttons', () => {
    test('Print/PDF button should exist in toolbar', async ({ page }) => {
      const printButton = await page.$('button[onclick="exportToPDF()"]');
      expect(printButton).not.toBeNull();
    });

    test('Print/PDF button should have exportToPDF onclick handler', async ({ page }) => {
      const onclick = await page.$eval('button[onclick="exportToPDF()"]', el => el.getAttribute('onclick'));
      expect(onclick).toBe('exportToPDF()');
    });

    test('Print (New Tab) button should exist in toolbar', async ({ page }) => {
      const printDirectButton = await page.$('button[onclick="exportToPDFDirect()"]');
      expect(printDirectButton).not.toBeNull();
    });

    test('Print (New Tab) button should have exportToPDFDirect onclick handler', async ({ page }) => {
      const onclick = await page.$eval('button[onclick="exportToPDFDirect()"]', el => el.getAttribute('onclick'));
      expect(onclick).toBe('exportToPDFDirect()');
    });
  });

  test.describe('Global Functions', () => {
    test('exportToPDF function should be globally available', async ({ page }) => {
      const isFunction = await isGlobalFunctionAvailable(page, 'exportToPDF');
      expect(isFunction).toBe(true);
    });

    test('exportToPDFDirect function should be globally available', async ({ page }) => {
      const isFunction = await isGlobalFunctionAvailable(page, 'exportToPDFDirect');
      expect(isFunction).toBe(true);
    });
  });

  test.describe('Dependencies', () => {
    test('wrapper element should exist for export content', async ({ page }) => {
      // The #wrapper element is required for export functions to work
      const wrapper = await page.$('#wrapper');
      expect(wrapper).not.toBeNull();
    });

    test('wrapper element should be inside preview container', async ({ page }) => {
      const wrapperExists = await page.evaluate(() => {
        const preview = document.getElementById('preview');
        const wrapper = document.getElementById('wrapper');
        return preview && wrapper && preview.contains(wrapper);
      });
      expect(wrapperExists).toBe(true);
    });

    test('status element should exist for error messages', async ({ page }) => {
      // Export functions use status element to show error messages
      const status = await page.$('#status');
      expect(status).not.toBeNull();
    });
  });

  test.describe('exportToPDF() Behavior', () => {
    test('exportToPDF should trigger window.print when content exists', async ({ page }) => {
      // Load sample content first
      await loadSampleContent(page);

      // Test exportToPDF with mocked window.print
      const result = await page.evaluate(browserTestExportToPDF);

      expect(result.printCalled).toBe(true);
      expect(result.errorStatus).toBeNull();
    });

    test('exportToPDF should show error when no content exists', async ({ page }) => {
      // Test exportToPDF with empty content
      const result = await page.evaluate(browserTestExportToPDFNoContent);

      expect(result.printCalled).toBe(false);
      expect(result.errorStatus).toContain('Error');
      expect(result.errorStatus).toContain('No content');
    });

    test('exportToPDF should validate wrapper content before proceeding', async ({ page }) => {
      // Verify exportToPDF checks for content
      const validatesContent = await page.evaluate(() => {
        const wrapper = document.getElementById('wrapper');
        const originalContent = wrapper.innerHTML;

        // Test with whitespace-only content
        wrapper.innerHTML = '   ';

        let printCalled = false;
        const originalPrint = globalThis.print;
        globalThis.print = function() { printCalled = true; };

        globalThis.exportToPDF();

        globalThis.print = originalPrint;
        wrapper.innerHTML = originalContent;

        // Should not call print with whitespace-only content
        return !printCalled;
      });

      expect(validatesContent).toBe(true);
    });
  });

  test.describe('exportToPDFDirect() Behavior', () => {
    test('exportToPDFDirect should open new window when content exists', async ({ page }) => {
      // Load sample content first
      await loadSampleContent(page);

      // Test exportToPDFDirect with mocked window.open
      const result = await page.evaluate(browserTestExportToPDFDirect);

      expect(result.openCalled).toBe(true);
      expect(result.errorStatus).toBeNull();
    });

    test('exportToPDFDirect should show error when no content exists', async ({ page }) => {
      // Test exportToPDFDirect with empty content
      const result = await page.evaluate(browserTestExportToPDFDirectNoContent);

      expect(result.openCalled).toBe(false);
      expect(result.errorStatus).toContain('Error');
      expect(result.errorStatus).toContain('No content');
    });

    test('exportToPDFDirect should validate wrapper content before proceeding', async ({ page }) => {
      // Verify exportToPDFDirect checks for content
      const validatesContent = await page.evaluate(() => {
        const wrapper = document.getElementById('wrapper');
        const originalContent = wrapper.innerHTML;

        // Test with whitespace-only content
        wrapper.innerHTML = '   ';

        let openCalled = false;
        const originalOpen = globalThis.open;
        globalThis.open = function() {
          openCalled = true;
          return { document: { open: function() {}, write: function() {}, close: function() {} }, onload: null };
        };

        globalThis.exportToPDFDirect();

        globalThis.open = originalOpen;
        wrapper.innerHTML = originalContent;

        // Should not call open with whitespace-only content
        return !openCalled;
      });

      expect(validatesContent).toBe(true);
    });

    test('exportToPDFDirect should access current style and syntax theme elements', async ({ page }) => {
      // Verify exportToPDFDirect attempts to access styling elements
      const accessesStyleElements = await page.evaluate(() => {
        // Load sample to ensure content exists
        globalThis.loadSample();

        // Check if function accesses these elements (they may be null, that's OK)
        // We're verifying the function doesn't crash when accessing them
        try {
          const wrapper = document.getElementById('wrapper');
          if (wrapper && wrapper.innerHTML.trim()) {
            // Mock window.open to prevent actual window opening
            const originalOpen = globalThis.open;
            globalThis.open = function() {
              return {
                document: {
                  open: function() {},
                  write: function() {},
                  close: function() {}
                },
                onload: null
              };
            };

            globalThis.exportToPDFDirect();

            globalThis.open = originalOpen;
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      });

      expect(accessesStyleElements).toBe(true);
    });
  });

  test.describe('Status Messages', () => {
    test('exportToPDF should show status message before opening print dialog', async ({ page }) => {
      // Load content
      await loadSampleContent(page);

      // Capture status messages
      const statusShown = await page.evaluate(() => {
        return new Promise(function resolveAfterStatus(resolve) {
          let statusMessage = null;

          const statusElement = document.getElementById('status');
          const observer = new MutationObserver(function onStatusChange() {
            const text = statusElement.textContent;
            if (text && text.includes('print')) {
              statusMessage = text;
            }
          });
          observer.observe(statusElement, { childList: true, subtree: true, characterData: true });

          // Mock print to prevent actual dialog
          const originalPrint = globalThis.print;
          globalThis.print = function() {};

          globalThis.exportToPDF();

          setTimeout(function checkStatus() {
            observer.disconnect();
            globalThis.print = originalPrint;
            resolve(statusMessage);
          }, 200);
        });
      });

      expect(statusShown).toBeTruthy();
      expect(statusShown.toLowerCase()).toContain('print');
    });

    test('exportToPDFDirect should show status message when generating PDF', async ({ page }) => {
      // Load content
      await loadSampleContent(page);

      // Capture status messages
      const statusShown = await page.evaluate(() => {
        return new Promise(function resolveAfterStatus(resolve) {
          let statusMessage = null;

          const statusElement = document.getElementById('status');
          const observer = new MutationObserver(function onStatusChange() {
            const text = statusElement.textContent;
            if (text && (text.includes('PDF') || text.includes('print'))) {
              statusMessage = text;
            }
          });
          observer.observe(statusElement, { childList: true, subtree: true, characterData: true });

          // Mock open to prevent actual window
          const originalOpen = globalThis.open;
          globalThis.open = function() {
            return {
              document: {
                open: function() {},
                write: function() {},
                close: function() {}
              },
              onload: null
            };
          };

          globalThis.exportToPDFDirect();

          setTimeout(function checkStatus() {
            observer.disconnect();
            globalThis.open = originalOpen;
            resolve(statusMessage);
          }, 200);
        });
      });

      expect(statusShown).toBeTruthy();
    });
  });
});
