import { test, expect, Page } from '@playwright/test';

async function nav(page: Page, name: string) {
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  if (
    (await toggle.isVisible()) &&
    !(await page.getByRole('navigation').isVisible())
  )
    await toggle.click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name, exact: true })
    .click();
  await expect(
    page.getByText('Opening your travel space…', { exact: true })
  ).toHaveCount(0);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true);
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  (page as any).runtimeErrors = errors;
  // External providers are intentionally unavailable in UI tests; verify graceful fallbacks.
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost'].includes(host)
      ? route.continue()
      : route.abort();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});
test.afterEach(async ({ page }) => {
  expect((page as any).runtimeErrors).toEqual([]);
});

test('explore images, category filters, budget sort, saved places and reload', async ({
  page,
}) => {
  await expect(page.locator('.destination-card')).toHaveCount(7);
  await expect
    .poll(() =>
      page
        .locator('.explore-hero img')
        .evaluate((img: HTMLImageElement) => img.naturalWidth)
    )
    .toBeGreaterThan(0);
  await page
    .getByRole('button', { name: 'Beaches & islands', exact: true })
    .click();
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'All places', exact: true }).click();
  await page.getByLabel('Sort destinations').selectOption('budget');
  await expect(page.locator('.destination-title').first()).toContainText(
    'Bali'
  );
  await page.getByRole('button', { name: 'Save Tokyo', exact: true }).click();
  await page.getByRole('button', { name: 'Saved (1)', exact: true }).click();
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Unsave Tokyo', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Saved (1)', exact: true }).click();
  await page.getByRole('button', { name: 'Unsave Tokyo', exact: true }).click();
  await expect(page.getByText('A little room for inspiration.')).toBeVisible();
  await noOverflow(page);
});

test('search, empty state, destination tabs, Escape and shared destination link', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Find a destination' }).click();
  await page.getByLabel('Search destinations').fill('not-a-real-match');
  await expect(page.getByText('No matches yet.')).toBeVisible();
  await page.getByLabel('Search destinations').fill('Tokyo');
  await page.locator('.search-results button').click();
  const dialog = page.getByRole('dialog', { name: 'Destination details' });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Logistics & Budget', exact: true })
    .click();
  await expect(
    dialog.getByText('Local currency:', { exact: false })
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.goto('/?destination=tokyo-japan');
  await expect(
    page.getByRole('dialog', { name: 'Destination details' })
  ).toBeVisible();
});

