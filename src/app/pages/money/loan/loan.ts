import { CurrencyPipe, PercentPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, debounceTime, of, switchMap } from 'rxjs';
import { messageFor } from '../../../core/api-error';
import { LoanService } from '../../../core/loan.service';
import { Loan, LoanPayment, LoanQuote, LoanTerms } from '../../../core/models';

@Component({
  selector: 'app-loan',
  imports: [ReactiveFormsModule, CurrencyPipe, PercentPipe],
  templateUrl: './loan.html',
  styleUrl: './loan.scss',
})
export class LoanPage implements OnInit {
  private readonly loans = inject(LoanService);

  protected readonly terms = signal<LoanTerms | null>(null);
  protected readonly quote = signal<LoanQuote | null>(null);
  protected readonly active = signal<Loan | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<string | null>(null);

  /** What settling now saves compared with paying every remaining instalment. */
  protected readonly savingBySettling = computed(() => {
    const loan = this.active();
    return loan ? loan.remainingToTerm - loan.outstanding : 0;
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    amount: [1000 as number | null, [Validators.required, Validators.min(0.01)]],
    installments: [12, Validators.required],
  });

  ngOnInit() {
    this.loans.terms().subscribe({
      next: (terms) => this.terms.set(terms),
      error: () => this.terms.set(null),
    });

    this.loadActive();

    // Re-quotes as the form is dragged around, without a request per keystroke.
    // An invalid or unoffered combination simply clears the quote instead of
    // showing an error the user is still in the middle of fixing.
    this.form.valueChanges
      .pipe(
        debounceTime(350),
        switchMap(() => {
          const { amount, installments } = this.form.getRawValue();
          if (this.form.invalid || !amount) {
            return of(null);
          }
          return this.loans.simulate(amount, installments);
        }),
      )
      .subscribe({
        next: (quote) => this.quote.set(quote),
        error: () => this.quote.set(null),
      });

    this.refreshQuote();
  }

  take() {
    if (this.form.invalid || this.busy()) {
      return;
    }

    const { amount, installments } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.done.set(null);

    this.loans.take(amount!, installments).subscribe({
      next: (loan) => {
        this.active.set(loan);
        this.busy.set(false);
        this.done.set('Empréstimo aprovado e o dinheiro já está na sua conta.');
      },
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          messageFor(response, 'Não foi possível contratar o empréstimo.', {
            400: 'Esse valor ou esse parcelamento não está disponível.',
            409: 'Você já tem um empréstimo em andamento. Quite antes de pegar outro.',
          }),
        );
      },
    });
  }

  payInstallment() {
    this.run(() => this.loans.payInstallment(), 'Parcela paga.');
  }

  settle() {
    this.run(() => this.loans.settle(), 'Empréstimo quitado. Sem dívida.');
  }

  private run(action: () => Observable<LoanPayment>, success: string) {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    this.done.set(null);

    action().subscribe({
      next: (payment) => {
        this.active.set(payment.settled ? null : payment.loan);
        this.busy.set(false);
        this.done.set(success);
      },
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          messageFor(response, 'Não foi possível pagar agora.', {
            404: 'Você não tem empréstimo em andamento.',
            422: 'Saldo insuficiente para pagar. Peça um dinheiro pra tia.',
          }),
        );
      },
    });
  }

  private loadActive() {
    this.loans.active().subscribe({
      next: (loan) => {
        this.active.set(loan);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private refreshQuote() {
    const { amount, installments } = this.form.getRawValue();
    if (amount) {
      this.loans.simulate(amount, installments).subscribe({
        next: (quote) => this.quote.set(quote),
        error: () => this.quote.set(null),
      });
    }
  }
}
