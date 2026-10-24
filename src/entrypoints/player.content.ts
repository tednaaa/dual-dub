import type { AudioRouter, HiddenPlayer } from '@/features/dual-audio';
import type { BackgroundRequest, Ear, PlayerCommand, PlayerStatus, StartResult, StreamSource } from '@/shared/api';
import { createAudioRouter, createHiddenPlayer } from '@/features/dual-audio';

const EARS: Ear[] = ['left', 'right'];

interface Session {
	router: AudioRouter;
	players: Map<Ear, HiddenPlayer>;
	master: HTMLVideoElement;
	masterMuted: boolean;
}

export default defineContentScript({
	registration: 'runtime',
	main(ctx) {
		let session: Session | undefined;

		function stop() {
			if (!session)
				return;

			const { router, players, master, masterMuted } = session;
			session = undefined;
			players.forEach(player => player.destroy());
			void router.close();
			master.muted = masterMuted;
			void browser.runtime.sendMessage({ type: 'revoke-cors' } satisfies BackgroundRequest);
		}

		async function start(streams: Record<Ear, StreamSource>): Promise<StartResult> {
			stop();

			const master = document.querySelector('video');
			if (!master)
				return { ok: false, error: 'No video in this frame' };

			await browser.runtime.sendMessage({ type: 'allow-cors' } satisfies BackgroundRequest);

			const router = createAudioRouter();
			const players = new Map<Ear, HiddenPlayer>();
			session = { router, players, master, masterMuted: master.muted };

			try {
				for (const ear of EARS) {
					const player = createHiddenPlayer(streams[ear], master.currentTime);
					players.set(ear, player);
					router.connect(ear, player.element);
					if (!master.paused)
						void player.element.play();
				}
				master.muted = true;
				await router.context.resume();
				return { ok: true, audio: router.context.state };
			}
			catch (error) {
				stop();
				return { ok: false, error: String(error) };
			}
		}

		function status(): PlayerStatus {
			if (!session)
				return null;

			const { router, players } = session;
			const earStatus = (ear: Ear) => {
				const player = players.get(ear);
				return {
					readyState: player?.element.readyState ?? 0,
					paused: player?.element.paused ?? true,
					currentTime: player?.element.currentTime ?? 0,
					level: router.level(ear),
					error: player?.error() ?? null,
				};
			};
			return { origin: location.origin, left: earStatus('left'), right: earStatus('right') };
		}

		browser.runtime.onMessage.addListener((message: PlayerCommand, _sender, sendResponse) => {
			switch (message.type) {
				case 'ping':
					sendResponse(true);
					return;
				case 'start':
					void start(message.streams).then(sendResponse);
					return true;
				case 'stop':
					stop();
					return;
				case 'volume':
					session?.router.setVolume(message.ear, message.value);
					return;
				case 'status':
					sendResponse(status());
			}
		});

		ctx.onInvalidated(stop);
	},
});
