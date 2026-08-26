import type {EntityMetadata, EntityProperty, MikroORM} from "@mikro-orm/core"
import {ReferenceKind, serialize} from "@mikro-orm/core"
import type {Where} from "better-auth"
import type {AdapterFactoryCustomizeAdapterCreator} from "better-auth/adapters"
import {dset} from "dset"

import {createAdapterError} from "./createAdapterError.js"

type AdapterFactoryCustomizeAdapterCreatorConfig =
  Parameters<AdapterFactoryCustomizeAdapterCreator>[0]

function checkForExhaustiveWhereOperator(op: never): never {
  throw new RangeError(
    `[Better Auth MikroORM adapter error] Unhandled WHERE operator detected: ${op}`
  )
}

export interface AdapterUtils {
  /**
   * Normalizes given model `name` for Mikro ORM using [naming strategy](https://mikro-orm.io/docs/naming-strategy) defined by the config.
   *
   * @param name - The name of the entity
   */
  normalizeEntityName(name: string): string

  /**
   * Returns metadata for given `entityName` from MetadataStorage.
   *
   * @param entityName - The name of the entity to get the metadata for
   *
   * @throws BetterAuthError when no metadata found
   */
  getEntityMetadata(name: string): EntityMetadata

  /**
   * Returns a path to a `field` reference.
   *
   * @param entityName - The name of the entity
   * @param fieldName - The field's name
   * @param throwOnShadowProps - Whether or throw error for Shadow Props. Use it for where clause so Mikro ORM will not throw when accessing such props from database.
   *
   * @throws BetterAuthError when no such field exist on the `entity`
   * @throws BetterAuthError if complex primary key is discovered in `fieldName` relation
   */
  getFieldPath(
    metadata: EntityMetadata,
    fieldName: string,
    throwOnShadowProps?: boolean
  ): string[]

  /**
   * Normalized Better Auth data for Mikro ORM.
   *
   * @param entityName - The name of the entity
   * @param input - The data to normalize
   */
  normalizeInput(
    metadata: EntityMetadata,
    input: Record<string, any>
  ): Record<string, any>

