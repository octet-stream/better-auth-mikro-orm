import {Entity, JsonType, PrimaryKey, Property} from "@mikro-orm/better-sqlite"

@Entity()
export class TestModel {
  @PrimaryKey({type: "string"})
  id!: string

  @Property({type: JsonType, nullable: true})
  stringArray?: string[]

  @Property({type: JsonType, nullable: true})
  numberArray?: number[]

  @Property({type: "string", nullable: true})
  testField?: string

  @Property({type: "string", nullable: true})
  cbDefaultValueField?: string
}
