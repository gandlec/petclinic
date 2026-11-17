import {Pipe, PipeTransform} from '@angular/core';

// List screens add and remove rows in place, including nested visits.
@Pipe({name: 'tableFilter', pure: false})
export class TableFilterPipe implements PipeTransform {
  transform<T>(rows: T[] | null | undefined, query: string, columns: string[]): T[] {
    if (!query) {
      return rows || [];
    }
    const term = query.toLowerCase();
    return (rows || []).filter(row =>
      columns.map(column => this.textAt(row, column.split('.'))).join(' ').toLowerCase().includes(term));
  }

  private textAt(value: unknown, path: string[]): string {
    if (Array.isArray(value)) {
      return value.map(item => this.textAt(item, path)).join(' ');
    }
    if (value == null) {
      return '';
    }
    if (path.length === 0) {
      return String(value);
    }
    if (typeof value !== 'object') {
      return '';
    }
    const [key, ...rest] = path;
    return this.textAt((value as Record<string, unknown>)[key], rest);
  }
}
