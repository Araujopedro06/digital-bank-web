import { Component, effect, inject, untracked } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ProfileService } from './core/profile.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly profile = inject(ProfileService);

  constructor() {
    // Fetch the avatar as soon as there is a session, and after a fresh login.
    // untracked keeps anything the service reads out of this effect's
    // dependencies, so refreshing cannot re-trigger the effect that started it.
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      untracked(() => {
        if (loggedIn) {
          void this.profile.refreshPhoto();
        }
      });
    });
  }
}
