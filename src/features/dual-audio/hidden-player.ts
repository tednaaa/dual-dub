import type { StreamSource } from '@/shared/api';
import Hls from 'hls.js';

export interface HiddenPlayer {
	element: HTMLVideoElement;
	error: () => string | null;
	destroy: () => void;
}

export function createHiddenPlayer(source: StreamSource, startAt: number): HiddenPlayer {
	const element = document.createElement('video');
	element.crossOrigin = 'anonymous';
	element.preload = 'auto';
	element.playsInline = true;

	let error: string | null = null;
	element.addEventListener('error', () => {
		error = element.error?.message || `MediaError ${element.error?.code}`;
	});

	const release = () => {
		element.pause();
		element.removeAttribute('src');
		element.load();
	};

	if (source.kind === 'mp4') {
		element.src = source.url;
		element.currentTime = startAt;
		return { element, error: () => error, destroy: release };
	}

	if (!Hls.isSupported())
		throw new Error('MediaSource is unavailable in this frame');

	const hls = new Hls({ enableWorker: false, capLevelToPlayerSize: true, startLevel: 0, startPosition: startAt });
	hls.on(Hls.Events.ERROR, (_event, data) => {
		if (data.fatal)
			error = `${data.type}: ${data.details} ${data.response?.code ?? ''}`.trim();
	});
	hls.loadSource(source.url);
	hls.attachMedia(element);

	return {
		element,
		error: () => error,
		destroy: () => {
			hls.destroy();
			release();
		},
	};
}
