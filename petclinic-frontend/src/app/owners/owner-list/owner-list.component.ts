import {Component, OnDestroy, OnInit} from '@angular/core';
import {OwnerService} from '../owner.service';
import {Owner} from '../owner';
import {OwnerSortColumn} from '../owner-page';
import {Router} from '@angular/router';
import { finalize } from 'rxjs/operators';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-owner-list',
  templateUrl: './owner-list.component.html',
  styleUrls: ['./owner-list.component.css']
})
export class OwnerListComponent implements OnInit, OnDestroy {
  errorMessage = '';
  owners: Owner[];
  isOwnersDataReceived: boolean = false;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  pageIndex = 0;
  sortColumn: OwnerSortColumn = 'name';
  sortDirection: 'ascending' | 'descending' = 'ascending';
  total = 0;
  query = '';
  private pageRequest: Subscription;

  constructor(private router: Router, private ownerService: OwnerService) {

  }

  ngOnInit() {
    this.loadPage();
  }

  ngOnDestroy(): void {
    this.pageRequest?.unsubscribe();
  }

  onSelect(owner: Owner) {
    this.router.navigate(['/owners', owner.id]);
  }

  addOwner() {
    this.router.navigate(['/owners/add']);
  }

  onSearchChange(query: string): void {
    this.query = query;
    this.pageIndex = 0;
    this.loadPage();
  }

  sortBy(column: OwnerSortColumn): void {
    this.sortDirection = this.sortColumn === column && this.sortDirection === 'ascending'
      ? 'descending' : 'ascending';
    this.sortColumn = column;
    this.pageIndex = 0;
    this.loadPage();
  }

  setPageSize(size: number): void {
    this.pageSize = size;
    this.pageIndex = 0;
    this.loadPage();
  }

  previousPage(): void {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.loadPage();
    }
  }

  nextPage(): void {
    if ((this.pageIndex + 1) * this.pageSize < this.total) {
      this.pageIndex++;
      this.loadPage();
    }
  }

  firstRow(): number {
    return this.total === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  lastRow(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.total);
  }

  private loadPage(): void {
    this.pageRequest?.unsubscribe();
    this.errorMessage = '';
    this.pageRequest = this.ownerService.getOwnersPage({
      search: this.query,
      page: this.pageIndex,
      size: this.pageSize,
      sort: this.sortColumn,
      direction: this.sortDirection
    }).pipe(finalize(() => {
      this.isOwnersDataReceived = true;
    })).subscribe(
      page => {
        this.errorMessage = '';
        this.owners = page.items;
        this.total = page.total;
        if (this.pageIndex > 0 && this.owners.length === 0) {
          this.pageIndex = this.total === 0 ? 0 : Math.ceil(this.total / this.pageSize) - 1;
          this.loadPage();
        }
      },
      error => {
        this.errorMessage = error;
        this.owners = [];
        this.total = 0;
      });
  }

}
