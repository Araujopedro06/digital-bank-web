import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { messageFor } from '../../../core/api-error';
import { PixCharge, PixKey } from '../../../core/models';
import { PixService } from '../../../core/pix.service';
import { PIX_KEY_LABELS } from '../pix-key-labels';

/** Which of the two things on screen was copied last. */
type Copied = 'link' | 'brcode' | null;

@Component({
  selector: 'app-pix-receive',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './pix-receive.html',
  styleUrl: './pix-receive.scss',
})
export class PixReceive implements OnInit {
  private readonly pix = inject(PixService);

  protected readonly labels = PIX_KEY_LABELS;

  protected readonly keys = signal<PixKey[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly charge = signal<PixCharge | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly copied = signal<Copied>(null);

  /** What the QR encodes: a link back into this app, carrying only the charge id. */
  protected readonly link = computed(() => {
    const charge = this.charge();
    return charge ? this.pix.chargeLink(charge.id) : null;
  });

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('qr');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    keyId: ['', Validators.required],
    amount: [null as number | null],
    description: [''],
  });

  constructor() {
    // The canvas only exists once a code has been generated, so drawing waits
    // for both. The draw itself is async and writes no signal the effect reads,
    // which is what keeps this from re-triggering itself.
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const link = this.link();

      if (canvas && link) {
        void this.draw(canvas, link);
      }
    });
  }

  ngOnInit() {
    this.pix.keys().subscribe({
      next: (keys) => {
        this.keys.set(keys);
        if (keys.length > 0) {
          this.form.controls.keyId.setValue(keys[0].id);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  generate() {
    if (this.form.invalid || this.busy()) {
      return;
    }

    const { keyId, amount, description } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.copied.set(null);

    this.pix
      .createCharge(keyId, amount && amount > 0 ? amount : null, description || null)
      .subscribe({
        next: (charge) => {
          this.charge.set(charge);
          this.busy.set(false);
        },
        error: (response: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(messageFor(response, 'Não foi possível gerar o código.'));
        },
      });
  }

  copyLink() {
    void this.copy(this.link(), 'link');
  }

  copyBrCode() {
    void this.copy(this.charge()?.brCode ?? null, 'brcode');
  }

  private async copy(text: string | null, what: Copied) {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(what);
      setTimeout(() => this.copied.update((current) => (current === what ? null : current)), 2000);
    } catch {
      this.error.set('Não consegui copiar. Selecione o texto e copie manualmente.');
    }
  }

  /**
   * The QR library is pulled in only when someone actually asks for a code, the
   * same way the face models are — nobody visiting the dashboard should pay for
   * it. Dark modules on white regardless of the app's dark theme: a scanner
   * needs the contrast in that direction.
   */
  private async draw(canvas: HTMLCanvasElement, text: string) {
    try {
      const qrcode = await import('qrcode');
      await qrcode.toCanvas(canvas, text, {
        width: 232,
        margin: 1,
        color: { dark: '#0e1116', light: '#ffffff' },
      });
    } catch {
      this.error.set('Não consegui desenhar o QR. Use o link abaixo.');
    }
  }
}
