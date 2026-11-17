import { Injectable } from '@angular/core';
import { Owner } from './owner';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { HandleError, HttpErrorHandler } from '../error.service';
import { OwnerPage, OwnerPageQuery } from './owner-page';

@Injectable()
export class OwnerService {
  entityUrl = environment.REST_API_URL + 'owners';

  private readonly handlerError: HandleError;

  constructor(
    private http: HttpClient,
    private httpErrorHandler: HttpErrorHandler
  ) {
    this.handlerError = httpErrorHandler.createHandleError('OwnerService');
  }

  getOwners(): Observable<Owner[]> {
    return this.http
      .get<Owner[]>(this.entityUrl)
      .pipe(catchError(this.handlerError('getOwners', [])));
  }

  getOwnersPage(query: OwnerPageQuery): Observable<OwnerPage> {
    const params = new HttpParams()
      .set('search', query.search)
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', query.sort)
      .set('direction', query.direction);
    return this.http
      .get<OwnerPage>(this.entityUrl + '/page', {params})
      .pipe(catchError(this.handlerError<OwnerPage>('getOwnersPage')));
  }

  getOwnerById(ownerId: number): Observable<Owner> {
    return this.http
      .get<Owner>(this.entityUrl + '/' + ownerId)
      .pipe(catchError(this.handlerError('getOwnerById', {} as Owner)));
  }

  addOwner(owner: Owner): Observable<Owner> {
    return this.http
      .post<Owner>(this.entityUrl, owner)
      .pipe(catchError(this.handlerError('addOwner', owner)));
  }


  updateOwner(ownerId: string, owner: Owner): Observable<{}> {
    return this.http
      .put<Owner>(this.entityUrl + '/' + ownerId, owner)
      .pipe(catchError(this.handlerError('updateOwner', owner)));
  }

  deleteOwner(ownerId: string): Observable<{}> {
    return this.http
      .delete<Owner>(this.entityUrl + '/' + ownerId)
      .pipe(catchError(this.handlerError('deleteOwner', [ownerId])));
  }

  searchOwners(search: string): Observable<Owner[]> {
    let url = this.entityUrl;
    if (search !== undefined) {
      url += '?search=' + search;
    }
    return this.http
      .get<Owner[]>(url)
      .pipe(catchError(this.handlerError('searchOwners', [])));
  }
}
