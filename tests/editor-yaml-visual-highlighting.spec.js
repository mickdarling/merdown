// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');
const {
  waitForPageReady,
  setCodeMirrorContent,
  WAIT_TIMES
} = require('./helpers/test-utils');

/**
 * Helper to get the computed color of a token at a specific position
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} line - Line number (0-indexed)
 * @param {number} ch - Character position (0-indexed)
 * @returns {Promise<string>} RGB color string
 */
async function getTokenColor(page, line, ch) {
  return page.evaluate(({ line, ch }) => {
    const cmElement = document.querySelector('.CodeMirror');
    const cm = cmElement?.CodeMirror;
    if (!cm) {
      throw new Error('CodeMirror instance not found');
    }

    // Get the DOM element for this position
    const coords = cm.charCoords({ line, ch }, 'local');
    const element = document.elementFromPoint(coords.left, coords.top);

    if (!element) {
      throw new Error('Could not find element at position');
    }

    // Get computed color
    const style = window.getComputedStyle(element);
    return style.color;
  }, { line, ch });
}

/**
 * Helper to check if a specific line has syntax highlighting
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} line - Line number (0-indexed)
 * @returns {Promise<boolean>} True if the line has highlighted tokens
 */
async function lineHasSyntaxHighlighting(page, line) {
  return page.evaluate((lineNum) => {
    const cmElement = document.querySelector('.CodeMirror');
    const cm = cmElement?.CodeMirror;
    if (!cm) {
      throw new Error('CodeMirror instance not found');
    }

    const lineContent = cm.getLine(lineNum);
    if (!lineContent) {
      return false;
    }

    // Check if any token in this line has a type (which means it's highlighted)
    let pos = 0;
    while (pos < lineContent.length) {
      const token = cm.getTokenAt({ line: lineNum, ch: pos + 1 });
      if (token.type) {
        return true;
      }
      pos = token.end;
    }

    return false;
  }, line);
}

/**
 * Helper to set CodeMirror content and wait for it to be processed
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} content - Content to set
 * @returns {Promise<void>}
 */
async function setContentAndWait(page, content) {
  await setCodeMirrorContent(page, content);
  await page.waitForTimeout(WAIT_TIMES.SHORT);
}

