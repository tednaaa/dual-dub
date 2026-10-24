import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	manifestVersion: 3,
	modules: ['@wxt-dev/module-vue'],
	vite: () => ({
		plugins: [tailwindcss()],
	}),
	manifest: ({ browser }) => ({
		name: 'Dual Dub',
		description: 'Two dubs of one video at once: one in the left ear, another in the right',
		permissions: ['storage', 'scripting', 'webRequest', 'declarativeNetRequestWithHostAccess'],
		host_permissions: ['<all_urls>'],
		...(browser === 'firefox'
			? {
					browser_specific_settings: {
						gecko: {
							id: 'dual-dub@extension',
							strict_min_version: '128.0',
							data_collection_permissions: { required: ['none'] },
						},
					},
				}
			: { minimum_chrome_version: '121' }),
	}),
});
