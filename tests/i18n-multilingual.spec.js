// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Mick Darling

// @ts-check
const { test, expect } = require('@playwright/test');
const {
  waitForPageReady,
  setCodeMirrorContent,
  renderMarkdownAndWait,
  WAIT_TIMES
} = require('./helpers/test-utils');

/**
 * Tests for Multilingual Markdown Content Rendering (Issue #249)
 *
 * Verifies that markdown content in various languages and scripts
 * renders correctly without character encoding issues (mojibake).
 *
 * Covers:
 * - CJK languages (Chinese, Japanese, Korean)
 * - RTL languages (Arabic, Hebrew)
 * - Cyrillic (Russian)
 * - Thai
 * - Mixed scripts
 * - All markdown features with international text
 */

/**
 * Helper to get rendered HTML content from the preview
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<string>} Rendered HTML content
 */
async function getRenderedContent(page) {
  return page.evaluate(() => {
    const wrapper = document.getElementById('wrapper');
    return wrapper ? wrapper.innerHTML : '';
  });
}

/**
 * Helper to get text content from the preview
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<string>} Rendered text content
 */
async function getRenderedText(page) {
  return page.evaluate(() => {
    const wrapper = document.getElementById('wrapper');
    return wrapper ? wrapper.textContent : '';
  });
}

