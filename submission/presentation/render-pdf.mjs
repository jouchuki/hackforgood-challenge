import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(sourceDir, '../..');
const browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(sourceDir, 'next-step-key-ideas.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.locator('img').evaluateAll(async imgs => Promise.all(imgs.map(img => img.decode())));
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: path.join(repo, 'output/pdf/next-step-key-ideas.pdf'), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
const overflow = await page.locator('.slide').evaluateAll(slides => slides.map(slide => ({ slide: slide.dataset.slideId, width: slide.scrollWidth, height: slide.scrollHeight })));
console.log(JSON.stringify({ pages: await page.locator('.slide').count(), overflow }, null, 2));
await browser.close();
