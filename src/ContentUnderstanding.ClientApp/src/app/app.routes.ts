import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { AnalyzePageComponent } from './features/analyze/analyze-page.component';

export const routes: Routes = [
  { path: '', component: AnalyzePageComponent, canActivate: [MsalGuard] },
  { path: '**', redirectTo: '' },
];
