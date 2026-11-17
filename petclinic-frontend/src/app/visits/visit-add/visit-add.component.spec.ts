/* tslint:disable:no-unused-variable */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {By} from '@angular/platform-browser';

import {VisitAddComponent} from './visit-add.component';
import {FormsModule, NgModel} from '@angular/forms';
import {VisitService} from '../visit.service';
import {PetService} from '../../pets/pet.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ActivatedRouteStub, RouterStub} from '../../testing/router-stubs';
import {Pet} from '../../pets/pet';
import {Observable, of} from 'rxjs';
import {MatMomentDateModule} from '@angular/material-moment-adapter';
import {MatDatepickerInput, MatDatepickerModule} from '@angular/material/datepicker';
import Spy = jasmine.Spy;
import {OwnerService} from '../../owners/owner.service';
import {Owner} from '../../owners/owner';
import * as moment from 'moment';

class PetServiceStub {
  addPet(pet: Pet): Observable<Pet> {
    return of();
  }
  getPetById(petId: string): Observable<Pet> {
    return of();
  }
}

const visitOwner: Owner = { id: 1, firstName: 'George', lastName: 'Franklin', address: '110 W. Liberty St.', city: 'Madison', telephone: '6085551023', pets: [] };

class OwnerServiceStub {
  getOwnerById(): Observable<Owner> {
    return of(visitOwner);
  }
}

class VisitServiceStub {
  addVisit(visit: any): Observable<any> {
    return of(visit);
  }
}

describe('VisitAddComponent', () => {
  let component: VisitAddComponent;
  let fixture: ComponentFixture<VisitAddComponent>;
  let petService: PetService;
  let visitService: VisitService;
  let testPet: Pet;
  let spy: Spy;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [VisitAddComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [FormsModule, MatDatepickerModule, MatMomentDateModule],
      providers: [
        {provide: PetService, useClass: PetServiceStub},
        {provide: VisitService, useClass: VisitServiceStub},
        {provide: OwnerService, useClass: OwnerServiceStub},
        {provide: Router, useClass: RouterStub},
        {provide: ActivatedRoute, useClass: ActivatedRouteStub}
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisitAddComponent);
    component = fixture.componentInstance;
    testPet = {
      id: 1,
      name: 'Leo',
      birthDate: '2010-09-07',
      type: {id: 1, name: 'cat'},
      ownerId: 1,
      owner: {
        id: 1,
        firstName: 'George',
        lastName: 'Franklin',
        address: '110 W. Liberty St.',
        city: 'Madison',
        telephone: '6085551023',
        pets: null
      },
      visits: null
    };
    petService = fixture.debugElement.injector.get(PetService);
    visitService = fixture.debugElement.injector.get(VisitService);
    spyOn(petService, 'getPetById').and.returnValue(of(testPet));
    spy = spyOn(petService, 'addPet')
      .and.returnValue(of(testPet));

    fixture.detectChanges();
  });

  it('should create VisitAddComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should submit visit and navigate to owner detail', () => {
    const router = fixture.debugElement.injector.get(Router) as unknown as RouterStub;
    spyOn(router, 'navigate');
    component.currentOwner = visitOwner;
    component.currentPet = testPet;
    const visit: any = { id: null, date: '2023-05-01', description: 'checkup', pet: testPet };
    component.onSubmit(visit);
    expect(visit.id).toBeNull();
    expect(component.addedSuccess).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/owners', 1]);
  });

  it('should limit visit dates to the pet birth date and one year ahead', () => {
    expect(component.minVisitDate.format('YYYY-MM-DD')).toBe(testPet.birthDate);
    expect(component.maxVisitDate.format('YYYY-MM-DD')).toBe(moment().add(1, 'year').format('YYYY-MM-DD'));
    expect(component.dateLimitsLoaded).toBeTrue();

    const dateElement = fixture.debugElement.query(By.css('input[name="date"]'));
    const datepickerInput = dateElement.injector.get(MatDatepickerInput);
    const dateControl = dateElement.injector.get(NgModel).control;
    dateControl.setValue(moment(testPet.birthDate).subtract(1, 'day'));
    expect(datepickerInput.validate(dateControl))
      .toEqual(jasmine.objectContaining({matDatepickerMin: jasmine.anything()}));
    dateControl.setValue(moment().add(1, 'year').add(1, 'day'));
    expect(datepickerInput.validate(dateControl))
      .toEqual(jasmine.objectContaining({matDatepickerMax: jasmine.anything()}));
  });

  it('should navigate to owner detail via gotoOwnerDetail', () => {
    const router = fixture.debugElement.injector.get(Router) as unknown as RouterStub;
    spyOn(router, 'navigate');
    component.currentOwner = visitOwner;
    component.gotoOwnerDetail();
    expect(router.navigate).toHaveBeenCalledWith(['/owners', 1]);
  });
});
