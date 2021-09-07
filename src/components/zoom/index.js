import Axios from "axios";
import {config} from "@core/config";
import {getDate, getDateTime, wait} from "@core/utils";
import {addZoomUsersToTimeLine} from "@/components/dataBase";
import {alertMsg, infoMsg} from "@core/logger";

const axios = Axios.create({
  baseURL: 'https://api.zoom.us'
});

axios.defaults.headers.common['Authorization'] = `Bearer ${config.zoom.authToken}`

const forceFinishMeeting = async () => {
  await axios.put(`v2/meetings/${config.zoom.meetingId}/status`, {action: 'end'})
}

const getLastMeetingReportFromZoom = async () => {
  const users = []
  const now = getDate()

  const ans = await axios.get(`https://api.zoom.us/v2/report/meetings/${config.zoom.meetingId}/participants?page_size=300`)
  const data = ans.data

  if (data?.participants?.length > 0) {
    for (const user of data.participants) {
      user.join_time = getDateTime(user.join_time)
      user.leave_time = getDateTime(user.leave_time)
      if (now === getDate(user.join_time)) {
        users.push(user)
      }
    }
  }
  return users
}

export const getLastMeetingReport = async () => {
  infoMsg('Zoom - finish meeting...')
  await wait(5000)
  try {
    await forceFinishMeeting()
    infoMsg('Zoom - get report...')
    let rep = []
    for (let i = 0; i < 10; i++) {
      rep = await getLastMeetingReportFromZoom()
      if (rep.length === 0) {
        infoMsg('Zoom - users is empty, repeat...')
        await wait(5000)
      } else {
        infoMsg(`Zoom - received users: ${rep.length}`)
        break
      }
    }
    if (rep.length > 0) {
      await addZoomUsersToTimeLine(rep)
    }
    return true
  } catch (err) {
    alertMsg('getLastMeetingReport Error:', err.message)
    return false
  }

}

