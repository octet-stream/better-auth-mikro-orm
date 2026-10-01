import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "./Base.ts"

/**
 * Mirrors the `deviceCode` model of Better Auth's `device-authorization` plugin.
 */
export const DeviceCodeSchema = defineEntity({
  name: "DeviceCode",
  extends: Base,
  properties: {
    deviceCode: p.string(),
    userCode: p.string(),
    userId: p.string().nullable(),
    expiresAt: p.datetime(),
    status: p.string(),
    lastPolledAt: p.datetime().nullable(),
    pollingInterval: p.integer().nullable(),
    clientId: p.string().nullable(),
    scope: p.string().nullable()
  }
})

export class DeviceCode extends DeviceCodeSchema.class {}

DeviceCodeSchema.setClass(DeviceCode)
