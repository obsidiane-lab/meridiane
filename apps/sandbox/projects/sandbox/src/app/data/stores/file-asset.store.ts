import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import type {FileAsset} from '@obsidiane/bridge-sandbox';

@Injectable({providedIn: 'root'})
export class FileAssetStore extends BaseEntityStore<FileAsset> {}
