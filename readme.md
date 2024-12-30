# ir-simple-api

A simple server API for iR Engine using feathers without a database.

### Consuming the server API

```ts
const config: Configuration = {
  clientHost: process.env['CLIENT_HOST'] || 'localhost',
  clientPort: Number(process.env['CLIENT_PORT']) || null,
  serverHost: process.env['SERVER_HOST'] || 'localhost',
  serverPort: Number(process.env['SERVER_PORT']) || 3030,
  certPath: process.env['CERT'] || null,
  keyPath: process.env['KEY'] || null
}

const services = (app: Application) => {
  baseServices(app)
}

createApp(services, config)
```

Notes:
- Leaving certPath or keyPath null will disable SSL.
- Leaving the clientPort empty assumes a domain is used.

## Services

**/p2p-signaling** - A signaling service for peer to peer sessions

### Peer to Peer Signaling

Ensure the server has baseServices configured (or that at least the p2p-signaling service is configured)

Two react hooks are exposed that use iR Engine's common API interface (thus feathers hooks)

```ts
useFeathersClient('https://localhost:3030') // server IP
useP2PSignaling('my room' as NetworkID)
```


## Todo

- Auth/User service, maybe requiring a database?
- Add example to repo