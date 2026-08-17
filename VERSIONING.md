# Website Versioning

The website uses semantic release versions plus an automatic build revision:

`vMAJOR.MINOR.PATCH + build revision`

Example: `v1.2.3 · build cfe9659a`

The build revision is derived automatically from the Git commit used by Vercel, GitHub Actions, or the local checkout. Rebuilding new source therefore produces a new visible build identifier without changing the release number for an identical code revision.

## Release rules

- Patch (`1.0.0` to `1.0.1`): bug fixes, security hardening, copy changes, and small visual corrections.
- Minor (`1.0.0` to `1.1.0`): backward-compatible features, new pages, or substantial workflow additions.
- Major (`1.0.0` to `2.0.0`): breaking authentication, data-contract, administrator-workflow, or platform redesign changes.

Use the matching command before committing a release:

```sh
npm run version:patch
npm run version:minor
npm run version:major
```

These commands update both `package.json` and `package-lock.json`. The next build reads that release version automatically; no footer code change is required.
