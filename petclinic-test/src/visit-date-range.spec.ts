import {APIRequestContext, Page} from '@playwright/test';
import {test, expect} from './support/trace-fixture';

test.use({dbFixture: 'default'});

const api = process.env.API_BASE_URL || 'http://127.0.0.1:8080/api';
const petId = 1;
const ownerId = 1;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function oneYearFromToday(): string {
  const now = new Date();
  const year = now.getFullYear() + 1;
  const month = now.getMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return isoDate(new Date(Date.UTC(year, month, Math.min(now.getDate(), lastDay))));
}

function dayBefore(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return isoDate(value);
}

function dayAfter(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return isoDate(value);
}

async function assertDateBounds(page: Page, birthDate: string, maximumDate: string, submitLabel: string) {
  const date = page.locator('input[name="date"]');
  const submit = page.getByRole('button', {name: submitLabel});
  const beforeBirth = page.getByText("Visit date cannot be before the pet's birth date");
  const tooLate = page.getByText('Visit date cannot be more than one year in the future');

  for (const invalidDate of ['0009-01-01', dayBefore(birthDate)]) {
    await date.fill(invalidDate);
    await expect(beforeBirth).toBeVisible();
    await expect(submit).toBeDisabled();
  }
  await date.fill(dayAfter(maximumDate));
  await expect(tooLate).toBeVisible();
  await expect(submit).toBeDisabled();

  for (const boundary of [birthDate, maximumDate]) {
    await date.fill(boundary);
    await expect(beforeBirth).toBeHidden();
    await expect(tooLate).toBeHidden();
    await expect(submit).toBeEnabled();
  }
}

async function deleteVisit(request: APIRequestContext, visitId: number) {
  const response = await request.delete(`${api}/visits/${visitId}`);
  expect(response.ok(), `cleanup of visit ${visitId}`).toBeTruthy();
}

test('new and edit visit forms enforce inclusive date bounds', async ({page, request}) => {
  const petResponse = await request.get(`${api}/pets/${petId}`);
  expect(petResponse.ok()).toBeTruthy();
  const pet = await petResponse.json() as {birthDate: string; ownerId: number};
  expect(pet.ownerId).toBe(ownerId);
  const maxDate = oneYearFromToday();
  let visitId: number | undefined;

  try {
    await page.goto(`/pets/${petId}/visits/add`);
    await expect(page.getByRole('heading', {name: 'New Visit'})).toBeVisible();
    await expect(page.locator('table').first()).toContainText(pet.birthDate);
    await page.locator('#description').fill('Date range acceptance test');
    await assertDateBounds(page, pet.birthDate, maxDate, 'Add Visit');

    await page.locator('input[name="date"]').fill(pet.birthDate);
    const createResponse = page.waitForResponse(response =>
      response.request().method() === 'POST' && response.url().endsWith(`/owners/${ownerId}/pets/${petId}/visits`));
    await page.getByRole('button', {name: 'Add Visit'}).click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    visitId = Number(created.headers().location?.split('/').pop());
    expect(visitId).toBeGreaterThan(0);
    await expect(page).toHaveURL(new RegExp(`/owners/${ownerId}$`));
    expect((await (await request.get(`${api}/visits/${visitId}`)).json()).date).toBe(pet.birthDate);

    await page.goto(`/visits/${visitId}/edit`);
    await expect(page.getByRole('heading', {name: 'Edit Visit'})).toBeVisible();
    await expect(page.locator('#description')).toHaveValue('Date range acceptance test');
    await expect(page.locator('table').first()).toContainText(pet.birthDate);
    await assertDateBounds(page, pet.birthDate, maxDate, 'Update Visit');
    const updateResponse = page.waitForResponse(response =>
      response.request().method() === 'PUT' && response.url().endsWith(`/visits/${visitId}`));
    await page.getByRole('button', {name: 'Update Visit'}).click();
    expect((await updateResponse).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/owners/${ownerId}$`));
    expect((await (await request.get(`${api}/visits/${visitId}`)).json()).date).toBe(maxDate);
  } finally {
    if (visitId) await deleteVisit(request, visitId);
  }
});

test('visit APIs reject dates outside the same bounds', async ({request}) => {
  const petResponse = await request.get(`${api}/pets/${petId}`);
  expect(petResponse.ok()).toBeTruthy();
  const pet = await petResponse.json() as {birthDate: string; ownerId: number};
  expect(pet.ownerId).toBe(ownerId);
  const description = 'Date range API acceptance test';
  const invalidDates = ['0009-01-01', dayBefore(pet.birthDate), dayAfter(oneYearFromToday())];
  const createdIds: number[] = [];

  try {
    const valid = await request.post(`${api}/visits`, {
      data: {petId, date: pet.birthDate, description},
    });
    expect(valid.status()).toBe(201);
    const visitId = Number(valid.headers().location?.split('/').pop());
    expect(visitId).toBeGreaterThan(0);
    createdIds.push(visitId);

    for (const date of invalidDates) {
      for (const url of [`${api}/visits`, `${api}/owners/${ownerId}/pets/${petId}/visits`]) {
        const response = await request.post(url, {data: {petId, date, description}});
        if (response.status() === 201) {
          createdIds.push(Number(response.headers().location?.split('/').pop()));
        }
        expect(response.status(), `POST ${url} with ${date}`).toBe(400);
      }
      const update = await request.put(`${api}/visits/${visitId}`, {data: {date, description}});
      expect(update.status(), `PUT visit with ${date}`).toBe(400);
      expect((await (await request.get(`${api}/visits/${visitId}`)).json()).date).toBe(pet.birthDate);
    }
  } finally {
    for (const id of createdIds) await deleteVisit(request, id);
  }
});
