import {
  type EntityManager,
  type EntityMetadata,
  type FindOptions,
  LockMode,
  type MikroORM,
  ReferenceKind,
  raw
} from "@mikro-orm/core"
import {
  createAdapterFactory,
  type DBAdapterDebugLogOption
} from "better-auth/adapters"
import {dset} from "dset"

import {createAdapterUtils} from "./utils/adapterUtils.ts"
import {createAdapterError} from "./utils/createAdapterError.ts"

export interface MikroOrmAdapterConfig {
  /**
   * Enable debug logs.
   *
   * @default false
   */
  debugLogs?: DBAdapterDebugLogOption

  /**
   * Indicates whether or not JSON is supported by target database.
   *
   * This option is enabled by default, because Mikro ORM supports JSON serialization/deserialization via [JsonType](https://mikro-orm.io/docs/custom-types#jsontype).
   * See documentation for more info: https://mikro-orm.io/docs/json-properties
   *
   * If disabled, Better Auth will handle these transformations for you.
   *
   * @default true
   */
  supportsJSON?: boolean
}

/**
 * Creates Mikro ORM adapter for Better Auth.
 *
 * Current limitations:
 *   * No m:m and 1:m and embedded references support
 *   * No complex primary key support
 *   * No schema generation
 *
 * @param orm - Instance of Mikro ORM returned from `MikroORM.init` or `MikroORM.initSync` methods
 * @param config - Additional configuration for Mikro ORM adapter
 */
