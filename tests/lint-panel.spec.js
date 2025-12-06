// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');
const {
  waitForPageReady,
  waitForGlobalFunction,
  waitForElementClass,
  waitForElementClassRemoved,
  elementHasClass,
  isGlobalFunctionAvailable,
  getElementAttribute,
  WAIT_TIMES
} = require('./helpers/test-utils');

/**
 * Browser-side helper: Toggle lint panel and wait for transition
 * Extracted to avoid deep function nesting (SonarCloud S2004)
 * @returns {Promise<boolean>} True if panel has 'show' class after toggle
 */
function browserToggleLintPanel() {
  return new Promise(function resolveAfterToggle(resolve) {
    const lintPanel = document.getElementById('lintPanel');
    if (!lintPanel) {
      resolve(false);
      return;
    }

    // Toggle the panel
    if (typeof globalThis.toggleLintPanel === 'function') {
      globalThis.toggleLintPanel();
    }

    // Wait for CSS transition (300ms as defined in index.html)
    setTimeout(function checkAfterTransition() {
      resolve(lintPanel.classList.contains('show'));
    }, 350);
  });
}

/**
 * Tests for Lint Panel Toggle Functionality
 *
 * These tests ensure the lint panel toggle functionality works correctly,
 * including the panel visibility, toggle button, close button, and state management.
 * The lint panel provides code validation feedback for JSON, HTML, CSS, and JavaScript.
 */
