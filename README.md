<div align="center">

![Zana Logo](assets/logo.svg)

# zana-registry

[![Made with love](assets/badge-made-with-love.svg)](https://github.com/mistweaverco/zana-registry/graphs/contributors)
[![Discord](assets/badge-discord.svg)](https://getzana.net/discord)

[Requirements](#requirements) • [Install](#install) • [Website](https://getzana.net/)

<p></p>

This is the registry for [Zana](https://getzana.net).

<p></p>

</div>

## Honorable Mentions

This registry is based of the work of the
[Mason registry](https://github.com/mason-org/mason-registry),
but differs quite heavily in its implementation.

Key differences include:

- Packages do not have a version included.
- Packages are located in `packages/[package-name]/zana.yaml` instead of `packages/[package-name]/package.yaml`.
  - This is to avoid conflicts with the original Mason registry yaml definitions.
- Releases are done every two hours, but do only **update** the monthly release.
  - This is to avoid spamming the registry with releases that are not necessary.
  - Releases can be done manually, if necessary.
- The registry should be more community driven and less centralized.

The original Mason registry is licensed under
the [Apache 2.0 License](https://github.com/mason-org/mason-registry/blob/main/LICENSE).

