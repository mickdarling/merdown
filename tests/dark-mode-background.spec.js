// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Dark Mode Preview Background', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should apply dark background when Dark Mode style is selected', async ({ page }) => {
    // Get the preview element
    const preview = page.locator('#preview');

    // Get initial background (should be white/light)
    const initialBg = await preview.evaluate(el => globalThis.getComputedStyle(el).backgroundColor);
    console.log('Initial background:', initialBg);

    // Select Dark Mode style
    await page.selectOption('#styleSelector', 'Dark Mode');

    // Wait for style to load
    await page.waitForTimeout(500);

    // Get the new background color
    const darkBg = await preview.evaluate(el => globalThis.getComputedStyle(el).backgroundColor);
    console.log('Dark mode background:', darkBg);

    // Dark mode should have a dark background (rgb values should be low)
    // #1e1e1e = rgb(30, 30, 30)
    expect(darkBg).toMatch(/rgb\(\s*30\s*,\s*30\s*,\s*30\s*\)/);
  });

  test('should apply light background when switching from Dark Mode to another style', async ({ page }) => {
    // First select Dark Mode
    await page.selectOption('#styleSelector', 'Dark Mode');
    await page.waitForTimeout(500);

    const preview = page.locator('#preview');

    // Verify dark background is applied
    const darkBg = await preview.evaluate(el => globalThis.getComputedStyle(el).backgroundColor);
    expect(darkBg).toMatch(/rgb\(\s*30\s*,\s*30\s*,\s*30\s*\)/);

    // Switch to Clean style
    await page.selectOption('#styleSelector', 'Clean');
    await page.waitForTimeout(500);

    // Verify light background
    const lightBg = await preview.evaluate(el => globalThis.getComputedStyle(el).backgroundColor);
    console.log('Clean style background:', lightBg);

    // Clean style should have white background - rgb(255, 255, 255)
    expect(lightBg).toMatch(/rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/);
  });

  test('wrapper element should also have dark background', async ({ page }) => {
    // Select Dark Mode
    await page.selectOption('#styleSelector', 'Dark Mode');
    await page.waitForTimeout(500);

    const wrapper = page.locator('#wrapper');
    const wrapperBg = await wrapper.evaluate(el => globalThis.getComputedStyle(el).backgroundColor);
    console.log('Wrapper background:', wrapperBg);

    // Wrapper should also have dark background
    expect(wrapperBg).toMatch(/rgb\(\s*30\s*,\s*30\s*,\s*30\s*\)/);
  });

  test('text should be readable in Dark Mode', async ({ page }) => {
    // Select Dark Mode
    await page.selectOption('#styleSelector', 'Dark Mode');
    await page.waitForTimeout(500);

    const wrapper = page.locator('#wrapper');
    const textColor = await wrapper.evaluate(el => globalThis.getComputedStyle(el).color);
    console.log('Text color in dark mode:', textColor);

    // Text should be light colored - rgb(230, 230, 230) = #e6e6e6
    // Parse RGB values and verify they are high (light)
    const rgbMatch = textColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    expect(rgbMatch).toBeTruthy();

    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);

    // Light text should have RGB values > 200
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(200);
  });
});
