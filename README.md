<div align="center">

![Zana Logo](assets/logo.svg)

# zana-registry

[![Made with love][badge-made-with-love]][contributors]
[![Latest release][badge-latest-release]][latest-release]

[What?](#what) •
[Honorable Mentions](#honorable-mentions) •
[Main Differences](#main-differences) •

<p></p>

This is the [registry][registry-website] for [Zana][website],

<p></p>

</div>

> [!INFO]
> Package versions are updated every two hours.
> The updater only **updates** the monthly release.
> It does also update the release notes if there are any changes.
> This is to avoid spamming the registry with releases.
> This means, there is one **release** per month,
> but it's updated every two hours.

## What?

Zana is a cross-platform package manager for development tools.
It allows you to easily install, manage, and distribute
development tools across different environments.

It supports a multitude of [package providers](#supported-providers).

It's designed to be uncomplicated, fast, and reliable,
making it easy to manage your development tools.

This is the registry that Zana uses to fetch package information.

## Supported providers

The registry currently supports the following package providers:

  - [x] `cargo`
  - [x] `codeberg`
  - [x] `composer`
  - [x] `gem`
  - [x] `generic` (shell commands)
  - [x] `github`
  - [x] `gitlab`
  - [x] `golang`
  - [x] `luarocks`
  - [x] `npm`
  - [x] `nuget`
  - [x] `opam`
  - [x] `openvsx`
  - [x] `pypi`

## Honorable mentions

This registry is based of the work of the
[Mason registry](https://github.com/mason-org/mason-registry),
but differs quite heavily in its implementation.

### Main differences

Main differences between the Mason registry and the Zana registry:

- Packages don't have a version included.
- Packages are located in `packages/<provider>/<package-id>/zana.yaml` where:
  - `<provider>` is the package provider
    (e.g., `npm`, `github`, `gitlab`, `...`)
  - `<package-id>` is the package identifier as defined by the provider
  - Examples:
    - `packages/npm/@mistweaverco/kulala-ls/zana.yaml` for npm scoped packages
    - `packages/npm/bash-language-server/zana.yaml` for npm top-level packages
    - `packages/github/dprint/dprint/zana.yaml` for GitHub repositories
    - `packages/gitlab/mistweaverco/a/b/c/repo-name/zana.yaml`
      for GitLab (supports unlimited sub-folders)
- Package IDs use the format `<provider>:<package-id>`
  (e.g., `npm:@mistweaverco/kulala-ls`, `github:dprint/dprint`)
- Releases are done every two hours, but do only **update** the monthly release.
  - This is to avoid spamming the registry.

> [!NOTE]
> The original Mason registry is licensed under
> [Apache 2.0 License](https://github.com/mason-org/mason-registry/blob/main/LICENSE).



[website]: https://getzana.net
[registry-website]: https://registry.getzana.net
[badge-made-with-love]: assets/badge-made-with-love.svg
[contributors]: https://github.com/mistweaverco/zana-registry/graphs/contributors
[logo]: assets/logo.svg
[swahili]: https://en.wikipedia.org/wiki/Swahili_language
[badge-latest-release]: https://img.shields.io/github/v/release/mistweaverco/zana-registry?style=for-the-badge
[latest-release]: https://github.com/mistweaverco/zana-registry/releases/latest
