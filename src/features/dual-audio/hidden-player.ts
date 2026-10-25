import type { AttachPlayer } from './players/types';
import type { DubStream } from '@/shared/api';
import type { StreamKind } from '@/shared/lib';
import { attachDash } from './players/dash';
import { attachHls } from './players/hls';
import { attachMp4 } from './players/mp4';

export interface HiddenPlayer {
	element: HTMLVideoElement;
	error: () => string | null;
	destroy: () => void;
}

const PLAYERS: Record<StreamKind, AttachPlayer> = { hls: attachHls, dash: attachDash, mp4: attachMp4 };

export function createHiddenPlayer(dub: DubStream, startAt: number): HiddenPlayer {
	const element = document.createElement('video');
	element.crossOrigin = 'anonymous';
	element.preload = 'auto';
	element.playsInline = true;

	let error: string | null = null;
	const fail = (message: string) => {
		error = message;
	};
	element.addEventListener('error', () => {
		fail(element.error?.message || `MediaError ${element.error?.code}`);
	});

	const detach = PLAYERS[dub.kind](element, dub, startAt, fail);

	return {
		element,
		error: () => error,
		destroy: () => {
			detach();
			element.pause();
			element.removeAttribute('src');
			element.load();
		},
	};
}
