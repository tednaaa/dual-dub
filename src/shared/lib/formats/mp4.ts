import type { Format } from './types';

export const mp4: Format = {
	detect: ({ url, type }) => new URL(url).pathname.toLowerCase().endsWith('.mp4') && type === 'media',
	parse: null,
};
