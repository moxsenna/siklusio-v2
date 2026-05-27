import { chromium } from "playwright";

const APP_URL = "http://localhost:8081";

async function main() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log("Logging in...");
  await page.goto(`${APP_URL}/auth`);
  await page.type('input[placeholder="nama@email.com"]', "userA@siklusio.local");
  await page.type('input[placeholder="••••••••"]', "123456");
  // Wait for the button and click it using a div-based text search
  console.log("Searching for submit button...");
  const buttonLocator = page.locator('div, span, p, [role="button"]').filter({ hasText: /^Masuk$/i }).last();
  await buttonLocator.waitFor({ timeout: 5000 });
  console.log("Submit button found. Clicking it...");
  await buttonLocator.click();
  await page.waitForTimeout(3000);

  console.log("Injecting onboarding bypassed state...");
  await page.evaluate(() => {
    localStorage.setItem('hs_onboardingCompleted', 'true');
  });

  console.log("Navigating to home...");
  await page.goto(`${APP_URL}/`);
  await page.waitForTimeout(4000);

  console.log("Current URL:", page.url());

  // Dump body text
  const bodyText = await page.innerText('body');
  console.log("Body text of current page:\n", bodyText);

  // Take a screenshot
  const screenshotPath = "scratch/auth_page_debug.png";
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to ${screenshotPath}`);

  // Get list of all links and buttons
  const elements = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('a, button, [role="link"], [role="button"], [role="tab"]').forEach(el => {
      results.push({
        tag: el.tagName,
        text: el.innerText || el.textContent,
        href: el.getAttribute('href'),
        role: el.getAttribute('role'),
        accessibilityLabel: el.getAttribute('accessibilitylabel') || el.getAttribute('aria-label'),
        style: el.getAttribute('style'),
        className: el.className
      });
    });
    return results;
  });

  console.log("Interactive elements:");
  console.log(JSON.stringify(elements, null, 2));

  await browser.close();
}

main().catch(console.error);
