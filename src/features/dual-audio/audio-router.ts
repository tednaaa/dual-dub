import type { Ear } from '@/shared/api';

const PAN: Record<Ear, number> = { left: -1, right: 1 };

export interface AudioRouter {
	context: AudioContext;
	connect: (ear: Ear, element: HTMLMediaElement) => void;
	setVolume: (ear: Ear, value: number) => void;
	level: (ear: Ear) => number;
	close: () => Promise<void>;
}

export function createAudioRouter(): AudioRouter {
	const context = new AudioContext();
	const gains = new Map<Ear, GainNode>();
	const analysers = new Map<Ear, AnalyserNode>();

	return {
		context,
		connect(ear, element) {
			const source = context.createMediaElementSource(element);
			const gain = new GainNode(context, { channelCount: 1, channelCountMode: 'explicit' });
			const analyser = new AnalyserNode(context, { fftSize: 2048 });
			source.connect(gain).connect(new StereoPannerNode(context, { pan: PAN[ear] })).connect(context.destination);
			source.connect(analyser);
			gains.set(ear, gain);
			analysers.set(ear, analyser);
		},
		setVolume(ear, value) {
			gains.get(ear)?.gain.setTargetAtTime(value, context.currentTime, 0.02);
		},
		level(ear) {
			const analyser = analysers.get(ear);
			if (!analyser)
				return 0;

			const samples = new Float32Array(analyser.fftSize);
			analyser.getFloatTimeDomainData(samples);
			return samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);
		},
		close: () => context.close(),
	};
}
