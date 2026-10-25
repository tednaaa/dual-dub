import type { StreamKind, Track } from '@/shared/lib';

export type Ear = 'left' | 'right';

export interface DubRef {
	sourceUrl: string;
	trackId: string;
}

export interface DubStream {
	url: string;
	kind: StreamKind;
	track: Track;
}

export type StartIssue = 'no-video' | 'no-ears' | 'failed';

export type StartResult = { ok: true } | { ok: false; issue: StartIssue };

export type PlayerCommand
	= | { type: 'ping' }
		| { type: 'start'; dubs: Record<Ear, DubStream> }
		| { type: 'stop' };

export interface PlayerPing {
	running: boolean;
}

export interface EarReport {
	level: number;
	error: string | null;
}

export interface PlayerReport {
	audio: AudioContextState;
	playing: boolean;
	ears: Record<Ear, EarReport>;
}

export const PLAYER_REPORT_PORT = 'player-report';

export type RuntimeRequest
	= | { type: 'allow-cors' }
		| { type: 'revoke-cors' }
		| { type: 'assign'; tabId: number; ear: Ear; dub: DubRef }
		| { type: 'swap'; tabId: number }
		| { type: 'enable'; tabId: number }
		| { type: 'disable'; tabId: number }
		| { type: 'refresh'; tabId: number };
