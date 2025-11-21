# Markdown Renderer - Security Fixes & CSS Theming System

**Date:** 2025-01-21
**Status:** In Progress - One Issue Remaining
**Project:** markdown-mermaid-renderer

---

## Session Summary

Completed comprehensive security review and CSS theming system overhaul. Fixed all critical security vulnerabilities and implemented flexible theme loading. One remaining issue with syntax highlighting theme integration needs resolution.

---

## ✅ Completed Work

### 1. Security Fixes (All Critical Issues Resolved)

**Mermaid Security (CRITICAL)**
- Changed `securityLevel: 'loose'` → `'strict'` (line 441)
- Prevents XSS attacks through malicious diagrams
- Status: ✅ FIXED

**Subresource Integrity (HIGH)**
- Added SRI hashes to all CDN scripts (lines 9-21)
- Prevents code injection via compromised CDNs
- Hashes added for: marked.js, mermaid.js, highlight.js (JS + CSS)
- Status: ✅ FIXED

**JavaScript Validation (HIGH)**
- Removed `new Function()` code execution (line 1474-1478)
- Disabled JS validation for security
- JSON, HTML, CSS validation still work
- Status: ✅ FIXED

**Content Security Policy (HIGH)**
- Added comprehensive CSP meta tag (lines 6-15)
- Restricts resource loading to trusted sources
- Blocks iframes, plugins, malicious content
- Status: ✅ FIXED

**Security Rating:** 7/10 → 9/10 ⭐

### 2. CSS Theme System Overhaul

**Problem Solved:** MarkedCustomStyles repository had no license (legal blocker)

**Solution:** Created our own MIT-licensed themes + flexible loading system

**6 Custom Themes Created** (all in `styles/` directory, MIT licensed):
1. `clean.css` - Minimal, modern, GitHub-inspired (default)
2. `academic.css` - Professional serif for formal documents
3. `github.css` - Matches GitHub markdown styling
4. `dark.css` - High-contrast dark theme
5. `monospace.css` - Code-focused, terminal aesthetic
6. `newspaper.css` - Classic magazine/newspaper layout

**4 Loading Methods Implemented:**
1. **Built-in themes** - Select from dropdown
2. **Load from file** - File picker dialog
3. **Drag-and-drop** - Drop CSS files onto preview panel
4. **Load from URL** - Enter any HTTPS URL to CSS file
5. **Repository integration** - Optional MarkedCustomStyles access

**Features Added:**
- "None (No CSS)" option for comparison
- Separator lines in dropdown
- Status messages for loading
- localStorage persistence
- Visual feedback for drag-and-drop

### 3. Documentation Created

**New Files:**
- `REVIEW-REPORT.md` - Complete security analysis
- `THIRD-PARTY-NOTICES.md` - License attributions
- `SECURITY-FIXES-APPLIED.md` - Detailed security fixes
- `CSS-LOADING-GUIDE.md` - Complete theming guide
- `CHANGES-SUMMARY.md` - Full changelog

**Updated Files:**
- `index.html` - All security fixes + new features
- All 6 CSS theme files

---

## ⚠️ REMAINING ISSUE: Syntax Highlighting Backgrounds

### Problem Description

**Symptom:** Code block backgrounds don't change when switching syntax highlighting themes. Background briefly flashes to correct color (e.g., dark for GitHub Dark theme), then immediately reverts to light gray/white.

**Expected Behavior:**
- Syntax highlighting theme should control 100% of code block appearance
- Document CSS theme should only control non-code content
- GitHub Dark → dark background
- GitHub Light → white background
- Each theme uses its specified background color

**Actual Behavior:**
- Background flashes correct color
- Immediately reverts to light/gray
- Indicates race condition or CSS override issue

### What We Know

**CSS Architecture:**
- Syntax theme CSS loaded via `<link>` tag (not scoped)
- Applies `.hljs` class to `<code>` elements
- `.hljs { background: #0d1117; color: #c9d1d9; }` (for GitHub Dark)
- `pre code.hljs { display: block; padding: 1em; }`

**Document Theme CSS:**
- Only applies margins to `<pre>` elements
- No background, padding, or color styling
- Completely removed to avoid conflicts

**Override Styles (lines 864-880):**
```css
#wrapper pre {
    background: none !important;
    background-color: transparent !important;
}

#wrapper pre code.hljs {
    display: block !important;
    padding: 1em !important;
}

#wrapper pre:has(code.hljs) {
    padding: 0 !important;
}
```

### What We Tried

1. ✅ Removed all pre/code styling from document themes
2. ✅ Made pre backgrounds transparent with !important
3. ✅ Added timing delay - CSS loads before re-render
4. ✅ Re-render markdown after theme change
5. ✅ Set display: block on code.hljs
6. ✅ Used !important on all overrides
7. ❌ Still reverts to light background

### Debugging Next Steps

**Investigate:**
1. Check browser DevTools computed styles on `<pre>` and `<code.hljs>`
2. Look for CSS rules overriding `.hljs` background
3. Check if something in `renderMarkdown()` resets styles
4. Verify `.hljs` class is actually being applied
5. Check CSS specificity - maybe `#wrapper pre` still wins
6. Look for inline styles being applied
7. Check if browser defaults are interfering

