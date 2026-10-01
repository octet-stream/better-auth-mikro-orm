import {type MikroORM, RequestContext} from "@mikro-orm/core"
import type {BetterAuthPlugin} from "better-auth"
import {generateId} from "better-auth"
import {deviceAuthorization} from "better-auth/plugins"
import {afterEach, beforeEach, expect, suite, test} from "vitest"

import {mikroOrmAdapter} from "../../src/adapter.ts"
import * as entities from "../fixtures/entities/atomic.ts"

interface CounterRow {
  id: string
  label: string
  value: number | null
  remaining: number
  ownerId: string | null
}

interface DeviceCodeRow {
  id: string
  deviceCode: string
  userCode: string
  userId: string | null
  status: string
}

interface UserRow {
  id: string
  email: string
  name: string
}

/**
 * Declares the `counter` model to Better Auth, so the adapter factory can transform its input and output.
 */
const counterPlugin = {
  id: "counter-test",
  schema: {
    counter: {
      fields: {
        label: {
          type: "string",
          required: true
        },
        value: {
          type: "number",
          required: false
        },
        remaining: {
          type: "number",
          required: false
        },
        ownerId: {
          type: "string",
          required: false,
          references: {
            model: "user",
            field: "id"
          }
        }
      }
    }
  }
} satisfies BetterAuthPlugin

/**
 * Tests for Better Auth 1.7 atomic adapter methods (`incrementOne` and `consumeOne`).
 *
 * Shared between SQLite and PostgreSQL runs.
 *
 * @param getOrm - Returns Mikro ORM instance. The database schema must be refreshed before each test.
 */
