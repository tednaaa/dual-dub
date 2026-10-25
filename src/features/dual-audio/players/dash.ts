import type { AttachPlayer } from './types';
import { MediaPlayer, supportsMediaSource } from 'dashjs';

const LOWEST_VIDEO_KBPS = 1;

export const attachDash: AttachPlayer = (element, { url, track }, startAt, fail) => {
	if (!supportsMediaSource())
		throw new Error('MediaSource is unavailable in this frame');

	const player = MediaPlayer().create();
	player.updateSettings({ streaming: { abr: { maxBitrate: { video: LOWEST_VIDEO_KBPS } } } });
	if (track.representationIds.length > 0)
		player.registerCustomCapabilitiesFilter(representation => track.representationIds.includes(representation.id));
	player.on(MediaPlayer.events.ERROR, ({ error }) => {
		fail(typeof error === 'string' ? error : error.message);
	});
	player.initialize(element, url, false, startAt);
	return () => player.destroy();
};
