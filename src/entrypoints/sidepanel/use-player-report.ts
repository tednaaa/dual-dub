import type { Ref } from 'vue';
import type { Ear, PlayerReport } from '@/shared/api';
import { ref, shallowRef, watch } from 'vue';
import { PLAYER_REPORT_PORT } from '@/shared/api';
import { isSilent, trackSilence } from '@/shared/lib';

const EARS: Ear[] = ['left', 'right'];

export function usePlayerReport(tabId: Ref<number | undefined>, frameId: Ref<number | null>) {
	const report = shallowRef<PlayerReport | null>(null);
	const silent = ref<Record<Ear, boolean>>({ left: false, right: false });

	watch([tabId, frameId], ([tab, frame], _previous, onCleanup) => {
		report.value = null;
		silent.value = { left: false, right: false };
		if (tab === undefined || frame === null)
			return;

		const port = browser.tabs.connect(tab, { name: PLAYER_REPORT_PORT, frameId: frame });
		const silentMs: Record<Ear, number> = { left: 0, right: 0 };
		let previousAt = performance.now();

		port.onMessage.addListener((message: PlayerReport) => {
			const now = performance.now();
			const audible = message.playing && message.audio === 'running';
			for (const ear of EARS)
				silentMs[ear] = trackSilence(silentMs[ear], message.ears[ear].level, audible, now - previousAt);
			previousAt = now;
			report.value = message;
			silent.value = { left: isSilent(silentMs.left), right: isSilent(silentMs.right) };
		});
		port.onDisconnect.addListener(() => {
			report.value = null;
		});
		onCleanup(() => port.disconnect());
	}, { immediate: true });

	return { report, silent };
}
