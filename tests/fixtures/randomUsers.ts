import {faker} from "@faker-js/faker"
import type {MikroORM} from "@mikro-orm/sqlite"

import type {UserInput} from "../utils/types.js"

import {User} from "./entities/defaults.js"

type OnUserCreatedCallback = (user: UserInput, index: number) => UserInput

type CreateOneUser = () => UserInput

type CreateManyUsers = (
  amount?: number,
  cb?: OnUserCreatedCallback
) => UserInput[]

type CreateAndFlushOneUser = () => Promise<User>

type CreateAndFlushManyUsers = (
  amount?: number,
  cb?: OnUserCreatedCallback
) => Promise<User[]>

export interface RandomUserUtils {
  createOne: CreateOneUser
  createMany: CreateManyUsers
  createAndFlushOne: CreateAndFlushOneUser
  createAndFlushMany: CreateAndFlushManyUsers
}

export function createRandomUsersUtils(orm: MikroORM): RandomUserUtils {
  const createOne: CreateOneUser = () => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const name = [firstName, lastName].join(" ")
    const email = faker.internet.email({firstName, lastName})

    return {email, name}
  }

  const createMany: CreateManyUsers = (amount, cb) =>
    Array.from({length: amount || 1}, (_, index) => {
      const user = createOne()

      return {...user, ...cb?.(user, index)}
    })

  const createAndFlushOne: CreateAndFlushOneUser = async () => {
    const user = orm.em.create(User, createOne(), {
      persist: true
    })

    await orm.em.flush()

    return user
  }

  const createAndFlushMany: CreateAndFlushManyUsers = async (amount, cb) => {
    const users = createMany(amount, cb).map(user =>
      orm.em.create(User, user, {
        persist: true
      })
    )

    await orm.em.flush()

    return users
  }

  return {
    createOne,
    createMany,
    createAndFlushOne,
    createAndFlushMany
  }
}
