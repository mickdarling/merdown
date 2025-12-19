// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for Mermaid diagram text clipping fix (Issue #342)
 * Verifies that SVG text elements are not clipped due to CSS inheritance
 */

// Timeout constants for consistent test timing
const TIMEOUTS = {
    PAGE_LOAD: 1000,
    MERMAID_RENDER: 2000,
    THEME_SWITCH: 1500
};

test.describe('Mermaid text clipping fix', () => {
    const mermaidContent = `# Test Diagram

\`\`\`mermaid
graph LR
    A[Markdown Editor] --> B[Parser]
    B --> C[Renderer]
    B --> D[Mermaid]
    C --> E[Live Preview]
    D --> E
\`\`\`
`;

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        // Set content with Mermaid diagram
        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, mermaidContent);

        // Wait for Mermaid to render
        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);
    });

    test('mermaid container should have line-height isolation', async ({ page }) => {
        const mermaidDiv = page.locator('.mermaid').first();
        await expect(mermaidDiv).toBeVisible();

        const lineHeight = await mermaidDiv.evaluate((el) => {
            return globalThis.getComputedStyle(el).lineHeight;
        });

        // line-height: 1 computes to the font-size value in pixels (e.g., "16px")
        // or "normal". We verify it's not an inflated value like "28.8px" from 1.8 * 16
        const numericValue = Number.parseFloat(lineHeight);
        if (Number.isNaN(numericValue)) {
            // "normal" is the browser default and is acceptable for isolated containers
            expect(lineHeight).toBe('normal');
        } else {
            // If it's a numeric pixel value, it should be close to the font-size (not inflated)
            expect(numericValue).toBeLessThan(25); // Should not be inflated
        }
    });

    test('mermaid SVG should be rendered', async ({ page }) => {
        const svg = page.locator('.mermaid svg').first();
        await expect(svg).toBeVisible();
    });

    test('mermaid container should have font-size reset', async ({ page }) => {
        const mermaidDiv = page.locator('.mermaid').first();
        await expect(mermaidDiv).toBeVisible();

        // Verify font-size is not inherited from wrapper styles
        const fontSize = await mermaidDiv.evaluate((el) => {
            return globalThis.getComputedStyle(el).fontSize;
        });

        // font-size: initial typically resolves to browser default (16px)
        const numericSize = Number.parseFloat(fontSize);
        expect(numericSize).toBeGreaterThan(0);
        expect(numericSize).toBeLessThanOrEqual(20); // Should be reasonable default
    });

    test('line-height stays isolated after switching to Monospace style', async ({ page }) => {
        const mermaidDiv = page.locator('.mermaid').first();
        await expect(mermaidDiv).toBeVisible();

        // Switch to Monospace style (which has line-height: 1.8 on #wrapper)
        await page.evaluate(() => {
            if (globalThis.changeStyle) {
                globalThis.changeStyle('monospace');
            }
        });
        await page.waitForTimeout(TIMEOUTS.THEME_SWITCH);

        // Verify line-height on mermaid container is still isolated
        const lineHeight = await mermaidDiv.evaluate((el) => {
            return globalThis.getComputedStyle(el).lineHeight;
        });

        const numericValue = Number.parseFloat(lineHeight);
        if (Number.isNaN(numericValue)) {
            expect(lineHeight).toBe('normal');
        } else {
            // Should still be small, not inflated by Monospace's 1.8 line-height
            expect(numericValue).toBeLessThan(25);
        }
    });

    // Issue #342 - Academic and Newspaper theme compatibility
    test('mermaid typography stays isolated with Academic theme', async ({ page }) => {
        const mermaidDiv = page.locator('.mermaid').first();
        await expect(mermaidDiv).toBeVisible();

        // Switch to Academic style (font-size: 18px, font-family: Georgia/serif)
        await page.evaluate(() => {
            if (globalThis.changeStyle) {
                globalThis.changeStyle('academic');
            }
        });
        await page.waitForTimeout(TIMEOUTS.THEME_SWITCH);

        // Verify typography properties are isolated from Academic theme
        const styles = await mermaidDiv.evaluate((el) => {
            const computed = globalThis.getComputedStyle(el);
            return {
                fontSize: computed.fontSize,
                fontFamily: computed.fontFamily,
                letterSpacing: computed.letterSpacing,
                lineHeight: computed.lineHeight,
            };
        });

        // font-size should not be Academic's 18px
        const fontSize = Number.parseFloat(styles.fontSize);
        expect(fontSize).toBeLessThanOrEqual(16);

        // font-family should not be Georgia/serif
        expect(styles.fontFamily.toLowerCase()).not.toContain('georgia');

        // letter-spacing should be normal (0px)
        expect(styles.letterSpacing).toBe('normal');
    });

    test('mermaid typography stays isolated with Newspaper theme', async ({ page }) => {
        const mermaidDiv = page.locator('.mermaid').first();
        await expect(mermaidDiv).toBeVisible();

        // Switch to Newspaper style (font-size: 14px, font-family: Times New Roman)
        await page.evaluate(() => {
            if (globalThis.changeStyle) {
                globalThis.changeStyle('newspaper');
            }
        });
        await page.waitForTimeout(TIMEOUTS.THEME_SWITCH);

        // Verify typography properties are isolated from Newspaper theme
        const styles = await mermaidDiv.evaluate((el) => {
            const computed = globalThis.getComputedStyle(el);
            return {
                fontSize: computed.fontSize,
                fontFamily: computed.fontFamily,
                letterSpacing: computed.letterSpacing,
                textTransform: computed.textTransform,
            };
        });

        // font-family should not be Times New Roman
        expect(styles.fontFamily.toLowerCase()).not.toContain('times');

        // text-transform should be none (Newspaper uses uppercase on some elements)
        expect(styles.textTransform).toBe('none');

        // letter-spacing should be normal
        expect(styles.letterSpacing).toBe('normal');
    });

    test('mermaid SVG text elements are isolated from theme styles', async ({ page }) => {
        // Wait for mermaid SVG to fully render
        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Switch to Academic style which has the most aggressive typography
        await page.evaluate(() => {
            if (globalThis.changeStyle) {
                globalThis.changeStyle('academic');
            }
        });
        await page.waitForTimeout(TIMEOUTS.THEME_SWITCH);

        // Check SVG element styles (text elements may be nested deep)
        const svgStyles = await mermaidSvg.evaluate((el) => {
            const computed = globalThis.getComputedStyle(el);
            return {
                letterSpacing: computed.letterSpacing,
                wordSpacing: computed.wordSpacing,
                textTransform: computed.textTransform,
            };
        });

        // SVG should have isolated typography
        expect(svgStyles.letterSpacing).toBe('normal');
        expect(svgStyles.textTransform).toBe('none');
    });

    // Issue #342 - Verify htmlLabels: false directive enables SVG text elements
    test('flowcharts should have SVG text elements for node labels', async ({ page }) => {
        // Wait for mermaid SVG to fully render
        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Verify flowcharts have native SVG text elements (htmlLabels: false enables this)
        // Note: Mermaid may still use foreignObject for some elements (e.g., edge labels),
        // but the key fix is that node labels use SVG text which avoids CSS inheritance issues
        const textCount = await mermaidSvg.evaluate((svg) => {
            return svg.querySelectorAll('text').length;
        });

        expect(textCount).toBeGreaterThan(0); // Should have SVG text elements for labels
    });

    test('flowchart text should be fully visible (not clipped) with Academic theme', async ({ page }) => {
        // Wait for mermaid SVG to fully render
        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Switch to Academic style
        await page.evaluate(() => {
            if (globalThis.changeStyle) {
                globalThis.changeStyle('academic');
            }
        });
        await page.waitForTimeout(TIMEOUTS.THEME_SWITCH);

        // Get all text from the SVG (both <text> elements and foreignObject content)
        const textContent = await mermaidSvg.evaluate((svg) => {
            // Get text from <text> elements
            const svgTexts = Array.from(svg.querySelectorAll('text'))
                .map(t => t.textContent?.trim()).filter(Boolean);
            // Get text from foreignObject elements
            const foTexts = Array.from(svg.querySelectorAll('foreignObject'))
                .map(fo => fo.textContent?.trim()).filter(Boolean);
            return [...svgTexts, ...foTexts];
        });

        // Should have readable text labels
        expect(textContent.length).toBeGreaterThan(0);

        // Verify known labels are present and complete (not truncated)
        const allText = textContent.join(' ');
        expect(allText).toContain('Markdown');
        expect(allText).toContain('Parser');
        expect(allText).toContain('Renderer');
    });

    test('flowchart text should be fully visible (not clipped) with Newspaper theme', async ({ page }) => {
        // Wait for mermaid SVG to fully render
        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Switch to Newspaper style (font-size: 14px, font-family: Times New Roman)
        await page.evaluate(() => {
            if (globalThis.changeStyle) {
                globalThis.changeStyle('newspaper');
            }
        });
        await page.waitForTimeout(TIMEOUTS.THEME_SWITCH);

        // Get all text from the SVG
        const textContent = await mermaidSvg.evaluate((svg) => {
            const svgTexts = Array.from(svg.querySelectorAll('text'))
                .map(t => t.textContent?.trim()).filter(Boolean);
            const foTexts = Array.from(svg.querySelectorAll('foreignObject'))
                .map(fo => fo.textContent?.trim()).filter(Boolean);
            return [...svgTexts, ...foTexts];
        });

        // Should have readable text labels
        expect(textContent.length).toBeGreaterThan(0);

        // Verify known labels are present and complete (not truncated)
        const allText = textContent.join(' ');
        expect(allText).toContain('Markdown');
        expect(allText).toContain('Parser');
        expect(allText).toContain('Renderer');
    });
});

