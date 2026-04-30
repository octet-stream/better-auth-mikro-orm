import {defineEntity, p} from "@mikro-orm/sqlite"

export const AddressSchema = defineEntity({
  name: "Address",
  embeddable: true,
  properties: {
    street: p.string(),
    city: p.string()
  }
})

export class Address extends AddressSchema.class {}

AddressSchema.setClass(Address)
