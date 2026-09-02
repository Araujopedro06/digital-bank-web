import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { loadRuntimeConfig } from './app/core/runtime-config';

// Resolved before bootstrap so the services read a settled value in their
// constructors and nothing has to handle the API address arriving late.
loadRuntimeConfig()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
