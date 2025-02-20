<script lang="ts">
	import Head from '$lib/head.svelte';
</script>

<Head
	data={{
		title: 'Zana Registry: Home',
		description:
			'Zana 📦 aims to be like Mason.nvim 🧱, but with the goal of supporting 🌈 not only Neovim, but rather any other editor 🫶.'
	}}
/>

<div class="hero bg-base-200">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<h1 class="text-5xl font-bold">Zana Registry</h1>
			<p class="py-6">
				Zana 📦 aims to be like Mason.nvim 🧱, but with the goal of supporting 🌈 not only Neovim,
				but rather any other editor 🫶.
			</p>
			<p class="py-6">Zana is swahili for "tools" or "tooling".</p>
			<p class="py-6">
				A minimal package manager for Neovim (and other editors) which uses this Registry to install
				and manage packages.
			</p>
			<p class="py-6">
				Easily install and manage LSP servers, DAP servers, linters, and formatters.
			</p>
			<p class="py-6">Currently, Zana is in pre-alpha and under active development.</p>
		</div>
	</div>
</div>
