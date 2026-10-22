import {inject, Injectable, Signal} from '@angular/core';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

import {AnyQuery, BridgeFacade, Collection, FacadeFactory, Iri, IriRequired, ResourceFacade, ResourceEvent} from '@obsidiane/bridge-sandbox';
import type {FileAsset} from '@obsidiane/bridge-sandbox';
import {FileAssetStore} from '../stores/file-asset.store';

@Injectable({providedIn: 'root'})
export class FileAssetRepository {
  private readonly store = inject(FileAssetStore);
  private readonly facadeFactory = inject(FacadeFactory);
  private readonly bridge = inject(BridgeFacade);

  private readonly facade: ResourceFacade<FileAsset> = this.facadeFactory.create<FileAsset>({url: '/api/file_assets'});

  assets(): Signal<readonly FileAsset[]> {
    return this.store.entities();
  }

  asset(iri: Iri): Signal<FileAsset | undefined> {
    return this.store.entity(iri);
  }

  fetchAll$(query?: AnyQuery): Observable<Collection<FileAsset>> {
    return this.facade.getCollection$(query).pipe(tap((col) => this.store.upsertMany(col.member)));
  }

  fetch$(iri: IriRequired): Observable<FileAsset> {
    return this.facade.get$(iri).pipe(tap((a) => this.store.upsert(a)));
  }

  upload$(file: File, label?: string): Observable<FileAsset> {
    const fd = new FormData();
    fd.set('file', file);
    if (label && label.trim() !== '') fd.set('label', label.trim());

    return this.bridge
      .post$<FileAsset, FormData>('/api/file_assets/upload', fd)
      .pipe(tap((asset) => this.store.upsert(asset)));
  }

  delete$(iri: IriRequired): Observable<void> {
    return this.facade.delete$(iri).pipe(tap(() => this.store.remove(iri)));
  }

  /** Applies the Mercure changes of this resource to the store while subscribed. */
  watch$(iri?: IriRequired): Observable<ResourceEvent<FileAsset>> {
    return this.facade.watch$(iri).pipe(tap((event) => this.store.apply(event)));
  }
}
