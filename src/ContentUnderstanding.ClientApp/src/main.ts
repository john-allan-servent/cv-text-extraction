import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { buildAppConfig } from './app/app.config';
import { createMsalInstance, loadSpaConfig } from './app/auth/msal.config';

async function start(): Promise<void> {
  const config = await loadSpaConfig();
  const instance = await createMsalInstance(config);
  await bootstrapApplication(App, buildAppConfig(instance, config));
}

start().catch((error: unknown) => {
  console.error('Application failed to start', error);
  const root = document.querySelector('app-root');
  if (root) {
    root.textContent = error instanceof Error ? error.message : 'Application failed to start.';
    root.className = 'block p-6 text-red-700';
  }
});
