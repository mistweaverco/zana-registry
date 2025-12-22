<script lang="ts">
	import Head from '$lib/head.svelte';
	import { onMount } from 'svelte';
	import { sharedStore } from '$lib/store';

	let modalInfo;
	let modalInfoCloseButton;
	let alertCopySuccess;
	let activePackageIndex = 0;
	let packages = [];

	let activePackageData = {
		name: '',
		source: {
			id: ''
		},
		description: '',
		version: '',
		homepage: '',
		licenses: [],
		languages: [],
		categories: []
	};

	const onHomepageIconClick = (e: Event) => {
		const target = e.currentTarget as HTMLElement;
		const btn = target.closest('button') as HTMLSpanElement;
		const homepage = btn.dataset.homepage as string;
		window.open(homepage, '_blank');
	};

	const onAttrCopyClick = (e: Event) => {
		const target = e.currentTarget as HTMLElement;
		const btn = target.closest('button') as HTMLSpanElement;
		const v = btn.dataset.value as string;
		navigator.clipboard.writeText(name);
		alertCopySuccess.classList.remove('hidden');
		setTimeout(() => {
			alertCopySuccess.classList.add('hidden');
		}, 2000);
	};

	const onRemotePackageItemClick = (e: Event) => {
		const target = e.currentTarget as HTMLElement;
		const tr = target.closest('tr') as HTMLTableRowElement;
		activePackageIndex = parseInt(tr.dataset.index as string);
		activePackageData = $sharedStore.filteredPackages[activePackageIndex];
		modalInfo.showModal();
		modalInfoCloseButton.focus();
	};

	const filterPackages = () => {
		if ($sharedStore.searchValue === '') {
			$sharedStore.filteredPackages = packages;
			return;
		}
		const searchLower = $sharedStore.searchValue.toLowerCase();
		$sharedStore.filteredPackages = packages;
		$sharedStore.filteredPackages = $sharedStore.filteredPackages.filter((pkg) => {
			// Search by name
			if (pkg.name.toLowerCase().includes(searchLower)) {
				pkg.searchMatchInfo = 'Name matched';
				return true;
			}
			// Search by aliases
			if (pkg.aliases && Array.isArray(pkg.aliases)) {
				return pkg.aliases.some((alias: string) => {
					const match = alias.toLowerCase().includes(searchLower);
					if (match) {
						pkg.searchMatchInfo = `Alias ${alias} matched`;
						return true;
					}
				});
			}
			return false;
		});
	};

	$: $sharedStore.searchValue, filterPackages();

	onMount(async () => {
		const res = await fetch('/zana-registry.json');
		const data = await res.json();
		const sortedData = data.sort((a, b) => {
			if (a.name < b.name) {
				return -1;
			}
			if (a.name > b.name) {
				return 1;
			}
			return 0;
		});
		packages = sortedData;
		$sharedStore.filteredPackages = sortedData;
		$sharedStore.packagesCount = sortedData.length;
	});
</script>

<Head
	data={{
		title: 'Zana Registry: List',
		description: 'Here you can search for packages in the Zana registry.'
	}}
/>

