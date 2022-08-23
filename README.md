# freemius-deployer

> Deploy WordPress plugin to Freemius from the 'build' directory

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
