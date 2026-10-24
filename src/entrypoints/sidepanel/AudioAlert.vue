<script setup lang="ts">
import type { AlertVariant } from 'shonk-ui';
import type { PanelAlert } from './alerts';
import type { MessageKey } from '@/shared/lib';
import { Alert } from 'shonk-ui';
import { computed } from 'vue';
import { t } from '@/shared/lib';

const props = defineProps<{
	alert: PanelAlert;
}>();

const EAR_LABEL = { left: 'earLeft', right: 'earRight' } as const;

const START_ISSUE_MESSAGES = {
	'no-video': ['alertNoVideoTitle', 'alertNoVideoDescription'],
	'no-ears': ['alertFailedTitle', 'alertFailedDescription'],
	'failed': ['alertFailedTitle', 'alertFailedDescription'],
} as const satisfies Record<string, [MessageKey, MessageKey]>;

interface AlertContent {
	variant: AlertVariant;
	title: string;
	description: string;
}

function alertContent(alert: PanelAlert): AlertContent {
	switch (alert.kind) {
		case 'start-failed': {
			const [title, description] = START_ISSUE_MESSAGES[alert.issue];
			return { variant: 'destructive', title: t(title), description: t(description) };
		}
		case 'same-stream':
			return { variant: 'warning', title: t('alertSameTitle'), description: t('alertSameDescription') };
		case 'suspended':
			return { variant: 'info', title: t('alertSuspendedTitle'), description: t('alertSuspendedDescription') };
		case 'load-failed':
			return { variant: 'destructive', title: t('alertLoadFailedTitle', t(EAR_LABEL[alert.ear])), description: t('alertLoadFailedDescription') };
		case 'silent':
			return { variant: 'warning', title: t('alertSilentTitle', t(EAR_LABEL[alert.ear])), description: t('alertSilentDescription') };
	}
}

const content = computed(() => alertContent(props.alert));
</script>

<template>
	<Alert :variant="content.variant" :title="content.title" class="animate-in fade-in-0 slide-in-from-top-1">
		<p class="text-xs">{{ content.description }}</p>
	</Alert>
</template>
