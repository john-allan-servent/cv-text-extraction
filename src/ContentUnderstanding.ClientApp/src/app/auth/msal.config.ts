import { InteractionType, IPublicClientApplication, LogLevel, PublicClientApplication } from '@azure/msal-browser';
import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalGuard,
  MsalGuardConfiguration,
  MsalInterceptor,
  MsalInterceptorConfiguration,
  MsalService,
} from '@azure/msal-angular';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Provider } from '@angular/core';

export interface SpaConfig {
  tenantId: string;
  clientId: string;
  apiScope: string;
}

/** Loads public SPA settings from the backend (populated from its environment variables). */
export async function loadSpaConfig(): Promise<SpaConfig> {
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error(`Unable to load application configuration (HTTP ${response.status}).`);
  }
  const config = (await response.json()) as SpaConfig;
  if (!config.tenantId || !config.clientId) {
    throw new Error('Server is missing AzureAd:TenantId or AzureAd:SpaClientId configuration.');
  }
  return config;
}

export async function createMsalInstance(config: SpaConfig): Promise<IPublicClientApplication> {
  const instance = new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'sessionStorage' },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
      },
    },
  });

  await instance.initialize();
  const result = await instance.handleRedirectPromise();
  const account = result?.account ?? instance.getAllAccounts()[0];
  if (account) {
    instance.setActiveAccount(account);
  }
  return instance;
}

export function msalProviders(instance: IPublicClientApplication, config: SpaConfig): Provider[] {
  const guardConfig: MsalGuardConfiguration = {
    interactionType: InteractionType.Redirect,
    authRequest: { scopes: [config.apiScope] },
  };
  const interceptorConfig: MsalInterceptorConfiguration = {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: new Map([['/api/analysis', [config.apiScope]]]),
  };

  return [
    { provide: MSAL_INSTANCE, useValue: instance },
    { provide: MSAL_GUARD_CONFIG, useValue: guardConfig },
    { provide: MSAL_INTERCEPTOR_CONFIG, useValue: interceptorConfig },
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
  ];
}