test.describe('Lint Panel Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageReady(page);
    await waitForGlobalFunction(page, 'toggleLintPanel');
  });

  test.describe('DOM Elements', () => {
    test('lintPanel element should exist in DOM after initialization', async ({ page }) => {
      const lintPanel = await page.$('#lintPanel');
      expect(lintPanel).not.toBeNull();
    });

    test('lintToggle button should exist in toolbar', async ({ page }) => {
      const lintToggle = await page.$('#lintToggle');
      expect(lintToggle).not.toBeNull();
    });

    test('lintToggle button should have correct onclick handler', async ({ page }) => {
      const onclick = await getElementAttribute(page, '#lintToggle', 'onclick');
      expect(onclick).toBe('toggleLintPanel()');
    });

    test('lintContent element should exist for displaying lint results', async ({ page }) => {
      const lintContent = await page.$('#lintContent');
      expect(lintContent).not.toBeNull();
    });

    test('lintPanel should have lint-header with close button', async ({ page }) => {
      const lintHeader = await page.$('#lintPanel .lint-header');
      expect(lintHeader).not.toBeNull();

      const closeButton = await page.$('#lintPanel .lint-close');
      expect(closeButton).not.toBeNull();
    });

    test('lint close button should have correct onclick handler', async ({ page }) => {
      const onclick = await getElementAttribute(page, '#lintPanel .lint-close', 'onclick');
      expect(onclick).toBe('toggleLintPanel()');
    });
  });

  test.describe('Global Function Availability', () => {
    test('toggleLintPanel function should be globally available', async ({ page }) => {
      const isFunction = await isGlobalFunctionAvailable(page, 'toggleLintPanel');
      expect(isFunction).toBe(true);
    });
  });

  test.describe('Panel Visibility Toggle', () => {
    test('lint panel should be hidden by default', async ({ page }) => {
      const hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(false);
    });

    test('clicking toggle button should show the lint panel', async ({ page }) => {
      // Initial state: panel should be hidden
      let hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(false);

      // Click the toggle button
      await page.click('#lintToggle');

      // Wait for CSS transition using condition-based wait
      await waitForElementClass(page, '#lintPanel', 'show');

      // Panel should now be visible
      hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(true);
    });

    test('clicking toggle button twice should hide the lint panel again', async ({ page }) => {
      // Show the panel
      await page.click('#lintToggle');
      await waitForElementClass(page, '#lintPanel', 'show');

      let hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(true);

      // Hide the panel
      await page.click('#lintToggle');
      await waitForElementClassRemoved(page, '#lintPanel', 'show');

      hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(false);
    });
  });

  test.describe('Close Button Functionality', () => {
    test('clicking close button (X) should hide the lint panel', async ({ page }) => {
      // Show the panel first
      await page.click('#lintToggle');
      await waitForElementClass(page, '#lintPanel', 'show');

      let hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(true);

      // Click the close button
      await page.click('#lintPanel .lint-close');
      await waitForElementClassRemoved(page, '#lintPanel', 'show');

      // Panel should now be hidden
      hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(false);
    });
  });

  test.describe('Panel State Toggle Sequence', () => {
    test('panel state should toggle correctly: visible -> hidden -> visible', async ({ page }) => {
      // Initial state: hidden
      let hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(false);

      // First toggle: show
      await page.click('#lintToggle');
      await waitForElementClass(page, '#lintPanel', 'show');
      hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(true);

      // Second toggle: hide
      await page.click('#lintToggle');
      await waitForElementClassRemoved(page, '#lintPanel', 'show');
      hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(false);

      // Third toggle: show again
      await page.click('#lintToggle');
      await waitForElementClass(page, '#lintPanel', 'show');
      hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(true);
    });

    test('toggle button should have active class when panel is shown', async ({ page }) => {
      // Initial state: button should not have active class
      let hasActiveClass = await elementHasClass(page, '#lintToggle', 'active');
      expect(hasActiveClass).toBe(false);

      // Show panel
      await page.click('#lintToggle');
      await waitForElementClass(page, '#lintPanel', 'show');

      // Button should have active class
      hasActiveClass = await elementHasClass(page, '#lintToggle', 'active');
      expect(hasActiveClass).toBe(true);

      // Hide panel
      await page.click('#lintToggle');
      await waitForElementClassRemoved(page, '#lintPanel', 'show');

      // Button should not have active class
      hasActiveClass = await elementHasClass(page, '#lintToggle', 'active');
      expect(hasActiveClass).toBe(false);
    });
  });

  test.describe('Lint Content Display', () => {
    test('lintContent should show default empty message when validation is disabled', async ({ page }) => {
      const contentText = await page.$eval('#lintContent', el => el.textContent);
      expect(contentText).toContain('No issues found or validation disabled');
    });

    test('lintContent element should be scrollable', async ({ page }) => {
      const overflowY = await page.$eval('.lint-content', el => getComputedStyle(el).overflowY);
      expect(overflowY).toBe('auto');
    });
  });

  test.describe('Panel Styling and Layout', () => {
    test('lint panel should have correct CSS positioning', async ({ page }) => {
      const position = await page.$eval('#lintPanel', el => getComputedStyle(el).position);
      expect(position).toBe('fixed');
    });

    test('lint panel should have correct height', async ({ page }) => {
      const height = await page.$eval('#lintPanel', el => getComputedStyle(el).height);
      expect(height).toBe('300px');
    });

    test('lint panel should span full width', async ({ page }) => {
      const styles = await page.$eval('#lintPanel', el => {
        const computed = getComputedStyle(el);
        return {
          left: computed.left,
          right: computed.right
        };
      });
      expect(styles.left).toBe('0px');
      expect(styles.right).toBe('0px');
    });
  });

  test.describe('Integration with toggleLintPanel()', () => {
    test('programmatically calling toggleLintPanel() should show panel', async ({ page }) => {
      // Use extracted helper to avoid deep nesting (SonarCloud S2004)
      const isShown = await page.evaluate(browserToggleLintPanel);
      expect(isShown).toBe(true);
    });

    test('calling toggleLintPanel() twice should return to hidden state', async ({ page }) => {
      // First call: show
      await page.evaluate(() => {
        if (typeof globalThis.toggleLintPanel === 'function') {
          globalThis.toggleLintPanel();
        }
      });
      await waitForElementClass(page, '#lintPanel', 'show');

      let hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(true);

      // Second call: hide
      await page.evaluate(() => {
        if (typeof globalThis.toggleLintPanel === 'function') {
          globalThis.toggleLintPanel();
        }
      });
      await waitForElementClassRemoved(page, '#lintPanel', 'show');

      hasShowClass = await elementHasClass(page, '#lintPanel', 'show');
      expect(hasShowClass).toBe(false);
    });
  });
});
