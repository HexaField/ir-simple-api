import feathers from '@feathersjs/client'
import Primus from 'primus-client'
import { useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'

import primusClient from '@ir-engine/client-core/src/util/primus-client'
import { API } from '@ir-engine/common'
import {
  HyperFlux,
  NO_PROXY,
  UserID,
  defineState,
  getMutableState,
  syncStateWithLocalStorage
} from '@ir-engine/hyperflux'
import { EngineState } from '@ir-engine/spatial/src/EngineState'

/**
 * @todo a simple user service to persist userids across refreshes - not secure
 */
const UserState = defineState({
  name: 'hexafield.ir-simple-api.UserState',
  initial: {
    userID: '' as UserID
  },
  extension: syncStateWithLocalStorage(['userID'])
})

export const useFeathersClient = (host: string) => {
  useEffect(() => {
    const userID = getMutableState(UserState).userID

    if (!userID.value) userID.set(uuidv4() as UserID)

    getMutableState(EngineState).userID.set(userID.get(NO_PROXY))

    const feathersClient = feathers()

    const query = { peerID: HyperFlux.store.peerID, userID: userID.value }

    const queryString = new URLSearchParams(query).toString()
    const primus = new Primus(`${host}?${queryString}`, {
      withCredentials: false,
      pingTimeout: 30000,
      pingInterval: 10000
    })
    feathersClient.configure(primusClient(primus, { timeout: 10000 }))

    primus.on('open', () => {
      console.log('Connection is alive and kicking')
    })

    API.instance = feathersClient

    return () => {
      primus.end()
    }
  }, [])
}
