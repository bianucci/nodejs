import createRequestBuilder from '@commercetools/api-request-builder'
import { createClient } from '@commercetools/sdk-client'
import {
  createAuthMiddlewareForClientCredentialsFlow,
} from '@commercetools/sdk-middleware-auth'
import {
  createHttpMiddleware,
} from '@commercetools/sdk-middleware-http'
import {
  createQueueMiddleware,
} from '@commercetools/sdk-middleware-queue'
import omit from 'lodash.omit'

// FIXME
const projectKey = 'foo'
const clientId = '123'
const clientSecret = 'secret'

const ignoredResponseKeys = [ 'id', 'createdAt', 'lastModifiedAt' ]

const service = createRequestBuilder().channels

const authMiddleware = createAuthMiddlewareForClientCredentialsFlow({
  host: 'https://auth.sphere.io',
  projectKey,
  credentials: {
    clientId,
    clientSecret,
  },
})
const httpMiddleware = createHttpMiddleware({
  host: 'https://api.sphere.io',
})
const queueMiddleware = createQueueMiddleware({
  concurrency: 5,
})
const client = createClient({
  middlewares: [
    authMiddleware,
    httpMiddleware,
    queueMiddleware,
  ],
})

describe('Channels', () => {
  const key = uniqueId('channel_')
  let channelResponse

  it('create', () => {
    const body = {
      key,
      name: { en: key },
    }
    const createRequest = {
      uri: service.build({ projectKey }),
      method: 'POST',
      body,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }

    return client.execute(createRequest)
    .then((response) => {
      channelResponse = response.body
      expect(omit(response.body, ignoredResponseKeys)).toEqual({
        ...body,
        roles: ['InventorySupply'],
        version: 1,
      })
      expect(response.statusCode).toBe(201)
    })
  })

  it('fetch', () => {
    const fetchRequest = {
      uri: service.where(`key = "${key}"`).build({ projectKey }),
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }

    return client.execute(fetchRequest)
    .then((response) => {
      expect(response.body.results).toHaveLength(1)
      expect(response.statusCode).toBe(200)
    })
  })

  it('update', () => {
    const updateRequest = {
      uri: service.byId(channelResponse.id).build({ projectKey }),
      method: 'POST',
      body: {
        version: channelResponse.version,
        actions: [
          { action: 'addRoles', roles: ['OrderImport'] },
        ],
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }

    return client.execute(updateRequest)
    .then((response) => {
      channelResponse = response.body
      expect(omit(response.body, ignoredResponseKeys)).toEqual({
        key,
        name: { en: key },
        roles: ['InventorySupply', 'OrderImport'],
        version: 2,
      })
      expect(response.statusCode).toBe(200)
    })
  })

  it('delete', () => {
    const uri = service.byId(channelResponse.id).build({ projectKey })
    const deleteRequest = {
      uri: `${uri}?version=${channelResponse.version}`,
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }

    return client.execute(deleteRequest)
    .then((response) => {
      expect(response.statusCode).toBe(200)
    })
  })
})

let uniqueIdCounter = 0
function uniqueId (prefix) {
  const id = `${Date.now()}_${uniqueIdCounter}`
  uniqueIdCounter += 1
  return prefix ? prefix + id : id
}