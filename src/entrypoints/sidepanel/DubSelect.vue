<script setup lang="ts">
import type { Source } from '@/entities/tab-state';
import type { DubRef } from '@/shared/api';
import { Badge, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from 'shonk-ui';
import { computed } from 'vue';
import { sameDub } from '@/entities/tab-state';
import { t } from '@/shared/lib';
import { groupDubs } from './dub-groups';
import { trackName } from './dub-label';

const props = defineProps<{
	sources: Source[];
	playing: DubRef | null;
	label: string;
}>();

const dub = defineModel<DubRef | null>({ required: true });

const groups = computed(() => groupDubs(props.sources).map(group => ({
	...group,
	dubs: group.dubs.map(numbered => ({
		key: `${numbered.dub.source.url} ${numbered.dub.track.id}`,
		ref: { sourceUrl: numbered.dub.source.url, trackId: numbered.dub.track.id },
		name: trackName(numbered),
	})),
})));

const selectedName = computed(() => groups.value.flatMap(group => group.dubs).find(item => sameDub(item.ref, dub.value))?.name);
</script>

<template>
	<Select v-model="dub" :by="sameDub" :disabled="sources.length === 0">
		<SelectTrigger size="sm" class="w-full min-w-0" :aria-label="label">
			<SelectValue>
				<span class="truncate">{{ selectedName ?? t('notAssigned') }}</span>
			</SelectValue>
		</SelectTrigger>

		<SelectContent>
			<template v-for="(group, index) in groups" :key="group.key">
				<SelectSeparator v-if="index > 0" />
				<SelectGroup>
					<SelectLabel class="flex items-center gap-2">
						<span class="truncate">{{ group.host ?? t('separateStreams') }}</span>
						<Badge variant="secondary">{{ group.kind.toUpperCase() }}</Badge>
					</SelectLabel>
					<SelectItem v-for="item in group.dubs" :key="item.key" :value="item.ref" :text-value="item.name">
						<span class="truncate">{{ item.name }}</span>
						<Badge v-if="sameDub(item.ref, playing)">{{ t('inPlayer') }}</Badge>
					</SelectItem>
				</SelectGroup>
			</template>
		</SelectContent>
	</Select>
</template>
