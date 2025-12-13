import {InjectionToken} from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export const MERCURE_HUB_URL = new InjectionToken<string>('MERCURE_HUB_URL');

export const MERCURE_CONFIG = new InjectionToken<RequestInit>('MERCURE_CONFIG');
