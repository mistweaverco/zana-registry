import { writable } from "svelte/store";
import { type Package } from "$lib/types";

export const sharedStore = writable({
  searchValue: "",
  filteredPackages: [] as Package[],
  packagesCount: 0,
});
