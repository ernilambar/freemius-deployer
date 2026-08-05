# Changelog

## 2.0.0 - 2026-08-05

- Added: `--dry-run`, `--config <path>`, `--env-file <path>`, and `--quiet` CLI flags.
- Added: `--release-mode <pending|beta|released>` flag to control the release status (default: `pending`).
- Added: `-h, --help` flag and short aliases (`-d`, `-c`, `-e`, `-q`, `-r`) for all CLI flags.
- Added: `-v, --version` flag to print the installed version and exit.
- Changed: unrecognized CLI flags now print a clean error instead of a raw Node stack trace.
- Changed: switched to Freemius's product-scoped Bearer-token API (`FREEMIUS_API_TOKEN` + `FREEMIUS_PRODUCT_ID`).
- Changed: config now comes from `freemius-deployer.json`.
- Changed: default `zipPath` is now `dist/`.
- Changed: exit code is now `1` on every failure path, not just `0` on success and failure alike.
- Fixed: the version-exists check now actually blocks the upload when a conflicting version exists.

## 1.0.0 - 2022-08-23
- Initial release
