export type Ear = 'left' | 'right';

export type StreamKind = 'hls' | 'mp4';

export interface StreamSource {
	url: string;
	kind: StreamKind;
}

export type PlayerCommand
	= | { type: 'ping' }
		| { type: 'start'; streams: Record<Ear, StreamSource> }
		| { type: 'stop' }
		| { type: 'volume'; ear: Ear; value: number }
		| { type: 'status' };

export type StartResult
	= | { ok: true; audio: AudioContextState }
		| { ok: false; error: string };

export interface EarStatus {
	readyState: number;
	paused: boolean;
	currentTime: number;
	level: number;
	error: string | null;
}

export type PlayerStatus = (Record<Ear, EarStatus> & { origin: string }) | null;

export type BackgroundRequest = { type: 'allow-cors' } | { type: 'revoke-cors' };
