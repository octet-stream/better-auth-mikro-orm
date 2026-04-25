# better-auth-mikro-orm

## 1.0.0-next.0

### Major Changes

- [#39](https://github.com/octet-stream/better-auth-mikro-orm/pull/39) [`3aea193`](https://github.com/octet-stream/better-auth-mikro-orm/commit/3aea1939723fc6207471f9d980f3f725070e2f5a) Thanks [@stoneLeaf](https://github.com/stoneLeaf)! - Update MikroORM to v7.x

## 0.5.0

### Minor Changes

- [#43](https://github.com/octet-stream/better-auth-mikro-orm/pull/43) [`01b77d6`](https://github.com/octet-stream/better-auth-mikro-orm/commit/01b77d67a21162bb4151a444482bfdd09f792dd6) Thanks [@octet-stream](https://github.com/octet-stream)! - Fix support for select and multiple where clauses.

- [#43](https://github.com/octet-stream/better-auth-mikro-orm/pull/43) [`23c760f`](https://github.com/octet-stream/better-auth-mikro-orm/commit/23c760fd83f865d62ea36c0d08187258179f9905) Thanks [@octet-stream](https://github.com/octet-stream)! - Support Better Auth v1.6

## 0.4.3

### Patch Changes

- [#24](https://github.com/octet-stream/better-auth-mikro-orm/pull/24) [`2fd766a`](https://github.com/octet-stream/better-auth-mikro-orm/commit/2fd766a48b297bd493f84e4f7d59e555afd9f893) Thanks [@octet-stream](https://github.com/octet-stream)! - Remove fields filtering from output normalization

## 0.4.2

### Patch Changes

- [#23](https://github.com/octet-stream/better-auth-mikro-orm/pull/23) [`1407666`](https://github.com/octet-stream/better-auth-mikro-orm/commit/1407666c313b687c7877dea0a4e0168f5e5b48df) Thanks [@octet-stream](https://github.com/octet-stream)! - Use `nativeDelete` and `nativeUpdate` ORM methods for `updateMany`/`deleteMany`. However, this change mean that Identity Map won't be updated after `deleteMany` and `updateMany` methods.

- [#20](https://github.com/octet-stream/better-auth-mikro-orm/pull/20) [`31f3fb1`](https://github.com/octet-stream/better-auth-mikro-orm/commit/31f3fb1c376c59f2ad83cc327e52fd35afb75af2) Thanks [@octet-stream](https://github.com/octet-stream)! - Remove `orm.em.clear` usage from `adapter.updateMany`

- [#22](https://github.com/octet-stream/better-auth-mikro-orm/pull/22) [`fe209dc`](https://github.com/octet-stream/better-auth-mikro-orm/commit/fe209dc013d2ec789215bda77ef48e7e887687d1) Thanks [@octet-stream](https://github.com/octet-stream)! - Use `getReference` to ensure references loaded correctly

## 0.4.1

### Patch Changes

- [#16](https://github.com/octet-stream/better-auth-mikro-orm/pull/16) [`f385105`](https://github.com/octet-stream/better-auth-mikro-orm/commit/f385105778ab10f511aa5315bf6b8890dfbb573a) Thanks [@octet-stream](https://github.com/octet-stream)! - Replace `nativeDelete` with `remove` method to delete rows to properly update IdentityMap in `adapter.deleteMany` method.

## 0.4.0

### Minor Changes

- [#9](https://github.com/octet-stream/better-auth-mikro-orm/pull/9) [`2fbe35a`](https://github.com/octet-stream/better-auth-mikro-orm/commit/2fbe35a86d2881debdd3f94d78474438c3023150) Thanks [@octet-stream](https://github.com/octet-stream)! - Support fields and models naming customization

- [#9](https://github.com/octet-stream/better-auth-mikro-orm/pull/9) [`2fbe35a`](https://github.com/octet-stream/better-auth-mikro-orm/commit/2fbe35a86d2881debdd3f94d78474438c3023150) Thanks [@octet-stream](https://github.com/octet-stream)! - Support better-auth createAdapter utility

### Patch Changes

- [#12](https://github.com/octet-stream/better-auth-mikro-orm/pull/12) [`bb39133`](https://github.com/octet-stream/better-auth-mikro-orm/commit/bb39133dd25e16fe9608effe72ff8015c2a15a36) Thanks [@cjroebuck](https://github.com/cjroebuck)! - fix(adapter): Support embedded references

## 0.3.0

### Minor Changes

- [#7](https://github.com/octet-stream/better-auth-mikro-orm/pull/7) [`4e59526`](https://github.com/octet-stream/better-auth-mikro-orm/commit/4e59526770fbcdd4c0fb57c9fcbee1838bdd2cd6) Thanks [@octet-stream](https://github.com/octet-stream)! - Implement count method for adapter

## 0.2.0

### Minor Changes

- [#3](https://github.com/octet-stream/better-auth-mikro-orm/pull/3) [`dc5b852`](https://github.com/octet-stream/better-auth-mikro-orm/commit/dc5b8524cee45b82eddbef8b40c3bc9d1a7f5df9) Thanks [@octet-stream](https://github.com/octet-stream)! - Support 1:m references

## 0.1.1

### Patch Changes

- [#1](https://github.com/octet-stream/better-auth-mikro-orm/pull/1) [`e30179b`](https://github.com/octet-stream/better-auth-mikro-orm/commit/e30179bf4690393f48bf266e94b0d7f3e36bf037) Thanks [@octet-stream](https://github.com/octet-stream)! - Fix peer dependencies requirements
