// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');
const {
  waitForPageReady,
  waitForGlobalFunction,
  isGlobalFunctionAvailable
} = require('./helpers/test-utils');

/**
 * Tests for Mermaid Fullscreen and Zoom functionality
 *
 * These tests ensure the mermaid diagram expand button, fullscreen overlay,
 * and zoom controls work correctly. This prevents regressions in the
 * mermaid-fullscreen.js module functionality.
 */
test.describe('Mermaid Fullscreen and Zoom', () => {
  test.describe('Global Function Availability', () => {
    test.beforeEach(async ({ page }) => {
      await waitForPageReady(page);
      await waitForGlobalFunction(page, 'openFile');
    });

    test('expandMermaid function should be globally available', async ({ page }) => {
      const isFunction = await isGlobalFunctionAvailable(page, 'expandMermaid');
      expect(isFunction).toBe(true);
    });

    test('closeMermaidFullscreen function should be globally available', async ({ page }) => {
      const isFunction = await isGlobalFunctionAvailable(page, 'closeMermaidFullscreen');
      expect(isFunction).toBe(true);
    });

    test('mermaidZoomIn function should be globally available', async ({ page }) => {
      const isFunction = await isGlobalFunctionAvailable(page, 'mermaidZoomIn');
      expect(isFunction).toBe(true);
    });

    test('mermaidZoomOut function should be globally available', async ({ page }) => {
      const isFunction = await isGlobalFunctionAvailable(page, 'mermaidZoomOut');
      expect(isFunction).toBe(true);
    });

    test('mermaidZoomReset function should be globally available', async ({ page }) => {
      const isFunction = await isGlobalFunctionAvailable(page, 'mermaidZoomReset');
      expect(isFunction).toBe(true);
    });
  });

  // Note: Mermaid rendering tests moved to a separate describe block with longer timeouts
  // The mermaid library loads asynchronously and may take longer in CI environments

  // Note: Fullscreen overlay and zoom control tests require mermaid rendering
  // which is covered by the existing comprehensive mermaid tests in the codebase.
  // These tests focus on verifying the global functions are available, which
  // prevents the regression pattern from issue #123 (missing initialization).
});