<dialog bind:this={modalInfo} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Info</h3>
		<table class="table w-full">
			<tbody>
				<tr>
					<td>Name:</td>
					<td>
						<div class="flex items-center gap-2">
							<label class="input input-bordered">
								<input type="text" class="grow" readonly value={activePackageData.name} />
							</label>
							<button
								class="btn btn-primary"
								aria-label="Click to copy the name to clipboard"
								on:click={onAttrCopyClick}
								data-copy-value={activePackageData.name}
							>
								<span class="icon">
									<i class="fa-solid fa-copy"></i>
								</span>
							</button>
						</div>
						<div role="alert" bind:this={alertCopySuccess} class="alert alert-success mt-3 hidden">
							<span class="icon">
								<i class="fa-solid fa-check"></i>
							</span>
							<span>Successfully copied to clipboard</span>
						</div>
					</td>
				</tr>
				<tr>
					<td>Source ID:</td>
					<td>
						<div class="flex items-center gap-2">
							<label class="input input-bordered">
								<input type="text" class="grow" readonly value={activePackageData.source.id} />
							</label>
							<button
								class="btn btn-primary"
								aria-label="Click to copy the source id to clipboard"
								on:click={onAttrCopyClick}
								data-copy-value={activePackageData.source.id}
							>
								<span class="icon">
									<i class="fa-solid fa-copy"></i>
								</span>
							</button>
						</div>
						<div role="alert" bind:this={alertCopySuccess} class="alert alert-success mt-3 hidden">
							<span class="icon">
								<i class="fa-solid fa-check"></i>
							</span>
							<span>Successfully copied to clipboard</span>
						</div>
					</td>
				</tr>
				<tr>
					<td>Install:</td>
					<td>
						<div class="flex items-center gap-2">
							<label class="input input-bordered">
								<input
									type="text"
									class="grow"
									readonly
									value={`zana add ${activePackageData.source.id}`}
								/>
							</label>
							<button
								class="btn btn-primary"
								aria-label="Click to copy the install command to clipboard"
								on:click={onAttrCopyClick}
								data-copy-value={`zana add ${activePackageData.source.id}`}
							>
								<span class="icon">
									<i class="fa-solid fa-copy"></i>
								</span>
							</button>
						</div>
						<div role="alert" bind:this={alertCopySuccess} class="alert alert-success mt-3 hidden">
							<span class="icon">
								<i class="fa-solid fa-check"></i>
							</span>
							<span>Successfully copied to clipboard</span>
						</div>
					</td>
				</tr>
				<tr>
					<td>Description:</td>
					<td>{activePackageData.description}</td>
				</tr>
				<tr>
					<td>Version:</td>
					<td>{activePackageData.version}</td>
				</tr>
				<tr>
					<td>Homepage:</td>
					<td>
						<div class="flex items-center gap-2">
							<label class="input input-bordered">
								<input type="text" class="grow" readonly value={activePackageData.homepage} />
							</label>
							<button
								class="btn btn-primary"
								aria-label="Click to open the homepage in a new tab"
								on:click={onHomepageIconClick}
								data-homepage={activePackageData.homepage}
							>
								<span class="icon">
									<i class="fa-solid fa-external-link"></i>
								</span>
							</button>
						</div>
					</td>
				</tr>
				<tr>
					<td>Licenses:</td>
					<td>{activePackageData.licenses.join(', ')}</td>
				</tr>
				<tr>
					<td>Languages:</td>
					<td>{activePackageData.languages.join(', ')}</td>
				</tr>
				<tr>
					<td>Categories:</td>
					<td>{activePackageData.categories.join(', ')}</td>
				</tr>
			</tbody>
		</table>
		<div class="modal-action">
			<form method="dialog">
				<button bind:this={modalInfoCloseButton} class="btn">Close</button>
			</form>
		</div>
	</div>
</dialog>

<div class="overflow-x-auto">
	<table class="table w-full">
		<thead>
			<tr>
				<th>Name</th>
				<th>Version</th>
				{#if $sharedStore.searchValue !== '' && $sharedStore.filteredPackages.length > 0}
					<th>Search Info</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each $sharedStore.filteredPackages as pkg, i (pkg.name)}
				<tr
					class="remote-package-item {i === activePackageIndex
						? 'bg-primary text-primary-content'
						: ''}"
					on:click={onRemotePackageItemClick}
					data-index={i}
				>
					<td>{pkg.name}</td>
					<td>
						<span>{pkg.version}</span>
					</td>
					{#if $sharedStore.searchValue !== '' && $sharedStore.filteredPackages.length > 0}
						<td>
							<span>{pkg.searchMatchInfo}</span>
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	td {
		vertical-align: top;
	}
</style>
