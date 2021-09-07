import {config} from "@core/config";
import {loadUsers} from "@/components/main";
import {log} from "@core/utils";


export const handler = async (req, reply) => {
  const body = req.body
  const auth = req.headers.authorization
  try {
    if (auth && auth === config.zoom.IncomingAuthKey) {
      const meetingId = body?.payload?.object?.id
      if (meetingId && meetingId === config.zoom.meetingId) {

        const userJoined = body?.event === 'meeting.participant_joined'
        const userName = body?.payload?.object?.participant?.user_name
        const userZoomId = body?.payload?.object?.participant?.id
        const userEmail = body?.payload?.object?.participant?.email
        let eventTime

        if (userJoined) {
          eventTime = body?.payload?.object?.participant?.join_time
        } else {
          eventTime = body?.payload?.object?.participant?.leave_time
        }

        const result = {
          agent: 'zoom',
          joined: userJoined,
          key: userZoomId ? userZoomId : '',
          username: userName ? userName : '',
          _userId: 0,
          camera: false,
          email: userEmail ? userEmail : '',
          time: new Date(eventTime).getTime()
        }

        loadUsers([result])
      }
      return reply.code(200).send('ok')
    } else {
      return reply.code(400).send('failed')
    }
  } catch (err) {
    log(err.message)
  }
}
