import type {
  EntityMetadata,
  EntityProperty as EntityPropertyMetadata,
  MikroORM
} from "@mikro-orm/core"
import {ReferenceKind, serialize} from "@mikro-orm/core"
import type {Where} from "better-auth"
import type {AdapterFactoryCustomizeAdapterCreator} from "better-auth/adapters"
import {dset} from "dset"

import {createAdapterError} from "./createAdapterError.js"

type BetterAuthAdapterFactoryConfig =
  Parameters<AdapterFactoryCustomizeAdapterCreator>[0]

function throwUnhandledWhereOperator(op: never): never {
  throw new RangeError(
    `[Better Auth MikroORM adapter error] Unhandled WHERE operator detected: ${op}`
  )
}

export interface AdapterUtils {
  /**
   * Returns metadata for given `entityName` from MetadataStorage.
   *
   * @param name - The name of the entity to get the metadata for
   *
   * @throws BetterAuthError when no metadata found
   */
  getEntityMetadata(name: string): EntityMetadata

  /**
   * Resolves a Better Auth field name into a MikroORM property path
   *
   * @param metadata - Entity metadata that owns the field
   * @param fieldName - Better Auth field name to resolve
   * @param throwOnShadowProps - When `true`, throws if the field is not persisted
   * and therefore cannot be used in database queries
   *
   * @throws BetterAuthError If the field does not exist on the entity
   * @throws BetterAuthError If the field is not persisted and `throwOnShadowProps` is `true`
   * @throws BetterAuthError If the field references a relation with a composite primary key
   * @throws BetterAuthError If the field kind cannot be represented as a MikroORM path
   */
  getFieldPath(
    metadata: EntityMetadata,
    fieldName: string,
    throwOnShadowProps?: boolean
  ): string[]

  /**
   * Normalized Better Auth data for Mikro ORM.
   *
   * @param metadata - The name of the entity
   * @param input - The data to normalize
   */
  normalizeInput(
    metadata: EntityMetadata,
    input: Record<string, any>
  ): Record<string, any>

  /**
   * Normalizes the Mikro ORM output for Better Auth.
   *
   * @param metadata - The name of the entity
   * @param output - The result of a Mikro ORM query
   * @param select - A list of fields to return
   */
  normalizeOutput(
    metadata: EntityMetadata,
    output: Record<string, any>,
    select?: string[]
  ): Record<string, any>

  /**
   * Transforms given list of Where clause(s) for Mikro ORM.
   *
   * @param metadata - Entity name
   * @param where - A list where clause(s) to normalize
   */
  normalizeWhereClauses(
    metadata: EntityMetadata,
    where?: Where[]
  ): Record<string, any>

  normalizeSelect(modelName: string, input?: string[]): string[] | undefined
}

const selfNamedReferenceKinds = [
  ReferenceKind.SCALAR,
  ReferenceKind.ONE_TO_MANY,
  ReferenceKind.EMBEDDED
]

/**
 * Creates bunch of utilities for adapter
 *
 * @param orm - Mikro ORM instance
 * @param config - Better Auth adapter factory config
 */
