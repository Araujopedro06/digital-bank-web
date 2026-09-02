import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { runtimeConfig } from './runtime-config';
import { FaceStatus, StepUpToken } from './models';

/** The face-api.js namespace, loaded on demand. */
type FaceApi = typeof import('@vladmandic/face-api');

/** Base-relative, so the weights still resolve when served under a sub-path. */
const MODEL_URL = new URL('models', document.baseURI).href;

@Injectable({ providedIn: 'root' })
export class FaceService {
  private readonly http = inject(HttpClient);

  private faceApi: FaceApi | null = null;
  private loading: Promise<FaceApi> | null = null;

  readonly modelsReady = signal(false);

  /**
   * Pulls in face-api.js and its ~6.7 MB of weights the first time a face screen
   * is opened, so the rest of the app is not paying for it on every visit.
   * Concurrent callers share one download.
   */
  async loadModels(): Promise<FaceApi> {
    if (this.faceApi) {
      return this.faceApi;
    }
    this.loading ??= this.doLoad();

    try {
      return await this.loading;
    } catch (error) {
      // Let the next attempt retry rather than caching the failure forever.
      this.loading = null;
      throw error;
    }
  }

  private async doLoad(): Promise<FaceApi> {
    const faceApi = await import('@vladmandic/face-api');

    await Promise.all([
      faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    this.faceApi = faceApi;
    this.modelsReady.set(true);
    return faceApi;
  }

  // --- API calls -----------------------------------------------------------

  status() {
    return this.http.get<FaceStatus>(`${runtimeConfig.apiUrl}/face/enrollment`);
  }

  enroll(descriptor: number[]) {
    return this.http.put<FaceStatus>(`${runtimeConfig.apiUrl}/face/enrollment`, {
      descriptor,
      consent: true,
    });
  }

  deleteEnrollment() {
    return this.http.delete<void>(`${runtimeConfig.apiUrl}/face/enrollment`);
  }

  /** Exchanges a matching face for a single-use token that authorises one transfer. */
  verify(descriptor: number[]) {
    return this.http.post<StepUpToken>(`${runtimeConfig.apiUrl}/face/verify`, { descriptor });
  }
}
