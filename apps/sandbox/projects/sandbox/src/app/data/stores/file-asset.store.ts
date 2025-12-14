import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import {FileAsset} from '../../entities/file-asset';

@Injectable({providedIn: 'root'})
export class FileAssetStore extends BaseEntityStore<FileAsset> {}

