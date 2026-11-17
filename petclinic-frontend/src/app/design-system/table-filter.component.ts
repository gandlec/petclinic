import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-table-filter',
  template: `
    <label class="form-group">
      {{ label }}
      <input #filter type="search" class="form-control" [value]="query"
        (input)="updateQuery(filter.value)" placeholder="Filter any column">
    </label>
  `
})
export class TableFilterComponent {
  @Input() label = 'Filter';
  @Output() queryChange = new EventEmitter<string>();
  query = '';

  updateQuery(query: string): void {
    this.query = query;
    this.queryChange.emit(query);
  }
}
