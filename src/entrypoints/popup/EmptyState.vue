<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
	icon: Component;
	title: string;
	description: string;
}>();
</script>

<template>
	<section class="flex flex-col items-center gap-3 px-4 py-8 text-center">
		<span class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
			<component :is="icon" class="size-6" />
		</span>

		<div class="flex flex-col gap-1">
			<h2 class="text-sm font-semibold">{{ title }}</h2>
			<p class="text-xs text-muted-foreground">{{ description }}</p>
		</div>

		<slot />
	</section>
</template>
