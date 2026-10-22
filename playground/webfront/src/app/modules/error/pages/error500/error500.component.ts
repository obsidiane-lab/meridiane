import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse, lucideServerCrash } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';

@Component({
  selector: 'app-error500',
  imports: [RouterLink, NgIcon, TranslatePipe, HlmButton, ...HlmEmptyImports],
  providers: [provideIcons({ lucideHouse, lucideServerCrash })],
  templateUrl: './error500.component.html',
  host: { class: 'block w-full max-w-lg' },
})
export class Error500Component {}
