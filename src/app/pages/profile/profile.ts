import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { messageFor } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { FaceService } from '../../core/face.service';
import { FaceStatus } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { FaceCapture } from '../../shared/face-capture/face-capture';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-profile',
  imports: [FaceCapture, DatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly profile = inject(ProfileService);
  private readonly faceService = inject(FaceService);

  protected readonly faceStatus = signal<FaceStatus | null>(null);
  protected readonly enrolling = signal(false);
  protected readonly photoError = signal<string | null>(null);
  protected readonly faceError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  ngOnInit() {
    void this.profile.refreshPhoto();
    this.loadFaceStatus();
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.photoError.set(null);
    if (file.size > MAX_PHOTO_BYTES) {
      this.photoError.set('A imagem precisa ter no máximo 2 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.photoError.set('Escolha um arquivo JPEG ou PNG.');
      return;
    }

    this.profile.upload(file).subscribe({
      next: () => {
        void this.profile.refreshPhoto();
        this.notice.set('Foto de perfil atualizada.');
      },
      error: (response: HttpErrorResponse) =>
        this.photoError.set(messageFor(response, 'Não foi possível enviar a foto.')),
    });
  }

  removePhoto() {
    this.profile.delete().subscribe({
      next: () => {
        this.profile.clear();
        this.notice.set('Foto de perfil removida.');
      },
      error: (response: HttpErrorResponse) =>
        this.photoError.set(messageFor(response, 'Não foi possível remover a foto.')),
    });
  }

  onFaceCaptured(descriptor: number[]) {
    this.faceError.set(null);
    this.faceService.enroll(descriptor).subscribe({
      next: (status) => {
        this.faceStatus.set(status);
        this.enrolling.set(false);
        this.notice.set('Rosto cadastrado. Ele será pedido no login e nas transferências.');
      },
      error: (response: HttpErrorResponse) => {
        this.faceError.set(messageFor(response, 'Não foi possível cadastrar o rosto.'));
        this.enrolling.set(false);
      },
    });
  }

  removeEnrollment() {
    this.faceService.deleteEnrollment().subscribe({
      next: () => {
        this.faceStatus.set({ enrolled: false, consentedAt: null });
        this.notice.set('Dados biométricos apagados.');
      },
      error: (response: HttpErrorResponse) =>
        this.faceError.set(messageFor(response, 'Não foi possível apagar os dados.')),
    });
  }

  private loadFaceStatus() {
    this.faceService.status().subscribe({
      next: (status) => this.faceStatus.set(status),
      error: () => this.faceStatus.set({ enrolled: false, consentedAt: null }),
    });
  }
}
