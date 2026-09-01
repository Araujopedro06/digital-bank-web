import { HttpErrorResponse } from '@angular/common/http';

const BY_STATUS: Record<number, string> = {
  0: 'Não foi possível falar com o servidor. Verifique sua conexão.',
  400: 'Confira os dados informados.',
  401: 'E-mail ou senha inválidos.',
  403: 'Confirmação facial necessária. Tente novamente.',
  404: 'Conta de destino não encontrada.',
  409: 'Este e-mail já está cadastrado.',
  413: 'A imagem precisa ter no máximo 2 MB.',
  422: 'Saldo insuficiente para esta transferência.',
  428: 'Você ainda não cadastrou seu rosto.',
};

/**
 * The API answers in English and deliberately keeps its messages generic, so the
 * user-facing Portuguese copy is decided here from the status code.
 */
export function messageFor(error: HttpErrorResponse, fallback: string): string {
  return BY_STATUS[error.status] ?? fallback;
}