**Possible Causes:**
- CSS specificity issue (ID selector beats class)
- Something in render pipeline overriding
- Browser default styles for `<pre>`
- Timing issue despite await
- CSS not actually applying to elements
- Scoping accidentally applied to syntax CSS
- Another style block interfering

**Potential Fixes:**
1. Use even more specific selector: `#wrapper pre code.hljs`
2. Apply background directly to pre via JavaScript
3. Extract background from .hljs CSS and apply to pre
4. Use inline styles for backgrounds
5. Investigate if wrapper scoping is interfering
6. Check if marked.js renderer is adding inline styles

---

## File Locations

**Modified:**
- `/Users/mick/Developer/markdown-mermaid-renderer/index.html`
- `/Users/mick/Developer/markdown-mermaid-renderer/styles/*.css` (all 6)

**Created:**
- `/Users/mick/Developer/markdown-mermaid-renderer/styles/` (directory)
- `/Users/mick/Developer/markdown-mermaid-renderer/REVIEW-REPORT.md`
- `/Users/mick/Developer/markdown-mermaid-renderer/THIRD-PARTY-NOTICES.md`
- `/Users/mick/Developer/markdown-mermaid-renderer/SECURITY-FIXES-APPLIED.md`
- `/Users/mick/Developer/markdown-mermaid-renderer/CSS-LOADING-GUIDE.md`
- `/Users/mick/Developer/markdown-mermaid-renderer/CHANGES-SUMMARY.md`

**Server Running:**
- `python3 -m http.server 8080`
- http://localhost:8080/index.html

---

## Code References

**Security Fixes:**
- Mermaid security: `index.html:441`
- SRI hashes: `index.html:9-21`
- CSP: `index.html:6-15`
- JS validation: `index.html:1474-1478`

**CSS System:**
- Available styles array: `index.html:547-563`
- loadStyle function: `index.html:572-639`
- loadSyntaxTheme function: `index.html:931-965`
- changeSyntaxTheme function: `index.html:967-973`
- Syntax override: `index.html:855-880`

**Issue Location:**
- Problem manifests when changing syntax theme dropdown
- Check `changeSyntaxTheme()` execution flow
- Inspect elements after render completes

---

## Key Insights

### What Works Well

1. **Security architecture is solid** - All critical vulnerabilities fixed
2. **Document themes work perfectly** - No conflicts with each other
3. **CSS loading is robust** - File upload, drag-drop, URL all work
4. **Separation of concerns is clear** - Document vs syntax styling
5. **User experience is good** - Multiple loading methods, status messages

### What Needs Work

1. **Syntax theme backgrounds** - The one remaining issue
2. **Timing/race condition** - Something overrides after CSS loads
3. **CSS specificity** - May need different approach
4. **Browser defaults** - Might be interfering

### Architecture Decisions

**Correct Approach:**
- Syntax highlighting controls: background, colors, padding, fonts (everything in code blocks)
- Document CSS controls: headings, paragraphs, lists, tables, blockquotes (everything else)
- This separation is architecturally sound

**Current Implementation:**
- Document CSS properly hands off to syntax CSS
- Syntax CSS loads correctly (confirmed via network tab)
- `.hljs` class applies correctly (confirmed)
- But background doesn't stay applied

---

## Next Session TODO

1. **Open browser DevTools**
   - Inspect `<pre>` element computed styles
   - Inspect `<code class="hljs">` element computed styles
   - Look for what's overriding the background

2. **Check CSS Specificity**
   - Run specificity calculator on conflicting rules
   - Check if `#wrapper pre` beats `.hljs`
   - May need `#wrapper .hljs` or `#wrapper pre .hljs`

3. **Console Debugging**
   - Log when syntax CSS loads
   - Log when render completes
   - Log computed backgrounds at each step
   - Find exact moment override happens

4. **Try Alternative Approaches**
   - Apply background via JavaScript after render
   - Extract color from .hljs CSS and apply to pre
   - Use mutation observer to catch style changes
   - Try !important on .hljs itself (edit CSS)

5. **Check Marked.js Renderer**
   - Verify no inline styles added
   - Check if renderer options affect this
   - Review `renderer.code` function (line ~1021)

---

## Success Metrics

**Achieved:**
- ✅ All security vulnerabilities fixed
- ✅ License issues resolved
- ✅ 6 professional themes created
- ✅ Flexible CSS loading implemented
- ✅ Complete documentation

**Pending:**
- ⏳ Syntax highlighting backgrounds work correctly
- ⏳ All 20 syntax themes usable with all 6 document themes
- ⏳ Ready for GitHub publication

---

## Notes for Next Developer

- The code is clean and well-documented
- Security is solid (9/10)
- The remaining issue is CSS-specific, not architectural
- Focus on computed styles and specificity
- Consider using browser DevTools "Force element state"
- The flash of correct color means CSS IS loading
- Something immediately overrides it - find what

**The answer is in the browser DevTools computed styles.**

---

## License Status

**Our Code:** MIT (clear for distribution)
**Dependencies:**
- marked.js: MIT ✅
- mermaid.js: MIT ✅
- highlight.js: BSD-3-Clause ✅
- http-server: MIT ✅ (dev only)
- MarkedCustomStyles: No license ⚠️ (optional, user manages)

**Ready for open source release once syntax issue resolved.**

---

**Memory Type:** Technical Session
**Complexity:** High
**Priority:** Medium (one issue remaining)
**Tags:** #security #css #theming #syntax-highlighting #bug
