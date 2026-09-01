import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  /** Object URL of the current photo, or null when there is none. */
  readonly photoUrl = signal<string | null>(null);

  /**
   * The same value as {@link photoUrl}, held in a plain field. Reading the signal
   * inside refresh would make any effect that calls refresh depend on it, and
   * writing it at the end of refresh would then re-trigger that effect forever.
   */
  private currentUrl: string | null = null;

  private inFlight: Promise<void> | null = null;

  /** Concurrent callers share one request rather than each fetching the image. */
  refreshPhoto(): Promise<void> {
    this.inFlight ??= this.fetchPhoto().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<void>(`${environment.apiUrl}/profile/photo`, form);
  }

  delete() {
    return this.http.delete<void>(`${environment.apiUrl}/profile/photo`);
  }

  clear() {
    this.swap(null);
  }

  private async fetchPhoto(): Promise<void> {
    let next: string | null = null;
    try {
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/profile/photo`, { responseType: 'blob' }),
      );
      next = blob && blob.size > 0 ? URL.createObjectURL(blob) : null;
    } catch {
      // 404 simply means the user has not uploaded one.
      next = null;
    }
    this.swap(next);
  }

  /** Publishes the new URL before releasing the old one, so what is on screen is never revoked. */
  private swap(next: string | null) {
    const previous = this.currentUrl;
    this.currentUrl = next;
    this.photoUrl.set(next);

    if (previous && previous !== next) {
      URL.revokeObjectURL(previous);
    }
  }
}
