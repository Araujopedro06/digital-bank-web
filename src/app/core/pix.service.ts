import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { runtimeConfig } from './runtime-config';
import {
  BrCode,
  BrCodeParsed,
  PixCharge,
  PixChargeLookup,
  PixKey,
  PixKeyType,
  PixRecipient,
  Transaction,
} from './models';

@Injectable({ providedIn: 'root' })
export class PixService {
  private readonly http = inject(HttpClient);
  private readonly base = `${runtimeConfig.apiUrl}/pix`;

  keys() {
    return this.http.get<PixKey[]>(`${this.base}/keys`);
  }

  /** A RANDOM key is issued by the bank, so its value is not sent. */
  registerKey(type: PixKeyType, value: string | null) {
    return this.http.post<PixKey>(`${this.base}/keys`, { type, value });
  }

  deleteKey(id: string) {
    return this.http.delete<void>(`${this.base}/keys/${id}`);
  }

  /**
   * A POST for what is really a read: the key is somebody's CPF, phone number or
   * e-mail, and those do not belong in a URL that ends up in logs and history.
   */
  resolve(key: string) {
    return this.http.post<PixRecipient>(`${this.base}/recipients`, { key });
  }

  pay(key: string, amount: number, description: string, faceToken: string | null = null) {
    return this.http.post<Transaction>(`${this.base}/transfers`, {
      key,
      amount,
      description,
      faceToken,
    });
  }

  brCode(keyId: string, amount: number | null, description: string | null) {
    return this.http.post<BrCode>(`${this.base}/brcode`, { keyId, amount, description });
  }

  /** Creates the row a shareable QR or link points at. */
  createCharge(keyId: string, amount: number | null, description: string | null) {
    return this.http.post<PixCharge>(`${this.base}/charges`, { keyId, amount, description });
  }

  openCharge(id: string) {
    return this.http.get<PixChargeLookup>(`${this.base}/charges/${id}`);
  }

  /**
   * The link a QR encodes. Built from the page's own origin rather than handed
   * down by the API, so the same code works on localhost, over the LAN and on
   * the deployed site without anything to configure.
   */
  chargeLink(id: string) {
    return new URL(`/pix/pay/${id}`, location.origin).href;
  }

  parseBrCode(payload: string) {
    return this.http.post<BrCodeParsed>(`${this.base}/brcode/parse`, { payload });
  }
}
