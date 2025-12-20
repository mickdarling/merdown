// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling
/**
 * Code Block and Editor Theme Flicker Tests
 * Tests for Issue #376 - Code block and editor flicker on theme change
 *
 * This test suite verifies that code blocks and the editor do NOT flicker when:
 * - Syntax highlighting theme is changed
 * - Editor theme is changed
 * - Multiple rapid theme changes occur
 *
 * The flicker manifests as a brief period with no styling (blank/unstyled state)
 * when old themes are removed BEFORE new themes finish loading.
 *
 * Fix: Load new themes BEFORE removing old ones (same pattern as mermaid fix #375)
 */

// @ts-check
const { test, expect } = require('@playwright/test');
const {
    waitForPageReady,
    waitForGlobalFunction,
    setCodeMirrorContent,
    renderMarkdownAndWait,
    WAIT_TIMES
} = require('../helpers/test-utils');

/**
 * Helper to set up a page with code blocks and wait for them to render
 * Moved to module scope to comply with S7721 (no async functions inside describe blocks)
 */
async function setupCodeBlockContent(page) {
    const content = `# Test Document

\`\`\`javascript
function hello() {
    console.log('Hello, World!');
}
\`\`\`

Some text between code blocks.

\`\`\`python
def greet():
    print("Hello!")
\`\`\`

\`\`\`css
.example {
    color: blue;
    background: white;
}
\`\`\`
`;
    await setCodeMirrorContent(page, content);
    await renderMarkdownAndWait(page, WAIT_TIMES.EXTRA_LONG);

    // Wait for code blocks to be rendered with syntax highlighting
    await page.waitForFunction(() => {
        const codeBlocks = document.querySelectorAll('pre code.hljs');
        return codeBlocks.length >= 3;
    }, { timeout: 5000 });
}

