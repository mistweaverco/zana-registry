<script lang="ts">
  import '@fortawesome/fontawesome-free/css/all.css';
	import '../app.css';
	let { children } = $props();

  import { sharedStore } from '$lib/store';
  import Navigation from '$lib/navigation.svelte';

  $sharedStore.searchValue = '';
</script>


<Navigation />

{@render children()}
