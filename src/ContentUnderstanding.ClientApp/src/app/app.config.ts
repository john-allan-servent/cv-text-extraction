import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { IPublicClientApplication } from '@azure/msal-browser';
import { routes } from './app.routes';
import { msalProviders, SpaConfig } from './auth/msal.config';

export function buildAppConfig(instance: IPublicClientApplication, config: SpaConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(routes),
      provideHttpClient(withInterceptorsFromDi()),
      ...msalProviders(instance, config),
    ],
  };
}
