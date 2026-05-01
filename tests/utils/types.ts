export type Simplify<T> = {[K in keyof T]: T[K]} & {}

export type EntityShape<
  T extends {[x: PropertyKey]: any},
  O extends PropertyKey = never
> = Simplify<Omit<Record<keyof T | (string & {}), any>, O>>

export interface AddressInput {
  street: string
  city: string
}

export interface UserInput {
  email: string
  name: string
  address?: AddressInput
}

export interface SessionInput {
  token: string
  userId: string
  expiresAt: Date
}
