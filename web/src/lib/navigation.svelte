<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { sharedStore } from '$lib/store';

	let currentRoute = page.url.pathname;
	let searchInputElement: HTMLInputElement;

	const onSearchFormSubmit = (evt: Event) => {
		evt.preventDefault();
		$sharedStore.searchValue = searchInputElement.value;
	};

	const onSearchFormInput = () => {
		$sharedStore.searchValue = searchInputElement.value;
	};

	afterNavigate(() => {
		currentRoute = page.url.pathname;
	});
</script>

<div class="navbar bg-base-300 sticky top-0 z-10">
	<div class="flex-1">
		<a href="/">
			<button class="btn {currentRoute === '/' ? 'btn-primary' : ''}">
				<span class="icon">
					<i class="fa-solid fa-house"></i>
				</span>
				<strong>Home</strong>
			</button>
		</a>
		<a href="/list">
			<div class="indicator">
				<button class="btn {currentRoute === '/list' ? 'btn-primary' : ''}">
					<span class="icon">
						<i class="fa-solid fa-cloud"></i>
					</span>
					{#if $sharedStore.packagesCount !== 0}
						<span class="indicator-item badge badge-secondary">{$sharedStore.packagesCount}</span>
					{/if}
					<strong>Registry</strong>
				</button>
			</div>
		</a>
		<a href="https://github.com/mistweaverco/zana-registry" target="_blank">
			<button class="btn">
				<span class="icon">
					<i class="fa-brands fa-github"></i>
				</span>
				<strong>Github</strong>
			</button>
		</a>
	</div>
	<div class="flex-none gap-2">
		<div class="form-control">
			<form on:submit={onSearchFormSubmit}>
				<input
					type="text"
					placeholder="Search"
					bind:this={searchInputElement}
					on:input={onSearchFormInput}
					class="input input-bordered w-24 md:w-auto"
				/>
			</form>
		</div>
	</div>
</div>
