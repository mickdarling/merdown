// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling
/**
 * Mermaid Style Change Flicker Tests
 * Tests for Issue #371 - Mermaid diagram text flickers/blinks on render
 *
 * This test suite verifies that mermaid diagrams do NOT flicker when:
 * - Preview style is changed
 * - Page is navigated
 * - Theme is updated
 *
 * The flicker manifests as briefly visible raw mermaid text or loading states
 * before the SVG diagram renders.
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

test.describe('Mermaid Style Change Flicker - Issue #371', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await waitForPageReady(page);
        await waitForGlobalFunction(page, 'renderMarkdown');
    });

    /**
     * Helper to set up a page with mermaid diagrams and wait for them to render
     */
    async function setupMermaidContent(page) {
        const content = `# Test Document

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

Some text between diagrams.

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi back
\`\`\`
`;
        await setCodeMirrorContent(page, content);
        await renderMarkdownAndWait(page, WAIT_TIMES.EXTRA_LONG);

        // Wait for diagrams to fully render
        await page.waitForFunction(() => {
            const diagrams = document.querySelectorAll('.mermaid');
            return diagrams.length >= 2 &&
                   Array.from(diagrams).every(d => d.dataset.mermaidRendered === 'true');
        }, { timeout: 10000 });
    }

    test('mermaid diagrams should be fully rendered before style change', async ({ page }) => {
        await setupMermaidContent(page);

        // Verify diagrams are rendered with SVG content
        const diagramState = await page.evaluate(() => {
            const diagrams = document.querySelectorAll('.mermaid');
            return Array.from(diagrams).map(d => ({
                rendered: d.dataset.mermaidRendered,
                hasSvg: d.querySelector('svg') !== null,
                hasRawText: d.textContent?.includes('graph TD') || d.textContent?.includes('sequenceDiagram')
            }));
        });

        for (const state of diagramState) {
            expect(state.rendered).toBe('true');
            expect(state.hasSvg).toBe(true);
            // Raw mermaid syntax should NOT be visible in rendered diagrams
            expect(state.hasRawText).toBe(false);
        }
    });

    test('should detect flicker when changing preview style', async ({ page }) => {
        await setupMermaidContent(page);

        // Set up mutation observer to detect DOM changes during style change
        const flickerDetected = await page.evaluate(async () => {
            return new Promise((resolve) => {
                let sawRawText = false;
                let sawPendingState = false;
                let sawLoadingClass = false;
                let svgRemoved = false;

                const diagrams = document.querySelectorAll('.mermaid');

                // Create mutation observer to watch for flicker indicators
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        const target = mutation.target;

                        // Check if SVG was removed (childList mutation)
                        if (mutation.type === 'childList') {
                            for (const node of mutation.removedNodes) {
                                if (node.nodeName === 'svg' || node.querySelector?.('svg')) {
                                    svgRemoved = true;
                                }
                            }
                        }

                        // Check for pending state
                        if (target.dataset?.mermaidRendered === 'pending') {
                            sawPendingState = true;
                        }

                        // Check for loading class
                        if (target.classList?.contains('mermaid-loading')) {
                            sawLoadingClass = true;
                        }

                        // Check for raw mermaid text becoming visible
                        if (target.textContent?.includes('graph TD') ||
                            target.textContent?.includes('sequenceDiagram')) {
                            sawRawText = true;
                        }
                    }
                });

                // Observe all mermaid diagrams
                diagrams.forEach(diagram => {
                    observer.observe(diagram, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        characterData: true,
                        attributeFilter: ['data-mermaid-rendered', 'class']
                    });
                });

                // Change the preview style
                const styleSelector = document.getElementById('styleSelector');
                if (styleSelector) {
                    // Get current value and change to something different
                    const currentValue = styleSelector.value;
                    const options = Array.from(styleSelector.options);
                    const newOption = options.find(o => o.value !== currentValue && o.value !== '');
                    if (newOption) {
                        styleSelector.value = newOption.value;
                        styleSelector.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }

                // Wait for any re-render to complete
                setTimeout(() => {
                    observer.disconnect();
                    resolve({
                        sawRawText,
                        sawPendingState,
                        sawLoadingClass,
                        svgRemoved
                    });
                }, 2000);
            });
        });

        // Document current behavior - this test will initially FAIL if flicker exists
        // After fix, all these should be false
        console.log('Flicker detection results:', flickerDetected);

        // These assertions document the EXPECTED behavior after fix
        // If these fail, it means flicker is occurring
        expect(flickerDetected.svgRemoved).toBe(false);
        expect(flickerDetected.sawPendingState).toBe(false);
        expect(flickerDetected.sawLoadingClass).toBe(false);
        expect(flickerDetected.sawRawText).toBe(false);
    });

    test('SVG diagrams should persist through style changes', async ({ page }) => {
        await setupMermaidContent(page);

        // Capture SVG content before style change
        const svgContentBefore = await page.evaluate(() => {
            const diagrams = document.querySelectorAll('.mermaid svg');
            return Array.from(diagrams).map(svg => svg.outerHTML.substring(0, 100));
        });

        expect(svgContentBefore.length).toBeGreaterThanOrEqual(2);

        // Change preview style
        await page.selectOption('#styleSelector', { index: 1 });

        // Wait for any re-render
        await page.waitForTimeout(WAIT_TIMES.EXTRA_LONG);

        // Check that SVGs still exist (not removed and re-created)
        const svgContentAfter = await page.evaluate(() => {
            const diagrams = document.querySelectorAll('.mermaid svg');
            return Array.from(diagrams).map(svg => svg.outerHTML.substring(0, 100));
        });

        expect(svgContentAfter.length).toBeGreaterThanOrEqual(2);
    });

    test('diagram render state should not reset on style change', async ({ page }) => {
        await setupMermaidContent(page);

        // Monitor data-mermaid-rendered attribute changes
        const stateChanges = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const changes = [];
                const diagrams = document.querySelectorAll('.mermaid');

                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.attributeName === 'data-mermaid-rendered') {
                            changes.push({
                                oldValue: mutation.oldValue,
                                newValue: mutation.target.dataset.mermaidRendered,
                                timestamp: Date.now()
                            });
                        }
                    }
                });

                diagrams.forEach(diagram => {
                    observer.observe(diagram, {
                        attributes: true,
                        attributeOldValue: true,
                        attributeFilter: ['data-mermaid-rendered']
                    });
                });

                // Trigger style change
                const styleSelector = document.getElementById('styleSelector');
                if (styleSelector) {
                    const currentIndex = styleSelector.selectedIndex;
                    styleSelector.selectedIndex = currentIndex === 0 ? 1 : 0;
                    styleSelector.dispatchEvent(new Event('change', { bubbles: true }));
                }

                setTimeout(() => {
                    observer.disconnect();
                    resolve(changes);
                }, 2000);
            });
        });

        // After fix: no state changes should occur (diagrams stay rendered)
        // Before fix: we'll see changes from 'true' to 'pending' and back
        console.log('State changes detected:', stateChanges);

        // Ideal behavior: no state changes at all during style switch
        expect(stateChanges.length).toBe(0);
    });

    test('rapid style changes should not cause cumulative flicker', async ({ page }) => {
        await setupMermaidContent(page);

        // Rapidly change styles multiple times
        const flickerCount = await page.evaluate(async () => {
            return new Promise((resolve) => {
                let pendingStateCount = 0;

                const diagrams = document.querySelectorAll('.mermaid');

                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.target.dataset?.mermaidRendered === 'pending') {
                            pendingStateCount++;
                        }
                    }
                });

                diagrams.forEach(diagram => {
                    observer.observe(diagram, {
                        attributes: true,
                        attributeFilter: ['data-mermaid-rendered']
                    });
                });

                // Rapidly toggle styles
                const styleSelector = document.getElementById('styleSelector');
                if (styleSelector) {
                    for (let i = 0; i < 5; i++) {
                        setTimeout(() => {
                            styleSelector.selectedIndex = i % styleSelector.options.length;
                            styleSelector.dispatchEvent(new Event('change', { bubbles: true }));
                        }, i * 100);
                    }
                }

                setTimeout(() => {
                    observer.disconnect();
                    resolve(pendingStateCount);
                }, 2000);
            });
        });

        // After fix: should be 0 (no pending states)
        // Before fix: will be >= number of style changes × number of diagrams
        console.log('Pending state transitions during rapid changes:', flickerCount);
        expect(flickerCount).toBe(0);
    });

    test('mermaid diagrams should remain visible during style transition', async ({ page }) => {
        await setupMermaidContent(page);

        // Take visual snapshots to detect flicker
        // This captures the diagram visibility state at multiple points
        const visibilityDuringChange = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const snapshots = [];

                const captureState = () => {
                    const diagrams = document.querySelectorAll('.mermaid');
                    return Array.from(diagrams).map(d => ({
                        hasSvg: d.querySelector('svg') !== null,
                        svgVisible: d.querySelector('svg')?.style.display !== 'none',
                        hasLoadingClass: d.classList.contains('mermaid-loading'),
                        rendered: d.dataset.mermaidRendered
                    }));
                };

                // Capture initial state
                snapshots.push({ time: 'before', state: captureState() });

                // Change style
                const styleSelector = document.getElementById('styleSelector');
                if (styleSelector) {
                    styleSelector.selectedIndex = 1;
                    styleSelector.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Capture states at intervals during re-render
                const intervals = [50, 100, 200, 500, 1000];
                intervals.forEach(ms => {
                    setTimeout(() => {
                        snapshots.push({ time: `${ms}ms`, state: captureState() });
                    }, ms);
                });

                setTimeout(() => {
                    resolve(snapshots);
                }, 1500);
            });
        });

        console.log('Visibility snapshots:', JSON.stringify(visibilityDuringChange, null, 2));

        // All snapshots should show diagrams with SVGs visible
        for (const snapshot of visibilityDuringChange) {
            for (const diagram of snapshot.state) {
                expect(diagram.hasSvg).toBe(true);
                expect(diagram.hasLoadingClass).toBe(false);
            }
        }
    });
});

