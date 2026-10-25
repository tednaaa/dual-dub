import type { AttachPlayer } from './types';

export const attachMp4: AttachPlayer = (element, { url }, startAt) => {
	element.src = url;
	element.currentTime = startAt;
	return () => {};
};
