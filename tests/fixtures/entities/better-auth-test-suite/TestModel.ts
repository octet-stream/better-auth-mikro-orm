import {defineEntity, p} from "@mikro-orm/sqlite"

export const TestModelSchema = defineEntity({
  name: "TestModel",
  properties: {
    id: p.string().primary(),
    stringArray: p.json<string[]>().nullable(),
    numberArray: p.json<number[]>().nullable(),
    testField: p.string().nullable(),
    cbDefaultValueField: p.string().nullable()
  }
})

export class TestModel extends TestModelSchema.class {}

TestModelSchema.setClass(TestModel)