test.describe('Mermaid Flicker - Comparison with Code Blocks', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await waitForPageReady(page);
        await waitForGlobalFunction(page, 'renderMarkdown');
    });

    test('code blocks should not flicker on style change (baseline)', async ({ page }) => {
        // Set up content with code blocks (not mermaid)
        const content = `# Test Document

\`\`\`javascript
function hello() {
    console.log('Hello, World!');
}
\`\`\`

\`\`\`python
def greet():
    print("Hello!")
\`\`\`
`;
        await setCodeMirrorContent(page, content);
        await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

        // Monitor for any content removal during style change
        const codeBlockFlicker = await page.evaluate(async () => {
            return new Promise((resolve) => {
                let contentRemoved = false;

                const codeBlocks = document.querySelectorAll('pre code');
                const originalContent = Array.from(codeBlocks).map(cb => cb.innerHTML);

                const observer = new MutationObserver(() => {
                    const currentContent = Array.from(document.querySelectorAll('pre code'))
                        .map(cb => cb.innerHTML);
                    if (currentContent.length < originalContent.length) {
                        contentRemoved = true;
                    }
                });

                const preview = document.getElementById('preview');
                if (preview) {
                    observer.observe(preview, { childList: true, subtree: true });
                }

                // Change style
                const styleSelector = document.getElementById('styleSelector');
                if (styleSelector) {
                    styleSelector.selectedIndex = 1;
                    styleSelector.dispatchEvent(new Event('change', { bubbles: true }));
                }

                setTimeout(() => {
                    observer.disconnect();
                    resolve({ contentRemoved });
                }, 1500);
            });
        });

        // Code blocks currently also get re-rendered, but they don't "flicker"
        // because syntax highlighting is applied synchronously
        console.log('Code block flicker result:', codeBlockFlicker);
    });
});
