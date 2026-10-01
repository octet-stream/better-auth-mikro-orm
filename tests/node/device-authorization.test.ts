import {betterAuth} from "better-auth"
import {deviceAuthorization} from "better-auth/plugins"
import {expect, test} from "vitest"

import {mikroOrmAdapter} from "../../src/adapter.ts"
import * as entities from "../fixtures/entities/atomic.ts"
import {createOrm} from "../fixtures/orm.ts"

const orm = createOrm({entities: Object.values(entities)})

// End-to-end check of Better Auth's device authorization flow, which relies on `incrementOne` (claiming the code with `increment: {}` and `set: {userId}`)
// and `consumeOne` (redeeming the approved code exactly once).
test("device authorization flow claims, approves and redeems a device code", async () => {
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "better-auth-mikro-orm-test-secret-0123456789",
    database: mikroOrmAdapter(orm),
    emailAndPassword: {
      enabled: true
    },
    plugins: [deviceAuthorization()]
  })

  const {user_code, device_code} = await auth.api.deviceCode({
    body: {
      client_id: "cli"
    }
  })

  const signUp = await auth.api.signUpEmail({
    body: {
      email: "device-flow@example.com",
      password: "correct-horse-battery-staple",
      name: "Device Flow"
    },
    returnHeaders: true
  })

  const cookie = signUp.headers.get("set-cookie")?.split(";")[0]

  expect(cookie).toBeTruthy()

  const headers = new Headers({cookie: cookie ?? ""})

  // Visiting the verification page while signed in claims the code for the user
  await auth.api.deviceVerify({query: {user_code}, headers})

  // Approval fails with DEVICE_CODE_NOT_CLAIMED if the claim did not persist `userId`
  await expect(
    auth.api.deviceApprove({body: {userCode: user_code}, headers})
  ).resolves.toEqual({success: true})

  const token = await auth.api.deviceToken({
    body: {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code,
      client_id: "cli"
    }
  })

  expect(token.access_token).toBeTruthy()

  // The approved code is single-use
  await expect(
    auth.api.deviceToken({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code,
        client_id: "cli"
      }
    })
  ).rejects.toThrow()
})
