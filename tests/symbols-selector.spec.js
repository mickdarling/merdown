// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');
const { waitForPageReady, getCodeMirrorContent, setCodeMirrorContent } = require('./helpers/test-utils');

test.describe('Symbols Selector', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageReady(page);
  });

  test('should exist in the editor panel header', async ({ page }) => {
    const selector = await page.$('#symbolsSelector');
    expect(selector).not.toBeNull();
  });

  test('should have correct optgroup label', async ({ page }) => {
    const label = await page.$eval('#symbolsSelector optgroup', el => el.getAttribute('label'));
    expect(label).toBe('Insert Symbol');
  });

  test('should have placeholder "Symbols..." as first option', async ({ page }) => {
    const firstOption = await page.$eval('#symbolsSelector option:first-child', el => el.textContent);
    expect(firstOption).toBe('Symbols...');
  });

  test('should have all required symbol options', async ({ page }) => {
    const options = await page.$$eval('#symbolsSelector option', els =>
      els.map(el => ({ value: el.value, text: el.textContent }))
    );

    // Remove the placeholder option
    const symbolOptions = options.slice(1);

    expect(symbolOptions).toEqual([
      { value: '#quot;', text: '" double quote' },
      { value: '#apos;', text: '\' single quote' },
      { value: '#lt;', text: '< less than' },
      { value: '#gt;', text: '> greater than' },
      { value: '#amp;', text: '& ampersand' },
      { value: '-->', text: '→ right arrow' },
      { value: '<--', text: '← left arrow' },
      { value: '<-->', text: '↔ both arrows' }
    ]);
  });

  test('should insert #quot; at cursor position', async ({ page }) => {
    // Set initial content
    await setCodeMirrorContent(page, 'Hello World');

    // Set cursor position using CodeMirror API
    await page.evaluate(() => {
      const editor = globalThis.state.cmEditor;
      editor.setCursor({ line: 0, ch: 5 }); // After "Hello"
    });

    // Select the #quot; option
    await page.selectOption('#symbolsSelector', '#quot;');

    // Wait a bit for the insertion
    await page.waitForTimeout(100);

    // Check content
    const content = await getCodeMirrorContent(page);
    expect(content).toBe('Hello#quot; World');
  });

  test('should insert --> (right arrow) at cursor position', async ({ page }) => {
    await setCodeMirrorContent(page, 'A B');

    await page.evaluate(() => {
      const editor = globalThis.state.cmEditor;
      editor.setCursor({ line: 0, ch: 2 }); // After "A "
    });

    await page.selectOption('#symbolsSelector', '-->');
    await page.waitForTimeout(100);

    const content = await getCodeMirrorContent(page);
    expect(content).toBe('A -->B');
  });

  test('should reset to placeholder after insertion', async ({ page }) => {
    await setCodeMirrorContent(page, 'Test');

    // Select a symbol
    await page.selectOption('#symbolsSelector', '#amp;');
    await page.waitForTimeout(100);

    // Check that selector is back to placeholder
    const value = await page.$eval('#symbolsSelector', el => el.value);
    expect(value).toBe('');
  });

  test('should insert at beginning of document', async ({ page }) => {
    await setCodeMirrorContent(page, 'World');

    await page.evaluate(() => {
      const editor = globalThis.state.cmEditor;
      editor.setCursor({ line: 0, ch: 0 });
    });

    await page.selectOption('#symbolsSelector', '#lt;');
    await page.waitForTimeout(100);

    const content = await getCodeMirrorContent(page);
    expect(content).toBe('#lt;World');
  });

  test('should insert at end of document', async ({ page }) => {
    await setCodeMirrorContent(page, 'Hello');

    await page.evaluate(() => {
      const editor = globalThis.state.cmEditor;
      editor.setCursor({ line: 0, ch: 5 });
    });

    await page.selectOption('#symbolsSelector', '#gt;');
    await page.waitForTimeout(100);

    const content = await getCodeMirrorContent(page);
    expect(content).toBe('Hello#gt;');
  });

  test('should move cursor after inserted text', async ({ page }) => {
    await setCodeMirrorContent(page, 'AB');

    await page.evaluate(() => {
      const editor = globalThis.state.cmEditor;
      editor.setCursor({ line: 0, ch: 1 }); // Between A and B
    });

    await page.selectOption('#symbolsSelector', '<-->');
    await page.waitForTimeout(100);

    // Check cursor position
    const cursorPos = await page.evaluate(() => {
      const editor = globalThis.state.cmEditor;
      const cursor = editor.getCursor();
      return { line: cursor.line, ch: cursor.ch };
    });

    expect(cursorPos).toEqual({ line: 0, ch: 5 }); // 1 (A) + 4 (<-->) = 5
  });

  test('should work with multiline content', async ({ page }) => {
    await setCodeMirrorContent(page, 'Line 1\nLine 2\nLine 3');

    await page.evaluate(() => {
      const editor = globalThis.state.cmEditor;
      editor.setCursor({ line: 1, ch: 4 }); // After "Line" on line 2
    });

    await page.selectOption('#symbolsSelector', '#apos;');
    await page.waitForTimeout(100);

    const content = await getCodeMirrorContent(page);
    expect(content).toBe('Line 1\nLine#apos; 2\nLine 3');
  });

  test('should have onchange handler', async ({ page }) => {
    const onchange = await page.$eval('#symbolsSelector', el => el.getAttribute('onchange'));
    expect(onchange).toBe('insertSpecialCharacter(this.value)');
  });

  test('should have appropriate title attribute', async ({ page }) => {
    const title = await page.$eval('#symbolsSelector', el => el.getAttribute('title'));
    expect(title).toBe('Insert special characters for Mermaid diagrams');
  });

  test('should use panel-selector CSS class', async ({ page }) => {
    const hasClass = await page.$eval('#symbolsSelector', el => el.classList.contains('panel-selector'));
    expect(hasClass).toBe(true);
  });

  test('insertSpecialCharacter should be a global function', async ({ page }) => {
    const isFunction = await page.evaluate(() => {
      return typeof globalThis.insertSpecialCharacter === 'function';
    });
    expect(isFunction).toBe(true);
  });
});