export function createAdapterUtils(
  orm: MikroORM,
  config: BetterAuthAdapterFactoryConfig
): AdapterUtils {
  const namingStrategy = orm.config.getNamingStrategy()

  const getEntityMetadata: AdapterUtils["getEntityMetadata"] = (
    entityName: string
  ) => {
    const ormMetadata = orm.getMetadata()
    const normalizedEntityName = namingStrategy.getEntityName(
      namingStrategy.classToTableName(entityName)
    )

    if (!ormMetadata.has(normalizedEntityName)) {
      createAdapterError(
        `Cannot find metadata for "${normalizedEntityName}" entity. Make sure it defined and listed in your Mikro ORM config.`
      )
    }

    return ormMetadata.get(normalizedEntityName)
  }

  /**
   * Returns metadata for a property by given `fieldName`.
   *
   * @param metadata - Entity metadata
   * @param fieldName - The name of the field to get metadata for
   */
  function getEntityPropertyMetadata(
    metadata: EntityMetadata,
    fieldName: string
  ): EntityPropertyMetadata {
    const propertyMetadata = metadata.props.find(propertyMetadata => {
      if (
        selfNamedReferenceKinds.includes(propertyMetadata.kind) &&
        propertyMetadata.name === fieldName
      ) {
        return true
      }

      return (
        propertyMetadata.kind === ReferenceKind.MANY_TO_ONE &&
        (propertyMetadata.name === fieldName ||
          propertyMetadata.fieldNames.includes(
            namingStrategy.propertyToColumnName(fieldName)
          ))
      )
    })

    if (!propertyMetadata) {
      createAdapterError(
        `Can't find property "${fieldName}" on entity "${metadata.className}".`
      )
    }

    return propertyMetadata
  }

  /**
   * Returns entity property name for given entity metadata
   *
   * @param metadata - Entity metadata
   * @param propertyMetadata - Property metadata
   */
  const getEntityPropertyName = (
    metadata: EntityMetadata,
    propertyMetadata: EntityPropertyMetadata
  ) => {
    if (selfNamedReferenceKinds.includes(propertyMetadata.kind)) {
      return propertyMetadata.name
    }

    if (propertyMetadata.kind === ReferenceKind.MANY_TO_ONE) {
      return namingStrategy.columnNameToProperty(
        namingStrategy.joinColumnName(propertyMetadata.name)
      )
    }

    createAdapterError(
      `Reference kind ${propertyMetadata.kind} is not supported. Defined in "${metadata.className}" entity for "${propertyMetadata.name}" field.`
    )
  }

  const getFieldPath: AdapterUtils["getFieldPath"] = (
    metadata,
    fieldName,
    throwOnShadowProps = false
  ) => {
    const propertyMetadata = getEntityPropertyMetadata(metadata, fieldName)

    if (propertyMetadata.persist === false && throwOnShadowProps) {
      createAdapterError(
        `Cannot serialize "${fieldName}" into path, because it cannot be persisted in "${metadata.tableName}" table.`
      )
    }

    if (
      propertyMetadata.kind === ReferenceKind.SCALAR ||
      propertyMetadata.kind === ReferenceKind.EMBEDDED
    ) {
      return [propertyMetadata.name]
    }

    if (propertyMetadata.kind === ReferenceKind.MANY_TO_ONE) {
      if (propertyMetadata.referencedPKs.length > 1) {
        createAdapterError(
          `The "${fieldName}" field references to a table "${propertyMetadata.name}" with complex primary key, which is not supported`
        )
      }

      return [propertyMetadata.name, namingStrategy.referenceColumnName()]
    }

    createAdapterError(
      `Cannot normalize "${fieldName}" field name into path for "${metadata.className}" entity.`
    )
  }

  const normalizeInput: AdapterUtils["normalizeInput"] = (metadata, input) => {
    const fields: Record<string, any> = {}

    Object.entries(input).forEach(([key, value]) => {
      const propertyMetadata = getEntityPropertyMetadata(metadata, key)
      const targetEntityMetadata = propertyMetadata.targetMeta
      const isReference =
        targetEntityMetadata &&
        propertyMetadata.kind !== ReferenceKind.SCALAR &&
        propertyMetadata.kind !== ReferenceKind.EMBEDDED

      dset(
        fields,
        [propertyMetadata.name],
        isReference
          ? orm.em.getReference(targetEntityMetadata.class, value)
          : value
      )
    })

    return fields
  }

  const normalizeOutput: AdapterUtils["normalizeOutput"] = (
    metadata,
    output,
    select
  ): Record<string, any> => {
    let result: Record<string, any> = {}

    for (const [key, value] of Object.entries(serialize(output))) {
      const property = getEntityPropertyMetadata(metadata, key)
      const path = getEntityPropertyName(metadata, property)

      dset(result, path, value)
    }

    // Filter out unnecessary fields
    // TODO: Implement proper select on mikro-orm querying level
    if (select) {
      result = Object.fromEntries(
        Object.entries(result).filter(([name]) => select.includes(name))
      )
    }

    return result
  }

  function normalizeWhereClause(
    path: Array<string | number>,
    where: Where,
    target: Record<string, any> = {}
  ): Record<string, any> {
    let normalizedValue = where.value
    let normalizedPath = path

    switch (where.operator) {
      case "in":
        if (!Array.isArray(where.value)) {
          createAdapterError(
            `The value for the field "${where.field}" must be an array when using the $in operator.`
          )
        }

        normalizedPath = path.concat("$in")
        break
      case "not_in":
        if (!Array.isArray(where.value)) {
          createAdapterError(
            `The value for the field "${where.field}" must be an array when using the $nin operator.`
          )
        }

        normalizedPath = path.concat("$nin")
        break
      case "contains":
        normalizedPath = path.concat("$like")
        normalizedValue = `%${where.value}%`
        break
      case "starts_with":
        normalizedPath = path.concat("$like")
        normalizedValue = `${where.value}%`
        break
      case "ends_with":
        normalizedPath = path.concat("$like")
        normalizedValue = `%${where.value}`
        break
      // The next 5 case statements are _expected_ to fall through so we can simplify and reuse the same logic for these operators
      case "gt":
      case "gte":
      case "lt":
      case "lte":
      case "ne":
        normalizedPath = path.concat(`$${where.operator}`)
        break
      case "eq":
      case undefined:
        break
      default:
        return throwUnhandledWhereOperator(where.operator)
    }

    dset(target, normalizedPath, normalizedValue)

    return target
  }

  const normalizeWhereClauses: AdapterUtils["normalizeWhereClauses"] = (
    metadata,
    where
  ) => {
    if (!where) {
      return {}
    }

    if (where.length === 1) {
      const [clause] = where

      if (!clause) {
        return {}
      }

      const path = getFieldPath(metadata, clause.field, true)

      return normalizeWhereClause(path, clause)
    }

    const result: Record<string, any> = {}

    where
      .filter(({connector}) => !connector || connector === "AND")
      .forEach((clause, index) => {
        const path = ["$and", index].concat(
          getFieldPath(metadata, clause.field, true)
        )

        normalizeWhereClause(path, clause, result)
      })

    where
      .filter(({connector}) => connector === "OR")
      .forEach((clause, index) => {
        const path = ["$or", index].concat(
          getFieldPath(metadata, clause.field, true)
        )

        normalizeWhereClause(path, clause, result)
      })

    return result
  }

  const normalizeSelect: AdapterUtils["normalizeSelect"] = (model, select) =>
    select?.map(field => config.getFieldName({model, field}))

  return {
    getEntityMetadata,
    getFieldPath,
    normalizeInput,
    normalizeOutput,
    normalizeWhereClauses,
    normalizeSelect
  }
}
