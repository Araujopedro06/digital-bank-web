import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { messageFor } from '../../../core/api-error';
import { BankService } from '../../../core/bank.service';
import { FaceService } from '../../../core/face.service';
import { Account, BrCodeParsed, PixRecipient } from '../../../core/models';
import { PixService } from '../../../core/pix.service';
import { FaceCapture } from '../../../shared/face-capture/face-capture';
import { PIX_KEY_LABELS } from '../pix-key-labels';

/** Every Pix payload starts with the payload-format field, "0002" + "01". */
const BR_CODE_PREFIX = '000201';

type Step = 'key' | 'confirm' | 'face';

@Component({
  selector: 'app-pix-pay',
  imports: [ReactiveFormsModule, CurrencyPipe, FaceCapture],
  templateUrl: './pix-pay.html',
  styleUrl: './pix-pay.scss',
})
export class PixPay implements OnInit {
  private readonly pix = inject(PixService);
  private readonly bank = inject(BankService);
  private readonly faceService = inject(FaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly labels = PIX_KEY_LABELS;

  protected readonly account = signal<Account | null>(null);
  protected readonly step = signal<Step>('key');
  protected readonly recipient = signal<PixRecipient | null>(null);
  protected readonly faceRequired = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<{ amount: number; name: string } | null>(null);

  /** A code that already carries an amount is not the payer's to change. */
  protected readonly amountFixed = signal(false);

  protected readonly keyForm = this.fb.nonNullable.group({
    key: ['', Validators.required],
  });

  protected readonly amountForm = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
  });

  ngOnInit() {
    this.loadAccount();
    this.faceService.status().subscribe({
      next: (status) => this.faceRequired.set(status.enrolled),
      error: () => this.faceRequired.set(false),
    });

    // Arrived from a scanned QR code or a shared link.
    const chargeId = this.route.snapshot.paramMap.get('chargeId');
    if (chargeId) {
      this.openCharge(chargeId);
    }
  }

  /**
   * The link carries only an opaque id, so who is being paid and how much is
   * asked of the server here rather than read out of the URL.
   */
  private openCharge(id: string) {
    this.busy.set(true);
    this.error.set(null);

    this.pix.openCharge(id).subscribe({
      next: (charge) => {
        this.recipient.set(charge.recipient);
        this.amountFixed.set(charge.amount !== null);
        this.amountForm.reset({
          amount: charge.amount,
          description: charge.description ?? '',
        });

        this.busy.set(false);
        this.step.set('confirm');
      },
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          messageFor(response, 'Não foi possível abrir este link de pagamento.', {
            404: 'Este link de pagamento não existe mais ou já expirou.',
          }),
        );
      },
    });
  }

  /**
   * One box for both a key and a pasted code: from the payer's side they are the
   * same thing — an address — and asking which one they have is a question the
   * first six characters already answer.
   */
  lookUp() {
    if (this.keyForm.invalid || this.busy()) {
      return;
    }

    const typed = this.keyForm.getRawValue().key.trim();
    this.busy.set(true);
    this.error.set(null);
    this.success.set(null);

    const isCode = typed.replace(/\s/g, '').startsWith(BR_CODE_PREFIX);
    const request: Observable<BrCodeParsed | PixRecipient> = isCode
      ? this.pix.parseBrCode(typed)
      : this.pix.resolve(typed);

    request.subscribe({
      next: (result) => {
        // A bare key carries no amount; a code may carry one.
        const parsed: BrCodeParsed =
          'recipient' in result ? result : { recipient: result, amount: null, description: null };

        this.recipient.set(parsed.recipient);
        this.amountFixed.set(parsed.amount !== null);
        this.amountForm.reset({
          amount: parsed.amount,
          description: parsed.description ?? '',
        });

        this.busy.set(false);
        this.step.set('confirm');
      },
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          messageFor(response, 'Não foi possível identificar essa chave.', {
            400: isCode
              ? 'Este código Pix não é válido. Copie-o novamente por inteiro.'
              : 'Esta chave não parece válida. Confira o que você digitou.',
            404: 'Não encontrei ninguém com essa chave.',
          }),
        );
      },
    });
  }

  confirm() {
    if (this.amountForm.invalid || this.busy()) {
      return;
    }

    this.error.set(null);

    if (this.recipient()?.own) {
      this.error.set('Esta chave é sua. Escolha outra pessoa para receber.');
      return;
    }

    if (this.faceRequired()) {
      this.step.set('face');
      return;
    }
    this.send(null);
  }

  onFaceCaptured(descriptor: number[]) {
    this.step.set('confirm');
    this.busy.set(true);

    this.faceService.verify(descriptor).subscribe({
      next: (token) => this.send(token.verificationToken),
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          response.status === 401
            ? 'Não reconheci seu rosto. O Pix não foi enviado.'
            : messageFor(response, 'Não foi possível confirmar sua identidade.'),
        );
      },
    });
  }

  cancelFaceStep() {
    this.step.set('confirm');
  }

  startOver() {
    this.step.set('key');
    this.recipient.set(null);
    this.amountFixed.set(false);
    this.keyForm.reset({ key: '' });
    this.amountForm.reset({ amount: null, description: '' });
    this.error.set(null);
  }

  private send(faceToken: string | null) {
    const recipient = this.recipient();
    if (!recipient) {
      return;
    }

    this.busy.set(true);
    const { amount, description } = this.amountForm.getRawValue();

    this.pix.pay(recipient.key, amount!, description, faceToken).subscribe({
      next: () => {
        this.success.set({ amount: amount!, name: recipient.ownerName });
        this.busy.set(false);
        this.startOver();
        this.loadAccount();
      },
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          messageFor(response, 'Não foi possível enviar o Pix.', {
            404: 'Não encontrei ninguém com essa chave.',
            422: 'Saldo insuficiente para este Pix.',
          }),
        );
      },
    });
  }

  private loadAccount() {
    this.bank.myAccount().subscribe((account) => this.account.set(account));
  }
}
