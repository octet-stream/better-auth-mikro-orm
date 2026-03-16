import {rm} from "node:fs/promises"
import {join} from "node:path"

import {type EntityClass, type EntitySchema, MikroORM} from "@mikro-orm/sqlite"
import {v7} from "uuid"
import {afterAll, beforeAll, beforeEach} from "vitest"

interface CreateOrmParams {
  refreshOnEachTest?: boolean
  entities: Array<EntityClass<Partial<any>> | EntitySchema<Partial<any>>>
}

export function createOrm({
  entities,
  refreshOnEachTest = true
}: CreateOrmParams): MikroORM {
  const dbName = join(import.meta.dirname, `${v7()}.sqlite`)

  const orm = new MikroORM({
    dbName,
    entities: entities,
    ensureDatabase: true,
    allowGlobalContext: true
  })

  beforeAll(async () => await orm.connect())

  if (refreshOnEachTest) {
    beforeEach(async () => await orm.schema.refresh())
  } else {
    beforeAll(async () => await orm.schema.refresh())
  }

  afterAll(async () => {
    await orm.close()
    await rm(dbName)
  })

  return orm
}
