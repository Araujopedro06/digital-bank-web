import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { BankService } from '../../core/bank.service';
import { Transaction, TransactionType } from '../../core/models';

const LABELS: Record<TransactionType, string> = {
  DEPOSIT: 'Depósito',
  TRANSFER_IN: 'Transferência recebida',
  TRANSFER_OUT: 'Transferência enviada',
};

@Component({
  selector: 'app-statement',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './statement.html',
  styleUrl: './statement.scss',
})
export class Statement implements OnInit {
  private readonly bank = inject(BankService);

  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(true);

  protected readonly hasPrevious = computed(() => this.page() > 0);
  protected readonly hasNext = computed(() => this.page() + 1 < this.totalPages());

  ngOnInit() {
    this.load(0);
  }

  load(page: number) {
    this.loading.set(true);
    this.bank.statement(page, 20).subscribe({
      next: (result) => {
        this.transactions.set(result.content);
        this.page.set(result.number);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  label(type: TransactionType) {
    return LABELS[type];
  }

  isCredit(transaction: Transaction) {
    return transaction.type !== 'TRANSFER_OUT';
  }
}
