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
 * Tests for YAML Front Matter Panel State Preservation (Issue #268)
 *
 * These tests verify that the YAML metadata panel's open/closed state
 * is preserved when changing preview styles, ensuring a better user experience.
 */
test.describe('YAML Panel State Preservation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageReady(page);
  });

  test('YAML panel stays open when changing preview style', async ({ page }) => {
    // Set up content with YAML front matter
    const markdown = `---
title: Test Document
author: Test Author
date: 2025-12-13
---

# Main Content

This is a test document.`;

    await setCodeMirrorContent(page, markdown);
    await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

    // Verify YAML panel exists
    const panel = await page.$('.yaml-front-matter');
    expect(panel).not.toBeNull();

    // Check initial state (should be closed by default)
    const initialOpen = await page.$eval('.yaml-front-matter', el => el.open);
    expect(initialOpen).toBe(false);

    // Open the panel
    await page.click('.yaml-front-matter summary');
    await page.waitForTimeout(100); // Wait for toggle animation

    // Verify panel is now open
    const openAfterClick = await page.$eval('.yaml-front-matter', el => el.open);
    expect(openAfterClick).toBe(true);

    // Get initial style
    const initialStyle = await page.$eval('#styleSelector', select => select.value);

    // Get list of available styles (excluding toggles)
    const availableStyles = await page.$$eval('#styleSelector option', options =>
      options
        .filter(opt => opt.value && opt.value !== '' && !opt.disabled && !opt.textContent?.includes('☐') && !opt.textContent?.includes('✓'))
        .map(opt => opt.value)
    );

    // Find a different style to switch to
    const newStyle = availableStyles.find(style => style !== initialStyle);
    expect(newStyle).toBeTruthy();

    // Change the preview style
    await page.selectOption('#styleSelector', newStyle);

    // Wait for render to complete (300ms debounce + render time)
    // Use EXTRA_LONG to ensure async render completes
    await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);

    // Verify the YAML panel still exists after re-render
    await page.waitForSelector('.yaml-front-matter', { timeout: 2000 });

    // Verify style changed
    const currentStyle = await page.$eval('#styleSelector', select => select.value);
    expect(currentStyle).toBe(newStyle);

    // CRITICAL: Verify panel is still open after style change
    const openAfterStyleChange = await page.$eval('.yaml-front-matter', el => el.open);
    expect(openAfterStyleChange).toBe(true);
  });

  test('YAML panel stays closed when changing preview style', async ({ page }) => {
    // Set up content with YAML front matter
    const markdown = `---
title: Another Test
version: 2.0
---

# Content`;

    await setCodeMirrorContent(page, markdown);
    await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

    // Verify panel exists and is closed
    const initialOpen = await page.$eval('.yaml-front-matter', el => el.open);
    expect(initialOpen).toBe(false);

    // Get initial style
    const initialStyle = await page.$eval('#styleSelector', select => select.value);

    // Get available styles
    const availableStyles = await page.$$eval('#styleSelector option', options =>
      options
        .filter(opt => opt.value && opt.value !== '' && !opt.disabled && !opt.textContent?.includes('☐') && !opt.textContent?.includes('✓'))
        .map(opt => opt.value)
    );

    const newStyle = availableStyles.find(style => style !== initialStyle);
    expect(newStyle).toBeTruthy();

    // Change style
    await page.selectOption('#styleSelector', newStyle);
    await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);
    await page.waitForSelector('.yaml-front-matter', { timeout: 2000 });

    // Verify panel is still closed
    const closedAfterStyleChange = await page.$eval('.yaml-front-matter', el => el.open);
    expect(closedAfterStyleChange).toBe(false);
  });

  test('YAML panel state preserved through multiple style changes', async ({ page }) => {
    const markdown = `---
title: Multi-Change Test
tags:
  - test
  - yaml
  - state
---

# Test`;

    await setCodeMirrorContent(page, markdown);
    await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

    // Open the panel
    await page.click('.yaml-front-matter summary');
    await page.waitForTimeout(100);

    const openAfterClick = await page.$eval('.yaml-front-matter', el => el.open);
    expect(openAfterClick).toBe(true);

    // Get available styles
    const availableStyles = await page.$$eval('#styleSelector option', options =>
      options
        .filter(opt => opt.value && opt.value !== '' && !opt.disabled && !opt.textContent?.includes('☐') && !opt.textContent?.includes('✓'))
        .map(opt => opt.value)
    );

    // Change styles multiple times
    for (let i = 0; i < Math.min(3, availableStyles.length); i++) {
      await page.selectOption('#styleSelector', availableStyles[i]);
      await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);
      await page.waitForSelector('.yaml-front-matter', { timeout: 2000 });

      // Verify panel remains open after each change
      const stillOpen = await page.$eval('.yaml-front-matter', el => el.open);
      expect(stillOpen).toBe(true);
    }
  });

  test('YAML panel state preserved when changing other theme selectors', async ({ page }) => {
    const markdown = `---
title: Cross-Theme Test
---

# Content`;

    await setCodeMirrorContent(page, markdown);
    await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

    // Open the panel
    await page.click('.yaml-front-matter summary');
    await page.waitForTimeout(100);

    // Verify panel is open
    const openAfterClick = await page.$eval('.yaml-front-matter', el => el.open);
    expect(openAfterClick).toBe(true);

    // Change syntax theme (should not trigger markdown re-render)
    const syntaxThemes = await page.$$eval('#syntaxThemeSelector option', options =>
      options.filter(opt => opt.value && opt.value !== '').map(opt => opt.value)
    );

    if (syntaxThemes.length > 1) {
      const initialSyntax = await page.$eval('#syntaxThemeSelector', select => select.value);
      const newSyntax = syntaxThemes.find(theme => theme !== initialSyntax);

      if (newSyntax) {
        await page.selectOption('#syntaxThemeSelector', newSyntax);
        await page.waitForTimeout(WAIT_TIMES.MEDIUM);

        // Panel should still be open (syntax theme changes also trigger re-render)
        const stillOpenAfterSyntax = await page.$eval('.yaml-front-matter', el => el.open);
        expect(stillOpenAfterSyntax).toBe(true);
      }
    }
  });
});
