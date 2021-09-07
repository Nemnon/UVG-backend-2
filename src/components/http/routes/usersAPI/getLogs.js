import {getLogs} from "@/components/dataBase";

export const handler = async (request, reply) =>{
  await request.jwtVerify()
  try{
    const users = await getLogs()
    return reply.code(200).send(users)
  }catch (e) {
    return reply.code(500).send({ error: 'Database error!' })
  }
}
