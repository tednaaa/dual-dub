import type { Format, StreamKind, StreamRequest } from './types';
import { dash } from './dash';
import { hls } from './hls';
import { mp4 } from './mp4';

export const FORMATS: Record<StreamKind, Format> = { hls, dash, mp4 };

const KINDS = Object.keys(FORMATS) as StreamKind[];

export function detectKind(request: StreamRequest): StreamKind | null {
	return KINDS.find(kind => FORMATS[kind].detect(request)) ?? null;
}
