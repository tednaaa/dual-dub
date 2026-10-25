<script setup lang="ts">
import type { EarSettings } from '@/entities/preferences';
import type { DubRef, Ear, StartIssue, StartResult } from '@/shared/api';
import { ArrowDownUpIcon, BookmarkCheckIcon, ChevronDownIcon, MonitorOffIcon, ShieldCheckIcon } from '@lucide/vue';
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from 'shonk-ui';
import { computed, ref, watch } from 'vue';
import { earSettings, onboarded, siteDubs } from '@/entities/preferences';
import { hasSingleDub, onboardingStep } from '@/entities/tab-state';
import { t } from '@/shared/lib';
import { pickAlert } from './alerts';
import AppFooter from './AppFooter.vue';
import AppHeader from './AppHeader.vue';
import AudioAlert from './AudioAlert.vue';
import EarCard from './EarCard.vue';
import EmptyState from './EmptyState.vue';
import OnboardingSteps from './OnboardingSteps.vue';
import { usePlayerReport } from './use-player-report';
import { useStorageItem } from './use-storage-item';
import { useTabState } from './use-tab-state';

const EARS: Ear[] = ['left', 'right'];

const { tabId, site, state, access, grantPermission, send } = useTabState();
const playerFrameId = computed(() => state.value.playerFrameId);
const { report, silent } = usePlayerReport(tabId, playerFrameId);
const settings = useStorageItem(earSettings);
const isOnboarded = useStorageItem(onboarded);
const rememberedSites = useStorageItem(siteDubs);

const startIssue = ref<StartIssue | null>(null);
const helpOpen = ref(false);
watch(tabId, () => {
	startIssue.value = null;
});

const running = computed(() => playerFrameId.value !== null);
const step = computed(() => onboardingStep(state.value));
const singleDub = computed(() => hasSingleDub(state.value));
const canEnable = computed(() => Boolean(state.value.ears.left && state.value.ears.right));
const rememberedSite = computed(() => site.value && rememberedSites.value[site.value] ? site.value : undefined);
const alert = computed(() => pickAlert({ startIssue: startIssue.value, ears: state.value.ears, report: report.value, silent: silent.value }));

async function toggle(on: boolean) {
	if (tabId.value === undefined)
		return;

	startIssue.value = null;
	if (!on) {
		await send({ type: 'disable', tabId: tabId.value });
		return;
	}

	const result = await send<StartResult>({ type: 'enable', tabId: tabId.value });
	if (!result.ok)
		startIssue.value = result.issue;
}

function assign(ear: Ear, dub: DubRef) {
	if (tabId.value !== undefined)
		void send({ type: 'assign', tabId: tabId.value, ear, dub });
}

function updateSettings(ear: Ear, next: EarSettings) {
	settings.value = { ...settings.value, [ear]: next };
}

function forget() {
	rememberedSites.value = Object.fromEntries(Object.entries(rememberedSites.value).filter(([host]) => host !== site.value));
}

function swap() {
	if (tabId.value !== undefined)
		void send({ type: 'swap', tabId: tabId.value });
}
</script>

<template>
	<main class="flex flex-col gap-4 p-4">
		<AppHeader :running="running" :can-enable="canEnable" @toggle="toggle" />

		<EmptyState
			v-if="access === 'no-permission'"
			:icon="ShieldCheckIcon"
			:title="t('permissionTitle')"
			:description="t('permissionDescription')"
		>
			<Button size="sm" @click="grantPermission">{{ t('permissionGrant') }}</Button>
		</EmptyState>

		<EmptyState
			v-else-if="access === 'unsupported'"
			:icon="MonitorOffIcon"
			:title="t('emptyTitle')"
			:description="t('emptyDescription')"
		/>

		<template v-else-if="access === 'ready'">
			<Collapsible v-if="isOnboarded" v-model:open="helpOpen">
				<CollapsibleTrigger as-child>
					<Button variant="ghost" size="sm" class="w-full justify-between">
						{{ t('howToUse') }}
						<ChevronDownIcon class="transition-transform motion-reduce:transition-none" :class="{ 'rotate-180': helpOpen }" />
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent class="pt-2">
					<OnboardingSteps :step="step" :single-dub="singleDub" />
				</CollapsibleContent>
			</Collapsible>

			<OnboardingSteps v-else :step="step" :single-dub="singleDub" />

			<AudioAlert v-if="alert" :alert="alert" />

			<div class="flex flex-col gap-2">
				<template v-for="ear in EARS" :key="ear">
					<EarCard
						:settings="settings[ear]"
						:ear="ear"
						:dub="state.ears[ear]"
						:sources="state.sources"
						:playing="state.playing"
						:level="report?.ears[ear].level ?? null"
						@update:settings="updateSettings(ear, $event)"
						@assign="assign(ear, $event)"
					/>

					<Button
						v-if="ear === 'left'"
						variant="ghost"
						size="sm"
						class="self-center"
						:disabled="!state.ears.left && !state.ears.right"
						@click="swap"
					>
						<ArrowDownUpIcon />
						{{ t('swapEars') }}
					</Button>
				</template>
			</div>

			<div v-if="rememberedSite" class="flex items-center gap-2 text-xs text-muted-foreground">
				<BookmarkCheckIcon class="size-4 shrink-0" />
				<span class="min-w-0 flex-1">{{ t('rememberedForSite', rememberedSite) }}</span>
				<Button variant="ghost" size="sm" @click="forget">{{ t('forget') }}</Button>
			</div>
		</template>

		<AppFooter />
	</main>
</template>