test.describe('Multilingual Markdown Rendering', () => {
  test.describe('CJK Languages (Chinese, Japanese, Korean)', () => {
    test('should render Japanese text (hiragana, katakana, kanji)', async ({ page }) => {
      await waitForPageReady(page);

      const japaneseContent = `# 日本語ヘッダー

こんにちは、世界。これはひらがなです。

カタカナもレンダリングされます。

**太字のテキスト**と*イタリックのテキスト*も機能します。

[日本語リンク](https://example.com)

- リスト項目 1
- リスト項目 2
- リスト項目 3
`;

      await setCodeMirrorContent(page, japaneseContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      // Verify all Japanese characters render correctly
      expect(renderedText).toContain('日本語ヘッダー');
      expect(renderedText).toContain('こんにちは、世界');
      expect(renderedText).toContain('ひらがな');
      expect(renderedText).toContain('カタカナ');
      expect(renderedText).toContain('太字のテキスト');
      expect(renderedText).toContain('イタリックのテキスト');
      expect(renderedText).toContain('日本語リンク');
      expect(renderedText).toContain('リスト項目 1');

      // Verify HTML structure
      const renderedHtml = await getRenderedContent(page);
      expect(renderedHtml).toContain('<h1');
      expect(renderedHtml).toContain('<strong>');
      expect(renderedHtml).toContain('<em>');
      expect(renderedHtml).toContain('<a href="https://example.com"');
      expect(renderedHtml).toContain('<ul>');
    });

    test('should render Chinese text (simplified and traditional)', async ({ page }) => {
      await waitForPageReady(page);

      const chineseContent = `# 中文标题

简体中文：你好世界

繁體中文：你好世界

**粗体文本**和*斜体文本*

[中文链接](https://example.com)

1. 第一项
2. 第二项
3. 第三项
`;

      await setCodeMirrorContent(page, chineseContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('中文标题');
      expect(renderedText).toContain('简体中文');
      expect(renderedText).toContain('你好世界');
      expect(renderedText).toContain('繁體中文');
      expect(renderedText).toContain('粗体文本');
      expect(renderedText).toContain('斜体文本');
      expect(renderedText).toContain('中文链接');
      expect(renderedText).toContain('第一项');
    });

    test('should render Korean text (hangul)', async ({ page }) => {
      await waitForPageReady(page);

      const koreanContent = `# 한국어 제목

안녕하세요, 세계입니다.

**굵은 텍스트**와 *기울임꼴 텍스트*

[한국어 링크](https://example.com)

- 목록 항목 1
- 목록 항목 2
- 목록 항목 3
`;

      await setCodeMirrorContent(page, koreanContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('한국어 제목');
      expect(renderedText).toContain('안녕하세요');
      expect(renderedText).toContain('세계입니다');
      expect(renderedText).toContain('굵은 텍스트');
      expect(renderedText).toContain('기울임꼴 텍스트');
      expect(renderedText).toContain('한국어 링크');
      expect(renderedText).toContain('목록 항목 1');
    });
  });

  test.describe('RTL Languages (Right-to-Left)', () => {
    test('should render Arabic text correctly', async ({ page }) => {
      await waitForPageReady(page);

      const arabicContent = `# عنوان عربي

مرحبا بالعالم

هذا نص عربي يجب أن يظهر من اليمين إلى اليسار.

**نص عريض** و *نص مائل*

[رابط عربي](https://example.com)

- البند الأول
- البند الثاني
- البند الثالث
`;

      await setCodeMirrorContent(page, arabicContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('عنوان عربي');
      expect(renderedText).toContain('مرحبا بالعالم');
      expect(renderedText).toContain('اليمين إلى اليسار');
      expect(renderedText).toContain('نص عريض');
      expect(renderedText).toContain('نص مائل');
      expect(renderedText).toContain('رابط عربي');
      expect(renderedText).toContain('البند الأول');

      // Verify HTML structure preserves Arabic text
      const renderedHtml = await getRenderedContent(page);
      expect(renderedHtml).toContain('<h1');
      expect(renderedHtml).toContain('عنوان عربي');
    });

    test('should render Hebrew text correctly', async ({ page }) => {
      await waitForPageReady(page);

      const hebrewContent = `# כותרת עברית

שלום עולם

זה טקסט בעברית שצריך להופיע מימין לשמאל.

**טקסט מודגש** ו *טקסט נטוי*

[קישור עברי](https://example.com)

1. פריט ראשון
2. פריט שני
3. פריט שלישי
`;

      await setCodeMirrorContent(page, hebrewContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('כותרת עברית');
      expect(renderedText).toContain('שלום עולם');
      expect(renderedText).toContain('מימין לשמאל');
      expect(renderedText).toContain('טקסט מודגש');
      expect(renderedText).toContain('טקסט נטוי');
      expect(renderedText).toContain('קישור עברי');
      expect(renderedText).toContain('פריט ראשון');
    });

    test('should handle mixed LTR/RTL text', async ({ page }) => {
      await waitForPageReady(page);

      const mixedContent = `# Mixed English and العربية

This paragraph contains both English and عربي text in the same line.

**English bold** and **نص عريض**

Hebrew: שלום, Japanese: こんにちは, English: Hello

- English item
- عنصر عربي
- פריט עברי
`;

      await setCodeMirrorContent(page, mixedContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('English');
      expect(renderedText).toContain('العربية');
      expect(renderedText).toContain('عربي');
      expect(renderedText).toContain('نص عريض');
      expect(renderedText).toContain('שלום');
      expect(renderedText).toContain('こんにちは');
      expect(renderedText).toContain('Hello');
    });
  });

  test.describe('Other Scripts and Languages', () => {
    test('should render Cyrillic text (Russian)', async ({ page }) => {
      await waitForPageReady(page);

      const russianContent = `# Русский заголовок

Привет мир

Это текст на русском языке.

**Жирный текст** и *курсивный текст*

[Русская ссылка](https://example.com)

- Первый пункт
- Второй пункт
- Третий пункт
`;

      await setCodeMirrorContent(page, russianContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('Русский заголовок');
      expect(renderedText).toContain('Привет мир');
      expect(renderedText).toContain('русском языке');
      expect(renderedText).toContain('Жирный текст');
      expect(renderedText).toContain('курсивный текст');
      expect(renderedText).toContain('Русская ссылка');
      expect(renderedText).toContain('Первый пункт');
    });

    test('should render Thai text', async ({ page }) => {
      await waitForPageReady(page);

      const thaiContent = `# หัวข้อภาษาไทย

สวัสดีโลก

นี่คือข้อความภาษาไทย

**ข้อความตัวหนา** และ *ข้อความตัวเอียง*

[ลิงก์ภาษาไทย](https://example.com)

- รายการที่ 1
- รายการที่ 2
- รายการที่ 3
`;

      await setCodeMirrorContent(page, thaiContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('หัวข้อภาษาไทย');
      expect(renderedText).toContain('สวัสดีโลก');
      expect(renderedText).toContain('ข้อความภาษาไทย');
      expect(renderedText).toContain('ข้อความตัวหนา');
      expect(renderedText).toContain('ข้อความตัวเอียง');
      expect(renderedText).toContain('ลิงก์ภาษาไทย');
      expect(renderedText).toContain('รายการที่ 1');
    });

    test('should render Greek text', async ({ page }) => {
      await waitForPageReady(page);

      const greekContent = `# Ελληνικός τίτλος

Γεια σου κόσμε

Αυτό είναι ελληνικό κείμενο.

**Έντονο κείμενο** και *πλάγιο κείμενο*

[Ελληνικός σύνδεσμος](https://example.com)
`;

      await setCodeMirrorContent(page, greekContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('Ελληνικός τίτλος');
      expect(renderedText).toContain('Γεια σου κόσμε');
      expect(renderedText).toContain('ελληνικό κείμενο');
      expect(renderedText).toContain('Έντονο κείμενο');
      expect(renderedText).toContain('πλάγιο κείμενο');
    });
  });

  test.describe('Markdown Features with International Text', () => {
    test('should render code blocks with international comments', async ({ page }) => {
      await waitForPageReady(page);

      const codeContent = `# Code with International Comments

\`\`\`javascript
// English comment
// 日本語のコメント
// 中文注释
// Русский комментарий
function hello() {
  console.log("こんにちは");
}
\`\`\`

\`\`\`python
# Arabic: مرحبا
# Hebrew: שלום
def greet():
    print("世界")
\`\`\`
`;

      await setCodeMirrorContent(page, codeContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('日本語のコメント');
      expect(renderedText).toContain('中文注释');
      expect(renderedText).toContain('Русский комментарий');
      expect(renderedText).toContain('こんにちは');
      expect(renderedText).toContain('مرحبا');
      expect(renderedText).toContain('שלום');
      expect(renderedText).toContain('世界');
    });

    test('should render tables with international content', async ({ page }) => {
      await waitForPageReady(page);

      const tableContent = `# Multilingual Table

| Language | Greeting | Country |
|----------|----------|---------|
| English  | Hello    | USA     |
| 日本語   | こんにちは | 日本    |
| 中文     | 你好     | 中国    |
| العربية  | مرحبا    | مصر     |
| עברית    | שלום     | ישראל   |
| Русский  | Привет   | Россия  |
| ไทย      | สวัสดี   | ไทย     |
`;

      await setCodeMirrorContent(page, tableContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      // Verify all table content renders
      expect(renderedText).toContain('日本語');
      expect(renderedText).toContain('こんにちは');
      expect(renderedText).toContain('日本');
      expect(renderedText).toContain('中文');
      expect(renderedText).toContain('你好');
      expect(renderedText).toContain('中国');
      expect(renderedText).toContain('العربية');
      expect(renderedText).toContain('مرحبا');
      expect(renderedText).toContain('עברית');
      expect(renderedText).toContain('שלום');
      expect(renderedText).toContain('Русский');
      expect(renderedText).toContain('Привет');
      expect(renderedText).toContain('ไทย');
      expect(renderedText).toContain('สวัสดี');

      // Verify table structure
      const renderedHtml = await getRenderedContent(page);
      expect(renderedHtml).toContain('<table>');
      expect(renderedHtml).toContain('<thead>');
      expect(renderedHtml).toContain('<tbody>');
    });

    test('should render blockquotes with international text', async ({ page }) => {
      await waitForPageReady(page);

      const quoteContent = `# International Quotes

> English quote: "Hello World"

> 日本語の引用: 「こんにちは世界」

> 中文引用：「你好世界」

> عربي: «مرحبا بالعالم»

> עברית: "שלום עולם"
`;

      await setCodeMirrorContent(page, quoteContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('Hello World');
      expect(renderedText).toContain('日本語の引用');
      expect(renderedText).toContain('こんにちは世界');
      expect(renderedText).toContain('中文引用');
      expect(renderedText).toContain('你好世界');
      expect(renderedText).toContain('عربي');
      expect(renderedText).toContain('مرحبا بالعالم');
      expect(renderedText).toContain('עברית');
      expect(renderedText).toContain('שלום עולם');

      // Verify blockquote structure
      const renderedHtml = await getRenderedContent(page);
      expect(renderedHtml).toContain('<blockquote>');
    });

    test('should render nested lists with international content', async ({ page }) => {
      await waitForPageReady(page);

      const nestedListContent = `# Multilingual Nested Lists

- English
  - Nested English
  - More nesting
- 日本語
  - ネストされた日本語
  - さらにネスト
- العربية
  - العربية المتداخلة
  - المزيد من التداخل
- עברית
  - עברית מקוננת
  - קינון נוסף
`;

      await setCodeMirrorContent(page, nestedListContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('English');
      expect(renderedText).toContain('Nested English');
      expect(renderedText).toContain('日本語');
      expect(renderedText).toContain('ネストされた日本語');
      expect(renderedText).toContain('العربية');
      expect(renderedText).toContain('العربية المتداخلة');
      expect(renderedText).toContain('עברית');
      expect(renderedText).toContain('עברית מקוננת');
    });

    test('should render inline code with international text', async ({ page }) => {
      await waitForPageReady(page);

      const inlineCodeContent = `# Inline Code with International Text

Use \`こんにちは\` for Japanese greeting.

The Chinese variable \`变量名\` should work.

Arabic: \`المتغير\` and Hebrew: \`משתנה\`

Russian: \`переменная\` and Thai: \`ตัวแปร\`
`;

      await setCodeMirrorContent(page, inlineCodeContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('こんにちは');
      expect(renderedText).toContain('变量名');
      expect(renderedText).toContain('المتغير');
      expect(renderedText).toContain('משתנה');
      expect(renderedText).toContain('переменная');
      expect(renderedText).toContain('ตัวแปร');

      // Verify inline code structure
      const renderedHtml = await getRenderedContent(page);
      expect(renderedHtml).toContain('<code>');
    });

    test('should render headings at all levels with international text', async ({ page }) => {
      await waitForPageReady(page);

      const headingsContent = `# H1: 日本語 中文 العربية עברית

## H2: Русский ไทย Ελληνικά

### H3: こんにちは 你好 مرحبا

#### H4: שלום Привет สวัสดี

##### H5: Γεια σου 안녕하세요

###### H6: Multilingual heading level 6
`;

      await setCodeMirrorContent(page, headingsContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      expect(renderedText).toContain('日本語');
      expect(renderedText).toContain('中文');
      expect(renderedText).toContain('العربية');
      expect(renderedText).toContain('עברית');
      expect(renderedText).toContain('Русский');
      expect(renderedText).toContain('ไทย');
      expect(renderedText).toContain('Ελληνικά');

      // Verify heading levels
      const renderedHtml = await getRenderedContent(page);
      expect(renderedHtml).toContain('<h1');
      expect(renderedHtml).toContain('<h2');
      expect(renderedHtml).toContain('<h3');
      expect(renderedHtml).toContain('<h4');
      expect(renderedHtml).toContain('<h5');
      expect(renderedHtml).toContain('<h6');
    });
  });

  test.describe('Character Encoding Validation', () => {
    test('should not produce mojibake (garbled characters)', async ({ page }) => {
      await waitForPageReady(page);

      // Test string with common mojibake patterns if encoding is wrong
      const testContent = `# Character Encoding Test

Japanese: こんにちは世界
Chinese: 你好世界
Korean: 안녕하세요
Arabic: مرحبا بالعالم
Hebrew: שלום עולם
Russian: Привет мир
Thai: สวัสดีโลก
Greek: Γεια σου κόσμε
`;

      await setCodeMirrorContent(page, testContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      // These should NOT appear if encoding is correct
      expect(renderedText).not.toContain('�'); // Replacement character
      expect(renderedText).not.toContain('????'); // Question marks
      expect(renderedText).not.toContain('\uFFFD'); // Unicode replacement char

      // Should contain the actual characters
      expect(renderedText).toContain('こんにちは世界');
      expect(renderedText).toContain('你好世界');
      expect(renderedText).toContain('안녕하세요');
      expect(renderedText).toContain('مرحبا بالعالم');
      expect(renderedText).toContain('שלום עולם');
      expect(renderedText).toContain('Привет мир');
      expect(renderedText).toContain('สวัสดีโลก');
      expect(renderedText).toContain('Γεια σου κόσμε');
    });

    test('should handle emoji with international text', async ({ page }) => {
      await waitForPageReady(page);

      const emojiContent = `# Emoji with International Text

🇯🇵 日本語: こんにちは 👋

🇨🇳 中文: 你好 🌏

🇰🇷 한국어: 안녕하세요 ✨

🇸🇦 العربية: مرحبا 🌙

🇮🇱 עברית: שלום ⭐

🇷🇺 Русский: Привет 🎉

🇹🇭 ไทย: สวัสดี 🙏
`;

      await setCodeMirrorContent(page, emojiContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      // Verify emoji render
      expect(renderedText).toContain('🇯🇵');
      expect(renderedText).toContain('👋');
      expect(renderedText).toContain('🌏');
      expect(renderedText).toContain('✨');
      expect(renderedText).toContain('🌙');
      expect(renderedText).toContain('⭐');
      expect(renderedText).toContain('🎉');
      expect(renderedText).toContain('🙏');

      // Verify text with emoji still renders correctly
      expect(renderedText).toContain('こんにちは');
      expect(renderedText).toContain('你好');
      expect(renderedText).toContain('안녕하세요');
      expect(renderedText).toContain('مرحبا');
      expect(renderedText).toContain('שלום');
      expect(renderedText).toContain('Привет');
      expect(renderedText).toContain('สวัสดี');
    });

    test('should preserve special Unicode characters', async ({ page }) => {
      await waitForPageReady(page);

      const unicodeContent = `# Special Unicode Characters

Math symbols: ∑ ∫ ∂ √ ∞ ≈ ≠ ≤ ≥

Currency: € £ ¥ ₹ ₽ ₪ ฿

Arrows: → ← ↑ ↓ ⇒ ⇐ ⇔

Symbols: © ® ™ § ¶ † ‡

Diacritics: café, naïve, Zürich, Łódź

Japanese symbols: ※ ℃ №

Chinese punctuation: 。、「」『』【】

Arabic diacritics: مَرْحَبًا

Hebrew points: שָׁלוֹם
`;

      await setCodeMirrorContent(page, unicodeContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.LONG);

      const renderedText = await getRenderedText(page);

      // Verify special characters preserve
      expect(renderedText).toContain('∑');
      expect(renderedText).toContain('€');
      expect(renderedText).toContain('→');
      expect(renderedText).toContain('©');
      expect(renderedText).toContain('café');
      expect(renderedText).toContain('※');
      expect(renderedText).toContain('。');
      expect(renderedText).toContain('مَرْحَبًا');
      expect(renderedText).toContain('שָׁלוֹם');
    });

    test('should have correct document encoding', async ({ page }) => {
      await waitForPageReady(page);

      const charset = await page.evaluate(() =>
        document.characterSet || document.charset
      );
      expect(charset.toUpperCase()).toBe('UTF-8');
    });
  });

  test.describe('Complex Multilingual Scenarios', () => {
    test('should render comprehensive multilingual document', async ({ page }) => {
      await waitForPageReady(page);

      const comprehensiveContent = `# 🌍 Multilingual Documentation / 多言語文書 / مستند متعدد اللغات

## Introduction

This document demonstrates **multilingual support** in Merview.

## Languages / 言語 / اللغات

### East Asian Languages

#### Japanese (日本語)
こんにちは、世界。これは日本語のテキストです。

**重要**: マークダウン機能が正常に動作します。

\`\`\`javascript
// 日本語のコメント
console.log("こんにちは");
\`\`\`

#### Chinese (中文)
简体中文：你好世界
繁體中文：你好世界

**重要**: 所有功能正常工作。

| 项目 | 描述 |
|------|------|
| 第一 | 测试 |
| 第二 | 验证 |

#### Korean (한국어)
안녕하세요, 세계입니다.

**중요**: 모든 기능이 정상적으로 작동합니다.

### RTL Languages

#### Arabic (العربية)
مرحبا بالعالم. هذا نص عربي.

**مهم**: جميع الميزات تعمل بشكل صحيح.

> الاقتباس العربي يعمل بشكل جيد.

#### Hebrew (עברית)
שלום עולם. זה טקסט עברי.

**חשוב**: כל התכונות עובדות כראוי.

### Other Scripts

#### Russian (Русский)
Привет мир. Это русский текст.

**Важно**: Все функции работают правильно.

#### Thai (ไทย)
สวัสดีโลก นี่คือข้อความภาษาไทย

**สำคัญ**: ทุกฟีเจอร์ทำงานได้อย่างถูกต้อง

#### Greek (Ελληνικά)
Γεια σου κόσμε. Αυτό είναι ελληνικό κείμενο.

**Σημαντικό**: Όλες οι λειτουργίες λειτουργούν σωστά.

## Mixed Content

This paragraph contains English, 日本語, 中文, العربية, עברית, Русский, ไทย, and Ελληνικά.

## Conclusion

All languages render correctly! ✅
すべての言語が正しく表示されます！✅
所有语言都正确显示！✅
جميع اللغات تعرض بشكل صحيح! ✅
כל השפות מוצגות נכון! ✅
Все языки отображаются правильно! ✅
ทุกภาษาแสดงผลถูกต้อง! ✅
Όλες οι γλώσσες αποδίδονται σωστά! ✅
`;

      await setCodeMirrorContent(page, comprehensiveContent);
      await renderMarkdownAndWait(page, WAIT_TIMES.EXTRA_LONG);

      const renderedText = await getRenderedText(page);

      // Spot check various languages
      expect(renderedText).toContain('こんにちは、世界');
      expect(renderedText).toContain('你好世界');
      expect(renderedText).toContain('안녕하세요');
      expect(renderedText).toContain('مرحبا بالعالم');
      expect(renderedText).toContain('שלום עולם');
      expect(renderedText).toContain('Привет мир');
      expect(renderedText).toContain('สวัสดีโลก');
      expect(renderedText).toContain('Γεια σου κόσμε');

      // Verify no encoding issues
      expect(renderedText).not.toContain('�');
      expect(renderedText).not.toContain('\uFFFD');
    });
  });
});
