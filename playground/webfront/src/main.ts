import { enableProdMode } from '@angular/core';

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { createAppConfig } from './app/app.config';
import { loadRuntimeConfig } from './app/core/config/runtime-config';

void bootstrap();

async function bootstrap() {
  try {
    const runtimeConfig = await loadRuntimeConfig();

    if (runtimeConfig.app.production) {
      enableProdMode();
      selfXSSWarning();
    }

    await bootstrapApplication(AppComponent, createAppConfig(runtimeConfig));
  } catch (err) {
    console.error(err);
    renderBootstrapFailureScreen();
  }
}

function selfXSSWarning() {
  setTimeout(() => {
    console.log(
      '%c** STOP **',
      'font-weight:bold; font: 2.5em Arial; color: white; background-color: #e11d48; padding-left: 15px; padding-right: 15px; border-radius: 25px; padding-top: 5px; padding-bottom: 5px;',
    );
    console.log(
      `\n%cThis is a browser feature intended for developers. Using this console may allow attackers to impersonate you and steal your information sing an attack called Self-XSS. Do not enter or paste code that you do not understand.`,
      'font-weight:bold; font: 2em Arial; color: #e11d48;',
    );
  });
}

function renderBootstrapFailureScreen() {
  const main = document.createElement('main');
  const section = document.createElement('section');
  const eyebrow = document.createElement('p');
  const title = document.createElement('h1');
  const message = document.createElement('p');

  main.className = 'flex min-h-svh items-center justify-center bg-background p-6 text-foreground';
  section.className = 'w-full max-w-lg rounded-xl border bg-card p-8 text-card-foreground shadow-sm';
  eyebrow.className = 'mb-2 text-xs font-semibold uppercase tracking-widest text-destructive';
  title.className = 'mb-3 text-2xl font-semibold tracking-tight';
  message.className = 'm-0 text-sm leading-6 text-muted-foreground';
  eyebrow.textContent = 'Meridiane';
  title.textContent = 'Chargement impossible';
  message.textContent =
    "L'application n'a pas pu terminer son démarrage. Recharge la page ou vérifie la configuration runtime du frontend.";

  section.append(eyebrow, title, message);
  main.append(section);
  document.body.replaceChildren(main);
}
