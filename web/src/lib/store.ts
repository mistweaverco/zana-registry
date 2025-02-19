import { writable } from 'svelte/store';

export const sharedStore = writable({
	searchValue: '',
	filteredPackages: [],
	packagesCount: 0
});
