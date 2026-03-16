import type {BetterAuthOptions} from "better-auth"
import {runAdapterTest} from "better-auth/adapters/test"
import {toMerged} from "es-toolkit"
import {suite} from "vitest"

import * as entities from "../fixtures/entities/better-auth-test-suite.js"

import {mikroOrmAdapter} from "../../src/adapter.js"
import {createOrm} from "../fixtures/orm.js"

const orm = createOrm({
  entities: Object.values(entities),
  refreshOnEachTest: false
})

suite("better-auth tests", async () => {
  const baseOptions: BetterAuthOptions = {
    user: {
      fields: {
        email: "email_address"
      },
      additionalFields: {
        test: {
          type: "string",
          defaultValue: "test"
        }
      }
    },
    session: {
      modelName: "sessions"
    }
  }

  await runAdapterTest({
    async getAdapter(customOptions = {}) {
      const adapter = mikroOrmAdapter(orm, {
        debugLogs: {
          isRunningAdapterTests: true
        }
      })

      return adapter(toMerged(baseOptions, customOptions))
    }
  })
})
