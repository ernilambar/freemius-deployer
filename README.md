# freemius-deployer

Deploy a WordPress plugin zip to Freemius.

## Requirements

- Node.js >= 22

## Install

```sh
npm install --save-dev freemius-deployer
```

## Example

Configure via a `freemius-deployer.json` file in your project root. These are the defaults, used for any key you omit:

```json
{
  "zipPath": "dist/",
  "zipName": "project-slug.zip"
}
```

Then add a script in `package.json`:

```json
"scripts": {
  "deploy": "freemius-deployer"
}
```

Configure `.env` with following keys. (**Important:** add `.env` to `.gitignore` — it contains your API token.)

```bash
FREEMIUS_PRODUCT_ID=12345
FREEMIUS_API_TOKEN="YOUR_API_BEARER_TOKEN"
```

Get the API token from the Freemius Developer Dashboard: open your product's Settings page, then the API & Keys tab.

## CLI flags

- `-d, --dry-run` — validate without uploading
- `-c, --config <path>` — use a different project root
- `-e, --env-file <path>` — use a different env file
- `-q, --quiet` — suppress non-error output
- `-r, --release-mode <pending|beta|released>` — release status to set on the uploaded version (default: `pending`)
- `-h, --help` — show usage and exit
- `-v, --version` — show version number and exit

By default, an uploaded version stays `pending` — not visible to customers — until you release it. Pass `--release-mode released` to make it live immediately, or `--release-mode beta` to make it visible only to beta testers.

## License

[MIT](LICENSE) © 2026 [Nilambar Sharma](https://www.nilambar.net)
