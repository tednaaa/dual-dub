import type { PlayerReport } from '@/shared/api';
import { describe, expect, it } from 'vitest';
import { pickAlert } from './alerts';

function report(overrides: Partial<PlayerReport> = {}): PlayerReport {
	return {
		audio: 'running',
		playing: true,
		ears: { left: { level: 0.3, error: null }, right: { level: 0.3, error: null } },
		...overrides,
	};
}

const stream = (url: string) => ({ url, kind: 'hls' as const, frameId: 3 });
const quiet = { left: false, right: false };

describe('pickAlert', () => {
	it('warns when both ears got the same dub', () => {
		const ears = { left: stream('https://a/ru.m3u8'), right: stream('https://a/ru.m3u8') };

		expect(pickAlert({ startIssue: null, ears, report: null, silent: quiet })).toEqual({ kind: 'same-stream' });
	});

	it('asks for a click before blaming silence on the dub', () => {
		const alert = pickAlert({ startIssue: null, ears: {}, report: report({ audio: 'suspended' }), silent: { left: true, right: true } });

		expect(alert).toEqual({ kind: 'suspended' });
	});

	it('reports a load error instead of the silence it causes', () => {
		const failed = report({ ears: { left: { level: 0.3, error: null }, right: { level: 0, error: 'networkError: manifestLoadError 403' } } });

		expect(pickAlert({ startIssue: null, ears: {}, report: failed, silent: { left: false, right: true } })).toEqual({ kind: 'load-failed', ear: 'right' });
	});

	it('names the silent ear', () => {
		expect(pickAlert({ startIssue: null, ears: {}, report: report(), silent: { left: false, right: true } })).toEqual({ kind: 'silent', ear: 'right' });
	});
});
