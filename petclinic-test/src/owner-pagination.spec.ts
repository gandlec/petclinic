import {test, expect} from './support/trace-fixture';

test.use({dbFixture: 'default'});

interface OwnerRow {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  telephone: string;
  pets: {name: string}[];
}

test('sorts all owner columns and paginates the filtered results', async ({page, request}) => {
  const api = process.env.API_BASE_URL || 'http://127.0.0.1:8080/api';
  const response = await request.get(`${api}/owners`);
  expect(response.ok()).toBeTruthy();
  const owners = await response.json() as OwnerRow[];
  expect(owners.length).toBeGreaterThan(20);

  await page.goto('/owners');
  const rows = page.locator('#ownersTable tbody tr');
  const size = page.getByLabel('Rows per page');
  const next = page.getByRole('button', {name: 'Next', exact: true});
  const previous = page.getByRole('button', {name: 'Previous', exact: true});
  const filter = page.getByRole('searchbox', {name: 'Search', exact: true});
  await expect(rows).toHaveCount(10);
  await expect(previous).toBeDisabled();

  for (const pageSize of [5, 10, 20]) {
    await size.selectOption({label: String(pageSize)});
    await expect(rows).toHaveCount(pageSize);
    await next.click();
    await expect(rows).toHaveCount(Math.min(pageSize, owners.length - pageSize));
    await expect(previous).toBeEnabled();
    await previous.click();
    await expect(rows).toHaveCount(pageSize);
  }

  const columns = [
    {label: 'Name', value: (owner: OwnerRow) => `${owner.firstName} ${owner.lastName}`},
    {label: 'Address', value: (owner: OwnerRow) => owner.address},
    {label: 'City', value: (owner: OwnerRow) => owner.city},
    {label: 'Telephone', value: (owner: OwnerRow) => owner.telephone},
    {label: 'Pets', value: (owner: OwnerRow) => (owner.pets || []).map(pet => pet.name).join(' ')}
  ];
  const names = () => rows.locator('td.ownerFullName').allTextContents()
    .then(values => values.map(value => value.trim()));
  const collator = new Intl.Collator(undefined, {sensitivity: 'base', numeric: true});
  for (const column of columns) {
    const header = page.getByRole('button', {name: column.label, exact: true});
    for (const direction of ['ascending', 'descending'] as const) {
      if (await header.locator('..').getAttribute('aria-sort') !== direction) {
        await header.click();
      }
      await expect(header.locator('..')).toHaveAttribute('aria-sort', direction);
      const sorted = [...owners].sort((a, b) => collator.compare(column.value(a), column.value(b))
        * (direction === 'ascending' ? 1 : -1));
      await expect.poll(names).toEqual(sorted.slice(0, 20).map(owner => `${owner.firstName} ${owner.lastName}`));
      await next.click();
      await expect.poll(names).toEqual(sorted.slice(20, 40).map(owner => `${owner.firstName} ${owner.lastName}`));
      await previous.click();
    }
  }

  await next.click();
  await filter.fill('Harry Potter');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Harry Potter');
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
  await filter.fill('no matching owner');
  await expect(rows).toHaveCount(0);
  await expect(page.getByText('0–0 of 0')).toBeVisible();
  await expect(next).toBeDisabled();
});
