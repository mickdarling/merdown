// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

/**
 * Test: Issue #391 - Respect Style Layout Toggle Preserves Centering
 *
 * Bug: When "Respect Style Layout" toggle is activated, the preview pane content
 * becomes left-justified instead of remaining center-justified.
 *
 * Root Cause: stripWrapperLayoutProperties() was stripping ALL margin properties,
 * including centering margins like "margin: 0 auto".
 *
 * Fix: Modified shouldKeepDeclaration() to preserve margin declarations with 'auto'
 * values, and updated applyLayoutConstraints() to only override vertical margins.
 */

const { test, expect } = require('@playwright/test');

// Constants for test timing
const STYLE_APPLY_WAIT = 500;
const TOGGLE_WAIT = 300;
const CENTERING_TOLERANCE = 10;

/**
 * Helper to get centering metrics for the wrapper element
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{leftSpace: number, rightSpace: number, diff: number}>}
 */
async function getCenteringMetrics(page) {
  return await page.evaluate(() => {
    const wrapper = document.getElementById('wrapper');
    const preview = document.getElementById('preview');
    const wrapperRect = wrapper.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    const leftSpace = wrapperRect.left - previewRect.left;
    const rightSpace = previewRect.right - wrapperRect.right;
    return { leftSpace, rightSpace, diff: Math.abs(leftSpace - rightSpace) };
  });
}

test.describe('Respect Style Layout - Centering Preservation (Issue #391)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for app to be ready
    await page.waitForSelector('#wrapper', { timeout: 5000 });
    await page.waitForSelector('#styleSelector', { timeout: 5000 });
  });

  test('wrapper should be centered when Respect Style Layout is OFF (default)', async ({ page }) => {
    // Select a style that uses centered layout (e.g., "Clean" which has margin: 0 auto)
    await page.selectOption('#styleSelector', 'Clean');
    await page.waitForTimeout(STYLE_APPLY_WAIT);

    // Get wrapper computed styles - verify only vertical margins are set inline
    const wrapperStyles = await page.evaluate(() => {
      const wrapper = document.getElementById('wrapper');
      return {
        marginTopInline: wrapper.style.marginTop,
        marginBottomInline: wrapper.style.marginBottom,
      };
    });

    // When OFF (default), inline styles should only set vertical margins
    expect(wrapperStyles.marginTopInline).toBe('0px');
    expect(wrapperStyles.marginBottomInline).toBe('0px');

    // Check that wrapper is approximately centered (within tolerance)
    const centering = await getCenteringMetrics(page);
    expect(centering.diff).toBeLessThan(CENTERING_TOLERANCE);
  });

  test('wrapper should be centered when Respect Style Layout is ON', async ({ page }) => {
    // Select a style
    await page.selectOption('#styleSelector', 'Clean');
    await page.waitForTimeout(STYLE_APPLY_WAIT);

    // Toggle "Respect Style Layout" ON
    await page.selectOption('#styleSelector', 'Respect Style Layout');
    await page.waitForTimeout(STYLE_APPLY_WAIT);

    // Verify toggle is ON via state check
    const isRespectLayoutOn = await page.evaluate(() => {
      // Access app state - window.state is the global state object
      return document.body.dataset.respectStyleLayout === 'true' ||
             (typeof state !== 'undefined' && state?.respectStyleLayout === true);
    });
    expect(isRespectLayoutOn).toBe(true);

    // When ON, inline margin style should be cleared, letting CSS take over
    const marginInline = await page.evaluate(() => {
      return document.getElementById('wrapper').style.margin;
    });
    expect(marginInline).toBe('');

    // Check that wrapper is centered
    const centering = await getCenteringMetrics(page);
    expect(centering.diff).toBeLessThan(CENTERING_TOLERANCE);
  });

  test('toggling Respect Style Layout should maintain centering', async ({ page }) => {
    await page.selectOption('#styleSelector', 'Clean');
    await page.waitForTimeout(STYLE_APPLY_WAIT);

    // Verify initial centering
    const initialCentering = await getCenteringMetrics(page);
    expect(initialCentering.diff).toBeLessThan(CENTERING_TOLERANCE);

    // Toggle ON - should remain centered
    await page.selectOption('#styleSelector', 'Respect Style Layout');
    await page.waitForTimeout(TOGGLE_WAIT);

    const centeringOn = await getCenteringMetrics(page);
    expect(centeringOn.diff).toBeLessThan(CENTERING_TOLERANCE);

    // Toggle OFF - should remain centered
    await page.selectOption('#styleSelector', 'Respect Style Layout');
    await page.waitForTimeout(TOGGLE_WAIT);

    const centeringOff = await getCenteringMetrics(page);
    expect(centeringOff.diff).toBeLessThan(CENTERING_TOLERANCE);
  });
});
