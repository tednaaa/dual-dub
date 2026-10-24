import type { CapturedStream } from '@/entities/tab-state';
import type { Ear, PlayerReport, StartIssue } from '@/shared/api';

export type PopupAlert
	= | { kind: 'start-failed'; issue: StartIssue }
		| { kind: 'same-stream' }
		| { kind: 'suspended' }
		| { kind: 'load-failed'; ear: Ear }
		| { kind: 'silent'; ear: Ear };

interface AlertInput {
	startIssue: StartIssue | null;
	ears: Partial<Record<Ear, CapturedStream>>;
	report: PlayerReport | null;
	silent: Record<Ear, boolean>;
}

const EARS: Ear[] = ['left', 'right'];

export function pickAlert({ startIssue, ears, report, silent }: AlertInput): PopupAlert | null {
	if (startIssue)
		return { kind: 'start-failed', issue: startIssue };
	if (ears.left && ears.left.url === ears.right?.url)
		return { kind: 'same-stream' };
	if (!report)
		return null;
	if (report.audio === 'suspended')
		return { kind: 'suspended' };

	const failed = EARS.find(ear => report.ears[ear].error);
	if (failed)
		return { kind: 'load-failed', ear: failed };

	const quiet = EARS.find(ear => silent[ear]);
	return quiet ? { kind: 'silent', ear: quiet } : null;
}
