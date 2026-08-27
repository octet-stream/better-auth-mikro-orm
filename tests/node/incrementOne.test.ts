import {beforeEach, expect, suite, test} from "vitest"

import {mikroOrmAdapter} from "../../src/index.js"
import {DeviceCode} from "../fixtures/entities/device-code/DeviceCode.js"
import {createOrm} from "../fixtures/orm.js"

const orm = createOrm({entities: [DeviceCode]})

// `deviceCode` is not a core Better Auth model — it arrives with the
// device-authorization plugin, and the adapter factory rejects any model that
// is absent from the resolved schema. Declaring it through a minimal plugin is
// what makes the factory dispatch `incrementOne` for this model at all, and it
// mirrors how the real flow reaches the adapter in production.
const adapter = mikroOrmAdapter(orm, {
  debugLogs: {
    isRunningAdapterTests: true
  }
})({
  plugins: [
    {
      id: "device-authorization-test",
      schema: {
        deviceCode: {
          fields: {
            userCode: {type: "string", required: true},
            status: {type: "string", required: true},
            userId: {type: "string", required: false},
            attempts: {type: "number", required: false}
          }
        }
      }
    }
  ]
} as never)

/**
 * `incrementOne` is a guarded conditional update, not merely a counter bump.
 * Better Auth drives it with two independent payloads — `increment` for
 * read-modify-write arithmetic and `set` for outright assignment — and it uses
 * either one alone as readily as both together.
 *
 * These tests exist because an implementation that honoured only `increment`
 * shipped and broke CLI device login in production. The empty-`increment`,
 * populated-`set` call below is the exact shape Better Auth's
 * `GET /device` route uses to claim a pending code, and it silently wrote
 * nothing: the returned entity was truthy, so the caller believed the claim
 * succeeded while the row still had `userId = null`, and the later approve step
 * refused to approve an unclaimed code.
 */

let code: DeviceCode

beforeEach(async () => {
  code = orm.em.create(DeviceCode, {
    userCode: "ABCD-EFGH",
    status: "pending",
    userId: null,
    attempts: 0
  })

  await orm.em.flush()
  orm.em.clear()
})

/**
 * Read the row back through a cleared identity map. Asserting on the returned
 * object alone would pass even if nothing were flushed, which is precisely the
 * failure mode being guarded against.
 */
async function reload(): Promise<DeviceCode | null> {
  orm.em.clear()

  return orm.em.findOne(DeviceCode, {id: code.id})
}

suite("incrementOne", () => {
  test("applies `set` when `increment` is empty", async () => {
    const result = await adapter.incrementOne({
      model: "deviceCode",
      where: [
        {field: "id", value: code.id},
        {field: "status", value: "pending"},
        {field: "userId", operator: "eq", value: null}
      ],
      increment: {},
      set: {userId: "user-1"}
    })

    expect(result).toBeTruthy()
    expect((await reload())?.userId).toBe("user-1")
  })

  test("applies `increment` when `set` is absent", async () => {
    await adapter.incrementOne({
      model: "deviceCode",
      where: [{field: "id", value: code.id}],
      increment: {attempts: 1}
    })

    expect((await reload())?.attempts).toBe(1)
  })

  test("applies `increment` and `set` together", async () => {
    await adapter.incrementOne({
      model: "deviceCode",
      where: [{field: "id", value: code.id}],
      increment: {attempts: 2},
      set: {status: "approved"}
    })

    const actual = await reload()

    expect(actual?.attempts).toBe(2)
    expect(actual?.status).toBe("approved")
  })

  test("increments from the stored value, not from zero", async () => {
    await adapter.incrementOne({
      model: "deviceCode",
      where: [{field: "id", value: code.id}],
      increment: {attempts: 1}
    })

    await adapter.incrementOne({
      model: "deviceCode",
      where: [{field: "id", value: code.id}],
      increment: {attempts: 1}
    })

    expect((await reload())?.attempts).toBe(2)
  })

  test("writes nothing and returns null when the guard does not match", async () => {
    // The claim guard in the device flow: only a row still marked pending and
    // still unclaimed may be taken. Here the status rules it out.
    const result = await adapter.incrementOne({
      model: "deviceCode",
      where: [
        {field: "id", value: code.id},
        {field: "status", value: "approved"}
      ],
      increment: {},
      set: {userId: "user-2"}
    })

    expect(result).toBeNull()
    expect((await reload())?.userId).toBeNull()
  })

  test("a second claim cannot take an already claimed code", async () => {
    const guard = [
      {field: "id", value: code.id},
      {field: "status", value: "pending"},
      {field: "userId", operator: "eq" as const, value: null}
    ]

    const first = await adapter.incrementOne({
      model: "deviceCode",
      where: guard,
      increment: {},
      set: {userId: "user-1"}
    })

    const second = await adapter.incrementOne({
      model: "deviceCode",
      where: guard,
      increment: {},
      set: {userId: "user-2"}
    })

    expect(first).toBeTruthy()
    expect(second).toBeNull()
    expect((await reload())?.userId).toBe("user-1")
  })
})
