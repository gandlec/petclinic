import {Component} from '@angular/core';
import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {DesignSystemModule} from './design-system.module';

@Component({
  template: `
    <app-table-filter #filter></app-table-filter>
    <table><tbody>
      <tr *ngFor="let row of rows | tableFilter: filter.query : ['name', 'specialties.name']">
        <td>{{ row.name }}</td>
        <td><input readonly [value]="row.specialties[0].name"></td>
      </tr>
    </tbody></table>`
})
class FilterHostComponent {
  rows = [
    {name: 'Helen Leary', specialties: [{name: 'radiology'}]},
    {name: 'James Carter', specialties: [{name: 'surgery'}]}
  ];
}

describe('TableFilterComponent', () => {
  let fixture: ComponentFixture<FilterHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FilterHostComponent],
      imports: [DesignSystemModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilterHostComponent);
    fixture.detectChanges();
  });

  function filterFor(query: string) {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = query;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function names(): string[] {
    const host: HTMLElement = fixture.nativeElement;
    return Array.from(host.querySelectorAll('td:first-child')).map(cell => cell.textContent.trim());
  }

  it('updates rows on input, including readonly input column content', () => {
    filterFor('DIO');
    expect(names()).toEqual(['Helen Leary']);
    filterFor('no match');
    expect(names()).toEqual([]);
    filterFor('');
    expect(names()).toEqual(['Helen Leary', 'James Carter']);
  });

  it('keeps filtering when rows are added, deleted or updated in place', () => {
    filterFor('DIO');
    fixture.componentInstance.rows.push({name: 'New Vet', specialties: [{name: 'radiology'}]});
    fixture.detectChanges();
    expect(names()).toEqual(['Helen Leary', 'New Vet']);
    fixture.componentInstance.rows.splice(0, 1);
    fixture.detectChanges();
    expect(names()).toEqual(['New Vet']);
    fixture.componentInstance.rows[1].specialties[0].name = 'surgery';
    fixture.detectChanges();
    expect(names()).toEqual([]);
  });
});
