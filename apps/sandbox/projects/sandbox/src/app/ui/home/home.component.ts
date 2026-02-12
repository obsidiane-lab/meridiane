import {Component} from '@angular/core';

import {RouterLink} from '@angular/router';
import {BACKEND_BASE_URL, MERCURE_HUB_URL} from '../../core/backend';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  readonly backendBaseUrl = BACKEND_BASE_URL;
  readonly mercureHubUrl = MERCURE_HUB_URL;
}

