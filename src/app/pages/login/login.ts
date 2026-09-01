import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { messageFor } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { FaceCapture } from '../../shared/face-capture/face-capture';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, FaceCapture],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Set once the password is accepted but the account also needs a face. */
  protected readonly challengeToken = signal<string | null>(null);
  protected readonly greeting = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit() {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (response.requiresFaceVerification) {
          this.challengeToken.set(response.challengeToken);
          this.greeting.set(response.name);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (response: HttpErrorResponse) => {
        this.error.set(messageFor(response, 'Não foi possível entrar. Tente novamente.'));
        this.submitting.set(false);
      },
    });
  }

  onFaceCaptured(descriptor: number[]) {
    const token = this.challengeToken();
    if (!token) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth.completeFaceLogin(token, descriptor).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (response: HttpErrorResponse) => {
        this.submitting.set(false);
        // The challenge is single-use, so a failure sends them back to the password.
        this.challengeToken.set(null);
        this.error.set(
          response.status === 401
            ? 'Não reconheci seu rosto. Entre novamente.'
            : messageFor(response, 'Não foi possível concluir a verificação.'),
        );
      },
    });
  }

  cancelFaceStep() {
    this.challengeToken.set(null);
    this.greeting.set(null);
  }
}
