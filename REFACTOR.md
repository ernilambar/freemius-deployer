# Refactor Plan — v2

Current state: 139-line single-file CLI, callback-based, zero tests, top-level execution on import. Goal: robust, testable, future-proof major version. Numbered by priority — discuss and cut what you don't want.

Runtime: verified on Node v22. The plan assumes Node 18+ (native `fetch`/`FormData`/`crypto`); 20.6+ unlocks native `--env-file` (see #11a).

---

## P0 — Correctness bugs (fix no matter what)

### 1. Version-exists check doesn't actually block deploy
`developer.Api(...)` is a callback (async network call). Everything after it — file check, buffer read, HMAC signing, `post()` upload — runs **synchronously, immediately**, without waiting for the callback. The "Version already exists" `process.exit()` fires *after* the upload has likely already started or finished. The one safety check this tool has is currently a no-op most of the time.
**Fix:** make the whole flow `async`/`await`; check tags, `await` the result, then proceed.

### 2. `process.exit()` always exits 0
Every `process.exit()` call (index.js:50,55,77,85,124,130) is called with no argument, which exits with code **0** — including on errors. Any CI pipeline checking `$?` after this tool sees success on failure.
**Fix:** `process.exit(1)` on every error path (or better, see #4).

### 3. Dead code: `Object.filter` monkey-patch
index.js:60-63 defines `Object.filter` on the global `Object` — but the actual filtering two lines later uses `Object.fromEntries(...)`, not `Object.filter`. It's unused, and mutating a built-in global as a side effect of calling this function is the kind of thing that causes weird bugs in whatever else runs in the same process.
**Fix:** delete it.

### 3a. Dead runtime dependency: `@babel/core`
`@babel/core` is declared in `dependencies` (package.json:33) but imported nowhere, and no babel config exists anywhere in the repo. It's the single heaviest install in the tree, pulled in for nothing.
**Fix:** delete it from `dependencies`. This is trivial and should ship immediately, independent of the rest of the refactor.

---

## P1 — Architecture for testability

### 4. Split into pure functions + thin CLI entrypoint
Today: one function, `freemiusDeployer()`, that reads config, hits the network, and calls `process.exit()` inline. This is close to untestable — you can't unit test a function that kills the process. Restructure into:
- `loadConfig()` — reads `package.json` + env, returns a plain object (or throws).
- `checkVersionAvailable(client, version)` — pure-ish, takes a client, returns bool/throws.
- `deployZip(client, zipBuffer, options)` — returns result or throws.
- `main()` — the only place that calls `process.exit`, in `bin/cli.js`, wrapping the above.
This alone unlocks real unit tests without spawning subprocesses.

### 5. Replace `process.exit()` calls with thrown errors
Inner functions should `throw` typed errors (e.g. `class ConfigError extends Error`). Only the CLI entrypoint catches and maps errors to exit codes. Testable, and gives you distinct exit codes per failure class if you ever want them.

### 6. Move to `async`/`await` throughout
Both the version-check call and the upload call are callback-style. Convert to promises so control flow is linear and awaitable — this is also the actual fix for #1, not just a style preference.

### 6a. Guard response parsing
`JSON.parse(e)` (index.js:66) is unguarded — a malformed or HTML error response throws an uncaught exception, not a clean error. The async/try-catch refactor must explicitly cover response-parse failures, not just network errors.

### 7. Isolate config loading behind an injectable function
`fs.readJsonSync('./package.json')` runs at **module load time**, at the top of the file, before anything else — so importing this module for a test has side effects. Move it inside `loadConfig()`, parameterize the path, default to `process.cwd()`.

---

## P2 — Dependency modernization

Actual current deps (9): `@babel/core` (dead — see #3a), `chalk`, `compare-versions@4`, `crypto-js`, `dotenv`, `freemius-node-sdk` (git URL, unversioned), `fs-extra`, `just-merge`, `needle`. Most are abandoned, overkill, native-replaceable, or entirely unused. Trimming is also what makes mocking in tests feasible — mocking a git-dependency SDK's internal callback API is miserable; mocking `fetch` is one line.

### 8. Drop `freemius-node-sdk`
Installed via `git+https://github.com/Freemius/freemius-node-sdk.git` — no version pin, no lockfile guarantee across installs, and it's used for exactly one GET call. Replace with a direct HTTP call using the same HMAC auth scheme you already hand-roll for the upload. One consistent auth code path instead of two.

### 9. Drop `needle` → native `fetch` + `FormData`
Node 18+ has global `fetch`, `FormData`, and `Blob`. `needle` is low-maintenance and multipart uploads are natively supported now. Removes a dependency and makes tests mockable via `undici`'s `MockAgent` or by stubbing `globalThis.fetch`.
**Add a timeout.** The current `needle` call has none — a hung connection hangs a CI job indefinitely. Wire an `AbortController` timeout into the `fetch` call.

### 10. Drop `crypto-js` → `node:crypto` — WITHOUT changing the signature
**Trap:** the current code (index.js:101-102) is `base64UrlEncode(HmacSHA256(stringToSign, secretKey).toString())`. crypto-js `WordArray.toString()` defaults to **hex**, so it base64-encodes the *hex string* — it does **not** base64-encode the raw HMAC bytes. Naively porting this to `createHmac(...).digest('base64')` produces different bytes and **breaks auth (401s)**. The faithful port is:
```js
const hex = createHmac('sha256', secretKey).update(stringToSign).digest('hex')
const auth = 'FS ' + developerId + ':' + publicKey + ':' + base64UrlEncode(hex)
```
Keep the hex → base64 sequence. Add a test (P3) that pins the exact auth header for a fixed input so this can't regress.

### 10a. Fix `base64UrlEncode` — it isn't base64url
`base64UrlEncode` (index.js:24-28) strips `=` padding but never maps `+`→`-` and `/`→`_`. That's base64-with-padding-stripped, not base64url. If Freemius validates true base64url, requests intermittently fail whenever the digest base64 contains `+`/`/`. Verify against Freemius's auth spec before/while rewriting; fix the mapping if required.

### 11. Drop `just-merge` → object spread
`merge(defaults, userConfig)` is a shallow merge of a 3-key object. `{ ...defaults, ...userConfig }` does the same thing with no dependency.

### 11a. Drop `fs-extra` → `node:fs`
`fs-extra` is used for exactly one thing: `readJsonSync` (index.js:22). `existsSync` (:83) and `readFileSync` (:88) are already native. Replace `readJsonSync('./package.json')` with `JSON.parse(readFileSync(path, 'utf8'))` → drop the dep.

### 11b. Decide on `dotenv`
`dotenv` is used only via the `import 'dotenv/config'` import-time side effect (index.js:9). On Node 20.6+ (you're on 22) native `--env-file` replaces it. Dropping it trades a dep for requiring consumers to pass `--env-file` (or `NODE_OPTIONS`). Keep only if you want zero-config `.env` autoloading; otherwise drop. Either way this is a deliberate call, tied to the `engines` floor in #22 and the `--env-file` override in #20.

### 12. Upgrade `compare-versions` v4 → latest
v4 is years out of date; the package moved from a default export to a named export (`import { compareVersions } from 'compare-versions'`) in a later major. Small breaking change to absorb now rather than later.

### 12a. Confirm version-conflict semantics while you're here
The current filter (index.js:69-72) keeps tags where existing `version >= pkg.version`, so a deploy is blocked not only when the exact version already exists but also when *any newer* version exists. Decide whether that's intended (it blocks re-deploying/downgrading below the latest tag) and document it — the messaging currently only says "already exists," which understates the actual behavior.

**Net effect of P2:** runtime dependencies go from **9 to 1–2** — `chalk` (kept for color), and `compare-versions` (unless you inline a trivial semver compare). `dotenv` is the swing dep per #11b. Everything else becomes native Node.

---

## P3 — Test suite

There are currently zero tests. For a tool that uploads production plugin builds and can silently overwrite a version, this is the highest-leverage category after the P0 bugs.

### 13. Pick a runner
Node's built-in `node:test` + `node:assert` needs no dependency and is sufficient here — no need for Jest/Vitest for a package this size, unless you want watch-mode/coverage ergonomics, in which case `vitest` is the lighter modern option.

### 14. Mock the network boundary
With P2 done, there's exactly one boundary to mock: HTTP. Use `undici`'s `MockAgent` (works with global `fetch` on Node 18+) to simulate:
- version-check response with/without a conflicting tag
- successful upload response
- Freemius API error response (`body.error`)
- network failure / timeout

### 15. Cover the actual bug class from #1
Write a test that proves the version-check *blocks* the upload call when a conflict exists — i.e. assert the mocked upload endpoint was never hit. This is the regression test for the most serious bug in the current code.

### 15a. Pin the auth header (regression guard for #10)
Given a fixed `stringToSign`, developerId, publicKey, and secretKey, assert the exact `Authorization` header string. This is the test that catches the hex-vs-base64 signature trap from #10 if anyone "simplifies" it later.

### 16. Config loading tests
Fixture `package.json` variants: missing `freemiusDeployer` key, partial overrides, missing/invalid env vars (non-integer IDs, missing public/secret key) — assert `loadConfig()` throws the right typed error for each.

### 17. Add `test` + `test:coverage` npm scripts, wire into CI (see #24)

---

## P4 — CLI / DX improvements

### 18. `--dry-run` flag
Run the version check and validate the zip exists/config is sane, print what *would* be uploaded, skip the actual POST. Low effort, high value for an irreversible action (once uploaded, a version tag exists on Freemius).

### 19. Config validation with actionable errors
Right now a non-numeric `FS__API_DEV_ID` just fails `Number.isInteger` with a generic message — and `FS__API_PUBLIC_KEY`/`FS__API_SECRET_KEY` presence is never checked at all. Validate the whole config shape up front (types for `zipPath`/`zipName`/`addContributor`, presence of all 4 env vars) and report *all* problems at once, not just the first one hit. Use a radix on `parseInt` while you're in there.

### 20. `--config <path>` / `--env-file <path>` overrides
Right now config only comes from `./package.json` + `.env` in cwd via `dotenv/config`'s import-time side effect. Support pointing at a different project root or env file — useful for monorepos and for testing. Coordinate with the #11b `dotenv` decision.

### 21. `--verbose` / `--quiet` flags
Current logging is a handful of unconditional `console.log`/`console.error` calls. Not urgent, but worth deciding now if you want structured/quiet output for CI logs.

---

## P5 — Packaging & future-proofing

### 22. Add `engines` field
No minimum Node version is declared, but the plan above assumes Node 18+ (native `fetch`/`FormData`), and #11b assumes 20.6+ if you drop `dotenv`. Declare `"engines": { "node": ">=18" }` (or `>=20.6` per the `dotenv` call) so npm/CI warns instead of failing mysteriously.

### 23. Add `files` field to `package.json`
Nothing currently restricts what gets published. Add `"files": [...]` matching the actual post-#4 layout (e.g. `["bin/", "lib/"]` — note `main` and `bin` currently both point at `index.js`, which the #4 split changes) so `README.md`/lockfile/etc. don't unnecessarily bloat the published tarball.

### 23a. Remove dead lint config
`standard.globals: ["__basedir"]` (package.json:28-30) declares a global that's never referenced in the code. Drop it during cleanup.

### 24. Add CI workflow
No `.github/workflows` present. Add lint + test on push/PR — this is what actually enforces P3 going forward instead of tests rotting.

### 25. Populate `CHANGELOG.md`
`CHANGELOG.md` already exists but is a stub (`X.X.X - YYYY-MM-DD` placeholder + the 1.0.0 line). Fill in the entry for this refactor — especially important given it's a breaking major version. Document the config-shape and dependency changes from P2, and the new exit codes from #2/#5.

### 26. Consider JSDoc + generated `.d.ts` (or TypeScript)
Not essential for a CLI-only package, but if you want editor autocomplete for the `freemiusDeployer` config block in consumers' `package.json`, JSDoc types on `loadConfig()` are a cheap way to self-document without a build step.

---

## P6 — Documentation

### 27. Document exit codes and failure modes in README
Once #2/#5 give you distinct exit codes, document them — consumers scripting around this tool (CI deploy steps) need to know what a non-zero exit means.

### 28. Document Node version requirement in README
Ties to #22.
