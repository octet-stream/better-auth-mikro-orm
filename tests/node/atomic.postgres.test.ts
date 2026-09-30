import {MikroORM} from "@mikro-orm/postgresql"
import {afterAll, beforeAll, beforeEach, suite} from "vitest"

import * as entities from "../fixtures/entities/atomic.ts"
import {defineAtomicSuite} from "../utils/atomicSuite.ts"

/**
 * Runs the atomic operations suite against a real PostgreSQL server, which has row-level locks and a connection pool,
 * so concurrent calls run in parallel transactions (unlike SQLite, where write transactions are serialized).
 *
 * Skipped unless `POSTGRES_URL` is set, e.g. `POSTGRES_URL=postgres://postgres@127.0.0.1:5432/adapter_test pnpm test`.
 * The database is dropped and recreated by the schema generator.
 */
const clientUrl = process.env.POSTGRES_URL

suite.skipIf(!clientUrl)("PostgreSQL", () => {
  let orm: MikroORM

  beforeAll(async () => {
    orm = new MikroORM({
      clientUrl,
      entities: Object.values(entities),
      allowGlobalContext: true,
      debug: false,
      pool: {
        max: 20
      }
    })

    await orm.connect()
  })

  beforeEach(async () => {
    await orm.schema.refresh()
    orm.em.clear()
  })

  afterAll(async () => {
    await orm?.close()
  })

  defineAtomicSuite(() => orm)
})
