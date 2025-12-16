/**
 * resize.js
 * Panel resize functionality for editor/preview split view
 * Allows users to drag the resize handle to adjust panel widths
 */

import { getElements } from './dom.js';
import { state } from './state.js';

// Track resize state (module-local)
// Note: This is intentionally NOT in state.js because:
// - It's only used within this module (startResize, handleResize, stopResize)
// - No other modules need to read or write this value
// - Keeping it local reduces coupling and makes the code easier to reason about
let isResizing = false;

/**
 * Start resizing - called on mousedown on resize handle
 */
function startResize(e) {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
}

/**
 * Handle resize - called on mousemove when resizing
 */
function handleResize(e) {
    if (!isResizing) return;

    const elements = getElements();
    const container = elements.container;
    const editorPanel = elements.editorPanel;
    const previewPanel = elements.previewPanel;

    if (!container || !editorPanel || !previewPanel) return;

    // Get container bounds
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    // Calculate percentage width for editor panel
    const editorPercentage = (mouseX / containerWidth) * 100;

    // Minimum panel width in pixels
    const minWidth = 200;
    const minPercentage = (minWidth / containerWidth) * 100;
    const maxPercentage = 100 - minPercentage;

    // Clamp the percentage to ensure both panels meet minimum width
    const clampedPercentage = Math.max(minPercentage, Math.min(maxPercentage, editorPercentage));

    // Apply flex-basis to both panels
    editorPanel.style.flexBasis = `${clampedPercentage}%`;
    previewPanel.style.flexBasis = `${100 - clampedPercentage}%`;

    // Store the panel widths in state to persist across document changes
    state.editorPanelWidth = clampedPercentage;
    state.previewPanelWidth = 100 - clampedPercentage;
}

/**
 * Stop resizing - called on mouseup
 */
function stopResize() {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
}

/**
 * Restore panel widths from state
 * Applies saved panel widths if they exist, otherwise uses default 50/50
 */
export function restorePanelWidths() {
    const elements = getElements();
    const editorPanel = elements.editorPanel;
    const previewPanel = elements.previewPanel;

    if (!editorPanel || !previewPanel) {
        console.warn('Panel elements not found');
        return;
    }

    // Only restore if we have saved widths
    if (state.editorPanelWidth !== null && state.previewPanelWidth !== null) {
        editorPanel.style.flexBasis = `${state.editorPanelWidth}%`;
        previewPanel.style.flexBasis = `${state.previewPanelWidth}%`;
    }
}

/**
 * Initialize resize handle functionality
 * Sets up event listeners for panel resizing
 */
export function initResizeHandle() {
    const elements = getElements();
    const resizeHandle = elements.resizeHandle;

    if (!resizeHandle) {
        console.warn('Resize handle element not found');
        return;
    }

    // Mouse events for resize handle
    resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);

    // Restore saved panel widths if they exist
    // Use requestAnimationFrame to ensure DOM is fully rendered (Issue #285)
    requestAnimationFrame(() => {
        restorePanelWidths();
    });
}
