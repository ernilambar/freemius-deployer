# freemius-deployer

Deploy a WordPress plugin zip to Freemius.

## Install

```sh
npm install --save-dev freemius-deployer
```

## Example

In `package.json` scripts:

```json
...
"freemiusDeployer": {
  "zipPath": "deploy/",
  "zipName": "my-project.zip",
  "addContributor": false
},
...
"scripts": {
  ...
  "deploy": "freemius-deployer"
}
```

Configure `.env` with following keys. (**Important**: Please make sure `.env` is gitignored as this contains sensitive information.)

```bash
FS__API_DEV_ID=12345
FS__API_PLUGIN_ID=12345
FS__API_PUBLIC_KEY="pk_YOUR_PUBLIC_KEY"
FS__API_SECRET_KEY="sk_YOUR_SECRET_KEY"
```

## CLI flags

- `--dry-run` — validate without uploading
- `--config <path>` — use a different project root
- `--env-file <path>` — use a different env file
- `--quiet` — suppress non-error output

## License

[MIT](LICENSE) © 2026 [Nilambar Sharma](https://www.nilambar.net)