test.describe('YAML Complex Structure Visual Highlighting', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageReady(page);
  });

  test('complex YAML example from issue has visible syntax highlighting', async ({ page }) => {
    const content = `---
title: My Document
metadata:
  author:
    name: John Doe
    email: john@example.com
  tags:
    - documentation
    - tutorial
description: |
  This is a multi-line
  description using literal block style.
defaults: &defaults
  layout: post
  published: true
post_settings:
  <<: *defaults
  comments: enabled
---
# Markdown content
`;
    await setContentAndWait(page, content);

    // Verify syntax highlighting is active for various lines

    // Line 0: Opening delimiter
    const line0Highlighted = await lineHasSyntaxHighlighting(page, 0);
    expect(line0Highlighted).toBe(true);

    // Line 1: Simple key-value
    const line1Highlighted = await lineHasSyntaxHighlighting(page, 1);
    expect(line1Highlighted).toBe(true);

    // Line 2: Nested object
    const line2Highlighted = await lineHasSyntaxHighlighting(page, 2);
    expect(line2Highlighted).toBe(true);

    // Line 3: Double nested
    const line3Highlighted = await lineHasSyntaxHighlighting(page, 3);
    expect(line3Highlighted).toBe(true);

    // Line 7: Array item
    const line7Highlighted = await lineHasSyntaxHighlighting(page, 7);
    expect(line7Highlighted).toBe(true);

    // Line 9: Multi-line string indicator
    const line9Highlighted = await lineHasSyntaxHighlighting(page, 9);
    expect(line9Highlighted).toBe(true);

    // Line 12: Anchor definition
    const line12Highlighted = await lineHasSyntaxHighlighting(page, 12);
    expect(line12Highlighted).toBe(true);

    // Line 16: Merge key and alias
    const line16Highlighted = await lineHasSyntaxHighlighting(page, 16);
    expect(line16Highlighted).toBe(true);

    // Line 18: Closing delimiter
    const line18Highlighted = await lineHasSyntaxHighlighting(page, 18);
    expect(line18Highlighted).toBe(true);

    // Line 19: Markdown content (after front matter)
    const line19Highlighted = await lineHasSyntaxHighlighting(page, 19);
    expect(line19Highlighted).toBe(true);
  });

  test('nested objects have different token types for keys and values', async ({ page }) => {
    const content = `---
metadata:
  author: John Doe
---`;
    await setContentAndWait(page, content);

    // Get all unique token types used in the YAML section
    const tokenTypes = await page.evaluate(() => {
      const cmElement = document.querySelector('.CodeMirror');
      const cm = cmElement?.CodeMirror;
      if (!cm) {
        throw new Error('CodeMirror instance not found');
      }

      const uniqueTypes = new Set();

      // Check lines 0-3 (YAML front matter)
      for (let lineNum = 0; lineNum <= 3; lineNum++) {
        const lineContent = cm.getLine(lineNum);
        if (!lineContent) continue;

        let pos = 0;
        while (pos < lineContent.length) {
          const token = cm.getTokenAt({ line: lineNum, ch: pos + 1 });
          if (token.type) {
            uniqueTypes.add(token.type);
          }
          pos = token.end;
        }
      }

      return Array.from(uniqueTypes);
    });

    // Should have more than one token type (indicating different syntax elements are tokenized differently)
    expect(tokenTypes.length).toBeGreaterThan(1);
  });

  test('comments have distinct highlighting', async ({ page }) => {
    const content = `---
title: Test # This is a comment
# Full line comment
author: John
---`;
    await setContentAndWait(page, content);

    // Line 1 should have highlighting (contains comment)
    const line1Highlighted = await lineHasSyntaxHighlighting(page, 1);
    expect(line1Highlighted).toBe(true);

    // Line 2 should have highlighting (full-line comment)
    const line2Highlighted = await lineHasSyntaxHighlighting(page, 2);
    expect(line2Highlighted).toBe(true);
  });

  test('multi-line strings maintain highlighting', async ({ page }) => {
    const content = `---
description: |
  First line
  Second line
  Third line
---`;
    await setContentAndWait(page, content);

    // All lines should have highlighting
    for (let i = 0; i <= 5; i++) {
      const highlighted = await lineHasSyntaxHighlighting(page, i);
      expect(highlighted).toBe(true);
    }
  });

  test('anchors and aliases are highlighted', async ({ page }) => {
    const content = `---
defaults: &defaults
  layout: post
post:
  <<: *defaults
---`;
    await setContentAndWait(page, content);

    // Line 1: anchor definition
    const line1Highlighted = await lineHasSyntaxHighlighting(page, 1);
    expect(line1Highlighted).toBe(true);

    // Line 4: alias reference
    const line4Highlighted = await lineHasSyntaxHighlighting(page, 4);
    expect(line4Highlighted).toBe(true);
  });

  test('complex arrays with nested objects are highlighted', async ({ page }) => {
    const content = `---
items:
  - name: Item 1
    value: 100
  - name: Item 2
    value: 200
---`;
    await setContentAndWait(page, content);

    // All lines should be highlighted
    for (let i = 0; i <= 6; i++) {
      const highlighted = await lineHasSyntaxHighlighting(page, i);
      expect(highlighted).toBe(true);
    }
  });

  test('quoted strings are highlighted differently than unquoted', async ({ page }) => {
    const content = `---
quoted: "String value"
unquoted: String value
---`;
    await setContentAndWait(page, content);

    // Both lines should have highlighting
    const line1Highlighted = await lineHasSyntaxHighlighting(page, 1);
    const line2Highlighted = await lineHasSyntaxHighlighting(page, 2);

    expect(line1Highlighted).toBe(true);
    expect(line2Highlighted).toBe(true);
  });

  test('highlighting persists after editing', async ({ page }) => {
    const content = `---
title: Test
---`;
    await setContentAndWait(page, content);

    // Edit the content
    await page.evaluate(() => {
      const cmElement = document.querySelector('.CodeMirror');
      const cm = cmElement?.CodeMirror;
      if (cm) {
        cm.replaceRange('\nauthor: John', { line: 1, ch: 11 });
      }
    });

    await page.waitForTimeout(WAIT_TIMES.SHORT);

    // New line should be highlighted
    const line2Highlighted = await lineHasSyntaxHighlighting(page, 2);
    expect(line2Highlighted).toBe(true);
  });

  test('syntax highlighting switches from YAML to markdown after front matter', async ({ page }) => {
    const content = `---
title: Test
---
# Markdown Heading
**Bold text**
`;
    await setContentAndWait(page, content);

    // YAML section should be highlighted
    const line1YamlHighlighted = await lineHasSyntaxHighlighting(page, 1);
    expect(line1YamlHighlighted).toBe(true);

    // Markdown section should also be highlighted (but with different mode)
    const line3MdHighlighted = await lineHasSyntaxHighlighting(page, 3);
    expect(line3MdHighlighted).toBe(true);

    const line4MdHighlighted = await lineHasSyntaxHighlighting(page, 4);
    expect(line4MdHighlighted).toBe(true);
  });
});