test('map layers, bounds, fullscreen dimensions, Escape and external tile failure', async ({
  page,
}) => {
  await page.route(/.*(cartocdn|arcgisonline|tile.openstreetmap).*/, (route) =>
    route.abort()
  );
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Dark', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByTitle('Fit Full Route').click();
  await page.getByTitle('Expand Fullscreen').click();
  const box = await page.locator('.map-fullscreen').boundingBox();
  expect(box?.width).toBeGreaterThan(1400);
  expect(box?.height).toBeGreaterThan(960);
  await expect(
    page.getByText('Map tiles couldn’t load.', { exact: false })
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.map-fullscreen')).toHaveCount(0);
});

test('create blank destination trip, add day and activity, complete, persist, delete', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Explore Tokyo', exact: true })
    .click();
  await page.getByRole('button', { name: 'Plan Trip', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A week in Tokyo' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add Day', exact: true }).click();
  await page.getByRole('button', { name: 'Add Stop', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add activity' });
  await dialog
    .locator('input[type="text"]')
    .first()
    .fill('A quiet coffee stop');
  await dialog.locator('input[type="number"]').fill('12.50');
  await dialog.locator('button[type="submit"]').click();
  await expect(
    page.getByText('A quiet coffee stop', { exact: true })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Mark complete: A quiet coffee stop' })
    .click();
  await page.reload();
  await nav(page, 'My itinerary');
  await page.getByRole('button', { name: 'Day 8', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Mark incomplete: A quiet coffee stop' })
  ).toBeVisible();
  const trip = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('tripcheck:active-trip')!)
  );
  expect(trip.days).toHaveLength(8);
  expect(trip.endDate).toBe(trip.days[7].date);
  expect(trip.days[7].activities[0].lat).toBeUndefined();
  await page.getByTitle('Delete activity').click();
  await expect(
    page.getByText('A quiet coffee stop', { exact: true })
  ).toHaveCount(0);
});

test('expense create, invalid amount, totals, persistence, delete and trip isolation', async ({
  page,
}) => {
  await nav(page, 'Budget');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add expense' });
  await dialog.getByLabel('Expense Description *').fill('Airport coffee test');
  await dialog.getByLabel('Amount ($ USD) *').fill('-2');
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Amount ($ USD) *').fill('4.75');
  await dialog.locator('button[type="submit"]').click();
  await expect(
    page.getByText('Airport coffee test', { exact: true })
  ).toBeVisible();
  await page.reload();
  await nav(page, 'Budget');
  const row = page
    .locator('.divide-y > div')
    .filter({ has: page.getByText('Airport coffee test', { exact: true }) });
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByText('Airport coffee test', { exact: true })
  ).toHaveCount(0);
  await nav(page, 'Explore');
  await page
    .getByRole('button', { name: 'Explore Tokyo', exact: true })
    .click();
  await page.getByRole('button', { name: 'Plan Trip', exact: true }).click();
  await nav(page, 'Budget');
  await expect(
    page.getByText('No expenses logged yet.', { exact: false })
  ).toBeVisible();
});

test('essentials: country, dialable numbers, conversion, packing add/toggle/persistence', async ({
  page,
}) => {
  await nav(page, 'Travel essentials');
  await expect(page.locator('a[href="tel:110"]').first()).toBeVisible();
  await page.locator('select').first().selectOption('Iceland');
  await expect(page.locator('a[href="tel:112"]').first()).toBeVisible();
  await page.locator('input[type="number"]').fill('2');
  await expect(page.getByText('309 JPY', { exact: true })).toBeVisible();
  await page
    .getByPlaceholder('Add packing item', { exact: false })
    .fill('My blue raincoat');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const item = page.getByRole('checkbox', { name: /My blue raincoat/ });
  await item.focus();
  await page.keyboard.press('Space');
  await expect(item).toHaveAttribute('aria-checked', 'true');
  await nav(page, 'Explore');
  await nav(page, 'Travel essentials');
  await expect(item).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await nav(page, 'Travel essentials');
  await expect(item).toHaveAttribute('aria-checked', 'true');
});

test('group ideas: zero-cost creation, vote switch/undo, persistence and trip isolation', async ({
  page,
}) => {
  await nav(page, 'Group ideas');
  await page.getByRole('button', { name: 'Add an idea', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add idea' });
  await dialog.getByLabel('Title *').fill('Free sunset walk');
  await dialog.getByLabel('Estimated Cost ($)').fill('0');
  await dialog.getByRole('button', { name: 'Save idea' }).click();
  const up = page.getByRole('button', { name: 'Upvote Free sunset walk' });
  const down = page.getByRole('button', { name: 'Downvote Free sunset walk' });
  await expect(up).toHaveAttribute('aria-pressed', 'true');
  await down.click();
  await expect(up).toHaveText('0');
  await expect(down).toHaveText('1');
  await down.click();
  await expect(down).toHaveText('0');
  await up.click();
  await page.reload();
  await nav(page, 'Group ideas');
  await expect(up).toHaveAttribute('aria-pressed', 'true');
  const cards = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('tripcheck:votes')!)
  );
  expect(
    cards.find((card: any) => card.title === 'Free sunset walk').costEst
  ).toBe(0);
  await nav(page, 'Explore');
  await page
    .getByRole('button', { name: 'Explore Tokyo', exact: true })
    .click();
  await page.getByRole('button', { name: 'Plan Trip', exact: true }).click();
  await nav(page, 'Group ideas');
  await expect(
    page.getByText('Every good trip starts with an idea.')
  ).toBeVisible();
});

test('route plan: real sample API, tabs, language, traveler count and import', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Plan my trip', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Plan your trip' });
  await dialog.locator('#origin-place-input').fill('New Delhi, India');
  await dialog.locator('#dest-place-input').fill('Tokyo, Japan');
  await dialog.getByLabel('Travelers', { exact: true }).fill('3');
  await dialog
    .getByRole('button', { name: 'Generate Trip', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('Sample plan');
  for (const text of [
    'Curated Stays',
    'Culinary Guide',
    'Transit & Route',
    'Budget Breakdown',
    'Day-by-Day Plan',
  ]) {
    await dialog.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: /Hindi/ }).click();
  await expect(dialog.getByText(/दिनों की यात्रा/)).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Open in Trip Planner', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const trip = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('tripcheck:active-trip')!)
  );
  expect(trip.travelers).toBe(3);
  expect(trip.days).toHaveLength(5);
  const ids = trip.days.flatMap((day: any) =>
    day.activities.map((a: any) => a.id)
  );
  expect(new Set(ids).size).toBe(ids.length);
  expect(trip.planningNote).toContain('Sample plan');
});