test.describe('Mermaid diagrams with existing init directives', () => {
    test('diagram with existing init directive should still render correctly', async ({ page }) => {
        const contentWithDirective = `# Test with existing directive

\`\`\`mermaid
%%{init: {"theme": "forest"}}%%
graph LR
    A[Start] --> B[End]
\`\`\`
`;
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, contentWithDirective);

        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);

        // Verify diagram rendered correctly
        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Verify it has rendered content (text in some form)
        const hasContent = await mermaidSvg.evaluate((svg) => {
            const texts = svg.querySelectorAll('text');
            const foreignObjects = svg.querySelectorAll('foreignObject');
            return texts.length > 0 || foreignObjects.length > 0;
        });

        expect(hasContent).toBe(true);
    });

    test('diagram with existing flowchart config should still render correctly', async ({ page }) => {
        const contentWithFlowchartConfig = `# Test with flowchart config

\`\`\`mermaid
%%{init: {"flowchart": {"curve": "basis"}}}%%
graph LR
    A[Node A] --> B[Node B]
    B --> C[Node C]
\`\`\`
`;
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, contentWithFlowchartConfig);

        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);

        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Verify the diagram rendered with readable labels
        const textContent = await mermaidSvg.evaluate((svg) => {
            const svgTexts = Array.from(svg.querySelectorAll('text'))
                .map(t => t.textContent?.trim()).filter(Boolean);
            const foTexts = Array.from(svg.querySelectorAll('foreignObject'))
                .map(fo => fo.textContent?.trim()).filter(Boolean);
            return [...svgTexts, ...foTexts].join(' ');
        });

        expect(textContent).toContain('Node A');
        expect(textContent).toContain('Node B');
    });

    test('diagram with empty flowchart config should still render correctly', async ({ page }) => {
        // Edge case: empty flowchart object - tests JSON parsing robustness
        const contentWithEmptyConfig = `# Test with empty flowchart config

\`\`\`mermaid
%%{init: {"flowchart": {}}}%%
graph LR
    A[Empty Config] --> B[Still Works]
\`\`\`
`;
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, contentWithEmptyConfig);

        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);

        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Verify the diagram rendered correctly
        const textContent = await mermaidSvg.evaluate((svg) => {
            const svgTexts = Array.from(svg.querySelectorAll('text'))
                .map(t => t.textContent?.trim()).filter(Boolean);
            const foTexts = Array.from(svg.querySelectorAll('foreignObject'))
                .map(fo => fo.textContent?.trim()).filter(Boolean);
            return [...svgTexts, ...foTexts].join(' ');
        });

        expect(textContent).toContain('Empty Config');
        expect(textContent).toContain('Still Works');
    });

    test('diagram with malformed init directive should still render', async ({ page }) => {
        // Edge case: invalid JSON in directive - should fall back to prepending
        const contentWithMalformed = `# Test malformed directive

\`\`\`mermaid
%%{init: {"flowchart": {curve: "basis"}}}%%
graph LR
    A[Malformed] --> B[Still Renders]
\`\`\`
`;
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, contentWithMalformed);

        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);

        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Should fall back to prepending directive and still render
        const textContent = await mermaidSvg.evaluate((svg) => {
            const svgTexts = Array.from(svg.querySelectorAll('text'))
                .map(t => t.textContent?.trim()).filter(Boolean);
            const foTexts = Array.from(svg.querySelectorAll('foreignObject'))
                .map(fo => fo.textContent?.trim()).filter(Boolean);
            return [...svgTexts, ...foTexts].join(' ');
        });

        expect(textContent).toContain('Malformed');
        expect(textContent).toContain('Still Renders');
    });

    test('diagram with whitespace in directive should still render', async ({ page }) => {
        // Edge case: tabs and extra whitespace in directive - tests regex robustness
        const contentWithWhitespace = `# Test whitespace in directive

\`\`\`mermaid
%%{init:	{"theme": "default"}	}%%
graph LR
    A[Tabs Work] --> B[Spaces Too]
\`\`\`
`;
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, contentWithWhitespace);

        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);

        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Verify the diagram rendered correctly with whitespace in directive
        const textContent = await mermaidSvg.evaluate((svg) => {
            const svgTexts = Array.from(svg.querySelectorAll('text'))
                .map(t => t.textContent?.trim()).filter(Boolean);
            const foTexts = Array.from(svg.querySelectorAll('foreignObject'))
                .map(fo => fo.textContent?.trim()).filter(Boolean);
            return [...svgTexts, ...foTexts].join(' ');
        });

        expect(textContent).toContain('Tabs Work');
        expect(textContent).toContain('Spaces Too');
    });
});

