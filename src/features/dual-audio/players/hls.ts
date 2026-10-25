import type { AttachPlayer } from './types';
import Hls from 'hls.js';

export const attachHls: AttachPlayer = (element, { url }, startAt, fail) => {
	if (!Hls.isSupported())
		throw new Error('MediaSource is unavailable in this frame');

	const hls = new Hls({ enableWorker: false, capLevelToPlayerSize: true, startLevel: 0, startPosition: startAt });
	hls.on(Hls.Events.ERROR, (_event, data) => {
		if (data.fatal)
			fail(`${data.type}: ${data.details} ${data.response?.code ?? ''}`.trim());
	});
	hls.loadSource(url);
	hls.attachMedia(element);
	return () => hls.destroy();
};
