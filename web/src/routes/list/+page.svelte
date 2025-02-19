<script lang="ts">
  import Head from '$lib/head.svelte';
	import { onMount } from 'svelte';
  import { sharedStore } from '$lib/store';

  let modalInfo;
  let activePackageIndex = 0;
  let packages = [];

  let activePackageData = {
    name: '',
    source: {
      id: '',
    },
    description: '',
    version: '',
    homepage: '',
    licenses: [],
    languages: [],
    categories: [],
  };

  const onRemotePackageItemClick = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    const tr = target.closest('tr') as HTMLTableRowElement;
    activePackageIndex = parseInt(tr.dataset.index as string);
    activePackageData = $sharedStore.filteredPackages[activePackageIndex];
    modalInfo.showModal();
  };

  const filterPackages = () => {
    if ($sharedStore.searchValue === '') {
      $sharedStore.filteredPackages = packages;
      return;
    }
    $sharedStore.filteredPackages = packages;
    $sharedStore.filteredPackages = $sharedStore.filteredPackages.filter((pkg) => {
      return pkg.name.toLowerCase().includes($sharedStore.searchValue.toLowerCase());
    });
  };

  $: $sharedStore.searchValue, filterPackages();

  onMount(async () => {
    const res = await fetch('/registry.json');
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

<Head data={{ title: 'Zana Registry: List', description: 'Here you can search for packages in the Zana registry.' }} />

<dialog bind:this={modalInfo} class="modal">
  <div class="modal-box">
    <h3 class="text-lg font-bold">Info</h3>
    <table class="table w-full">
      <tbody>
        <tr>
          <td>Name:</td>
          <td>
            <label class="input input-bordered flex items-center gap-2">
              <span class="icon">
                <i class="fa-solid fa-signature"></i>
              </span>
              <input type="text" class="grow" readonly value={activePackageData.name} />
            </label>
          </td>
        </tr>
        <tr>
          <td>Source ID:</td>
          <td>{activePackageData.source.id}</td>
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
            <label class="input input-bordered flex items-center gap-2">
              <span class="icon">
                <i class="fa-solid fa-external-link"></i>
              </span>
              <input type="text" class="grow" readonly value={activePackageData.homepage} />
            </label>
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
        <button class="btn">Close</button>
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
