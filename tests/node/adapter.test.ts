import type {
  Session as DatabaseSession,
  User as DatabaseUser
} from "better-auth"
import {generateId} from "better-auth"
import {NIL, validate} from "uuid"
import {expect, suite, test} from "vitest"

import {mikroOrmAdapter} from "../../src/index.js"

import {createOrm} from "../fixtures/orm.js"
import {createRandomUsersUtils} from "../fixtures/randomUsers.js"
import type {SessionInput, UserInput} from "../utils/types.js"

import * as entities from "../fixtures/entities/defaults.js"

const orm = createOrm({entities: Object.values(entities)})

const randomUsers = createRandomUsersUtils(orm)

const adapter = mikroOrmAdapter(orm, {
  debugLogs: {
    isRunningAdapterTests: true
  }
})({})

suite("create", () => {
  test("a new record", async () => {
    const expected = randomUsers.createOne()
    const actual = await adapter.create<UserInput, DatabaseUser>({
      model: "user",
      data: expected
    })

    expect(actual).toMatchObject(expected)
  })

  test("with a reference", async () => {
    const user = await randomUsers.createAndFlushOne()

    const actual = await adapter.create<SessionInput, DatabaseSession>({
      model: "session",
      data: {
        token: generateId(),
        userId: user.id,
        expiresAt: new Date()
      }
    })

    expect(actual.userId).toBe(user.id)
  })

  // https://github.com/octet-stream/better-auth-mikro-orm/issues/18
  test("with referenced value not presented in Identity Map (issue #18)", async () => {
    const user = await randomUsers.createAndFlushOne()

    orm.em.clear()

    const actual = await adapter.create<SessionInput, DatabaseSession>({
      model: "session",
      data: {
        token: generateId(),
        userId: user.id,
        expiresAt: new Date()
      }
    })

    expect(actual.userId).toBe(user.id)
  })

  suite("generateId", () => {
    suite("via database.generateId option", () => {
      test("custom generator", async () => {
        const expected = "451"
        const adapter = mikroOrmAdapter(orm, {
          debugLogs: {
            isRunningAdapterTests: true
          }
        })({
          advanced: {
            database: {
              generateId: () => expected
            }
          }
        })

        const actual = await adapter.create<UserInput, DatabaseUser>({
          model: "user",
          data: randomUsers.createOne()
        })

        expect(actual.id).toBe(expected)
      })

      test("disabled (managed by orm or db)", async () => {
        const adapter = mikroOrmAdapter(orm, {
          debugLogs: {
            isRunningAdapterTests: true
          }
        })({
          advanced: {
            database: {
              generateId: false
            }
          }
        })

        const actual = await adapter.create<UserInput, DatabaseUser>({
          model: "user",
          data: randomUsers.createOne()
        })

        expect(validate(actual.id)).toBe(true)
      })
    })

    suite("via legacy advanced.generateId option", () => {
      test("custom generator", async () => {
        const expected = "451"
        const adapter = mikroOrmAdapter(orm, {
          debugLogs: {
            isRunningAdapterTests: true
          }
        })({
          advanced: {
            generateId: () => expected
          }
        })

        const actual = await adapter.create<UserInput, DatabaseUser>({
          model: "user",
          data: randomUsers.createOne()
        })

        expect(actual.id).toBe(expected)
      })

      test("disabled (managed by orm or db)", async () => {
        const adapter = mikroOrmAdapter(orm, {
          debugLogs: {
            isRunningAdapterTests: true
          }
        })({
          advanced: {
            generateId: false
          }
        })

        const actual = await adapter.create<UserInput, DatabaseUser>({
          model: "user",
          data: randomUsers.createOne()
        })

        expect(validate(actual.id)).toBe(true)
      })
    })
  })
})

suite("count", () => {
  test("returns the number of total rows in the table", async () => {
    const expected = 11

    await randomUsers.createAndFlushMany(expected)

    const actual = await adapter.count({model: "user"})

    expect(actual).toBe(expected)
  })

  test("supports where clauses", async () => {
    const [, , user3, , user5] = await randomUsers.createAndFlushMany(10)

    const actual = await adapter.count({
      model: "user",
      where: [
        {
          operator: "in",
          field: "id",
          value: [user3.id, user5.id]
        }
      ]
    })

    expect(actual).toBe(2)
  })
})

suite("findOne", () => {
  test("by id", async () => {
    const expected = await randomUsers.createAndFlushOne()
    const actual = await adapter.findOne<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "id",
          value: expected.id
        }
      ]
    })

    expect(actual?.id).toBe(expected.id)
  })

  test("by arbitary field", async () => {
    const expected = await randomUsers.createAndFlushOne()
    const actual = await adapter.findOne<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "email",
          value: expected.email
        }
      ]
    })

    expect(actual?.id).toBe(expected.id)
  })

  test("returns only selected fields", async () => {
    const user = await randomUsers.createAndFlushOne()
    const actual = await adapter.findOne({
      model: "user",
      where: [
        {
          field: "id",
          value: user.id
        }
      ],
      select: ["email"]
    })

    expect(actual).toEqual({email: user.email})
  })

  test("returns null for nonexistent record", async () => {
    const actual = adapter.findOne<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "id",
          value: "test"
        }
      ]
    })

    await expect(actual).resolves.toBeNull()
  })
})

