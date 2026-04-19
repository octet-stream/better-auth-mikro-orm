import type {FindOptions, MikroORM} from "@mikro-orm/core"
import {
  createAdapterFactory,
  type DBAdapterDebugLogOption
} from "better-auth/adapters"
import {dset} from "dset"

import {createAdapterUtils} from "./utils/adapterUtils.js"

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
        getFieldPath,
        normalizeInput,
        normalizeOutput,
        normalizeWhereClauses,
        normalizeSelect
      } = createAdapterUtils(orm, config)

      return {
        async create({model, data, select}) {
          const metadata = getEntityMetadata(model)
          const input = normalizeInput(metadata, data)
          const entity = orm.em.create(metadata.class, input)

          await orm.em.persistAndFlush(entity)

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
            await orm.em.removeAndFlush(entity)
          }
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
