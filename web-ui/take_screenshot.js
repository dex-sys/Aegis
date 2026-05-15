import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1000 });
  
  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    console.log('Navigating to /coach...');
    // Buscar el link que diga ENTRENADOR y hacer click
    await page.click('text=ENTRENADOR');
    await page.waitForTimeout(3000); 
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'screenshot.png', fullPage: true });
    console.log('Screenshot saved as screenshot.png');
  } catch (err) {
    console.error('Error taking screenshot:', err);
  } finally {
    await browser.close();
  }
})();
