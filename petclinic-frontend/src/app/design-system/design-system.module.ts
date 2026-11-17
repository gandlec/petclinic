import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ComboComponent} from './combo.component';
import {TableFilterComponent} from './table-filter.component';
import {TableFilterPipe} from './table-filter.pipe';

/** The standardised widgets every screen is expected to use. */
@NgModule({
  imports: [CommonModule],
  declarations: [ComboComponent, TableFilterComponent, TableFilterPipe],
  exports: [ComboComponent, TableFilterComponent, TableFilterPipe]
})
export class DesignSystemModule {
}
