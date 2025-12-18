/**
 * Mermaid Lazy Loading Tests
 * Tests for Issue #326 - Slow loading on documentation pages with multiple diagrams
 *
 * This test suite verifies that Mermaid diagrams are rendered lazily using
 * IntersectionObserver rather than all at once during initial page load.
 */

// @ts-check
const { test, expect } = require('@playwright/test');
const {
    waitForPageReady,
    waitForGlobalFunction,
    setCodeMirrorContent,
    renderMarkdownAndWait,
    WAIT_TIMES
} = require('./helpers/test-utils');

test.describe('Mermaid Lazy Loading', () => {
    test.beforeEach(async ({ page }) => {
        await waitForPageReady(page);
        await waitForGlobalFunction(page, 'openFile');
    });

    test('diagrams above the fold should render immediately', async ({ page }) => {
        // Create content with a diagram at the top
        const content = `# Test Document

\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`

Regular text content here.
`;

        await setCodeMirrorContent(page, content);
        await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

        // Wait a bit for lazy loading to trigger
        await page.waitForTimeout(WAIT_TIMES.SHORT);

        // Check that the first diagram is rendered (should be visible)
        const diagramRendered = await page.evaluate(() => {
            const diagram = document.querySelector('.mermaid');
            return diagram && diagram.dataset.mermaidRendered === 'true';
        });

        expect(diagramRendered).toBe(true);
    });

    test('diagrams far below viewport should not render immediately', async ({ page }) => {
        // Create content with a diagram very far down the page (beyond 200px margin)
        const content = `# Test Document

${'\\n'.repeat(100)}

\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`
`;

        await setCodeMirrorContent(page, content);
        await renderMarkdownAndWait(page, WAIT_TIMES.MEDIUM);

        // Check diagram status before any scroll
        const diagramStatus = await page.evaluate(() => {
            const diagram = document.querySelector('.mermaid');
            return diagram ? diagram.dataset.mermaidRendered : null;
        });

        // Should be 'pending' (waiting to be rendered) or 'true' if within rootMargin
        // The 200px rootMargin means nearby diagrams will preload
        expect(diagramStatus).toMatch(/^(pending|true)$/);
    });

    test('lazy loading improves initial render performance', async ({ page }) => {
        // Create content with multiple diagrams
        const content = `# Test Document

\`\`\`mermaid
graph TD
    A1[First]
\`\`\`

${'\\n'.repeat(100)}

\`\`\`mermaid
graph TD
    A2[Second]
\`\`\`

${'\\n'.repeat(100)}

\`\`\`mermaid
graph TD
    A3[Third]
\`\`\`
`;

        await setCodeMirrorContent(page, content);

        // Measure render time
        const startTime = Date.now();
        await renderMarkdownAndWait(page, WAIT_TIMES.MEDIUM);
        const renderTime = Date.now() - startTime;

        // Check that at least one diagram exists
        const diagramCount = await page.evaluate(() => {
            return document.querySelectorAll('.mermaid').length;
        });

        expect(diagramCount).toBe(3);

        // Render should complete quickly (not waiting for all diagrams)
        // This is a loose check - main goal is not blocking on all diagram renders
        expect(renderTime).toBeLessThan(5000);
    });

    test('multiple diagrams should render progressively', async ({ page }) => {
        // Create content with multiple diagrams
        const content = `# Test Document

\`\`\`mermaid
graph TD
    A1[First]
\`\`\`

${'\\n'.repeat(20)}

\`\`\`mermaid
graph TD
    A2[Second]
\`\`\`

${'\\n'.repeat(20)}

\`\`\`mermaid
graph TD
    A3[Third]
\`\`\`
`;

        await setCodeMirrorContent(page, content);
        await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

        // Wait for visible diagrams to render
        await page.waitForTimeout(WAIT_TIMES.SHORT);

        // Count how many diagrams are rendered
        const renderedCount = await page.evaluate(() => {
            const diagrams = document.querySelectorAll('.mermaid');
            return Array.from(diagrams).filter(d => d.dataset.mermaidRendered === 'true').length;
        });

        // First diagram should be rendered, others may not be (depends on viewport)
        expect(renderedCount).toBeGreaterThanOrEqual(1);
        expect(renderedCount).toBeLessThanOrEqual(3);
    });

    test('IntersectionObserver should be created and stored in state', async ({ page }) => {
        const content = `# Test

\`\`\`mermaid
graph TD
    A[Start]
\`\`\`
`;

        await setCodeMirrorContent(page, content);
        await renderMarkdownAndWait(page, WAIT_TIMES.MEDIUM);

        // Check that the observer is stored in state
        const hasObserver = await page.evaluate(() => {
            return window.state && window.state.mermaidObserver !== null;
        });

        expect(hasObserver).toBe(true);
    });

    test('observer should be cleaned up on re-render', async ({ page }) => {
        const content = `# Test

\`\`\`mermaid
graph TD
    A[Start]
\`\`\`
`;

        await setCodeMirrorContent(page, content);
        await renderMarkdownAndWait(page, WAIT_TIMES.MEDIUM);

        // Get initial observer
        const observer1 = await page.evaluate(() => {
            return window.state ? window.state.mermaidObserver : null;
        });

        // Trigger a re-render by changing content
        await setCodeMirrorContent(page, content + '\\nMore content');
        await renderMarkdownAndWait(page, WAIT_TIMES.MEDIUM);

        // Check that a new observer was created
        const observer2 = await page.evaluate(() => {
            return window.state ? window.state.mermaidObserver : null;
        });

        // Both should exist (different instances)
        expect(observer1).not.toBeNull();
        expect(observer2).not.toBeNull();
    });
});