  /**
   * Normalizes the Mikro ORM output for Better Auth.
   *
   * @param entityName - The name of the entity
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
   * @param entityName - Entity name
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
 */
export function createAdapterUtils(
  orm: MikroORM,
  config: AdapterFactoryCustomizeAdapterCreatorConfig
): AdapterUtils {
  const namingStrategy = orm.config.getNamingStrategy()

  const normalizeEntityName: AdapterUtils["normalizeEntityName"] = name =>
    namingStrategy.getEntityName(namingStrategy.classToTableName(name))

  const getEntityMetadata: AdapterUtils["getEntityMetadata"] = (
    entityName: string
  ) => {
    const ormMetadata = orm.getMetadata()
    const normalizedEntityName = normalizeEntityName(entityName)

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
  ): EntityProperty {
    const propertyMetadata = metadata.props.find(propertyMetadata => {
      if (
        selfNamedReferenceKinds.includes(propertyMetadata.kind) &&
        propertyMetadata.name === fieldName
      ) {
        return true
      }

      if (
        propertyMetadata.kind === ReferenceKind.MANY_TO_ONE &&
        (propertyMetadata.name === fieldName ||
          propertyMetadata.fieldNames.includes(
            namingStrategy.propertyToColumnName(fieldName)
          ))
      ) {
        return true
      }

      return false
    })

    if (!propertyMetadata) {
      createAdapterError(
        `Can't find property "${fieldName}" on entity "${metadata.className}".`
      )
    }

    return propertyMetadata
  }

  /**
   * Returns referenced _column_ name for given `prop` using [naming strategy](https://mikro-orm.io/docs/naming-strategy) defined by the config.
   *
   * @param entityName - The name of the entity
   * @param prop - Property metadata
   */
  function getReferencedColumnName(
    entityName: string,
    propertyMetadata: EntityProperty
  ) {
    if (selfNamedReferenceKinds.includes(propertyMetadata.kind)) {
      return propertyMetadata.name
    }

    if (propertyMetadata.kind === ReferenceKind.MANY_TO_ONE) {
      return namingStrategy.columnNameToProperty(
        namingStrategy.joinColumnName(propertyMetadata.name)
      )
    }

    createAdapterError(
      `Reference kind ${propertyMetadata.kind} is not supported. Defined in "${entityName}" entity for "${propertyMetadata.name}" field.`
    )
  }

  /**
   * Returns referenced _property_ name in camelCase.
   *
   * @param entityName - The name of the entity
   * @param prop - Property metadata
   */
  const getReferencedPropertyName = (
    metadata: EntityMetadata,
    propertyMetadata: EntityProperty
  ) => getReferencedColumnName(metadata.className, propertyMetadata)

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

  /**
   * Normalizes property's raw input value: if property is a reference,
   * then it wraps value using [`orm.em.getReference`](https://mikro-orm.io/docs/entity-manager#entity-references) method,
   * to unsure it's correctly persisted.
   *
   * Otherwise the value is returned as is.
   *
   * @param property - Metadata of the property
   * @param value - Raw input value
   */
  const normalizePropertyValue = (
    propertyMetadata: EntityProperty,
    value: unknown
  ): unknown => {
    if (
      !propertyMetadata.targetMeta ||
      propertyMetadata.kind === ReferenceKind.SCALAR ||
      propertyMetadata.kind === ReferenceKind.EMBEDDED
    ) {
      return value
    }

    return orm.em.getReference(propertyMetadata.targetMeta.class, value)
  }

  const normalizeInput: AdapterUtils["normalizeInput"] = (metadata, input) => {
    const fields: Record<string, any> = {}
    Object.entries(input).forEach(([key, value]) => {
      const propertyMetadata = getEntityPropertyMetadata(metadata, key)
      const normalizedValue = normalizePropertyValue(propertyMetadata, value)

      dset(fields, [propertyMetadata.name], normalizedValue)
    })

    return fields
  }

  const normalizeOutput: AdapterUtils["normalizeOutput"] = (
    metadata,
    output,
    select
  ): Record<string, any> => {
    let result: Record<string, any> = {}
    const serializedOutput = serialize(output)

    Object.entries(serializedOutput)
      .map(([key, value]) => ({
        path: getReferencedPropertyName(
          metadata,
          getEntityPropertyMetadata(metadata, key)
        ),
        value
      }))
      .forEach(({path, value}) => {
        dset(result, path, value)
      })

    // Filter out unnecessary fields
    // TODO: Implement proper select on mikro-orm querying level
    if (select) {
      result = Object.fromEntries(
        Object.entries(result).filter(([name]) => select.includes(name))
      )
    }

    return result
  }

  /**
   * Creates a `where` clause with given params.
   *
   * @param fieldName - The name of the field
   * @param path - Path to the field reference
   * @param value - Field's value
   * @param op - Query operator
   * @param target - Target object to assign the result to. The object will be *mutated*
   */
  function createWhereClause(
    path: Array<string | number>,
    value: unknown,
    op?: string,
    target: Record<string, any> = {}
  ): Record<string, any> {
    dset(target, op == null || op === "eq" ? path : path.concat(op), value)

    return target
  }

  /**
   * Same as `createWhereClause`, but creates a statement with only `$in` operator and check if the `value` is an array.
   *
   * @param fieldName - The name of the field
   * @param path - Path to the field reference
   * @param value - Field's value
   * @param target - Target object to assign the result to. The object will be *mutated*
   */
  function createWhereInClause(
    fieldName: string,
    path: Array<string | number>,
    value: unknown,
    operator: "in" | "nin",
    target?: Record<string, any>
  ): Record<string, any> {
    const normalizedOperator = `$${operator}`

    if (!Array.isArray(value)) {
      createAdapterError(
        `The value for the field "${fieldName}" must be an array when using the ${normalizedOperator} operator.`
      )
    }

    return createWhereClause(path, value, normalizedOperator, target)
  }

  function normalizeWhereClause(
    path: Array<string | number>,
    input: Where,
    target?: Record<string, any>
  ): Record<string, any> {
    switch (input.operator) {
      case "in":
        return createWhereInClause(input.field, path, input.value, "in", target)
      case "not_in":
        return createWhereInClause(
          input.field,
          path,
          input.value,
          "nin",
          target
        )
      case "contains":
        return createWhereClause(path, `%${input.value}%`, "$like", target)
      case "starts_with":
        return createWhereClause(path, `${input.value}%`, "$like", target)
      case "ends_with":
        return createWhereClause(path, `%${input.value}`, "$like", target)
      // The next 5 case statements are _expected_ to fall through so we can simplify and reuse the same logic for these operators
      case "gt":
      case "gte":
      case "lt":
      case "lte":
      case "ne":
        return createWhereClause(
          path,
          input.value,
          `$${input.operator}`,
          target
        )
      case "eq":
      case undefined:
        return createWhereClause(path, input.value, "eq", target)
      default:
        return checkForExhaustiveWhereOperator(input.operator)
    }
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
    normalizeEntityName,
    getFieldPath,
    normalizeInput,
    normalizeOutput,
    normalizeWhereClauses,
    normalizeSelect
  }
}
