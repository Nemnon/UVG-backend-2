import {getAllUsers} from "@/components/main";

export const handler = async (request, reply) =>{
  await request.jwtVerify()
  const users = getAllUsers()
  return reply.code(200).send(users)
}
