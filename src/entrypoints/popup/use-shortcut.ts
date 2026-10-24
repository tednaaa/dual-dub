import { ref } from 'vue';

export function useShortcut(command: string) {
	const keys = ref<string[]>([]);
	void browser.commands.getAll().then((commands) => {
		const shortcut = commands.find(({ name }) => name === command)?.shortcut;
		keys.value = shortcut ? shortcut.split('+') : [];
	});
	return keys;
}
