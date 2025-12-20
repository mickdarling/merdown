// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for Mermaid file support (Issue #367)
 *
 * Features tested:
 * - Pure Mermaid content detection using mermaid.parse()
 * - .mermaid and .mmd file extension support
 * - Auto-detection of pure Mermaid vs Markdown content
 * - Prevention of false positives (e.g., "pie is very tasty")
 */

test.describe('Mermaid File Support (Issue #367)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    });

    test.describe('Pure Mermaid Content Detection', () => {
        test('should render pure Gantt chart content as diagram', async ({ page }) => {
            const ganttContent = `gantt
    title A Gantt Diagram
    dateFormat YYYY-MM-DD
    section Section
        A task          :a1, 2014-01-01, 30d
        Another task    :after a1, 20d`;

            await page.evaluate((content) => {
                globalThis.state.documentMode = null; // Reset to auto-detect
                globalThis.state.cmEditor.setValue(content);
            }, ganttContent);

            // Wait for render
            await page.waitForTimeout(2000);

            // Check if mermaid diagram rendered with SVG
            const hasMermaidSvg = await page.evaluate(() => {
                const mermaidEl = document.querySelector('.mermaid');
                return mermaidEl && mermaidEl.querySelector('svg') !== null;
            });

            expect(hasMermaidSvg).toBe(true);
        });

        test('should render pure flowchart content as diagram', async ({ page }) => {
            const flowchartContent = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Fix it]
    D --> B`;

            await page.evaluate((content) => {
                globalThis.state.documentMode = null;
                globalThis.state.cmEditor.setValue(content);
            }, flowchartContent);

            await page.waitForTimeout(2000);

            const hasMermaidSvg = await page.evaluate(() => {
                const mermaidEl = document.querySelector('.mermaid');
                return mermaidEl && mermaidEl.querySelector('svg') !== null;
            });

            expect(hasMermaidSvg).toBe(true);
        });

        test('should render pure sequence diagram as diagram', async ({ page }) => {
            const sequenceContent = `sequenceDiagram
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: I'm good thanks!`;

            await page.evaluate((content) => {
                globalThis.state.documentMode = null;
                globalThis.state.cmEditor.setValue(content);
            }, sequenceContent);

            await page.waitForTimeout(2000);

            const hasMermaidSvg = await page.evaluate(() => {
                const mermaidEl = document.querySelector('.mermaid');
                return mermaidEl && mermaidEl.querySelector('svg') !== null;
            });

            expect(hasMermaidSvg).toBe(true);
        });

        test('should render pure pie chart as diagram', async ({ page }) => {
            const pieContent = `pie title Pets adopted
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`;

            await page.evaluate((content) => {
                globalThis.state.documentMode = null;
                globalThis.state.cmEditor.setValue(content);
            }, pieContent);

            await page.waitForTimeout(2000);

            const hasMermaidSvg = await page.evaluate(() => {
                const mermaidEl = document.querySelector('.mermaid');
                return mermaidEl && mermaidEl.querySelector('svg') !== null;
            });

            expect(hasMermaidSvg).toBe(true);
        });
    });

    test.describe('False Positive Prevention', () => {
        test('should NOT render "pie is very tasty" as pie chart', async ({ page }) => {
            await page.evaluate(() => {
                globalThis.state.documentMode = null;
                globalThis.state.cmEditor.setValue('pie is very tasty and I love it');
            });

            await page.waitForTimeout(1500);

            const hasMermaid = await page.evaluate(() => {
                return document.querySelector('.mermaid') !== null;
            });

            expect(hasMermaid).toBe(false);
        });

        test('should NOT render "graph theory is interesting" as graph', async ({ page }) => {
            await page.evaluate(() => {
                globalThis.state.documentMode = null;
                globalThis.state.cmEditor.setValue('graph theory is a fascinating branch of mathematics');
            });

            await page.waitForTimeout(1500);

            const hasMermaid = await page.evaluate(() => {
                return document.querySelector('.mermaid') !== null;
            });

            expect(hasMermaid).toBe(false);
        });

        test('should NOT render "journey to the center of the earth" as journey diagram', async ({ page }) => {
            await page.evaluate(() => {
                globalThis.state.documentMode = null;
                globalThis.state.cmEditor.setValue('journey to the center of the earth is a classic novel');
            });

            await page.waitForTimeout(1500);

            const hasMermaid = await page.evaluate(() => {
                return document.querySelector('.mermaid') !== null;
            });

            expect(hasMermaid).toBe(false);
        });
    });

    test.describe('Markdown with Mermaid Fences', () => {
        test('should render markdown with mermaid fences as markdown', async ({ page }) => {
            const markdownContent = `# My Document

Here is a diagram:

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

And some more text.`;

            await page.evaluate((content) => {
                globalThis.state.documentMode = null;
                globalThis.state.cmEditor.setValue(content);
            }, markdownContent);

            await page.waitForTimeout(2000);

            // Should have both heading and mermaid diagram
            const result = await page.evaluate(() => {
                const wrapper = document.querySelector('#preview #wrapper');
                const h1 = wrapper?.querySelector('h1');
                const mermaidEl = wrapper?.querySelector('.mermaid');
                return {
                    hasHeading: h1?.textContent?.includes('My Document') ?? false,
                    hasMermaid: mermaidEl !== null
                };
            });

            expect(result.hasHeading).toBe(true);
            expect(result.hasMermaid).toBe(true);
        });
    });

    test.describe('Document Mode', () => {
        test('should respect documentMode=mermaid for file extension', async ({ page }) => {
            // Simulate loading a .mermaid file
            await page.evaluate(() => {
                globalThis.state.documentMode = 'mermaid';
                globalThis.state.cmEditor.setValue('graph TD\n    A --> B');
            });

            await page.waitForTimeout(2000);

            const hasMermaidSvg = await page.evaluate(() => {
                const mermaidEl = document.querySelector('.mermaid');
                return mermaidEl && mermaidEl.querySelector('svg') !== null;
            });

            expect(hasMermaidSvg).toBe(true);
        });

        test('should respect documentMode=markdown even for pure mermaid content', async ({ page }) => {
            // documentMode=markdown should force markdown rendering
            // Pure mermaid without fences will be treated as plain text
            await page.evaluate(() => {
                globalThis.state.documentMode = 'markdown';
                globalThis.state.cmEditor.setValue('graph TD\n    A --> B');
            });

            await page.waitForTimeout(2000);

            // Should NOT be rendered as a single Mermaid diagram
            // It should be rendered as plain text/paragraph
            const result = await page.evaluate(() => {
                const wrapper = document.querySelector('#preview #wrapper');
                const mermaidWithSvg = wrapper?.querySelector('.mermaid svg');
                const innerText = wrapper?.innerText || '';
                return {
                    hasMermaidSvg: mermaidWithSvg !== null,
                    // Plain text rendering will show the mermaid syntax as text
                    includesGraphText: innerText.includes('graph') || innerText.includes('A')
                };
            });

            // When documentMode is 'markdown', pure mermaid content without fences
            // should NOT render as a diagram - it should be plain text
            expect(result.hasMermaidSvg).toBe(false);
            expect(result.includesGraphText).toBe(true);
        });
    });

    test.describe('File Validation', () => {
        test('isValidMarkdownFile should accept .mermaid extension', async ({ page }) => {
            const isValid = await page.evaluate(() => {
                return globalThis.isValidMarkdownFile({ type: '', name: 'diagram.mermaid' });
            });
            expect(isValid).toBe(true);
        });

        test('isValidMarkdownFile should accept .mmd extension', async ({ page }) => {
            const isValid = await page.evaluate(() => {
                return globalThis.isValidMarkdownFile({ type: '', name: 'diagram.mmd' });
            });
            expect(isValid).toBe(true);
        });

        test('isValidMarkdownFile should accept text/vnd.mermaid MIME type', async ({ page }) => {
            const isValid = await page.evaluate(() => {
                return globalThis.isValidMarkdownFile({ type: 'text/vnd.mermaid', name: 'diagram' });
            });
            expect(isValid).toBe(true);
        });
    });

    test.describe('Mermaid with Frontmatter', () => {
        test('should render pure mermaid with YAML frontmatter', async ({ page }) => {
            const mermaidWithFrontmatter = `---
title: My Diagram
---
graph TD
    A[Start] --> B[End]`;

            await page.evaluate((content) => {
                globalThis.state.documentMode = null;
                globalThis.state.cmEditor.setValue(content);
            }, mermaidWithFrontmatter);

            await page.waitForTimeout(2000);

            const result = await page.evaluate(() => {
                const mermaidEl = document.querySelector('.mermaid');
                const yamlPanel = document.querySelector('.yaml-front-matter');
                return {
                    hasMermaidSvg: mermaidEl && mermaidEl.querySelector('svg') !== null,
                    hasYamlPanel: yamlPanel !== null
                };
            });

            expect(result.hasMermaidSvg).toBe(true);
            expect(result.hasYamlPanel).toBe(true);
        });
    });
});
