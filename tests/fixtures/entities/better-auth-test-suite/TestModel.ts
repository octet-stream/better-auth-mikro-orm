import {Entity, JsonType, PrimaryKey, Property} from "@mikro-orm/better-sqlite"

@Entity()
export class TestModel {
  @PrimaryKey({type: "string"})
  id!: string

  @Property({type: JsonType})
  stringArray!: string[]

  @Property({type: JsonType})
  numberArray!: number[]
}
