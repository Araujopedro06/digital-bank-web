import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { messageFor } from '../../core/api-error';
import { BankService } from '../../core/bank.service';
import { FaceService } from '../../core/face.service';
import { Account } from '../../core/models';
import { FaceCapture } from '../../shared/face-capture/face-capture';

@Component({
  selector: 'app-transfer',
  imports: [ReactiveFormsModule, CurrencyPipe, FaceCapture],
  templateUrl: './transfer.html',
  styleUrl: './transfer.scss',
})
export class Transfer implements OnInit {
  private readonly bank = inject(BankService);
  private readonly faceService = inject(FaceService);

  protected readonly account = signal<Account | null>(null);
  protected readonly faceRequired = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<{ amount: number; account: string } | null>(null);

  /** True while the user is being asked to confirm the transfer with their face. */
  protected readonly confirmingFace = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    toAccountNumber: ['', [Validators.required, Validators.minLength(6)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
  });

  ngOnInit() {
    this.loadAccount();
    this.faceService.status().subscribe({
      next: (status) => this.faceRequired.set(status.enrolled),
      error: () => this.faceRequired.set(false),
    });
  }

  submit() {
    if (this.form.invalid || this.submitting() || this.confirmingFace()) {
      return;
    }

    this.error.set(null);
    this.success.set(null);

    if (this.form.getRawValue().toAccountNumber === this.account()?.number) {
      this.error.set('Não é possível transferir para a própria conta.');
      return;
    }

    if (this.faceRequired()) {
      this.confirmingFace.set(true);
      return;
    }
    this.send(null);
  }

  /** The face matched: swap the descriptor for a token, then move the money. */
  onFaceCaptured(descriptor: number[]) {
    this.confirmingFace.set(false);
    this.submitting.set(true);

    this.faceService.verify(descriptor).subscribe({
      next: (token) => this.send(token.verificationToken),
      error: (response: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(
          response.status === 401
            ? 'Não reconheci seu rosto. A transferência não foi feita.'
            : messageFor(response, 'Não foi possível confirmar sua identidade.'),
        );
      },
    });
  }

  cancelFaceStep() {
    this.confirmingFace.set(false);
  }

  private send(faceToken: string | null) {
    this.submitting.set(true);
    const { toAccountNumber, amount, description } = this.form.getRawValue();

    this.bank.transfer(toAccountNumber, amount!, description, faceToken).subscribe({
      next: () => {
        this.success.set({ amount: amount!, account: toAccountNumber });
        this.form.reset({ toAccountNumber: '', amount: null, description: '' });
        this.submitting.set(false);
        this.loadAccount();
      },
      error: (response: HttpErrorResponse) => {
        this.error.set(messageFor(response, 'Não foi possível concluir a transferência.'));
        this.submitting.set(false);
      },
    });
  }

  private loadAccount() {
    this.bank.myAccount().subscribe((account) => this.account.set(account));
  }
}