suite("findMany", () => {
  test("returns all records", async () => {
    const users = await randomUsers.createAndFlushMany(10)
    const actual = await adapter.findMany<DatabaseUser>({
      model: "user"
    })

    expect(actual.map(({id}) => id)).toEqual(users.map(({id}) => id))
  })

  test("limit", async () => {
    const limit = 6
    const users = await randomUsers.createAndFlushMany(10)

    const expected = users.slice(0, limit).map(({id}) => id)
    const actual = await adapter.findMany<DatabaseUser>({
      model: "user",
      limit
    })

    expect(actual.map(({id}) => id)).toEqual(expected)
  })

  test("offset", async () => {
    const offset = 3
    const users = await randomUsers.createAndFlushMany(4)

    const expected = users.slice(offset).map(({id}) => id)
    const actual = await adapter.findMany<DatabaseUser>({
      model: "user",
      offset
    })

    expect(actual.map(({id}) => id)).toEqual(expected)
  })

  test("sortBy", async () => {
    const [user1, user2, user3] = await randomUsers.createAndFlushMany(
      3,

      (user, index) => ({
        ...user,
        email: `user-${index + 1}@example.com`
      })
    )

    const actual = await adapter.findMany<DatabaseUser>({
      model: "user",
      sortBy: {
        field: "email",
        direction: "desc"
      }
    })

    expect(actual.map(({id}) => id)).toEqual([user3.id, user2.id, user1.id])
  })

  suite("operators", () => {
    test("in", async () => {
      const [user1, , user3] = await randomUsers.createAndFlushMany(3)

      const actual = await adapter.findMany<DatabaseUser>({
        model: "user",
        where: [
          {
            field: "id",
            operator: "in",
            value: [user1.id, user3.id]
          }
        ]
      })

      expect(actual.map(({id}) => id)).toEqual([user1.id, user3.id])
    })
  })
})

suite("update", () => {
  test("updates matched row", async () => {
    const user = await randomUsers.createAndFlushOne()

    const actual = await adapter.update<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "id",
          value: user.id
        }
      ],
      update: {
        emailVerified: true
      }
    })

    expect(actual?.emailVerified).toBe(true)
  })

  test("returns null when no row found", async () => {
    const actual = await adapter.update<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "id",
          value: NIL
        }
      ],
      update: {
        emailVerified: true
      }
    })

    expect(actual).toBe(null)
  })

  test("updates Identity Map", async () => {
    const user = await randomUsers.createAndFlushOne()

    await adapter.update<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "id",
          value: user.id
        }
      ],
      update: {
        emailVerified: true
      }
    })

    expect(user.emailVerified).toBe(true)
  })
})

suite("updateMany", () => {
  test("updates matched rows", async () => {
    const [user1, user2, user3] = await randomUsers.createAndFlushMany(3)

    const affected = await adapter.updateMany({
      model: "user",
      where: [
        {
          field: "id",
          operator: "in",
          value: [user1.id, user3.id]
        }
      ],

      update: {
        emailVerified: true
      }
    })

    expect(affected).toBe(2)

    const users = await orm.em.find(entities.User, {
      id: {$in: [user1.id, user2.id, user3.id]}
    })

    expect(users.map(({emailVerified}) => emailVerified)).toMatchObject([
      true,
      false,
      true
    ])
  })

  test("does not clear Identity Map", async () => {
    const user = await randomUsers.createAndFlushOne()

    const session = orm.em.create(entities.Session, {
      token: generateId(),
      user,
      expiresAt: new Date()
    })

    await orm.em.flush()

    await adapter.updateMany({
      model: "session",
      where: [
        {
          field: "id",
          value: session.id
        }
      ],
      update: {
        token: generateId()
      }
    })

    const promise = adapter.create<SessionInput, DatabaseSession>({
      model: "session",
      data: {
        token: generateId(),
        userId: user.id,
        expiresAt: new Date()
      }
    })

    await expect(promise).resolves.not.toThrow()
  })
})

suite("delete", () => {
  test("removes matched row", async () => {
    const user = await randomUsers.createAndFlushOne()

    await adapter.delete({
      model: "user",
      where: [
        {
          field: "id",
          value: user.id
        }
      ]
    })

    const promise = orm.em.findOne(entities.User, user.id)

    await expect(promise).resolves.toBe(null)
  })
})

suite("deleteMany", () => {
  test("deletes multiple rows", async () => {
    const users = await randomUsers.createAndFlushMany(3)

    const ids = users.map(({id}) => id)

    const actual = await adapter.deleteMany({
      model: "user",
      where: [
        {
          field: "id",
          operator: "in",
          value: ids
        }
      ]
    })

    expect(actual).toBe(users.length)

    const matchedRowsCountPromise = orm.em.count(entities.User, {
      id: {
        $in: ids
      }
    })

    await expect(matchedRowsCountPromise).resolves.toBe(0)
  })

  suite("deleteMany", () => {
    // https://github.com/octet-stream/better-auth-mikro-orm/issues/15
    test("does not clear IdentityMap (issue #15)", async () => {
      const user = await randomUsers.createAndFlushOne()

      const session = orm.em.create(entities.Session, {
        token: generateId(),
        user,
        expiresAt: new Date()
      })

      await orm.em.flush()

      await adapter.deleteMany({
        model: "session",
        where: [
          {
            field: "id",
            value: session.id
          }
        ]
      })

      const promise = adapter.create<SessionInput, DatabaseSession>({
        model: "session",
        data: {
          token: generateId(),
          userId: user.id,
          expiresAt: new Date()
        }
      })

      await expect(promise).resolves.not.toThrow()
    })
  })
})