export function defineAtomicSuite(getOrm: () => MikroORM) {
  const getAdapter = () =>
    mikroOrmAdapter(getOrm(), {
      debugLogs: {
        isRunningAdapterTests: true
      }
    })({
      plugins: [deviceAuthorization(), counterPlugin]
    })

  const createUser = async () => {
    const adapter = getAdapter()

    return adapter.create<Omit<UserRow, "id">, UserRow>({
      model: "user",
      data: {
        email: `${generateId()}@example.com`,
        name: "Test User"
      }
    })
  }

  const createCounter = async (data: Partial<Omit<CounterRow, "id">> = {}) => {
    const adapter = getAdapter()

    return adapter.create<Omit<CounterRow, "id">, CounterRow>({
      model: "counter",
      data: {
        label: "counter",
        value: 0,
        remaining: 0,
        ownerId: null,
        ...data
      }
    })
  }

  const createDeviceCode = async () => {
    const adapter = getAdapter()

    return adapter.create<Record<string, unknown>, DeviceCodeRow>({
      model: "deviceCode",
      data: {
        deviceCode: generateId(),
        userCode: generateId(8),
        userId: null,
        expiresAt: new Date(Date.now() + 60_000),
        status: "pending",
        clientId: "cli"
      }
    })
  }

  const findCounter = (id: string) =>
    getAdapter().findOne<CounterRow>({
      model: "counter",
      where: [{field: "id", value: id}]
    })

  suite("incrementOne", () => {
    test("increments a counter and returns the updated row", async () => {
      const adapter = getAdapter()
      const counter = await createCounter({value: 1})

      const actual = await adapter.incrementOne<CounterRow>({
        model: "counter",
        where: [{field: "id", value: counter.id}],
        increment: {value: 2}
      })

      expect(actual).toMatchObject({id: counter.id, value: 3})
      await expect(findCounter(counter.id)).resolves.toMatchObject({value: 3})
    })

    test("decrements with a negative delta", async () => {
      const adapter = getAdapter()
      const counter = await createCounter({value: 5})

      const actual = await adapter.incrementOne<CounterRow>({
        model: "counter",
        where: [{field: "id", value: counter.id}],
        increment: {value: -2}
      })

      expect(actual?.value).toBe(3)
    })

    test("treats a null counter as zero", async () => {
      const adapter = getAdapter()
      const counter = await createCounter({value: null})

      const actual = await adapter.incrementOne<CounterRow>({
        model: "counter",
        where: [{field: "id", value: counter.id}],
        increment: {value: 1}
      })

      expect(actual?.value).toBe(1)
    })

    test("applies both increment and set in the same call", async () => {
      const adapter = getAdapter()
      const owner = await createUser()
      const counter = await createCounter({value: 10, label: "before"})

      const actual = await adapter.incrementOne<CounterRow>({
        model: "counter",
        where: [{field: "id", value: counter.id}],
        increment: {value: 1, remaining: -1},
        set: {label: "after", ownerId: owner.id}
      })

      expect(actual).toMatchObject({
        id: counter.id,
        value: 11,
        remaining: -1,
        label: "after",
        ownerId: owner.id
      })

      await expect(findCounter(counter.id)).resolves.toMatchObject({
        value: 11,
        remaining: -1,
        label: "after",
        ownerId: owner.id
      })
    })

    // This is the exact shape Better Auth's device authorization plugin uses to claim a device code.
    // Dropping `set` here makes the device approval fail one request later without an error.
    test("claims a device code with empty increment and set (device authorization shape)", async () => {
      const adapter = getAdapter()
      const user = await createUser()
      const otherUser = await createUser()
      const deviceCode = await createDeviceCode()

      // Load the row first, like the plugin does, so a stale Identity Map copy would be observable
      await adapter.findOne({
        model: "deviceCode",
        where: [{field: "id", value: deviceCode.id}]
      })

      const claimWhere = [
        {field: "id", value: deviceCode.id},
        {field: "status", value: "pending"},
        {field: "userId", operator: "eq" as const, value: null}
      ]

      const claimed = await adapter.incrementOne<DeviceCodeRow>({
        model: "deviceCode",
        where: claimWhere,
        increment: {},
        set: {userId: user.id}
      })

      expect(claimed).toMatchObject({id: deviceCode.id, userId: user.id})

      await expect(
        adapter.findOne<DeviceCodeRow>({
          model: "deviceCode",
          where: [{field: "id", value: deviceCode.id}]
        })
      ).resolves.toMatchObject({userId: user.id, status: "pending"})

      // The guard (userId IS NULL) no longer matches, so nobody else can claim it
      const reclaimed = await adapter.incrementOne<DeviceCodeRow>({
        model: "deviceCode",
        where: claimWhere,
        increment: {},
        set: {userId: otherUser.id}
      })

      expect(reclaimed).toBeNull()

      await expect(
        adapter.findOne<DeviceCodeRow>({
          model: "deviceCode",
          where: [{field: "id", value: deviceCode.id}]
        })
      ).resolves.toMatchObject({userId: user.id})
    })

    test("returns null and changes nothing on a guard miss", async () => {
      const adapter = getAdapter()
      const counter = await createCounter({value: 1, label: "unchanged"})

      const actual = await adapter.incrementOne<CounterRow>({
        model: "counter",
        where: [
          {field: "id", value: counter.id},
          {field: "value", operator: "gt", value: 1}
        ],
        increment: {value: 1},
        set: {label: "changed"}
      })

      expect(actual).toBeNull()
      await expect(findCounter(counter.id)).resolves.toMatchObject({
        value: 1,
        label: "unchanged"
      })
    })

    test("returns null when no row matches", async () => {
      const adapter = getAdapter()

      const actual = await adapter.incrementOne<CounterRow>({
        model: "counter",
        where: [{field: "id", value: generateId()}],
        increment: {value: 1}
      })

      expect(actual).toBeNull()
    })

    test("updates at most one row for a non-unique predicate", async () => {
      const adapter = getAdapter()
      const label = generateId()

      await createCounter({label, value: 0})
      await createCounter({label, value: 0})
      await createCounter({label, value: 0})

      const actual = await adapter.incrementOne<CounterRow>({
        model: "counter",
        where: [{field: "label", value: label}],
        increment: {value: 1}
      })

      expect(actual?.value).toBe(1)

      const rows = await adapter.findMany<CounterRow>({
        model: "counter",
        where: [{field: "label", value: label}]
      })

      expect(rows.map(row => row.value).sort()).toEqual([0, 0, 1])
    })

    test("rejects non-finite increments", async () => {
      const adapter = getAdapter()
      const counter = await createCounter()

      await expect(
        adapter.incrementOne({
          model: "counter",
          where: [{field: "id", value: counter.id}],
          increment: {value: Number.POSITIVE_INFINITY}
        })
      ).rejects.toThrow()

      await expect(findCounter(counter.id)).resolves.toMatchObject({value: 0})
    })

    test("refreshes the Identity Map copy of the updated row", async () => {
      const orm = getOrm()
      const adapter = getAdapter()
      const counter = await createCounter({value: 1})

      const managed = await orm.em.findOneOrFail(entities.Counter, counter.id)

      await adapter.incrementOne({
        model: "counter",
        where: [{field: "id", value: counter.id}],
        increment: {value: 1}
      })

      expect(managed.value).toBe(2)

      const reloaded = await orm.em.findOneOrFail(entities.Counter, counter.id)

      expect(reloaded.value).toBe(2)
    })

    test("loses no updates under concurrent increments", async () => {
      const adapter = getAdapter()
      const counter = await createCounter({value: 0})
      const concurrency = 25

      const results = await Promise.all(
        Array.from({length: concurrency}, () =>
          adapter.incrementOne<CounterRow>({
            model: "counter",
            where: [{field: "id", value: counter.id}],
            increment: {value: 1}
          })
        )
      )

      // Every caller observed a distinct post-increment value
      const observed = results.map(row => row?.value ?? 0).sort((a, b) => a - b)

      expect(observed).toEqual(
        Array.from({length: concurrency}, (_, index) => index + 1)
      )

      await expect(findCounter(counter.id)).resolves.toMatchObject({
        value: concurrency
      })
    })

    test("honours a comparison guard under concurrent decrements", async () => {
      const adapter = getAdapter()
      const counter = await createCounter({remaining: 5})

      const results = await Promise.all(
        Array.from({length: 20}, () =>
          adapter.incrementOne<CounterRow>({
            model: "counter",
            where: [
              {field: "id", value: counter.id},
              {field: "remaining", operator: "gt", value: 0}
            ],
            increment: {remaining: -1}
          })
        )
      )

      expect(results.filter(row => row !== null)).toHaveLength(5)
      await expect(findCounter(counter.id)).resolves.toMatchObject({
        remaining: 0
      })
    })

    test("lets exactly one concurrent claim win", async () => {
      const adapter = getAdapter()
      const deviceCode = await createDeviceCode()
      const users = await Promise.all(Array.from({length: 5}, createUser))

      const results = await Promise.all(
        users.map(user =>
          adapter.incrementOne<DeviceCodeRow>({
            model: "deviceCode",
            where: [
              {field: "id", value: deviceCode.id},
              {field: "status", value: "pending"},
              {field: "userId", value: null}
            ],
            increment: {},
            set: {userId: user.id}
          })
        )
      )

      const winners = results.filter(row => row !== null)

      expect(winners).toHaveLength(1)

      await expect(
        adapter.findOne<DeviceCodeRow>({
          model: "deviceCode",
          where: [{field: "id", value: deviceCode.id}]
        })
      ).resolves.toMatchObject({userId: winners[0]?.userId})
    })
  })

  suite("consumeOne", () => {
    test("deletes and returns the matched row", async () => {
      const adapter = getAdapter()
      const counter = await createCounter({label: "consume-me", value: 7})

      const actual = await adapter.consumeOne<CounterRow>({
        model: "counter",
        where: [{field: "id", value: counter.id}]
      })

      expect(actual).toMatchObject({
        id: counter.id,
        label: "consume-me",
        value: 7
      })
      await expect(findCounter(counter.id)).resolves.toBeNull()
    })

    test("returns null when no row matches", async () => {
      const adapter = getAdapter()

      await expect(
        adapter.consumeOne({
          model: "counter",
          where: [{field: "id", value: generateId()}]
        })
      ).resolves.toBeNull()
    })

    test("returns null and keeps the row on a guard miss", async () => {
      const adapter = getAdapter()
      const deviceCode = await createDeviceCode()

      const actual = await adapter.consumeOne({
        model: "deviceCode",
        where: [
          {field: "id", value: deviceCode.id},
          {field: "status", value: "approved"}
        ]
      })

      expect(actual).toBeNull()

      await expect(
        adapter.findOne({
          model: "deviceCode",
          where: [{field: "id", value: deviceCode.id}]
        })
      ).resolves.not.toBeNull()
    })

    test("deletes at most one row for a non-unique predicate", async () => {
      const adapter = getAdapter()
      const label = generateId()

      await createCounter({label})
      await createCounter({label})
      await createCounter({label})

      const actual = await adapter.consumeOne({
        model: "counter",
        where: [{field: "label", value: label}]
      })

      expect(actual).not.toBeNull()
      await expect(
        adapter.count({
          model: "counter",
          where: [{field: "label", value: label}]
        })
      ).resolves.toBe(2)
    })

    test("evicts the consumed row from the Identity Map", async () => {
      const orm = getOrm()
      const adapter = getAdapter()
      const counter = await createCounter()

      await orm.em.findOneOrFail(entities.Counter, counter.id)

      await adapter.consumeOne({
        model: "counter",
        where: [{field: "id", value: counter.id}]
      })

      await expect(
        orm.em.findOne(entities.Counter, counter.id)
      ).resolves.toBeNull()
      await expect(findCounter(counter.id)).resolves.toBeNull()
    })

    test("gives the row to exactly one concurrent consumer", async () => {
      const adapter = getAdapter()
      const counter = await createCounter()

      const results = await Promise.all(
        Array.from({length: 10}, () =>
          adapter.consumeOne({
            model: "counter",
            where: [{field: "id", value: counter.id}]
          })
        )
      )

      expect(results.filter(row => row !== null)).toHaveLength(1)
      await expect(findCounter(counter.id)).resolves.toBeNull()
    })
  })

  // MikroORM's default is `allowGlobalContext: false`: outside a `RequestContext`, using `orm.em` directly throws.
  // Better Auth may call `consumeOne` / `incrementOne` outside a request context (e.g. background jobs), and both
  // methods commit before touching the caller's Identity Map, so a throw there would lose the consumed row.
  suite("without a request context and allowGlobalContext: false", () => {
    let previous: boolean

    // Seeds and reads rows inside a request context, so only the call under test runs without one.
    const inContext = <T>(fn: () => Promise<T>) =>
      RequestContext.create(getOrm().em, fn)

    beforeEach(() => {
      const {config} = getOrm()

      previous = config.get("allowGlobalContext")
      config.set("allowGlobalContext", false)
    })

    afterEach(() => {
      getOrm().config.set("allowGlobalContext", previous)
    })

    test("the global context is really rejected", () => {
      expect(() => getOrm().em.getUnitOfWork()).toThrow(/global EntityManager/)
    })

    test("consumeOne consumes the row exactly once without throwing", async () => {
      const adapter = getAdapter()
      const deviceCode = await inContext(createDeviceCode)
      const where = [
        {field: "deviceCode", value: deviceCode.deviceCode},
        {field: "status", value: "pending"}
      ]

      const first = await adapter.consumeOne<DeviceCodeRow>({
        model: "deviceCode",
        where
      })

      expect(first).toMatchObject({
        id: deviceCode.id,
        deviceCode: deviceCode.deviceCode
      })

      await expect(
        adapter.consumeOne({model: "deviceCode", where})
      ).resolves.toBeNull()

      await expect(
        inContext(() =>
          adapter.count({
            model: "deviceCode",
            where: [{field: "id", value: deviceCode.id}]
          })
        )
      ).resolves.toBe(0)
    })

    test("incrementOne claims and increments without throwing", async () => {
      const adapter = getAdapter()
      const user = await inContext(createUser)
      const deviceCode = await inContext(createDeviceCode)
      const counter = await inContext(() => createCounter({value: 1}))

      const claimWhere = [
        {field: "id", value: deviceCode.id},
        {field: "status", value: "pending"},
        {field: "userId", value: null}
      ]

      await expect(
        adapter.incrementOne<DeviceCodeRow>({
          model: "deviceCode",
          where: claimWhere,
          increment: {},
          set: {userId: user.id}
        })
      ).resolves.toMatchObject({id: deviceCode.id, userId: user.id})

      await expect(
        adapter.incrementOne({
          model: "deviceCode",
          where: claimWhere,
          increment: {},
          set: {userId: user.id}
        })
      ).resolves.toBeNull()

      await expect(
        adapter.incrementOne<CounterRow>({
          model: "counter",
          where: [{field: "id", value: counter.id}],
          increment: {value: 2}
        })
      ).resolves.toMatchObject({id: counter.id, value: 3})

      await expect(
        inContext(() => findCounter(counter.id))
      ).resolves.toMatchObject({value: 3})
    })

    test("incrementOne sets a reference field without throwing", async () => {
      const adapter = getAdapter()
      const owner = await inContext(createUser)
      const counter = await inContext(() => createCounter({value: 1}))

      await expect(
        adapter.incrementOne<CounterRow>({
          model: "counter",
          where: [{field: "id", value: counter.id}],
          increment: {value: 1},
          set: {ownerId: owner.id}
        })
      ).resolves.toMatchObject({id: counter.id, value: 2, ownerId: owner.id})

      await expect(
        inContext(() => findCounter(counter.id))
      ).resolves.toMatchObject({value: 2, ownerId: owner.id})
    })

    test("concurrent consumers get the row exactly once", async () => {
      const adapter = getAdapter()
      const counter = await inContext(() => createCounter())

      const results = await Promise.all(
        Array.from({length: 10}, () =>
          adapter.consumeOne({
            model: "counter",
            where: [{field: "id", value: counter.id}]
          })
        )
      )

      expect(results.filter(row => row !== null)).toHaveLength(1)
      await expect(inContext(() => findCounter(counter.id))).resolves.toBeNull()
    })
  })
}
