import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { messageFor } from '../../../core/api-error';
import { PixKey, PixKeyType } from '../../../core/models';
import { PixService } from '../../../core/pix.service';
import { PIX_KEY_LABELS } from '../pix-key-labels';

const PLACEHOLDERS: Record<PixKeyType, string> = {
  CPF: '000.000.000-00',
  EMAIL: 'seu@email.com',
  PHONE: '(11) 98765-4321',
  RANDOM: '',
};

/**
 * A 400 from the key endpoint always means the value failed its own type's rule,
 * and this screen knows which type was chosen — so it can say what is wrong
 * without the API sending Portuguese, which it deliberately does not do.
 */
const REJECTED: Record<PixKeyType, string> = {
  CPF: 'CPF inválido. Confira os números digitados.',
  EMAIL: 'A chave de e-mail precisa ser o e-mail da própria conta, escrito corretamente.',
  PHONE: 'Celular inválido. Informe DDD e número, como (11) 98765-4321.',
  RANDOM: 'Não foi possível gerar a chave. Tente de novo.',
};

@Component({
  selector: 'app-pix-keys',
  imports: [ReactiveFormsModule],
  templateUrl: './pix-keys.html',
  styleUrl: './pix-keys.scss',
})
export class PixKeys implements OnInit {
  private readonly pix = inject(PixService);

  protected readonly keys = signal<PixKey[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly copied = signal<string | null>(null);

  protected readonly types: PixKeyType[] = ['CPF', 'EMAIL', 'PHONE', 'RANDOM'];
  protected readonly labels = PIX_KEY_LABELS;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: ['CPF' as PixKeyType, Validators.required],
    value: [''],
  });

  private readonly type = signal<PixKeyType>('CPF');

  /** A random key has no value to type — the bank issues it. */
  protected readonly needsValue = computed(() => this.type() !== 'RANDOM');
  protected readonly placeholder = computed(() => PLACEHOLDERS[this.type()]);

  ngOnInit() {
    this.form.controls.type.valueChanges.subscribe((type) => {
      this.type.set(type);
      this.form.controls.value.reset('');
    });
    this.load();
  }

  submit() {
    if (this.saving()) {
      return;
    }

    const { type, value } = this.form.getRawValue();
    if (this.needsValue() && !value.trim()) {
      this.error.set('Informe a chave que você quer cadastrar.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.pix.registerKey(type, this.needsValue() ? value.trim() : null).subscribe({
      next: (key) => {
        this.keys.update((current) => [...current, key]);
        this.form.controls.value.reset('');
        this.saving.set(false);
      },
      error: (response: HttpErrorResponse) => {
        this.error.set(
          messageFor(response, 'Não foi possível cadastrar a chave.', {
            400: REJECTED[type],
            409: 'Esta chave já está cadastrada.',
            422: 'Você já tem o número máximo de chaves.',
          }),
        );
        this.saving.set(false);
      },
    });
  }

  remove(key: PixKey) {
    if (!confirm(`Excluir a chave ${key.display}? Quem tiver ela salva não conseguirá te pagar.`)) {
      return;
    }

    this.error.set(null);
    this.pix.deleteKey(key.id).subscribe({
      next: () => this.keys.update((current) => current.filter((k) => k.id !== key.id)),
      error: (response: HttpErrorResponse) =>
        this.error.set(messageFor(response, 'Não foi possível excluir a chave.')),
    });
  }

  async copy(key: PixKey) {
    try {
      await navigator.clipboard.writeText(key.value);
      this.copied.set(key.id);
      setTimeout(() => this.copied.update((id) => (id === key.id ? null : id)), 2000);
    } catch {
      // Clipboard access needs a secure context and a user gesture; when it is
      // refused the key is still on screen to copy by hand.
      this.error.set('Não consegui copiar. Selecione a chave e copie manualmente.');
    }
  }

  private load() {
    this.pix.keys().subscribe({
      next: (keys) => {
        this.keys.set(keys);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
