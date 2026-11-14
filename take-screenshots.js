#!/usr/bin/env node
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OVERRIDE_HEADER = 'Cloudflare-Workers-Version-Overrides';
const VERSION_ID = 'a92506f7-0230-40d9-9fcb-4a38d65ea34e';

const pages = [
  { name: 'home', url: 'https://gccguide.com/s/gccguide' },
  { name: 'rates', url: 'https://gccguide.com/s/gccguide/rates' },
  { name: 'rates-aed-inr', url: 'https://gccguide.com/s/gccguide/rates/aed-to-inr' },
  { name: 'gold-dubai', url: 'https://gccguide.com/s/gccguide/gold-rate/dubai' },
  { name: 'fuel', url: 'https://gccguide.com/s/gccguide/fuel-price' },
  { name: 'prayer', url: 'https://gccguide.com/s/gccguide/prayer-times' },
  { name: 'calculators', url: 'https://gccguide.com/s/gccguide/calculators' },
  { name: 'gratuity', url: 'https://gccguide.com/s/gccguide/gratuity/uae' },
  { name: 'embassy', url: 'https://gccguide.com/s/gccguide/embassy' },
  { name: 'visa-fees', url: 'https://gccguide.com/s/gccguide/visa-fees' },
  { name: 'holidays', url: 'https://gccguide.com/s/gccguide/public-holidays' },
  { name: 'country-uae', url: 'https://gccguide.com/s/gccguide/country/uae' },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const outDir = path.join(__dirname, 'ui-shots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const page of pages) {
    console.log(`📸 Screenshotting ${page.name}...`);

    // Desktop 1280px
    {
      const browser_page = await browser.newPage();
      await browser_page.setViewport({ width: 1280, height: 1024 });
      await browser_page.setExtraHTTPHeaders({
        [OVERRIDE_HEADER]: `autoblog-gccguide="${VERSION_ID}"`,
      });

      try {
        await browser_page.goto(page.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await browser_page.screenshot({
          path: path.join(outDir, `${page.name}-desktop.png`),
          fullPage: true,
        });
        console.log(`  ✓ Desktop screenshot saved`);
      } catch (e) {
        console.error(`  ✗ Desktop failed:`, e.message);
      }
      await browser_page.close();
    }

    // Mobile 390px
    {
      const browser_page = await browser.newPage();
      await browser_page.setViewport({ width: 390, height: 844 });
      await browser_page.setExtraHTTPHeaders({
        [OVERRIDE_HEADER]: `autoblog-gccguide="${VERSION_ID}"`,
      });

      try {
        await browser_page.goto(page.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await browser_page.screenshot({
          path: path.join(outDir, `${page.name}-mobile.png`),
          fullPage: true,
        });
        console.log(`  ✓ Mobile screenshot saved`);
      } catch (e) {
        console.error(`  ✗ Mobile failed:`, e.message);
      }
      await browser_page.close();
    }
  }

  await browser.close();
  console.log('\n✅ All screenshots complete!');
})().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