test('route failure is visible and stale results reset on reopening', async ({
  page,
}) => {
  await page.route('**/api/ai/plan', (route) =>
    route.fulfill({
      status: 503,
      json: {
        success: false,
        error: 'Temporarily unavailable. Please try again.',
      },
    })
  );
  await page.getByRole('button', { name: 'Plan my trip', exact: true }).click();
  await page.locator('#dest-place-input').fill('Tokyo');
  await page
    .getByRole('button', { name: 'Generate Trip', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Temporarily unavailable'
  );
  await page.getByLabel('Close trip planner').click();
  await page.getByRole('button', { name: 'Plan my trip', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('trip assistant sample import and offline error', async ({ page }) => {
  await page.getByRole('button', { name: 'Try the trip assistant' }).click();
  const dialog = page.getByRole('dialog', { name: 'Trip assistant' });
  await dialog.locator('#ai-modal-dest-input').fill('Tokyo, Japan');
  await dialog.getByRole('button', { name: 'Create my itinerary' }).click();
  await expect(dialog.getByRole('status')).toContainText('Sample plan');
  await dialog.getByRole('button', { name: /Import/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.route('**/api/ai/plan', (route) => route.abort());
  await page.getByRole('button', { name: 'Try the trip assistant' }).click();
  await page.getByRole('button', { name: 'Create my itinerary' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: /Import/ })).toHaveCount(0);
});

test('inspiration carousel opens destinations with keyboard', async ({
  page,
}) => {
  await nav(page, 'Get inspired');
  await page.getByRole('button', { name: 'Next', exact: true }).first().click();
  const card = page
    .getByRole('button', { name: 'Explore Tokyo', exact: true })
    .first();
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('dialog', { name: 'Destination details' })
  ).toBeVisible();
});

for (const width of [360, 390, 768, 1440, 1920]) {
  test(`responsive navigation and all feature pages at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await noOverflow(page);
    for (const name of [
      'Get inspired',
      'My itinerary',
      'Budget',
      'Travel essentials',
      'Group ideas',
      'Explore',
    ]) {
      await nav(page, name);
      await noOverflow(page);
    }
    if (width === 1920) {
      const main = await page.locator('main').boundingBox();
      expect(main!.width).toBeGreaterThan(1600);
    }
  });
}

test('malformed saved data does not crash the app', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('tripcheck:active-trip', 'null');
    localStorage.setItem('tripcheck:expenses', '{broken');
  });
  await page.reload();
  await nav(page, 'Budget');
  await expect(
    page.getByRole('heading', {
      name: 'Keep the memories. Track the spending.',
    })
  ).toBeVisible();
});

test('autocomplete selection, clear, keyboard navigation and quick form handoff', async ({
  page,
}) => {
  const origin = page.locator('#quick-origin-input');
  await origin.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(origin).not.toHaveValue('');
  await page.locator('#quick-dest-input').fill('Tokyo');
  await page.getByText('LEAVING FROM', { exact: true }).click();
  await page.getByRole('button', { name: 'Plan my trip', exact: true }).click();
  await expect(page.locator('#dest-place-input')).toHaveValue('Tokyo');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('malformed successful AI response is an error, never a crash or fake plan', async ({
  page,
}) => {
  await page.route('**/api/ai/plan', (route) =>
    route.fulfill({ json: { success: true, plan: { days: [] } } })
  );
  await page.getByRole('button', { name: 'Plan my trip', exact: true }).click();
  await page.locator('#dest-place-input').fill('Tokyo');
  await page
    .getByRole('button', { name: 'Generate Trip', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open in Trip Planner' })
  ).toHaveCount(0);
});

test('closing a loading planner cancels it and does not resurrect stale results', async ({
  page,
}) => {
  await page.route('**/api/ai/plan', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await route
      .fulfill({ json: { success: false, error: 'Old request error' } })
      .catch(() => {});
  });
  await page.getByRole('button', { name: 'Plan my trip', exact: true }).click();
  await page.locator('#dest-place-input').fill('Tokyo');
  await page
    .getByRole('button', { name: 'Generate Trip', exact: true })
    .click();
  await page.getByLabel('Close trip planner').click();
  await page.getByRole('button', { name: 'Plan my trip', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Generate Trip', exact: true })
  ).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('search dialog traps focus and restores it on Escape', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Find a destination' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('button').last().focus();
  await page.keyboard.press('Tab');
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement))
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('deeply corrupt persisted trip and expense rows recover gracefully', async ({
  page,
}) => {
  await page.evaluate(() => {
    const trip = JSON.parse(localStorage.getItem('tripcheck:active-trip')!);
    trip.days = [null];
    localStorage.setItem('tripcheck:active-trip', JSON.stringify(trip));
    localStorage.setItem('tripcheck:expenses', '[null]');
    localStorage.setItem('tripcheck:votes', '[{}]');
  });
  await page.reload();
  await nav(page, 'My itinerary');
  await expect(page.getByText('Your trip', { exact: true })).toBeVisible();
  await nav(page, 'Budget');
  await nav(page, 'Group ideas');
});

test('mobile dialogs and generated results fit the screen and can be dismissed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Plan my trip', exact: true }).click();
  await page.locator('#dest-place-input').fill('Tokyo');
  await page
    .getByRole('button', { name: 'Generate Trip', exact: true })
    .click();
  await expect(page.getByRole('status').first()).toContainText('Sample plan');
  const dialog = page.getByRole('dialog');
  expect(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
  ).toBe(true);
  await page.getByLabel('Close trip planner').click();
  await nav(page, 'Budget');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  expect(
    await page
      .getByRole('dialog')
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
  ).toBe(true);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await nav(page, 'Explore');
  await page
    .getByRole('button', { name: 'Explore Tokyo', exact: true })
    .click();
  expect(
    await page
      .getByRole('dialog')
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
  ).toBe(true);
});

test('planner map visibility and empty day selection work independently', async ({
  page,
}) => {
  await nav(page, 'My itinerary');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page
    .getByRole('button', { name: 'Hide Map', exact: true })
    .first()
    .click();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Show Map', exact: true })
    .first()
    .click();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.getByRole('button', { name: 'Add Day', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No mapped stops yet' })
  ).toBeVisible();
});

test('map popup treats activity names as text, not executable HTML', async ({
  page,
}) => {
  await page.evaluate(() => {
    const trip = JSON.parse(localStorage.getItem('tripcheck:active-trip')!);
    trip.days[0].activities[0].title =
      '<img src=x onerror="window.popupInjected=true">';
    localStorage.setItem('tripcheck:active-trip', JSON.stringify(trip));
  });
  await page.reload();
  await nav(page, 'My itinerary');
  await page.locator('.activity-pin').first().click();
  await expect(page.locator('.leaflet-popup-content')).toContainText(
    '<img src=x'
  );
  expect(
    await page.evaluate(() => (window as any).popupInjected)
  ).toBeUndefined();
  await nav(page, 'Explore');
});
