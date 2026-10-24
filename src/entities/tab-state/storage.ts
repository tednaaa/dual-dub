import type { TabState } from './model';
import { EMPTY_TAB_STATE } from './model';

const key = (tabId: number) => `session:tab-${tabId}` as const;

let queue: Promise<unknown> = Promise.resolve();

export async function readTabState(tabId: number): Promise<TabState> {
	return await storage.getItem<TabState>(key(tabId)) ?? EMPTY_TAB_STATE;
}

export function watchTabState(tabId: number, callback: (state: TabState) => void) {
	return storage.watch<TabState>(key(tabId), state => callback(state ?? EMPTY_TAB_STATE));
}

export function updateTabState(tabId: number, update: (state: TabState) => TabState): Promise<TabState> {
	const next = queue.then(async () => {
		const state = update(await readTabState(tabId));
		await storage.setItem(key(tabId), state);
		return state;
	});
	queue = next.catch(() => undefined);
	return next;
}

export async function clearTabState(tabId: number) {
	await storage.removeItem(key(tabId));
}
