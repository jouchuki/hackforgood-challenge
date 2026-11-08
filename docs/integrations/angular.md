# Next Step on Angular

Browser SDK

## Requirements

- Angular with afterNextRender and a browser application build.

## 1. Install the browser package

Install the local tarball in the Angular project.

File: Terminal

```
npm install ./before-browser.tgz
```

## 2. Create a browser-aware service

Inject this service in the component that handles moderation. afterNextRender avoids initializing the SDK during server rendering.

File: next-step.service.ts

```
import { Injectable, DestroyRef, afterNextRender, inject } from '@angular/core';
import { createBefore } from '@before/browser';

@Injectable({ providedIn: 'root' })
export class NextStepService {
  private client = createBefore();
  constructor() {
    afterNextRender(() => { void this.client.init({
      endpoint: "https://support.example", siteId: "YOUR_INSTALLATION_ID"
    }); });
    inject(DestroyRef).onDestroy(() => this.client.destroy());
  }
  intervene() {
    return this.client.intervene({ type: 'search', severity: 'high' });
  }
}
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Angular render callbacks and destruction](https://angular.dev/guide/components/lifecycle)
