import {normalTestSuite, testAdapter} from "@better-auth/test-utils/adapter"
import {MikroORM} from "@mikro-orm/better-sqlite"

import {mikroOrmAdapter} from "../../src/adapter.js"
import * as entities from "../fixtures/entities/better-auth-test-suite.js"

const orm = MikroORM.initSync({
  dbName: ":memory:",
  allowGlobalContext: true,
  entities: Object.values(entities)
})

const {execute} = await testAdapter({
  adapter: () =>
    mikroOrmAdapter(orm, {
      debugLogs: {
        isRunningAdapterTests: true
      }
    }),
  async runMigrations() {
    await orm.getSchemaGenerator().refreshDatabase()
  },
  tests: [
    normalTestSuite({
      disableTests: {
        // TODO: Re-enable one by one when I add support for joins
        "findOne - should join a model with modified field name": true,
        "findOne - multiple joins should return result even when some joined tables have no matching rows": true,
        "findOne - backwards join should only return single record not array": true,
        "findOne - backwards join with modified field name (session base, users-table join)": true,
        "findMany - backwards join should only return single record not array": true,
        "findMany - should handle mixed joins correctly when some are missing": true,
        "findMany - should find many with join and limit": true,
        "findMany - should find many with join and offset": true,
        "findMany - should find many with join and sortBy": true,
        "findMany - should find many with join and where clause": true,
        "findMany - should find many with join, where, limit, and offset": true,
        "findOne - should find a model with join": true,
        "findOne - should perform backwards joins": true,
        "findMany - should find many models with join": true,
        "findMany - should find many with one-to-one join": true,
        "findOne - should return null for one-to-one join when joined record doesn't exist": true,
        "findMany - should return null for one-to-one join when joined records don't exist": true,
        "findOne - should select fields with multiple joins": true,
        "findMany - should select fields with multiple joins": true,
        "findOne - should be able to perform a limited join": true,
        "findMany - should be able to perform a limited join": true,
        "findOne - should select fields with one-to-one join": true,
        "findMany - should select fields with one-to-one join": true,
        "findOne - should select fields with one-to-many join": true,
        "findMany - should select fields with one-to-many join": true,
        "findOne - should return an array for one-to-many joins": true,
        "findOne - should return an object for one-to-one joins": true,
        "findMany - should return empty array for one-to-many join when joined records don't exist": true,
        "findOne - should be able to perform a complex limited join": true,
        "create - should support json": true,
        "findMany - should be able to perform a complex limited join": true,
        "findOne - should work with both one-to-one and one-to-many joins": true,
        "findMany - should find many with both one-to-one and one-to-many joins": true,
        "findOne - should return null for failed base model lookup that has joins": true,
        "findMany - should return empty array when base records don't exist with joins": true,

        // FIXME: These are skipped for now
        "create - should return null for nullable foreign keys": true
      }
    })
  ],
  overrideBetterAuthOptions: options => ({
    ...options,
    user: {
      fields: {
        email: "email_address"
      }
    },
    session: {
      modelName: "sessions"
    }
  })
})

execute()
