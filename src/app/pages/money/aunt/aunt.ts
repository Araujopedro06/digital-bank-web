import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { messageFor } from '../../../core/api-error';
import { AllowanceService } from '../../../core/allowance.service';
import { AllowanceOutcome, AllowanceResult, AllowanceStatus } from '../../../core/models';

/**
 * What she says. The API answers with an outcome and nothing else, which is what
 * lets these vary — a button that replies with the same sentence every time stops
 * being funny on the second press.
 */
const LINES: Record<AllowanceOutcome, string[]> = {
  GRANTED: [
    'Toma, meu bem. Não gasta tudo em besteira.',
    'Claro, meu anjo. Já mandei, tá?',
    'Pra você eu sempre tenho. Aproveita.',
    'Já tá na conta. Depois liga pra tia.',
  ],
  HAGGLED: [
    'É muita coisa, meu bem. Te mando o que dá.',
    'Nem eu tenho tudo isso! Toma aqui e vai com calma.',
    'Metade do que você pediu já tá bom, né?',
  ],
  REFUSED: [
    'Vai trabalhar, menino!',
    'Tá achando que dinheiro nasce em árvore? Arruma um emprego.',
    'Essa foi boa. Agora vai procurar o que fazer.',
    'Eu sou sua tia, não sou o Banco Central.',
  ],
};

function lineFor(outcome: AllowanceOutcome): string {
  const options = LINES[outcome];
  return options[Math.floor(Math.random() * options.length)];
}

@Component({
  selector: 'app-aunt',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './aunt.html',
  styleUrl: './aunt.scss',
})
export class Aunt implements OnInit {
  private readonly allowance = inject(AllowanceService);

  protected readonly status = signal<AllowanceStatus | null>(null);
  protected readonly asking = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly reply = signal<{ result: AllowanceResult; line: string } | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    amount: [200 as number | null, [Validators.required, Validators.min(0.01)]],
  });

  ngOnInit() {
    this.loadStatus();
  }

  ask() {
    if (this.form.invalid || this.asking()) {
      return;
    }

    this.asking.set(true);
    this.error.set(null);
    this.reply.set(null);

    this.allowance.ask(this.form.getRawValue().amount!).subscribe({
      next: (result) => {
        this.reply.set({ result, line: lineFor(result.outcome) });
        this.status.update((current) =>
          current ? { ...current, availableAt: result.availableAt } : current,
        );
        this.asking.set(false);
      },
      error: (response: HttpErrorResponse) => {
        this.asking.set(false);
        this.error.set(
          messageFor(response, 'Não consegui falar com a tia agora.', {
            429: 'Ela já te mandou dinheiro faz pouco. Deixa ela respirar.',
          }),
        );
        // She may have said no because of the cooldown; find out when it lifts.
        this.loadStatus();
      },
    });
  }

  private loadStatus() {
    this.allowance.status().subscribe({
      next: (status) => this.status.set(status),
      error: () => this.status.set(null),
    });
  }
}
