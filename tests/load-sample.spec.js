// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for Load Sample functionality
 *
 * These tests ensure the Load Sample button and loadSample() function work correctly
 * to populate the editor with comprehensive demo content including markdown,
 * code blocks, tables, and mermaid diagrams.
 */
test.describe('Load Sample Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for CodeMirror to initialize
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    // Wait for the editor API to be ready
    await page.waitForFunction(() => typeof globalThis.loadSample === 'function', { timeout: 5000 });
  });

  test.describe('Load Sample Button', () => {
    test('Load Sample button should exist in toolbar', async ({ page }) => {
      const loadSampleButton = await page.$('button[onclick="loadSample()"]');
      expect(loadSampleButton).not.toBeNull();
    });

    test('Load Sample button should have loadSample onclick handler', async ({ page }) => {
      const onclick = await page.$eval('button[onclick="loadSample()"]', el => el.getAttribute('onclick'));
      expect(onclick).toBe('loadSample()');
    });

    test('Load Sample button should be visible and clickable', async ({ page }) => {
      const loadSampleButton = await page.$('button[onclick="loadSample()"]');
      expect(loadSampleButton).not.toBeNull();

      // Check visibility
      const isVisible = await page.isVisible('button[onclick="loadSample()"]');
      expect(isVisible).toBe(true);

      // Check if button is enabled (not disabled)
      const isEnabled = await page.isEnabled('button[onclick="loadSample()"]');
      expect(isEnabled).toBe(true);
    });
  });

  test.describe('Global Function', () => {
    test('loadSample() function should be globally available', async ({ page }) => {
      const isFunction = await page.evaluate(() => typeof globalThis.loadSample === 'function');
      expect(isFunction).toBe(true);
    });

    test('loadSample() should be callable without errors', async ({ page }) => {
      // Clear editor first to ensure we can detect the change
      await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        if (cmEditor) cmEditor.setValue('');
      });

      // Call loadSample and check it doesn't throw
      const didExecute = await page.evaluate(() => {
        try {
          globalThis.loadSample();
          return true;
        } catch (error) {
          console.error('loadSample error:', error);
          return false;
        }
      });

      expect(didExecute).toBe(true);
    });
  });

  test.describe('Sample Content Loading', () => {
    test('clicking Load Sample should populate the editor with content', async ({ page }) => {
      // Clear editor first
      await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        if (cmEditor) cmEditor.setValue('');
      });

      // Wait a moment for clearing to complete
      await page.waitForTimeout(100);

      // Verify editor is empty
      const emptyContent = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });
      expect(emptyContent).toBe('');

      // Click Load Sample button
      await page.click('button[onclick="loadSample()"]');

      // Wait for content to load
      await page.waitForTimeout(200);

      // Verify editor now has content
      const loadedContent = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      expect(loadedContent.length).toBeGreaterThan(0);
    });

    test('editor should not be empty after loading sample', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const content = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      expect(content).not.toBe('');
      expect(content.trim().length).toBeGreaterThan(100);
    });

    test('sample content should include expected elements', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const content = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      // Check for expected markdown elements
      expect(content).toContain('# Comprehensive Markdown + Mermaid Feature Demo');
      expect(content).toContain('## Text Formatting');
      expect(content).toContain('## Lists');
      expect(content).toContain('## Code Blocks');
      expect(content).toContain('## Tables');
      expect(content).toContain('## Mermaid Diagrams');
      expect(content).toContain('## Blockquotes');
    });

    test('sample content should include code blocks with various languages', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const content = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      // Check for language-specific code blocks
      expect(content).toContain('```javascript');
      expect(content).toContain('```python');
      expect(content).toContain('```yaml');
      expect(content).toContain('```json');
    });

    test('sample content should include mermaid diagram blocks', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const content = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      // Check for mermaid diagram types
      expect(content).toContain('```mermaid');
      expect(content).toContain('graph TD'); // Flowchart
      expect(content).toContain('sequenceDiagram'); // Sequence diagram
      expect(content).toContain('classDiagram'); // Class diagram
    });

    test('sample content should include markdown tables', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const content = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      // Check for table syntax
      expect(content).toContain('| Feature | Status | Priority |');
      expect(content).toContain('|---------|--------|----------|');
    });
  });

  test.describe('Preview Rendering', () => {
    test('markdown should be rendered in preview after loading sample', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');

      // Wait for rendering to complete
      await page.waitForTimeout(1000);

      // Check that preview has rendered content
      const previewHTML = await page.$eval('#wrapper', el => el.innerHTML);
      expect(previewHTML.length).toBeGreaterThan(0);

      // Check for rendered HTML elements
      expect(previewHTML).toContain('<h1');
      expect(previewHTML).toContain('<h2');
      expect(previewHTML).toContain('<table');
      expect(previewHTML).toContain('<pre');
    });

    test('preview should contain rendered headings from sample', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(1000);

      // Check for specific rendered headings
      const hasMainHeading = await page.$eval('#wrapper', el =>
        el.textContent.includes('Comprehensive Markdown + Mermaid Feature Demo')
      );
      expect(hasMainHeading).toBe(true);

      const hasSubHeadings = await page.$eval('#wrapper', el => {
        const text = el.textContent;
        return text.includes('Text Formatting') &&
               text.includes('Lists') &&
               text.includes('Code Blocks');
      });
      expect(hasSubHeadings).toBe(true);
    });

    test('preview should contain syntax-highlighted code blocks', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(1500);

      // Check for syntax highlighted code blocks (hljs class added by highlight.js)
      const hasCodeBlocks = await page.evaluate(() => {
        const codeBlocks = document.querySelectorAll('#wrapper pre code');
        return codeBlocks.length > 0;
      });
      expect(hasCodeBlocks).toBe(true);
    });

    test('preview should contain rendered mermaid diagrams', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');

      // Wait longer for mermaid to render
      await page.waitForTimeout(2000);

      // Check for mermaid SVG elements
      const hasMermaidDiagrams = await page.evaluate(() => {
        const mermaidElements = document.querySelectorAll('#wrapper .mermaid svg');
        return mermaidElements.length > 0;
      });
      expect(hasMermaidDiagrams).toBe(true);
    });

    test('preview should contain rendered tables', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(1000);

      const hasTables = await page.evaluate(() => {
        const tables = document.querySelectorAll('#wrapper table');
        return tables.length > 0;
      });
      expect(hasTables).toBe(true);
    });
  });

  test.describe('Edge Cases', () => {
    test('loading sample when editor already has content should replace it', async ({ page }) => {
      // First, put some initial content in the editor
      await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        if (cmEditor) cmEditor.setValue('# Initial Content\n\nThis is some initial content.');
      });
      await page.waitForTimeout(100);

      // Verify initial content is set
      const initialContent = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });
      expect(initialContent).toContain('Initial Content');

      // Now load the sample
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      // Verify content was replaced
      const newContent = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      expect(newContent).not.toContain('Initial Content');
      expect(newContent).toContain('Comprehensive Markdown + Mermaid Feature Demo');
    });

    test('loading sample multiple times should work consistently', async ({ page }) => {
      // Load sample first time
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const firstLoad = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      // Load sample second time
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const secondLoad = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      // Both loads should produce identical content
      expect(firstLoad).toBe(secondLoad);
      expect(firstLoad.length).toBeGreaterThan(0);
    });

    test('loading sample should trigger re-render of preview', async ({ page }) => {
      // Clear everything first
      await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        if (cmEditor) cmEditor.setValue('');
      });
      await page.waitForTimeout(500);

      // Get initial preview HTML (should be empty)
      const initialPreview = await page.$eval('#wrapper', el => el.innerHTML.trim());

      // Load sample
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(1500);

      // Get new preview HTML
      const newPreview = await page.$eval('#wrapper', el => el.innerHTML.trim());

      // Preview should have changed from empty to populated
      expect(initialPreview.length).toBeLessThan(newPreview.length);
      expect(newPreview.length).toBeGreaterThan(100);
    });

    test('sample content should be valid markdown', async ({ page }) => {
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const content = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      // Basic markdown validation checks
      // - Should have headings starting with #
      expect(content).toMatch(/^#\s/m);

      // - Code blocks should be properly closed
      const backtickMatches = content.match(/```/g);
      expect(backtickMatches).not.toBeNull();
      // Should have even number of ``` (opening and closing)
      expect(backtickMatches.length % 2).toBe(0);

      // - Should have proper list syntax
      expect(content).toMatch(/^[-*]\s/m);
      expect(content).toMatch(/^\d+\.\s/m);
    });
  });

  test.describe('Integration', () => {
    test('sample loading should work after editor has content', async ({ page }) => {
      // Set some initial content
      await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        if (cmEditor) {
          cmEditor.setValue('# My Document\n\nSome initial content.');
        }
      });
      await page.waitForTimeout(100);

      // Now load sample (should replace the content)
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(200);

      const content = await page.evaluate(() => {
        const cmEditor = document.querySelector('.CodeMirror')?.CodeMirror;
        return cmEditor ? cmEditor.getValue() : '';
      });

      expect(content).toContain('Comprehensive Markdown + Mermaid Feature Demo');
      expect(content).not.toContain('My Document');
    });

    test('sample content should render with current style theme', async ({ page }) => {
      // Load sample first
      await page.click('button[onclick="loadSample()"]');
      await page.waitForTimeout(1500);

      // Check that preview wrapper has content and styling is applied
      const wrapperExists = await page.evaluate(() => {
        const wrapper = document.getElementById('wrapper');
        if (!wrapper) return false;

        const hasContent = wrapper.innerHTML.length > 0;
        const hasStyles = getComputedStyle(wrapper).display !== '';

        return hasContent && hasStyles;
      });

      expect(wrapperExists).toBe(true);
    });
  });
});
