<script lang="ts">
	export let label: string;
	export let selected: string[] = [];
	export let suggestions: string[] = [];
	export let inputValue = '';
	export let inputPlaceholder = 'Type and press Enter';
	export let badgeClass = 'badge-secondary';
	export let showAllOptions = false;
	export let minCharsToShowOptions = 0;
	export let btnClass = 'btn-accent';
	export let onAdd: (value: string) => void;
	export let onRemove: (value: string) => void;

	const optionsId = `options-${label.replaceAll(/\s+/g, '-').toLowerCase()}`;

	const shouldShowOptions = () =>
		showAllOptions || inputValue.trim().length >= minCharsToShowOptions;

	const commit = () => {
		if (!inputValue.trim()) return;
		onAdd?.(inputValue);
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commit();
		}
	};
</script>

<div class="form-control">
	<div class="label"><span class="label-text">{label}</span></div>

	<div class="join w-full">
		<input
			class="input input-bordered join-item w-full"
			type="text"
			placeholder={inputPlaceholder}
			bind:value={inputValue}
			on:keydown={onKeyDown}
			on:change={commit}
			on:blur={commit}
			list={optionsId}
		/>
		<button type="button" class="btn {btnClass} join-item" on:click={commit}>Add</button>
	</div>

	<div class="mt-2 flex flex-wrap gap-2">
		{#each selected as v (v)}
			<button
				type="button"
				class={`badge ${badgeClass} cursor-pointer`}
				on:click={() => onRemove?.(v)}
			>
				{v} <span class="ml-1">×</span>
			</button>
		{/each}
	</div>

	{#if shouldShowOptions()}
		<datalist id={optionsId}>
			{#each suggestions as s (s)}
				<option value={s}></option>
			{/each}
		</datalist>
	{/if}
</div>
