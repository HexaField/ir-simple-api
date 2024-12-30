import feathers from '@feathersjs/client'
import Primus from 'primus-client'
import { useEffect } from 'react'

import primusClient from '@ir-engine/client-core/src/util/primus-client'
import { API } from '@ir-engine/common'
import { HyperFlux } from '@ir-engine/hyperflux'

export const useFeathersClient = (host: string) => {
  useEffect(() => {
    const feathersClient = feathers()

    const query = { peerID: HyperFlux.store.peerID }

    const queryString = new URLSearchParams(query).toString()
    const primus = new Primus(`${host}?${queryString}`, {
      withCredentials: false,
      pingTimeout: 30000,
      pingInterval: 10000
    })
    feathersClient.configure(primusClient(primus, { timeout: 10000 }))

    API.instance = feathersClient

    return () => {
      primus.end()
    }
  }, [])
}
