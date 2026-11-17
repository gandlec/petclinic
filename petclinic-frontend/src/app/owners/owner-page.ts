import {Owner} from './owner';

export type OwnerSortColumn = 'name' | 'address' | 'city' | 'telephone' | 'pets';

export interface OwnerPage {
  items: Owner[];
  total: number;
}

export interface OwnerPageQuery {
  search: string;
  page: number;
  size: number;
  sort: OwnerSortColumn;
  direction: 'ascending' | 'descending';
}