export const mikroOrmAdapter = (
  orm: MikroORM,
  {debugLogs, supportsJSON = true}: MikroOrmAdapterConfig = {}
) =>
  createAdapterFactory({
    config: {
      adapterId: "mikro-orm-adapter",
      adapterName: "Mikro ORM Adapter",
      debugLogs,
      supportsJSON
    },

    adapter(config) {
      const {
        getEntityMetadata,
        getPropertyMetadata,
        getFieldPath,
        normalizeInput,
        normalizeOutput,
        normalizeWhereClauses,
        normalizeSelect
      } = createAdapterUtils(orm, config)

      /**
       * Returns the primary key property name of the entity.
       * Composite primary keys are not supported by this adapter.
       */
      function getPrimaryKeyName(metadata: EntityMetadata): string {
        const [primaryKey, ...rest] = metadata.primaryKeys

        if (!primaryKey || rest.length > 0) {
          createAdapterError(
            `Entity "${metadata.className}" must have exactly one primary key to be used with atomic operations.`
          )
        }

        return primaryKey
      }

      /**
       * Removes an entity from the identity map of the current context (request-scoped EntityManager, if any),
       * so the stale copy is not served to subsequent reads by primary key after a native delete.
       *
       * Must never throw: it runs after the delete has been committed, so a throw would lose the consumed row.
       * `getContext(false)` skips the `allowGlobalContext` check (MikroORM's default forbids the global context),
       * and `getUnitOfWork(false)` reads that resolved EntityManager's own unit of work without validating again.
       * Without a request context this touches the global identity map, which is harmless: evicting is always safe.
       */
      function evictFromIdentityMap(
        metadata: EntityMetadata,
        primaryKey: unknown
      ): void {
        const uow = orm.em.getContext(false).getUnitOfWork(false)
        const entity = uow.getById(metadata.class, primaryKey as any)

        if (entity) {
          uow.unsetIdentity(entity)
        }
      }

      return {
        async create({model, data, select}) {
          const metadata = getEntityMetadata(model)
          const input = normalizeInput(metadata, data)
          const entity = orm.em.create(metadata.class, input)

          await orm.em.flush()

          return normalizeOutput(
            metadata,
            entity,
            normalizeSelect(model, select)
          ) as any
        },

        async count({model, where}): Promise<number> {
          const metadata = getEntityMetadata(model)

          return orm.em.count(
            metadata.class,
            normalizeWhereClauses(metadata, where)
          )
        },

        async findOne({model, where, select}) {
          const metadata = getEntityMetadata(model)

          const entity = await orm.em.findOne(
            metadata.class,
            normalizeWhereClauses(metadata, where)
          )

          if (!entity) {
            return null
          }

          const result = normalizeOutput(
            metadata,
            entity,
            normalizeSelect(model, select)
          ) as any

          return result
        },

        async findMany({model, where, limit, offset, sortBy, select}) {
          const metadata = getEntityMetadata(model)

          const options: FindOptions<any> = {
            limit,
            offset
          }

          if (sortBy) {
            const path = getFieldPath(metadata, sortBy.field)
            dset(options, ["orderBy", ...path], sortBy.direction)
          }

          const rows = await orm.em.find(
            metadata.class,
            normalizeWhereClauses(metadata, where),
            options
          )

          const normalizedSelect = normalizeSelect(model, select)
          const result = rows.map(row =>
            normalizeOutput(metadata, row, normalizedSelect)
          ) as any

          return result
        },

        async update({model, where, update}) {
          const metadata = getEntityMetadata(model)

          const entity = await orm.em.findOne(
            metadata.class,
            normalizeWhereClauses(metadata, where)
          )

          if (!entity) {
            return null
          }

          orm.em.assign(entity, normalizeInput(metadata, update as any))

          await orm.em.flush()

          return normalizeOutput(metadata, entity) as any
        },

        async updateMany({model, where, update}) {
          const metadata = getEntityMetadata(model)

          return orm.em.nativeUpdate(
            metadata.class,
            normalizeWhereClauses(metadata, where),
            normalizeInput(metadata, update as any)
          )
        },

        async delete({model, where}) {
          const metadata = getEntityMetadata(model)

          const entity = await orm.em.findOne(
            metadata.class,

            normalizeWhereClauses(metadata, where),

            {
              fields: ["id"]
            }
          )

          if (entity) {
            await orm.em.remove(entity).flush()
          }
        },

        /**
         * Atomically deletes a single row matching the `where` clause and returns it.
         *
         * Runs in its own transaction on a fresh fork of the current EntityManager:
         *   1. `SELECT ... LIMIT 1 FOR UPDATE` picks one matching row and locks it
         *      (dialects without row locks, such as SQLite, serialize write transactions instead).
         *   2. `DELETE ... WHERE <where> AND <pk> = ?` re-checks the guard in the same statement,
         *      so exactly one concurrent caller sees an affected row count of 1 and wins the row.
         *
         * At most one row is deleted, even if the predicate is not unique.
         */
        async consumeOne({model, where}) {
          const metadata = getEntityMetadata(model)
          const primaryKeyName = getPrimaryKeyName(metadata)
          const filter = normalizeWhereClauses(metadata, where)

          const consumed = await orm.em.transactional(
            async (em: EntityManager) => {
              const entity = await em.findOne(metadata.class, filter, {
                lockMode: LockMode.PESSIMISTIC_WRITE
              })

              if (!entity) {
                return null
              }

              const primaryKey = (entity as Record<string, unknown>)[
                primaryKeyName
              ]
              const output = normalizeOutput(metadata, entity)

              // Detach from the fork so the transaction does not merge the deleted row back into the parent context
              em.getUnitOfWork(false).unsetIdentity(entity)

              const affected = await em.nativeDelete(metadata.class, {
                $and: [filter, {[primaryKeyName]: primaryKey}]
              })

              return affected === 1 ? {output, primaryKey} : null
            },
            {clear: true}
          )

          if (!consumed) {
            return null
          }

          evictFromIdentityMap(metadata, consumed.primaryKey)

          return consumed.output as any
        },

        /**
         * Atomically applies `increment` deltas and `set` assignments to a single row matching the `where` clause.
         * The `where` clause is both the selector and the guard.
         *
         * Runs in its own transaction on a fresh fork of the current EntityManager:
         *   1. `SELECT ... LIMIT 1 FOR UPDATE` picks one matching row and locks it
         *      (dialects without row locks, such as SQLite, serialize write transactions instead).
         *   2. `UPDATE ... SET field = coalesce(field, 0) + ?, <set> WHERE <where> AND <pk> = ?`
         *      computes the increments in SQL and re-checks the guard in the same statement,
         *      so concurrent increments never lose updates and a guard miss changes nothing.
         *   3. The updated row is re-read inside the same transaction (the row lock is still held),
         *      and merged back into the caller's identity map when the transaction commits.
         *
         * Both `increment` and `set` are applied by the same `UPDATE` statement.
         */
        async incrementOne({model, where, increment, set}) {
          const metadata = getEntityMetadata(model)
          const primaryKeyName = getPrimaryKeyName(metadata)
          const filter = normalizeWhereClauses(metadata, where)
          const setProperties = new Set(
            Object.keys(set ?? {}).map(
              field => getPropertyMetadata(metadata, field).name
            )
          )
          const increments: Record<string, unknown> = {}

          for (const [field, delta] of Object.entries(increment)) {
            if (typeof delta !== "number" || !Number.isFinite(delta)) {
              createAdapterError(
                `The increment for "${field}" field must be a finite number.`
              )
            }

            const property = getPropertyMetadata(metadata, field)
            const [column] = property.fieldNames

            if (property.kind !== ReferenceKind.SCALAR || !column) {
              createAdapterError(
                `Cannot increment "${field}" field on "${metadata.className}" entity, because it is not a scalar column.`
              )
            }

            if (setProperties.has(property.name)) {
              createAdapterError(
                `The "${field}" field cannot be both incremented and set in the same operation.`
              )
            }

            increments[property.name] = raw("coalesce(??, 0) + ?", [
              column,
              delta
            ])
          }

          if (
            setProperties.size === 0 &&
            Object.keys(increments).length === 0
          ) {
            createAdapterError(
              "incrementOne requires at least one field to increment or set."
            )
          }

          return orm.em.transactional(
            async (em: EntityManager) => {
              const entity = await em.findOne(metadata.class, filter, {
                lockMode: LockMode.PESSIMISTIC_WRITE
              })

              if (!entity) {
                return null
              }

              const primaryKey = (entity as Record<string, unknown>)[
                primaryKeyName
              ]

              // References in `set` are created on the transaction's fork: `orm.em` would reject the global context
              // when there is no request context and `allowGlobalContext` is disabled (MikroORM's default).
              const data = {
                ...(set ? normalizeInput(metadata, set, em) : {}),
                ...increments
              }

              const affected = await em.nativeUpdate(
                metadata.class,
                {$and: [filter, {[primaryKeyName]: primaryKey}]},
                data
              )

              if (affected !== 1) {
                return null
              }

              await em.refresh(entity)

              return normalizeOutput(metadata, entity) as any
            },
            {clear: true}
          )
        },

        async deleteMany({model, where}) {
          const metadata = getEntityMetadata(model)

          return orm.em.nativeDelete(
            metadata.class,
            normalizeWhereClauses(metadata, where)
          )
        }
      }
    }
  })
