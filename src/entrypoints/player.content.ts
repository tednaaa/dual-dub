import type { AudioRouter, HiddenPlayer } from '@/features/dual-audio';
import type { BackgroundRequest, Ear, PlayerCommand, PlayerStatus, StartResult, StreamSource } from '@/shared/api';
import { createAudioRouter, createHiddenPlayer, findMasterVideo, silenceMaster, syncWithMaster } from '@/features/dual-audio';

const EARS: Ear[] = ['left', 'right'];

interface Session {
	router: AudioRouter;
	players: Map<Ear, HiddenPlayer>;
	master: HTMLVideoElement;
	unsync: () => void;
	unsilence: () => void;
}

export default defineContentScript({
	registration: 'runtime',
	main(ctx) {
		let session: Session | undefined;

		function stop() {
			if (!session)
				return;

			const { router, players, unsync, unsilence } = session;
			session = undefined;
			unsync();
			unsilence();
			players.forEach(player => player.destroy());
			void router.close();
			void browser.runtime.sendMessage({ type: 'revoke-cors' } satisfies BackgroundRequest);
		}

		async function start(streams: Record<Ear, StreamSource>): Promise<StartResult> {
			stop();

			const master = findMasterVideo();
			if (!master)
				return { ok: false, error: 'No video in this frame' };

			await browser.runtime.sendMessage({ type: 'allow-cors' } satisfies BackgroundRequest);

			const router = createAudioRouter();
			const players = new Map<Ear, HiddenPlayer>();
			const current: Session = { router, players, master, unsync: () => {}, unsilence: () => {} };
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
				current.unsync = syncWithMaster(master, Array.from(players.values(), player => player.element));
				current.unsilence = silenceMaster(master);
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
			return { origin: location.origin, masterTime: session.master.currentTime, left: earStatus('left'), right: earStatus('right') };
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