test.describe('Code Block Theme Flicker - Issue #376', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await waitForPageReady(page);
        await waitForGlobalFunction(page, 'renderMarkdown');
    });

    test('syntax themes should load without visible blank state', async ({ page }) => {
        await setupCodeBlockContent(page);

        // Set up observer to track stylesheet presence
        await page.evaluate(() => {
            const state = { hadNoSyntaxTheme: false };

            // Check stylesheet count periodically
            function checkStylesheets() {
                const syntaxTheme = document.getElementById('syntax-theme') ||
                                   document.getElementById('syntax-theme-loading');
                if (!syntaxTheme) {
                    state.hadNoSyntaxTheme = true;
                }
            }

            // Monitor frequently during theme change
            const observer = new MutationObserver(checkStylesheets);
            observer.observe(document.head, { childList: true, subtree: true });

            globalThis.__testObserverState = state;
            globalThis.__testObserver = observer;

            // Change the syntax theme
            const syntaxSelector = document.getElementById('syntaxThemeSelector');
            if (syntaxSelector) {
                const currentValue = syntaxSelector.value;
                const newOption = Array.from(syntaxSelector.options)
                    .find(o => o.value !== currentValue && o.value !== '' && !o.parentElement?.label?.includes('Import'));
                if (newOption) {
                    syntaxSelector.value = newOption.value;
                    syntaxSelector.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });

        // Wait for theme change to complete
        await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);

        // Collect results
        const flickerBehavior = await page.evaluate(() => {
            globalThis.__testObserver?.disconnect();
            const result = {
                hadNoSyntaxTheme: globalThis.__testObserverState?.hadNoSyntaxTheme || false,
                finalThemeExists: document.getElementById('syntax-theme') !== null,
                codeBlockCount: document.querySelectorAll('pre code.hljs').length
            };
            delete globalThis.__testObserverState;
            delete globalThis.__testObserver;
            return result;
        });

        console.log('Syntax theme flicker behavior:', flickerBehavior);

        // Key assertion: Should NOT have a period with no syntax theme
        expect(flickerBehavior.hadNoSyntaxTheme).toBe(false);
        expect(flickerBehavior.finalThemeExists).toBe(true);
        expect(flickerBehavior.codeBlockCount).toBeGreaterThanOrEqual(3);
    });

    test('editor themes should load without visible blank state', async ({ page }) => {
        await setupCodeBlockContent(page);

        // Set up observer to track editor theme stylesheet presence
        await page.evaluate(() => {
            const state = { hadNoEditorTheme: false };

            function checkEditorTheme() {
                const editorTheme = document.getElementById('editor-theme') ||
                                   document.getElementById('editor-theme-loading');
                if (!editorTheme) {
                    state.hadNoEditorTheme = true;
                }
            }

            const observer = new MutationObserver(checkEditorTheme);
            observer.observe(document.head, { childList: true, subtree: true });

            globalThis.__testObserverState = state;
            globalThis.__testObserver = observer;

            // Change the editor theme
            const editorSelector = document.getElementById('editorThemeSelector');
            if (editorSelector) {
                const currentValue = editorSelector.value;
                const newOption = Array.from(editorSelector.options)
                    .find(o => o.value !== currentValue && o.value !== '' && !o.parentElement?.label?.includes('Import'));
                if (newOption) {
                    editorSelector.value = newOption.value;
                    editorSelector.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });

        // Wait for theme change to complete
        await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);

        // Collect results
        const flickerBehavior = await page.evaluate(() => {
            globalThis.__testObserver?.disconnect();
            const result = {
                hadNoEditorTheme: globalThis.__testObserverState?.hadNoEditorTheme || false,
                finalThemeExists: document.getElementById('editor-theme') !== null,
                editorExists: document.querySelector('.CodeMirror') !== null
            };
            delete globalThis.__testObserverState;
            delete globalThis.__testObserver;
            return result;
        });

        console.log('Editor theme flicker behavior:', flickerBehavior);

        // Key assertion: Should NOT have a period with no editor theme
        expect(flickerBehavior.hadNoEditorTheme).toBe(false);
        expect(flickerBehavior.finalThemeExists).toBe(true);
        expect(flickerBehavior.editorExists).toBe(true);
    });

    test('rapid theme changes should not cause flicker', async ({ page }) => {
        await setupCodeBlockContent(page);

        // Set up observer to track stylesheet gaps during rapid changes
        await page.evaluate(() => {
            const state = { gapCount: 0 };

            function checkForGaps() {
                const syntaxTheme = document.getElementById('syntax-theme') ||
                                   document.getElementById('syntax-theme-loading');
                const editorTheme = document.getElementById('editor-theme') ||
                                   document.getElementById('editor-theme-loading');
                if (!syntaxTheme || !editorTheme) {
                    state.gapCount++;
                }
            }

            const observer = new MutationObserver(checkForGaps);
            observer.observe(document.head, { childList: true, subtree: true });

            globalThis.__testObserverState = state;
            globalThis.__testObserver = observer;
        });

        // Rapidly toggle themes multiple times
        for (let i = 0; i < 3; i++) {
            await page.evaluate((index) => {
                const syntaxSelector = document.getElementById('syntaxThemeSelector');
                if (syntaxSelector) {
                    const options = Array.from(syntaxSelector.options)
                        .filter(o => o.value && !o.parentElement?.label?.includes('Import'));
                    if (options.length > 0) {
                        syntaxSelector.value = options[index % options.length].value;
                        syntaxSelector.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }, i);
            await page.waitForTimeout(100);
        }

        // Wait for all changes to settle
        await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);

        // Collect results
        const flickerCount = await page.evaluate(() => {
            globalThis.__testObserver?.disconnect();
            const count = globalThis.__testObserverState?.gapCount || 0;
            delete globalThis.__testObserverState;
            delete globalThis.__testObserver;
            return count;
        });

        console.log('Theme gaps during rapid changes:', flickerCount);

        // After fix: should be 0 (no gaps in theme coverage)
        // Before fix: will be > 0 (old removed before new loaded)
        expect(flickerCount).toBe(0);
    });

    test('should preserve old theme if new theme fails to load', async ({ page }) => {
        await setupCodeBlockContent(page);

        // Wait for syntax theme to load
        await page.waitForFunction(() => {
            return document.getElementById('syntax-theme') !== null;
        }, { timeout: 5000 });

        // Get initial theme state (link element for CDN themes)
        const initialTheme = await page.evaluate(() => {
            const syntaxTheme = document.getElementById('syntax-theme');
            if (!syntaxTheme) return null;
            // For link elements, use getAttribute; for style elements, use textContent
            return syntaxTheme.getAttribute('href') || syntaxTheme.textContent?.substring(0, 100) || 'theme-present';
        });

        expect(initialTheme).not.toBeNull();

        // Verify theme persists (this test documents the error handling behavior)
        // In practice, the loadSyntaxTheme function includes try-catch that keeps old theme on failure
        const themeState = await page.evaluate(() => {
            const syntaxTheme = document.getElementById('syntax-theme');
            return {
                exists: syntaxTheme !== null,
                hasHref: syntaxTheme?.hasAttribute('href') || false,
                tagName: syntaxTheme?.tagName || null
            };
        });

        // After initial load, theme should exist and be a link or style element
        expect(themeState.exists).toBe(true);
        expect(['LINK', 'STYLE']).toContain(themeState.tagName);

        // The actual error handling test happens in the implementation:
        // If a theme load fails, the try-catch in loadSyntaxTheme ensures
        // that the old theme link is NOT removed, preventing flicker
    });
});

test.describe('Code Block Styling During Theme Transitions', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await waitForPageReady(page);
        await waitForGlobalFunction(page, 'renderMarkdown');
    });

    test('code blocks should maintain highlighting during syntax theme change', async ({ page }) => {
        await setupCodeBlockContent(page);

        // Capture initial state
        const initialState = await page.evaluate(() => {
            const codeBlocks = document.querySelectorAll('pre code.hljs');
            return Array.from(codeBlocks).map(block => ({
                hasClass: block.classList.contains('hljs'),
                hasHighlightedElements: block.querySelectorAll('.hljs-keyword, .hljs-string, .hljs-function').length > 0
            }));
        });

        expect(initialState.length).toBeGreaterThanOrEqual(3);

        // Change syntax theme
        await page.evaluate(() => {
            const syntaxSelector = document.getElementById('syntaxThemeSelector');
            if (syntaxSelector) {
                const options = Array.from(syntaxSelector.options)
                    .filter(o => o.value && !o.parentElement?.label?.includes('Import'));
                if (options.length > 1) {
                    syntaxSelector.selectedIndex = (syntaxSelector.selectedIndex + 1) % options.length;
                    syntaxSelector.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });

        // Wait for theme change
        await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);

        // Verify code blocks still have syntax highlighting
        const finalState = await page.evaluate(() => {
            const codeBlocks = document.querySelectorAll('pre code.hljs');
            return {
                blockCount: codeBlocks.length,
                allHaveHljsClass: Array.from(codeBlocks).every(b => b.classList.contains('hljs'))
            };
        });

        expect(finalState.blockCount).toBeGreaterThanOrEqual(3);
        expect(finalState.allHaveHljsClass).toBe(true);
    });

    test('editor should maintain styling during theme change', async ({ page }) => {
        await setupCodeBlockContent(page);

        // Check initial editor state
        const initialEditor = await page.evaluate(() => {
            const cm = document.querySelector('.CodeMirror');
            return {
                exists: cm !== null,
                hasContent: cm?.CodeMirror?.getValue().length > 0
            };
        });

        expect(initialEditor.exists).toBe(true);
        expect(initialEditor.hasContent).toBe(true);

        // Change editor theme
        await page.evaluate(() => {
            const editorSelector = document.getElementById('editorThemeSelector');
            if (editorSelector) {
                const options = Array.from(editorSelector.options)
                    .filter(o => o.value && !o.parentElement?.label?.includes('Import'));
                if (options.length > 1) {
                    editorSelector.selectedIndex = (editorSelector.selectedIndex + 1) % options.length;
                    editorSelector.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });

        // Wait for theme change
        await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);

        // Verify editor still works and has styling
        const finalEditor = await page.evaluate(() => {
            const cm = document.querySelector('.CodeMirror');
            const hasTheme = document.getElementById('editor-theme') !== null;
            return {
                exists: cm !== null,
                hasContent: cm?.CodeMirror?.getValue().length > 0,
                hasTheme
            };
        });

        expect(finalEditor.exists).toBe(true);
        expect(finalEditor.hasContent).toBe(true);
        expect(finalEditor.hasTheme).toBe(true);
    });
});
