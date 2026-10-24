import { driftCorrection } from '@/shared/lib';

const CHECK_INTERVAL_MS = 500;

export function syncWithMaster(master: HTMLVideoElement, slaves: HTMLMediaElement[]): () => void {
	const controller = new AbortController();
	const on = (type: keyof HTMLMediaElementEventMap, handler: () => void) =>
		master.addEventListener(type, handler, { signal: controller.signal });

	const play = () => slaves.forEach(slave => void slave.play());
	const pause = () => slaves.forEach(slave => slave.pause());

	on('playing', play);
	on('pause', pause);
	on('waiting', pause);
	on('seeked', () => slaves.forEach((slave) => {
		slave.currentTime = master.currentTime;
	}));
	on('ratechange', () => slaves.forEach((slave) => {
		slave.playbackRate = master.playbackRate;
	}));

	const timer = setInterval(() => {
		if (master.paused || master.seeking)
			return;

		for (const slave of slaves) {
			if (slave.seeking || slave.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)
				continue;

			const correction = driftCorrection(master.currentTime, slave.currentTime, master.playbackRate);
			if ('seek' in correction)
				slave.currentTime = correction.seek;
			else
				slave.playbackRate = correction.rate;
		}
	}, CHECK_INTERVAL_MS);

	return () => {
		controller.abort();
		clearInterval(timer);
	};
}