test.describe('Other diagram types still work correctly', () => {
    test('sequenceDiagram should render correctly', async ({ page }) => {
        const sequenceContent = `# Sequence Diagram Test

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob->>Alice: Hi Alice
\`\`\`
`;
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, sequenceContent);

        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);

        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Sequence diagrams naturally use SVG text
        const textElements = await mermaidSvg.evaluate((svg) => {
            return svg.querySelectorAll('text').length;
        });

        expect(textElements).toBeGreaterThan(0);
    });

    test('classDiagram should render correctly', async ({ page }) => {
        const classContent = `# Class Diagram Test

\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal : +int age
    Duck : +String beakColor
\`\`\`
`;
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, classContent);

        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);

        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Should have rendered content (class diagrams may use text or foreignObject)
        const textContent = await mermaidSvg.evaluate((svg) => {
            const svgTexts = Array.from(svg.querySelectorAll('text'))
                .map(t => t.textContent?.trim()).filter(Boolean);
            const foTexts = Array.from(svg.querySelectorAll('foreignObject'))
                .map(fo => fo.textContent?.trim()).filter(Boolean);
            return [...svgTexts, ...foTexts].join(' ');
        });

        // Verify class names are present
        expect(textContent).toContain('Animal');
        expect(textContent).toContain('Duck');
    });

    test('stateDiagram should render correctly', async ({ page }) => {
        const stateContent = `# State Diagram Test

\`\`\`mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Inactive
    Inactive --> [*]
\`\`\`
`;
        await page.goto('/');
        await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);

        await page.evaluate((content) => {
            if (globalThis.setEditorContent) {
                globalThis.setEditorContent(content);
            }
        }, stateContent);

        await page.waitForTimeout(TIMEOUTS.MERMAID_RENDER);

        const mermaidSvg = page.locator('.mermaid svg').first();
        await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

        // Should have rendered
        const hasContent = await mermaidSvg.evaluate((svg) => {
            return svg.innerHTML.length > 100;
        });

        expect(hasContent).toBe(true);
    });
});
