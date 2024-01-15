import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { KVNamespace } from '@cloudflare/workers-types'
import { connect } from '@planetscale/database'
//import { customAlphabet } from 'nanoid'
//import { signToken, hashPassword } from '@fromafrica/edge-api'

type Bindings = {
	ENVIRONMENT: string
	NSCACHE: KVNamespace
	TOKEN: string
	DATABASE_HOST: string;
	DATABASE_NAME: string;
	DATABASE_USERNAME: string;
	DATABASE_PASSWORD: string;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', async (c, next) => {
	const auth = bearerAuth({ token: c.env.TOKEN })
	return await auth(c, next)
})

app.post('/dns-query', async (c) => {

    const reqBody = await c.req.json();

    if (!reqBody || !reqBody.domain || !reqBody.type) {
		c.status(500)
		c.header('Content-Type', 'application/json')
		return c.body('{ "status": "500", "message": "error detected" }')
	}

    const domain = reqBody.domain;
    const requestedType = reqBody.type;

	try {
		let domainCache = await c.env.NSCACHE.get(domain)

		if (domainCache === null) {  
			return c.json({ status: '404', message: 'not found' })
		}

		let recordParsed = JSON.parse(domainCache)

		if (recordParsed.type !== requestedType) {
			return c.json({ status: '404', message: 'not found' })
		}

		return c.json({ status: '200', message: 'valid', query: domain, record: recordParsed })

	} catch (e) {
		console.log(e)
		return c.json({ status: '500', message: e })
	}
})


app.post('/cache-update', async (c) => {

    const reqBody = await c.req.json();

    if (!reqBody || !reqBody.domain || !reqBody.record) {
		c.status(200)
		c.header('Content-Type', 'application/json')
		return c.body('{ "error": "error detected." }')
	}

    const domain = reqBody.domain;
    const record = reqBody.record;

	try {
		await c.env.NSCACHE.put(domain, record)

		console.log('domain: '+ domain)
		console.log('record: '+ record)

		return c.json({ status: 200, message: 'record updated', domain: domain, record: record })

	} catch (e) {
		console.log(e)
		return c.json({ error: 'system error' })
	}
})


app.post('/cache-create', async (c) => {

    const reqBody = await c.req.json();

    if (!reqBody || !reqBody.domain || !reqBody.record) {
		c.status(200)
		c.header('Content-Type', 'application/json')
		return c.body('{ "error": "error detected." }')
	}

    const domain = reqBody.domain;
    const record = reqBody.record;

	try {
		await c.env.NSCACHE.put(domain, record)

		return c.json({ status: 200, message: 'record updated', domain: domain, record: record })

	} catch (e) {
		console.log(e)
		return c.json({ error: 'system error' })
	}
})

export default app