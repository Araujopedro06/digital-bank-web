import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { BankService } from '../../core/bank.service';
import { Account, Transaction } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly bank = inject(BankService);
  protected readonly auth = inject(AuthService);

  protected readonly account = signal<Account | null>(null);
  protected readonly recent = signal<Transaction[]>([]);
  protected readonly loading = signal(true);
  protected readonly balanceHidden = signal(false);

  ngOnInit() {
    forkJoin({
      account: this.bank.myAccount(),
      statement: this.bank.statement(0, 5),
    }).subscribe({
      next: ({ account, statement }) => {
        this.account.set(account);
        this.recent.set(statement.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleBalance() {
    this.balanceHidden.update((hidden) => !hidden);
  }

  isCredit(transaction: Transaction) {
    return transaction.type !== 'TRANSFER_OUT';
  }
}
