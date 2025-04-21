import type {FindOptions, MikroORM} from "@mikro-orm/core"
import {type AdapterDebugLogs, createAdapter} from "better-auth/adapters"
import {dset} from "dset"

import {createAdapterUtils} from "./utils/adapterUtils.js"

export interface MikroOrmAdapterConfig {
  /**
   * Enable debug logs.
   *
   * @default false
   */
  debugLogs?: AdapterDebugLogs

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
  createAdapter({
    config: {
      debugLogs,
      supportsJSON,
      adapterId: "mikro-orm-adapter",
      adapterName: "Mikro ORM Adapter"
    },

    adapter({options}) {
      const {
        getEntityMetadata,
        getFieldPath,
        normalizeInput,
        normalizeOutput,
        normalizeWhereClauses
      } = createAdapterUtils(orm)

      return {
        async create({model, data, select}) {
          const metadata = getEntityMetadata(model)
          const input = normalizeInput(metadata, data)

          // Better Auth ignores `advanced.generateId` option when it's disabled, so this needs to be taken care of (for backwards compatibility)
          if (
            options.advanced?.generateId === false &&
            !options.advanced?.database
          ) {
            Reflect.deleteProperty(input, "id")
          }

          const entity = orm.em.create(metadata.class, input)

          await orm.em.persistAndFlush(entity)

          return normalizeOutput(metadata, entity, select) as any
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

          return normalizeOutput(metadata, entity, select) as any
        },

        async findMany({model, where, limit, offset, sortBy}) {
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

          return rows.map(row => normalizeOutput(metadata, row)) as any
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

          const affected = await orm.em.nativeUpdate(
            metadata.class,
            normalizeWhereClauses(metadata, where),
            normalizeInput(metadata, update)
          )

          orm.em.clear()

          return affected
        },

        async delete({model, where}) {
          const metadata = getEntityMetadata(model)

          const entity = await orm.em.findOne(
            metadata.class,
            normalizeWhereClauses(metadata, where)
          )

          if (entity) {
            await orm.em.removeAndFlush(entity)
          }
        },

        async deleteMany({model, where}) {
          const metadata = getEntityMetadata(model)

          const affected = await orm.em.nativeDelete(
            metadata.class,
            normalizeWhereClauses(metadata, where)
          )

          orm.em.clear() // This clears the IdentityMap

          return affected
        }
      }
    }
  })
