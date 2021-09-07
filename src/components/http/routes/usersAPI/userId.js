import {getUserData} from "@/components/dataBase";

export const options = {
  schema: {
    params: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {id: {type: 'number'}}
    }
  }
}

export const handler = async (request, reply) => {
  await request.jwtVerify()
  try {
    const {id} = request.params;
    const user = await getUserData(id)
    return reply.code(200).send(user)
  } catch (err) {
    return reply.code(500).send({error: err.message})
  }
}
