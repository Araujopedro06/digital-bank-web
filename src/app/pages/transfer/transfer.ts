import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { messageFor } from '../../core/api-error';
import { BankService } from '../../core/bank.service';
import { Account } from '../../core/models';

@Component({
  selector: 'app-transfer',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './transfer.html',
  styleUrl: './transfer.scss',
})
export class Transfer implements OnInit {
  private readonly bank = inject(BankService);

  protected readonly account = signal<Account | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<{ amount: number; account: string } | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    toAccountNumber: ['', [Validators.required, Validators.minLength(6)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
  });

  ngOnInit() {
    this.loadAccount();
  }

  submit() {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);

    const { toAccountNumber, amount, description } = this.form.getRawValue();

    if (toAccountNumber === this.account()?.number) {
      this.error.set('Não é possível transferir para a própria conta.');
      this.submitting.set(false);
      return;
    }

    this.bank.transfer(toAccountNumber, amount!, description).subscribe({
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
