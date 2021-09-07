import {updateUser} from "@/components/dataBase";


export const options = {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'id', 'ten', 'userAliases', 'userKeys'],
      properties: {
        name: {
          type: 'string',
          minLength: 3,
          maxLength: 32
        },
        id: {type: 'number', minimum: 0},
        ten: {type: 'number', minimum: 1},
        userAliases: {
          type: 'array',
          items: {
            type: 'object',
            required: ['mod', 'id', 'val'],
            properties: {
              id: {type: 'number'},
              mod: {type: 'string', minLength: 1, maxLength: 1},
              val: {type: 'string', minLength: 3},
            }
          }
        },
        userKeys: {
          type: 'array',
          items: {
            type: 'object',
            required: ['mod', 'id', 'val'],
            properties: {
              id: {type: 'number'},
              mod: {type: 'string', minLength: 1, maxLength: 1},
              val: {type: 'string', minLength: 3},
            }
          }
        }
      }
    }
  }
}

export const handler = async (request, reply) => {
  await request.jwtVerify()
  try {
    const user = request.body
    const id = await updateUser(user)
    return reply.code(200).send({id})
  } catch (err) {
    return reply.code(500).send({error: err.message})
  }
}
