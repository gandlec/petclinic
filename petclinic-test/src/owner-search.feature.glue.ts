import {DataTable, Given, When, Then} from '@cucumber/cucumber';
import {expect} from '@playwright/test';
import axios from 'axios';
import {PlaywrightWorld} from './support/world';

// Gherkin, bound directly: the steps do the work themselves, with no DSL layer
// underneath — the .feature is the readable artefact here, and a second naming
// of the same sentences would only add indirection. (add-visit.spec.ts makes the
// opposite case: no Gherkin, sentences as a DSL in add-visit.dsl.ts.)
//
// Nothing below decides anything: the Background states the data, the Examples
// table states the search term and the expected result set.

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api';

const fullName = (o: {firstName: string; lastName: string}) => `${o.firstName} ${o.lastName}`;
const namesIn = (cell: string) => cell.split(',').map((n) => n.trim()).filter(Boolean);

/** Polls until the table has settled on exactly `expected` — order-insensitive. */
async function expectOwnersListed(world: PlaywrightWorld, expected: string[]): Promise<void> {
  const cells = world.page.locator('#ownersTable td.ownerFullName');
  const listed = async () => (await cells.allTextContents()).map((t) => t.trim()).filter(Boolean).sort();

  await expect.poll(listed, {timeout: 10_000}).toEqual([...expected].sort());
}

/**
 * Remembers every owner the clinic holds, after checking that the ones the
 * Background names are among them — so a changed seed (Flyway's
 * db/seed/R__seed.sql, which the feature asks for with @fixture:default) fails on
 * the Given instead of looking like a broken search.
 */
Given('the clinic has these owners', async function (this: PlaywrightWorld, owners: DataTable) {
  const {data} = await axios.get(`${API_BASE}/owners`, {timeout: 10_000});
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('The API returned no owners — is the backend up, and was the DB reset to ' +
      'the @fixture:default this feature declares?');
  }
  const names: string[] = data.map(fullName);
  expect(names).toEqual(expect.arrayContaining(owners.raw().map(([name]) => name.trim())));
  this.allOwnerNames = names;
});

When('I open the owners page', async function (this: PlaywrightWorld) {
  await this.page.goto('/owners');
  await this.page.locator('h2:has-text("Owners")').waitFor({state: 'visible', timeout: 10_000});
});

When('I search owners for {string}', async function (this: PlaywrightWorld, search: string) {
  await this.page.getByRole('searchbox', {name: 'Filter', exact: true}).fill(search);
});

Then('exactly these owners are listed: {string}', async function (this: PlaywrightWorld, owners: string) {
  await expectOwnersListed(this, namesIn(owners));
});

Then('every owner in the clinic is listed', async function (this: PlaywrightWorld) {
  const expected = this.requireAllOwnerNames();
  const names: string[] = [];
  const cells = this.page.locator('#ownersTable td.ownerFullName');
  const next = this.page.getByRole('button', {name: 'Next', exact: true});
  await expect(this.page.getByLabel('Rows per page')).toBeVisible();
  await expect.poll(async () => cells.count()).toBe(Math.min(5, expected.length));
  while (true) {
    names.push(...(await cells.allTextContents()).map(name => name.trim()));
    if (await next.isDisabled()) break;
    await next.click();
  }
  expect(names.sort()).toEqual([...expected].sort());
});
