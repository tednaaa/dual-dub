import type { DubStream } from '@/shared/api';

export type AttachPlayer = (element: HTMLVideoElement, dub: DubStream, startAt: number, fail: (message: string) => void) => () => void;
