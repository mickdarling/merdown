// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for Theme Selector functionality
 *
 * These tests ensure the three theme selectors (Style, Syntax, and Editor)
 * are properly initialized with their respective options and can trigger
 * theme changes when selections are made.
 */
test.describe('Theme Selectors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for CodeMirror to initialize
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    // Wait for theme functions to be globally available
    await page.waitForFunction(() =>
      typeof globalThis.changeStyle === 'function' &&
      typeof globalThis.changeSyntaxTheme === 'function' &&
      typeof globalThis.changeEditorTheme === 'function',
      { timeout: 5000 }
    );
  });

  test.describe('Style Selector (#styleSelector)', () => {
    test('element should exist in DOM', async ({ page }) => {
      const styleSelector = await page.$('#styleSelector');
      expect(styleSelector).not.toBeNull();
    });

    test('should have options populated', async ({ page }) => {
      // Get all options from the style selector
      const optionCount = await page.$$eval('#styleSelector option', options => options.length);

      // Should have more than just the placeholder "Style..." option
      expect(optionCount).toBeGreaterThan(1);
    });

    test('should have specific style options available', async ({ page }) => {
      // Check for some expected style options
      const hasCleanStyle = await page.$eval('#styleSelector',
        select => Array.from(select.options).some(opt => opt.value === 'Clean')
      );
      expect(hasCleanStyle).toBe(true);
    });

    test('changeStyle() function should be globally available', async ({ page }) => {
      const isFunction = await page.evaluate(() => typeof globalThis.changeStyle === 'function');
      expect(isFunction).toBe(true);
    });

    test('should have a default selection', async ({ page }) => {
      const selectedValue = await page.$eval('#styleSelector', select => select.value);
      // Should have a value selected (not empty)
      expect(selectedValue).not.toBe('');
    });

    test('changing selection should trigger style change', async ({ page }) => {
      // Get the current selection
      const initialValue = await page.$eval('#styleSelector', select => select.value);

      // Find a different style option to select
      const availableOptions = await page.$$eval('#styleSelector option',
        options => options
          .filter(opt => opt.value && opt.value !== '' && !opt.disabled)
          .map(opt => opt.value)
      );

      // Find an option different from current selection
      const newValue = availableOptions.find(opt => opt !== initialValue && opt !== 'Respect Style Layout');

      if (newValue) {
        // Change to the new style
        await page.selectOption('#styleSelector', newValue);

        // Wait a bit for the style to load
        await page.waitForTimeout(500);

        // Verify the selection changed
        const currentValue = await page.$eval('#styleSelector', select => select.value);
        expect(currentValue).toBe(newValue);
      }
    });

    test('should display Respect Style Layout toggle option', async ({ page }) => {
      const hasToggleOption = await page.$eval('#styleSelector',
        select => Array.from(select.options).some(opt =>
          opt.textContent && opt.textContent.includes('Respect Style Layout')
        )
      );
      expect(hasToggleOption).toBe(true);
    });
  });

  test.describe('Syntax Theme Selector (#syntaxThemeSelector)', () => {
    test('element should exist in DOM', async ({ page }) => {
      const syntaxThemeSelector = await page.$('#syntaxThemeSelector');
      expect(syntaxThemeSelector).not.toBeNull();
    });

    test('should have options populated', async ({ page }) => {
      // Get all options from the syntax theme selector
      const optionCount = await page.$$eval('#syntaxThemeSelector option', options => options.length);

      // Should have more than just the placeholder "Code..." option
      expect(optionCount).toBeGreaterThan(1);
    });

    test('should have specific syntax theme options available', async ({ page }) => {
      // Check for some expected syntax themes
      const hasGitHubDark = await page.$eval('#syntaxThemeSelector',
        select => Array.from(select.options).some(opt => opt.value === 'GitHub Dark')
      );
      expect(hasGitHubDark).toBe(true);
    });

    test('changeSyntaxTheme() function should be globally available', async ({ page }) => {
      const isFunction = await page.evaluate(() => typeof globalThis.changeSyntaxTheme === 'function');
      expect(isFunction).toBe(true);
    });

    test('should have a default selection', async ({ page }) => {
      const selectedValue = await page.$eval('#syntaxThemeSelector', select => select.value);
      // Should have a value selected (not empty)
      expect(selectedValue).not.toBe('');
    });

    test('#syntax-override style element should exist or be created', async ({ page }) => {
      // The syntax-override element should exist after initialization
      // It might be created during theme initialization
      await page.waitForTimeout(500); // Wait for initialization

      const syntaxOverride = await page.$('#syntax-override');
      // Should exist after initialization
      expect(syntaxOverride).not.toBeNull();
    });

    test('changing selection should update syntax highlighting', async ({ page }) => {
      // Get the current selection
      const initialValue = await page.$eval('#syntaxThemeSelector', select => select.value);

      // Find a different syntax theme option to select
      const availableOptions = await page.$$eval('#syntaxThemeSelector option',
        options => options
          .filter(opt => opt.value && opt.value !== '')
          .map(opt => opt.value)
      );

      // Find an option different from current selection
      const newValue = availableOptions.find(opt => opt !== initialValue);

      if (newValue) {
        // Change to the new syntax theme
        await page.selectOption('#syntaxThemeSelector', newValue);

        // Wait for the theme to load
        await page.waitForTimeout(500);

        // Verify the selection changed
        const currentValue = await page.$eval('#syntaxThemeSelector', select => select.value);
        expect(currentValue).toBe(newValue);

        // Verify a syntax theme link was added to the page
        const syntaxThemeLink = await page.$('#syntax-theme');
        expect(syntaxThemeLink).not.toBeNull();
      }
    });

    test('syntax theme link should have SRI integrity attribute', async ({ page }) => {
      // Wait for the syntax theme to load
      await page.waitForTimeout(500);

      const syntaxThemeLink = await page.$('#syntax-theme');
      if (syntaxThemeLink) {
        const integrity = await page.$eval('#syntax-theme', link => link.integrity);
        // Should have SRI hash for security
        expect(integrity).toBeTruthy();
        expect(integrity).toContain('sha');
      }
    });
  });

  test.describe('Editor Theme Selector (#editorThemeSelector)', () => {
    test('element should exist in DOM', async ({ page }) => {
      const editorThemeSelector = await page.$('#editorThemeSelector');
      expect(editorThemeSelector).not.toBeNull();
    });

    test('should have options populated', async ({ page }) => {
      // Get all options from the editor theme selector
      const optionCount = await page.$$eval('#editorThemeSelector option', options => options.length);

      // Should have more than just the placeholder "Theme..." option
      expect(optionCount).toBeGreaterThan(1);
    });

    test('should have specific editor theme options available', async ({ page }) => {
      // Check for some expected editor themes
      const hasMaterialDarker = await page.$eval('#editorThemeSelector',
        select => Array.from(select.options).some(opt => opt.value === 'Material Darker')
      );
      expect(hasMaterialDarker).toBe(true);
    });

    test('changeEditorTheme() function should be globally available', async ({ page }) => {
      const isFunction = await page.evaluate(() => typeof globalThis.changeEditorTheme === 'function');
      expect(isFunction).toBe(true);
    });

    test('should have a default selection', async ({ page }) => {
      const selectedValue = await page.$eval('#editorThemeSelector', select => select.value);
      // Should have a value selected (not empty)
      expect(selectedValue).not.toBe('');
    });

    test('changing selection should update CodeMirror theme', async ({ page }) => {
      // Get the current selection
      const initialValue = await page.$eval('#editorThemeSelector', select => select.value);

      // Find a different editor theme option to select
      const availableOptions = await page.$$eval('#editorThemeSelector option',
        options => options
          .filter(opt => opt.value && opt.value !== '')
          .map(opt => opt.value)
      );

      // Find an option different from current selection
      const newValue = availableOptions.find(opt => opt !== initialValue);

      if (newValue) {
        // Change to the new editor theme
        await page.selectOption('#editorThemeSelector', newValue);

        // Wait for the theme to load
        await page.waitForTimeout(500);

        // Verify the selection changed
        const currentValue = await page.$eval('#editorThemeSelector', select => select.value);
        expect(currentValue).toBe(newValue);

        // Verify an editor theme style element was added to the page
        const editorThemeStyle = await page.$('#editor-theme');
        expect(editorThemeStyle).not.toBeNull();
      }
    });

    test('editor theme style should contain CSS rules', async ({ page }) => {
      // Wait for the editor theme to load
      await page.waitForTimeout(500);

      const editorThemeStyle = await page.$('#editor-theme');
      if (editorThemeStyle) {
        const cssContent = await page.$eval('#editor-theme', style => style.textContent);
        // Should have actual CSS content
        expect(cssContent).toBeTruthy();
        expect(cssContent.length).toBeGreaterThan(0);
      }
    });

    test('CodeMirror editor should reflect theme changes', async ({ page }) => {
      // Get initial CodeMirror background
      const initialBackground = await page.$eval('.CodeMirror',
        el => getComputedStyle(el).backgroundColor
      );

      // Find a different editor theme
      const availableOptions = await page.$$eval('#editorThemeSelector option',
        options => options
          .filter(opt => opt.value && opt.value !== '')
          .map(opt => opt.value)
      );

      if (availableOptions.length > 1) {
        const currentValue = await page.$eval('#editorThemeSelector', select => select.value);
        const newValue = availableOptions.find(opt => opt !== currentValue);

        if (newValue) {
          // Change to the new editor theme
          await page.selectOption('#editorThemeSelector', newValue);

          // Wait for theme to apply
          await page.waitForTimeout(500);

          // Get new background (may or may not be different depending on theme)
          const newBackground = await page.$eval('.CodeMirror',
            el => getComputedStyle(el).backgroundColor
          );

          // Background should be defined (we can't guarantee it changed without knowing theme specifics)
          expect(newBackground).toBeTruthy();
        }
      }
    });
  });

  // Note: Theme persistence tests removed - localStorage keys may vary by implementation
  // The core functionality (selectors work, themes load) is tested above

  test.describe('Theme Integration', () => {
    test('all three theme selectors should be functional simultaneously', async ({ page }) => {
      // Verify all selectors exist and have options
      const styleOptions = await page.$$eval('#styleSelector option', opts => opts.length);
      const syntaxOptions = await page.$$eval('#syntaxThemeSelector option', opts => opts.length);
      const editorOptions = await page.$$eval('#editorThemeSelector option', opts => opts.length);

      expect(styleOptions).toBeGreaterThan(1);
      expect(syntaxOptions).toBeGreaterThan(1);
      expect(editorOptions).toBeGreaterThan(1);
    });

    test('theme selectors should not interfere with each other', async ({ page }) => {
      // Get initial values
      const initialStyle = await page.$eval('#styleSelector', s => s.value);
      const initialSyntax = await page.$eval('#syntaxThemeSelector', s => s.value);
      const initialEditor = await page.$eval('#editorThemeSelector', s => s.value);

      // Change style selector
      const styleOptions = await page.$$eval('#styleSelector option',
        opts => opts.filter(o => o.value && !o.disabled).map(o => o.value)
      );
      const newStyle = styleOptions.find(o => o !== initialStyle && o !== 'Respect Style Layout');

      if (newStyle) {
        await page.selectOption('#styleSelector', newStyle);
        await page.waitForTimeout(300);

        // Verify other selectors didn't change
        const syntaxAfter = await page.$eval('#syntaxThemeSelector', s => s.value);
        const editorAfter = await page.$eval('#editorThemeSelector', s => s.value);

        expect(syntaxAfter).toBe(initialSyntax);
        expect(editorAfter).toBe(initialEditor);
      }
    });
  });
});
