import type { Ear } from '@/shared/api';
import { ref } from 'vue';

const TONE_SECONDS = 0.6;
const FADE_SECONDS = 0.05;
const TONE_GAIN = 0.2;
const TONES: [Ear, number][] = [['left', -1], ['right', 1]];

function playTone(context: AudioContext, pan: number) {
	const oscillator = new OscillatorNode(context, { frequency: 660 });
	const gain = new GainNode(context, { gain: 0 });
	oscillator.connect(gain).connect(new StereoPannerNode(context, { pan })).connect(context.destination);

	const start = context.currentTime;
	const end = start + TONE_SECONDS;
	gain.gain.setValueAtTime(0, start);
	gain.gain.linearRampToValueAtTime(TONE_GAIN, start + FADE_SECONDS);
	gain.gain.setValueAtTime(TONE_GAIN, end - FADE_SECONDS);
	gain.gain.linearRampToValueAtTime(0, end);
	oscillator.start(start);
	oscillator.stop(end);

	return new Promise(resolve => oscillator.addEventListener('ended', resolve, { once: true }));
}

export function useEarTest() {
	const testing = ref<Ear | null>(null);

	async function run() {
		if (testing.value)
			return;

		const context = new AudioContext();
		for (const [ear, pan] of TONES) {
			testing.value = ear;
			await playTone(context, pan);
		}
		testing.value = null;
		await context.close();
	}

	return { testing, run };
}
