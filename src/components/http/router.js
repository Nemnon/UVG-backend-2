import {FastifyPluginAsync} from "fastify";
import * as loginRoute from '@/components/http/routes/login'
import * as zoomRoute from '@/components/http/routes/zoom'
import * as apiUserId from '@/components/http/routes/usersAPI/userId'
import * as apiUsers from '@/components/http/routes/usersAPI/users'
import * as apiLogs from '@/components/http/routes/usersAPI/getLogs'
import * as apiUserPost from '@/components/http/routes/usersAPI/userPost'
import * as apiUsersEvents from '@/components/http/routes/usersAPI/usersEvents'
import * as apiUsersOnline from '@/components/http/routes/usersAPI/usersOnline'


// https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md


const pluginCallback = async (server, options) => {

  server.post('/login', loginRoute.options, loginRoute.handler)
  server.post('/zoom', zoomRoute.handler)

  ////////// API ///////////
  server.get( '/api/users', apiUsers.handler)
  server.get( '/api/users/events', apiUsersEvents.handler)
  server.get( '/api/users/online', apiUsersOnline.handler)
  server.get( '/api/user/:id', apiUserId.options, apiUserId.handler)
  server.post('/api/user', apiUserPost.options, apiUserPost.handler)
  server.get( '/api/logs', apiLogs.handler)


}

export default pluginCallback
