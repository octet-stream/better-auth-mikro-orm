---
"better-auth-mikro-orm": patch
---

Drop CJS build output and rely on require(esm) instead via [module-sync](https://nodejs.org/api/packages.html#conditional-exports) entry point.
~~This change was introduced in previous release, but I forgot to add changeset.~~
