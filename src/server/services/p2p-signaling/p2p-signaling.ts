import { BadRequest } from '@feathersjs/errors'
import { Application, Params } from '@feathersjs/feathers'
import { NetworkID, PeerID, UserID } from '@ir-engine/hyperflux'
import { MessageTypes } from '@ir-engine/network'
import { p2pSignalingPath } from '../../../schemas/p2p-signaling/p2p-signaling.schema'

let peerIndex = 0

type PeerInfo = {
  peerID: PeerID
  peerIndex: number
  userID: UserID
}

// since we don't have a database, we'll store the peers in memory
const peers = {} as Record<NetworkID, PeerInfo[]>

type JoinSignalingDataType = {
  networkID: NetworkID
}

type SignalData = {
  networkID: NetworkID
  targetPeerID: PeerID
  fromPeerID: PeerID
  message: MessageTypes
}

const peerJoin = async (app: Application, data: JoinSignalingDataType, params: Params) => {
  const peerID = params.socketQuery!.peerID

  if (!peerID) throw new BadRequest('PeerID required')

  if (!data?.networkID) throw new BadRequest('networkID required')

  app.channel(`peerIds/${peerID}`).join(params.connection!)

  const newPeerIndex = peerIndex++

  if (!peers[data.networkID]) peers[data.networkID] = [] as PeerInfo[]
  peers[data.networkID].push({
    peerID,
    peerIndex: newPeerIndex,
    /** @todo - figure out user service somehow */
    userID: peerID as any as UserID
  })

  console.info(`Peer ${peerID} joined instance ${data.networkID}`)

  return {
    index: newPeerIndex
  }
}

declare module '@ir-engine/common/declarations' {
  interface ServiceTypes {
    [p2pSignalingPath]: {
      create: (data: JoinSignalingDataType, params?: Params) => ReturnType<typeof peerJoin>
      patch: (id: null, data: Omit<SignalData, 'fromPeerID'>, params?: Params) => Promise<SignalData>
      find: (params?: Params) => Promise<PeerInfo[]>
    }
  }
}

export default function (app: Application) {
  app.use(p2pSignalingPath, {
    create: async (data: JoinSignalingDataType, params) => peerJoin(app, data, params!),
    patch: async (id: null, data: SignalData, params) => {
      const peerID = params!.socketQuery!.peerID
      const networkID = data.networkID
      const targetPeerID = data.targetPeerID

      if (!peerID) throw new BadRequest('peerID required')
      if (!targetPeerID) throw new BadRequest('targetPeerID required')
      if (!networkID) throw new BadRequest('networkID required')

      // from here, we can leverage feathers-sync to send the message to the target peer
      data.fromPeerID = peerID
      return data
    },
    find: async (params?: Params) => {
      const networkID = params?.query?.networkID as NetworkID
      if (!networkID) return [] as PeerInfo[]
      return peers[networkID] || ([] as PeerInfo[])
    }
  })

  app.service(p2pSignalingPath)

  app.on('disconnect', async (connection) => {
    const peerID = connection.socketQuery.peerID
    if (!peerID) return
    app.channel(`peerIds/${peerID}`).leave(connection)
    for (const networkID in peers) {
      const peerIndex = peers[networkID].findIndex((peer) => peer.peerID === peerID)
      if (peerIndex !== -1) {
        peers[networkID].splice(peerIndex, 1)
        console.info(`Peer ${peerID} left instance ${networkID}`)
      }
      if (peers[networkID].length === 0) delete peers[networkID]
    }
  })

  app.service(p2pSignalingPath).publish('patched', async (data: SignalData, context) => {
    return app.channel(`peerIds/${data.targetPeerID}`).send(data)
  })
}
