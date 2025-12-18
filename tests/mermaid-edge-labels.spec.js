/**
 * Test for issue #327: Mermaid diagram edge labels should not be struck through by arrows
 * Verifies that DOMPurify preserves style attributes and foreignObject HTML content
 * required for proper text positioning in Mermaid diagrams
 */

const { test, expect } = require('@playwright/test');

test.describe('Mermaid Edge Labels', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080');
        await page.waitForLoadState('networkidle');
    });

    test('edge label foreignObjects should preserve style attributes', async ({ page }) => {
        // Load test markdown with edge labels
        const markdown = `
# Test Edge Labels

\`\`\`mermaid
graph LR
    A[Start] -->|Label 1| B[Middle]
    B -->|Label 2| C[End]
\`\`\`
        `;

        await page.evaluate((md) => {
            const editor = document.querySelector('.CodeMirror').CodeMirror;
            editor.setValue(md);
        }, markdown);

        // Wait for Mermaid to render
        await page.waitForSelector('.mermaid svg', { timeout: 5000 });

        // Verify edge label foreignObjects exist and have inline styles preserved
        const styleInfo = await page.evaluate(() => {
            const foreignObjects = document.querySelectorAll('.mermaid svg .edgeLabel foreignObject');
            if (foreignObjects.length === 0) return null;

            let hasStyleAttr = false;
            let hasHtmlContent = false;

            foreignObjects.forEach(fo => {
                // Check for style attribute on foreignObject or its children
                if (fo.hasAttribute('style') || fo.querySelector('[style]')) {
                    hasStyleAttr = true;
                }
                // Check for HTML elements inside foreignObject (div, span)
                if (fo.querySelector('div') || fo.querySelector('span')) {
                    hasHtmlContent = true;
                }
            });

            return {
                count: foreignObjects.length,
                hasStyleAttr,
                hasHtmlContent
            };
        });

        // Should have foreignObjects with style attributes and HTML content
        expect(styleInfo).not.toBeNull();
        expect(styleInfo.count).toBeGreaterThan(0);
        expect(styleInfo.hasStyleAttr).toBe(true);
        expect(styleInfo.hasHtmlContent).toBe(true);
    });

    test('sponsor page diagram should render with properly positioned edge labels', async ({ page }) => {
        // Load the sponsor page
        await page.goto('http://localhost:8080/?url=docs/sponsor.md');
        await page.waitForLoadState('networkidle');

        // Wait for Mermaid to render
        await page.waitForSelector('.mermaid svg', { timeout: 5000 });

        // Check that edge labels exist (the sponsor diagram has 2 labeled edges: "Sponsor" and "Free for Everyone")
        const edgeLabels = await page.locator('.mermaid svg .edgeLabel').count();
        expect(edgeLabels).toBeGreaterThan(0);

        // Verify foreignObjects have preserved styles for proper positioning
        const hasPreservedStyles = await page.evaluate(() => {
            const foreignObjects = document.querySelectorAll('.mermaid svg .edgeLabel foreignObject');
            if (foreignObjects.length === 0) return false;

            // Check if any foreignObject or its children have style attributes
            for (const fo of foreignObjects) {
                if (fo.hasAttribute('style') || fo.querySelector('[style]')) {
                    return true;
                }
            }
            return false;
        });

        expect(hasPreservedStyles).toBe(true);
    });

    test('DOMPurify config should preserve SVG attributes for text positioning', async ({ page }) => {
        // Load a simple test diagram
        const markdown = `
\`\`\`mermaid
graph LR
    A -->|Test| B
\`\`\`
        `;

        await page.evaluate((md) => {
            const editor = document.querySelector('.CodeMirror').CodeMirror;
            editor.setValue(md);
        }, markdown);

        await page.waitForSelector('.mermaid svg', { timeout: 5000 });

        // Verify SVG has style attributes (not stripped by DOMPurify)
        const svgHasStyles = await page.evaluate(() => {
            const svg = document.querySelector('.mermaid svg');
            if (!svg) return false;

            // Check if SVG or its descendants have style attributes
            const elementsWithStyle = svg.querySelectorAll('[style]');
            return elementsWithStyle.length > 0;
        });

        expect(svgHasStyles).toBe(true);
    });
});
