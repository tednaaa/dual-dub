import type { EarSettings } from '@/entities/preferences';
import type { AudioRouter, HiddenPlayer } from '@/features/dual-audio';
import type { Ear, PlayerCommand, PlayerPing, PlayerReport, RuntimeRequest, StartResult, StreamSource } from '@/shared/api';
import { earGain, earSettings } from '@/entities/preferences';
import { createAudioRouter, createHiddenPlayer, findMasterVideo, silenceMaster, syncWithMaster } from '@/features/dual-audio';
import { PLAYER_REPORT_PORT } from '@/shared/api';

const EARS: Ear[] = ['left', 'right'];
const REPORT_INTERVAL_MS = 66;

interface Session {
	router: AudioRouter;
	players: Map<Ear, HiddenPlayer>;
	master: HTMLVideoElement;
	release: (() => void)[];
}

function applySettings(router: AudioRouter, settings: Record<Ear, EarSettings>) {
	EARS.forEach(ear => router.setVolume(ear, earGain(settings[ear])));
}

function resumeOnClick(router: AudioRouter) {
	const resume = () => void router.context.resume();
	document.addEventListener('pointerdown', resume, { capture: true });
	return () => document.removeEventListener('pointerdown', resume, { capture: true });
}

export default defineContentScript({
	registration: 'runtime',
	main(ctx) {
		let session: Session | undefined;

		function stop() {
			if (!session)
				return;

			const { router, players, release } = session;
			session = undefined;
			release.forEach(dispose => dispose());
			players.forEach(player => player.destroy());
			void router.close();
			void browser.runtime.sendMessage({ type: 'revoke-cors' } satisfies RuntimeRequest);
		}

		async function start(streams: Record<Ear, StreamSource>): Promise<StartResult> {
			stop();

			const master = findMasterVideo();
			if (!master)
				return { ok: false, issue: 'no-video' };

			await browser.runtime.sendMessage({ type: 'allow-cors' } satisfies RuntimeRequest);

			const router = createAudioRouter();
			const players = new Map<Ear, HiddenPlayer>();
			const current: Session = { router, players, master, release: [] };
			session = current;

			try {
				for (const ear of EARS) {
					const player = createHiddenPlayer(streams[ear], master.currentTime);
					players.set(ear, player);
					router.connect(ear, player.element);
					player.element.defaultPlaybackRate = master.playbackRate;
					player.element.playbackRate = master.playbackRate;
					if (!master.paused)
						void player.element.play();
				}
				applySettings(router, await earSettings.getValue());
				current.release.push(
					syncWithMaster(master, Array.from(players.values(), player => player.element)),
					earSettings.watch(settings => applySettings(router, settings)),
					resumeOnClick(router),
					silenceMaster(master),
				);
				void router.context.resume();
				return { ok: true };
			}
			catch {
				stop();
				return { ok: false, issue: 'failed' };
			}
		}

		function report(): PlayerReport | undefined {
			if (!session)
				return;

			const { router, players, master } = session;
			const earReport = (ear: Ear) => ({ level: router.level(ear), error: players.get(ear)?.error() ?? null });
			return {
				audio: router.context.state,
				playing: !master.paused,
				ears: { left: earReport('left'), right: earReport('right') },
			};
		}

		browser.runtime.onMessage.addListener((message: PlayerCommand, _sender, sendResponse) => {
			switch (message.type) {
				case 'ping':
					sendResponse({ running: session !== undefined } satisfies PlayerPing);
					return;
				case 'start':
					void start(message.streams).then(sendResponse);
					return true;
				case 'stop':
					stop();
					sendResponse(true);
			}
		});

		browser.runtime.onConnect.addListener((port) => {
			if (port.name !== PLAYER_REPORT_PORT)
				return;

			const timer = setInterval(() => {
				const current = report();
				if (current)
					port.postMessage(current);
			}, REPORT_INTERVAL_MS);
			port.onDisconnect.addListener(() => clearInterval(timer));
		});

		ctx.onInvalidated(stop);
	},
});
