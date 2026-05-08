<script lang="ts">
	import '@fortawesome/fontawesome-free/css/all.css';
	import '../app.css';
	let { children } = $props();
	import Navigation from '$lib/navigation.svelte';
</script>

<Navigation />

{@render children()}
