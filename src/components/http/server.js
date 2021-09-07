import path from "path";
import * as fs from "fs";
import fastify from 'fastify'
import jwt from 'fastify-jwt'
import cors from 'fastify-cors'
import * as block from "./block";
import router from "./router";
import {config} from "@core/config";
import fastifyStatic from "fastify-static";
import {isBlocked} from "./block";
import {alertMsg, infoMsg} from "@core/logger";


const jwtSecret = config.WebServer.jwt_secret;

const server80 = fastify({logger: { level: 'warn'}})
let options443 = {logger: {level: 'warn'}}

if (fs.existsSync(config.WebServer.ssl.privkey)){
  options443 = {
    ...options443,
    https: {
      key: fs.readFileSync(config.WebServer.ssl.privkey),
      cert: fs.readFileSync(config.WebServer.ssl.fullchain),
    }
  }
}

const server443 = fastify(options443)


async function build80 () {
  await server80.register(fastifyStatic, {
    root: path.resolve(__dirname, './static/.well-known/acme-challenge'),
    prefix: '/.well-known/acme-challenge',
  })

  server80.addHook('onRequest', async (req, res) => {
    if (isBlocked(req.ip)) res.code(403).send()
    return
  })

  return server80
}

async function build443 () {
  await server443.register(jwt, {secret: jwtSecret})
  await server443.register(cors, {origin: '*'})
  await server443.register(router)
  await server443.register(fastifyStatic, {
    root: path.resolve(__dirname, './static/adm'),
    prefix: '/adm'
  })

  server443.setNotFoundHandler((req, res) => {
    res.sendFile('index.html')
  })

  server443.addHook('onRequest', async (req, res) => {
    if (isBlocked(req.ip)) res.code(403).send()
    return
  })

  return server443
}

build80()
  .then(server => server.listen(80, '0.0.0.0'))
  .then(()=>{infoMsg('80 server started')})
  .catch(alertMsg)


build443()
  .then(server443 => server443.listen(443, '0.0.0.0'))
  .then(()=>{infoMsg('443 server started')})
  .catch(alertMsg)

server80.addHook('onError', async (request, reply, error) => {
  infoMsg(`80 ${request.ip} - ${request.method} - ${request.url} - ${error.message}`)
  block.addToWatch(request.ip)
})

server443.addHook('onError', async (request, reply, error) => {
  infoMsg(`443 ${request.ip} - ${request.method} - ${request.url} - ${error.message}`)
  block.addToWatch(request.ip)
})

export default server443

