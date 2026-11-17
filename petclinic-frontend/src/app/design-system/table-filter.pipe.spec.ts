import {TableFilterPipe} from './table-filter.pipe';

describe('TableFilterPipe', () => {
  const pipe = new TableFilterPipe();
  const rows = [
    {id: 42, firstName: 'George', lastName: 'Franklin', city: 'Madison',
      pets: [{name: 'Leo'}, {name: 'Max'}]},
    {id: 43, firstName: 'Helen', lastName: 'Leary', city: 'Windsor', pets: []}
  ];
  const columns = ['firstName', 'lastName', 'city', 'pets.name'];

  it('matches case-insensitive substrings in every displayed column', () => {
    for (const query of ['EOR', 'ANK', 'ADIS', 'aX', 'george FRANKLIN']) {
      expect(pipe.transform(rows, query, columns)).toEqual([rows[0]]);
    }
  });

  it('does not search fields that are not displayed', () => {
    expect(pipe.transform(rows, '42', columns)).toEqual([]);
  });

  it('restores all rows when cleared without modifying the source', () => {
    pipe.transform(rows, 'Leo', columns);
    expect(pipe.transform(rows, '', columns)).toBe(rows);
    expect(rows.length).toBe(2);
  });

  it('handles loading data, empty arrays and missing optional values', () => {
    expect(pipe.transform(undefined, 'cat', columns)).toEqual([]);
    expect(pipe.transform([{pets: null}], 'cat', ['pets.name'])).toEqual([]);
  });

  it('matches displayed dates, telephone numbers and nested specialties', () => {
    expect(pipe.transform([{date: '2026-11-17'}], '11-1', ['date']).length).toBe(1);
    expect(pipe.transform([{telephone: '6085551023'}], '555', ['telephone']).length).toBe(1);
    expect(pipe.transform([{specialties: [{name: 'radiology'}]}], 'DIO', ['specialties.name']).length).toBe(1);
  });
});
