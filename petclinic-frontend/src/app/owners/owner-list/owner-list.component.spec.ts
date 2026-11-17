/* tslint:disable:no-unused-variable */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {DebugElement, NO_ERRORS_SCHEMA} from '@angular/core';

import {OwnerListComponent} from './owner-list.component';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import { OwnerService } from '../owner.service';
import {Owner} from '../owner';
import {OwnerPage, OwnerPageQuery} from '../owner-page';
import {Observable, of, Subject} from 'rxjs';
import {RouterTestingModule} from '@angular/router/testing';
import {CommonModule} from '@angular/common';
import {PartsModule} from '../../parts/parts.module';
import {ActivatedRouteStub} from '../../testing/router-stubs';
import {OwnerDetailComponent} from '../owner-detail/owner-detail.component';
import {OwnersModule} from '../owners.module';
import {DummyComponent} from '../../testing/dummy.component';
import {OwnerAddComponent} from '../owner-add/owner-add.component';
import {OwnerEditComponent} from '../owner-edit/owner-edit.component';
import Spy = jasmine.Spy;


class OwnerServiceStub {
  getOwnersPage(query: OwnerPageQuery): Observable<OwnerPage> {
    return of({items: [], total: 0});
  }

  searchOwners(search: string): Observable<Owner[]> {
    return of();
  }
}

describe('OwnerListComponent', () => {

  let component: OwnerListComponent;
  let fixture: ComponentFixture<OwnerListComponent>;
  let ownerService = new OwnerServiceStub();
  let getOwnersPageSpy: Spy;
  let searchOwnersSpy: Spy;
  let de: DebugElement;
  let el: HTMLElement;


  const testOwner: Owner = {
    id: 1,
    firstName: 'George',
    lastName: 'Franklin',
    address: '110 W. Liberty St.',
    city: 'Madison',
    telephone: '6085551023',
    pets: []
  };
  let testOwners: Owner[];

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DummyComponent],
      schemas: [NO_ERRORS_SCHEMA],
      imports: [CommonModule, FormsModule, PartsModule, OwnersModule,
        RouterTestingModule.withRoutes(
          [{path: 'owners', component: OwnerListComponent},
            {path: 'owners/add', component: OwnerAddComponent},
            {path: 'owners/:id', component: OwnerDetailComponent},
            {path: 'owners/:id/edit', component: OwnerEditComponent}
          ])],
      providers: [
        {provide: OwnerService, useValue: ownerService},
        {provide: ActivatedRoute, useClass: ActivatedRouteStub}
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    testOwners = [testOwner];

    fixture = TestBed.createComponent(OwnerListComponent);
    component = fixture.componentInstance;
    ownerService = fixture.debugElement.injector.get(OwnerService);
    getOwnersPageSpy = spyOn(ownerService, 'getOwnersPage')
      .and.returnValue(of({items: testOwners, total: testOwners.length}));
    searchOwnersSpy = spyOn(ownerService, 'searchOwners')
      .and.returnValue(of(testOwners));

  });

  it('should create OwnerListComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should call ngOnInit() method', () => {
    fixture.detectChanges();
    expect(getOwnersPageSpy).toHaveBeenCalledWith({
      search: '',
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ascending'
    });
  });


  it(' should show full name after getOwners observable (async) ', waitForAsync(() => {
    fixture.detectChanges();
    fixture.whenStable().then(() => { // wait for async getOwners
      fixture.detectChanges();        // update view with name
      de = fixture.debugElement.query(By.css('.ownerFullName'));
      el = de.nativeElement;
      expect(el.innerText).toBe((testOwner.firstName.toString() + ' ' + testOwner.lastName.toString()));
    });
  }));

  function filterFor(query: string) {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = query;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function listedNames(): string[] {
    return fixture.debugElement.queryAll(By.css('.ownerFullName'))
      .map(cell => cell.nativeElement.textContent.trim());
  }

  it('sends live search to the server and resets to the first page', () => {
    getOwnersPageSpy.and.returnValue(of({items: [testOwner], total: 1}));
    fixture.detectChanges();
    component.pageIndex = 2;

    filterFor('george FRANKLIN');

    expect(getOwnersPageSpy.calls.mostRecent().args[0]).toEqual({
      search: 'george FRANKLIN',
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ascending'
    });
    expect(listedNames()).toEqual(['George Franklin']);
    expect(searchOwnersSpy).not.toHaveBeenCalled();
  });

  it('ignores a stale page response after the search changes', () => {
    const initialLoad = new Subject<OwnerPage>();
    getOwnersPageSpy.and.returnValues(initialLoad, of({items: [testOwner], total: 1}));
    fixture.detectChanges();

    filterFor('Franklin');
    initialLoad.next({items: [testOwner, {...testOwner, id: 2, lastName: 'Davis'}], total: 2});
    fixture.detectChanges();
    expect(listedNames()).toEqual(['George Franklin']);
  });

  it('paginates server results and resets when the page size changes', () => {
    const allOwners = Array.from({length: 23}, (_, i) =>
      ({...testOwner, id: i + 1, firstName: `Owner ${String(i + 1).padStart(2, '0')}`}));
    getOwnersPageSpy.and.callFake((query: OwnerPageQuery) => of({
      items: allOwners.slice(query.page * query.size, (query.page + 1) * query.size),
      total: allOwners.length
    }));
    fixture.detectChanges();

    expect(listedNames().length).toBe(10);
    component.nextPage();
    fixture.detectChanges();
    expect(listedNames()[0]).toBe('Owner 11 Franklin');

    component.setPageSize(5);
    fixture.detectChanges();
    expect(component.pageIndex).toBe(0);
    expect(listedNames().length).toBe(5);
    component.setPageSize(20);
    fixture.detectChanges();
    expect(listedNames().length).toBe(20);
    component.nextPage();
    fixture.detectChanges();
    expect(listedNames().length).toBe(3);
    component.nextPage();
    expect(component.pageIndex).toBe(1);
    component.previousPage();
    expect(component.pageIndex).toBe(0);
  });

  it('requests server sorting for every column and direction', () => {
    getOwnersPageSpy.and.returnValue(of({items: [testOwner], total: 1}));
    fixture.detectChanges();
    for (const column of ['name', 'address', 'city', 'telephone', 'pets']) {
      const header: HTMLButtonElement = fixture.nativeElement.querySelector(`button[data-sort="${column}"]`);
      header.click();
      fixture.detectChanges();
      expect(getOwnersPageSpy.calls.mostRecent().args[0]).toEqual({
        search: '',
        page: 0,
        size: 10,
        sort: column,
        direction: column === 'name' ? 'descending' : 'ascending'
      });
      header.click();
      fixture.detectChanges();
      expect(getOwnersPageSpy.calls.mostRecent().args[0].direction)
        .toBe(column === 'name' ? 'ascending' : 'descending');
    }
  });

});
