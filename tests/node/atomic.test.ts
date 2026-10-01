import * as entities from "../fixtures/entities/atomic.ts"
import {createOrm} from "../fixtures/orm.ts"
import {defineAtomicSuite} from "../utils/atomicSuite.ts"

const orm = createOrm({entities: Object.values(entities)})

defineAtomicSuite(() => orm)
