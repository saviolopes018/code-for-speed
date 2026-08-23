import { test, expect } from '@playwright/test';

test.describe('CODE FOR SPEED — Fortaleza free roam smoke', () => {
  test('boots, loads the road network and lets the car drive', async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on('pageerror', (err) => fatalErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') fatalErrors.push(msg.text());
    });

    await page.goto('/');

    // 1. canvas exists
    await expect(page.locator('#game-canvas')).toBeVisible();

    // 2. game bootstrapped (Rapier WASM + map loaded + debug hook exposed)
    await page.waitForFunction(() => (window as any).__CFS__ !== undefined, {
      timeout: 20_000,
    });

    // 3. vehicle exists
    expect(await page.evaluate(() => (window as any).__CFS__.hasVehicle())).toBe(true);

    // 4. real road network loaded from the imported Fortaleza map
    const roads = await page.evaluate(() => (window as any).__CFS__.roadCount());
    expect(roads).toBeGreaterThan(100);
    const tris = await page.evaluate(() => (window as any).__CFS__.roadTriangles());
    expect(tris).toBeGreaterThan(0);

    // 5. start free roam from the title screen
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).__CFS__.getState() === 'playing', {
      timeout: 5_000,
    });

    // 6. HUD present and loop advancing
    await expect(page.locator('.hud-speed')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__CFS__.getFps())).toBeGreaterThan(0);

    // 7. driving forward moves the car (input + physics alive)
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1200);
    const speed = await page.evaluate(() => (window as any).__CFS__.getSpeed());
    await page.keyboard.up('KeyW');
    expect(speed).toBeGreaterThan(1);

    // 8. no fatal exceptions
    expect(fatalErrors, fatalErrors.join('\n')).toHaveLength(0);
  });
});
