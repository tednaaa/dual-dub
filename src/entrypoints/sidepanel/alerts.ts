import type { DubRef, Ear, PlayerReport, StartIssue } from '@/shared/api';
import { sameDub } from '@/entities/tab-state';

export type PanelAlert
	= | { kind: 'start-failed'; issue: StartIssue }
		| { kind: 'same-stream' }
		| { kind: 'suspended' }
		| { kind: 'load-failed'; ear: Ear }
		| { kind: 'silent'; ear: Ear };

interface AlertInput {
	startIssue: StartIssue | null;
	ears: Partial<Record<Ear, DubRef>>;
	report: PlayerReport | null;
	silent: Record<Ear, boolean>;
}

const EARS: Ear[] = ['left', 'right'];

export function pickAlert({ startIssue, ears, report, silent }: AlertInput): PanelAlert | null {
	if (startIssue)
		return { kind: 'start-failed', issue: startIssue };
	if (sameDub(ears.left, ears.right))
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
