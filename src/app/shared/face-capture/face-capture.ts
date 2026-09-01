import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FaceService } from '../../core/face.service';
import {
  CHALLENGE_LABELS,
  Challenge,
  eyesAreClosed,
  headTurn,
  randomChallenge,
  satisfiesTurn,
} from './liveness';

type Phase = 'IDLE' | 'LOADING_MODELS' | 'STARTING_CAMERA' | 'CHALLENGE' | 'CAPTURING' | 'DONE';

/** Frames the challenge must hold for before it counts, to reject a single noisy frame. */
const FRAMES_TO_CONFIRM = 2;

@Component({
  selector: 'app-face-capture',
  templateUrl: './face-capture.html',
  styleUrl: './face-capture.scss',
})
export class FaceCapture implements OnDestroy {
  private readonly faceService = inject(FaceService);

  /** Wording differs between enrolling a face and proving one. */
  readonly mode = input<'ENROLL' | 'VERIFY'>('VERIFY');

  readonly captured = output<number[]>();
  readonly cancelled = output<void>();

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  private stream: MediaStream | null = null;
  private loopHandle: number | null = null;
  private confirmedFrames = 0;

  protected readonly phase = signal<Phase>('IDLE');
  protected readonly challenge = signal<Challenge>('BLINK');
  protected readonly livenessPassed = signal(false);
  protected readonly faceDetected = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly challengeLabel = computed(() => CHALLENGE_LABELS[this.challenge()]);
  protected readonly busy = computed(
    () => this.phase() === 'LOADING_MODELS' || this.phase() === 'CAPTURING',
  );

  async start() {
    this.error.set(null);
    this.livenessPassed.set(false);
    this.confirmedFrames = 0;
    this.challenge.set(randomChallenge());

    try {
      this.phase.set('LOADING_MODELS');
      const faceApi = await this.faceService.loadModels();

      this.phase.set('STARTING_CAMERA');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: 'user' },
        audio: false,
      });

      const element = this.video()?.nativeElement;
      if (!element) {
        throw new Error('Video element is not ready');
      }
      element.srcObject = this.stream;
      await element.play();

      this.phase.set('CHALLENGE');
      this.runLoop(faceApi);
    } catch (cause) {
      this.stop();
      this.phase.set('IDLE');
      this.error.set(this.describe(cause));
    }
  }

  cancel() {
    this.stop();
    this.phase.set('IDLE');
    this.cancelled.emit();
  }

  ngOnDestroy() {
    this.stop();
  }

  /**
   * One pass per animation frame: find the face, check the challenge, and once
   * it holds, compute the descriptor and hand it back.
   */
  private runLoop(faceApi: Awaited<ReturnType<FaceService['loadModels']>>) {
    const options = new faceApi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

    const tick = async () => {
      const element = this.video()?.nativeElement;
      if (!element || this.phase() !== 'CHALLENGE') {
        return;
      }

      const detection = await faceApi
        .detectSingleFace(element, options)
        .withFaceLandmarks();

      this.faceDetected.set(!!detection);

      if (detection && this.challengeSatisfied(detection.landmarks)) {
        this.confirmedFrames += 1;
        if (this.confirmedFrames >= FRAMES_TO_CONFIRM) {
          this.livenessPassed.set(true);
          await this.captureDescriptor(faceApi, element, options);
          return;
        }
      } else if (detection) {
        this.confirmedFrames = 0;
      }

      this.loopHandle = requestAnimationFrame(() => void tick());
    };

    this.loopHandle = requestAnimationFrame(() => void tick());
  }

  private challengeSatisfied(landmarks: {
    getLeftEye(): { x: number; y: number }[];
    getRightEye(): { x: number; y: number }[];
    getNose(): { x: number; y: number }[];
  }): boolean {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const current = this.challenge();

    if (current === 'BLINK') {
      return eyesAreClosed(leftEye, rightEye);
    }

    const nose = landmarks.getNose();
    const noseTip = nose[nose.length - 1] ?? nose[0];
    return satisfiesTurn(headTurn(leftEye, rightEye, noseTip), current);
  }

  private async captureDescriptor(
    faceApi: Awaited<ReturnType<FaceService['loadModels']>>,
    element: HTMLVideoElement,
    options: InstanceType<
      Awaited<ReturnType<FaceService['loadModels']>>['TinyFaceDetectorOptions']
    >,
  ) {
    this.phase.set('CAPTURING');

    // The challenge frame has the eyes shut or the head turned, which is a poor
    // frame to recognise from. Let the user settle, then take the descriptor.
    await new Promise((resolve) => setTimeout(resolve, 700));

    const result = await faceApi
      .detectSingleFace(element, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result) {
      this.phase.set('CHALLENGE');
      this.confirmedFrames = 0;
      this.livenessPassed.set(false);
      this.error.set('Não consegui ver seu rosto. Fique de frente para a câmera.');
      this.runLoop(faceApi);
      return;
    }

    this.phase.set('DONE');
    this.stop();
    this.captured.emit(Array.from(result.descriptor));
  }

  private stop() {
    if (this.loopHandle !== null) {
      cancelAnimationFrame(this.loopHandle);
      this.loopHandle = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    const element = this.video()?.nativeElement;
    if (element) {
      element.srcObject = null;
    }
  }

  private describe(cause: unknown): string {
    if (cause instanceof DOMException) {
      if (cause.name === 'NotAllowedError') {
        return 'Permissão de câmera negada. Libere o acesso no navegador e tente de novo.';
      }
      if (cause.name === 'NotFoundError') {
        return 'Nenhuma câmera encontrada neste dispositivo.';
      }
    }
    return 'Não foi possível iniciar a câmera. Tente novamente.';
  }
}
