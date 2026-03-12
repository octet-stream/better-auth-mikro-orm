import {expect, suite, test} from "vitest"

import type {User as DatabaseUser} from "better-auth"

import {mikroOrmAdapter} from "../../src/adapter.js"
import {createOrm} from "../fixtures/orm.js"
import {createRandomUsersUtils} from "../fixtures/randomUsers.js"
import type {UserInput} from "../utils/types.js"

suite("custom entity (model) names", async () => {
  const entities = await import("../fixtures/entities/custom-entity-name.js")
  const orm = await createOrm({
    entities: Object.values(entities)
  })

  const randomUsers = createRandomUsersUtils(orm)
  const adapter = mikroOrmAdapter(orm)({
    user: {
      modelName: "custom_user"
    }
  })

  test("creates a record", async () => {
    const expected = randomUsers.createOne()

    const actual = await adapter.create<UserInput, DatabaseUser>({
      model: "user",
      data: expected
    })

    expect(actual).toMatchObject(expected)
  })
})

suite("custom field names", () => {
  suite("camelCase", async () => {
    const entities = await import("../fixtures/entities/custom-field-name.js")
    const orm = await createOrm({entities: Object.values(entities)})

    test("with camelCase", async () => {
      const randomUsers = createRandomUsersUtils(orm)
      const adapter = mikroOrmAdapter(orm)({
        user: {
          fields: {
            email: "emailAddress"
          }
        }
      })

      const expected = randomUsers.createOne()

      const actual = await adapter.create<UserInput, DatabaseUser>({
        model: "user",
        data: expected
      })

      expect(actual).toMatchObject(expected)
    })
  })

  suite("snake_case", async () => {
    const entities = await import(
      "../fixtures/entities/custom-field-name-snake-case.js"
    )

    const orm = await createOrm({entities: Object.values(entities)})

    test("with snake_case", async () => {
      const randomUsers = createRandomUsersUtils(orm)
      const adapter = mikroOrmAdapter(orm)({
        user: {
          fields: {
            email: "email_address"
          }
        }
      })

      const expected = randomUsers.createOne()

      const actual = await adapter.create<UserInput, DatabaseUser>({
        model: "user",
        data: expected
      })

      expect(actual).toMatchObject(expected)
    })
  })
})
