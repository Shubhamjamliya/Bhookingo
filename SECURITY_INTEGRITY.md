# Bhokingo Security Workflow

Git does not execute code during `fetch`, `pull`, or `push`. A pull can still place
untrusted source code in the working tree, so do not use `git pull` directly for
this repository.

Use the safe sync command from either package directory:

```powershell
npm run git:sync:safe
```

It fetches first, refuses a dirty working tree, and blocks an incoming merge when
it changes protected files such as `vite.config.js`, `package.json`, lockfiles,
runtime configuration, or project scripts. Review the diff before explicitly
approving the protected changes:

```powershell
git diff HEAD..@{upstream} -- Frontend/vite.config.js Frontend/package.json Backend/package.json
powershell -NoProfile -ExecutionPolicy RemoteSigned -File scripts/safe-sync.ps1 -ApproveProtectedChanges
```

Use `npm run deps:install:safe` for dependency installation. It runs `npm ci
--ignore-scripts`, so dependency lifecycle scripts cannot run automatically.

The normal `npm run dev` command checks that there are no active Git hooks,
lifecycle scripts, unsafe references to the legacy source-rewrite tools, or local
changes to startup-critical files before it starts Vite or nodemon. Application
source files remain editable during normal development. `dev:unsafe` exists only
for controlled troubleshooting and must not be used for untrusted branches.

Run a local Windows Defender scan with:

```powershell
npm run security:scan
```

No repository code can prevent a user, administrator, or malware with Windows
permissions from opening a terminal. Keep Git host branch protection enabled:
require pull-request review, restrict push access, enable 2FA, and require CI to
review changes to protected files.
