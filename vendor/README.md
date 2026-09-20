# Offline development toolchain

The tarballs here contain the exact npm packages referenced by package-lock.json. They are development tools/types only; no runtime JavaScript dependency or font is installed by the application. `npm ci --offline --ignore-scripts` has been tested with an initially empty npm cache.

| Package | Version | Purpose | License notice inside archive |
|---|---|---|---|
| typescript | 5.8.3 | Compiler / syntax checks | package/LICENSE.txt, Apache-2.0 |
| @types/node | 25.1.0 | Node type definitions; code is tested on Node 22.16 | node/LICENSE, MIT |
| undici-types | 7.16.0 | Type-only dependency of Node definitions | package/LICENSE, MIT |

No claim is made that a newer Node API is available at runtime just because it exists in the types. Runtime compatibility is verified against the Node version recorded in docs/VALIDATION.md. The original package notices are preserved inside each archive; checksums are in SHA256SUMS.json and npm lock integrity fields. Do not replace the tarballs without regenerating and verifying the lock and tests.
