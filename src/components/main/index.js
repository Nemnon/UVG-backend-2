import '@/components/arvut'
import '@/components/http/server'
import * as db from '@/components/dataBase'
import {getLastMeetingReport} from "@/components/zoom";
import {startCalcUsers} from "@/components/userPresence";
import {saveUsers} from "@/components/googleSheet/polonskiy";
import {saveTenPresence, saveToTimeLine, saveUsersData} from "@/components/googleSheet/uvg";
import {alertMsg, infoMsg} from "@core/logger";
import {ifEndSchedule, ifSchedule} from "@/components/dataBase";
import {config} from "@core/config";

let timer;
const allUsers = new Map();
const UsersToSaveUVGSheet = []

export const getAllUsers = () => Array.from(allUsers)

const removeTimeoutUsers = () => {
  allUsers.forEach((user, key) => {
    if (new Date().getTime() - user.time > config.arvut.userTimeOut) {
      allUsers.delete(key)
      // console.log('DELETE USER - ', key)
    }
  })
}

export const loadUsers = async (users) => {

  try {
    const isSchedule = await ifSchedule()

    for (let user of users) {
      // user.time = new Date().getTime();

      if (user?.key?.length > 10) {
        user._userId = await db.getUserIdFromKey(user.key)
      } else {
        user._userId = await db.getUserIdFromName(user.username)
      }

      user.realName = user.username

      if (user._userId > 0){
        user.realName = await  db.getUserName(user._userId)
      }

      const key = user._userId || user.key || user.username

      if (!allUsers.has(key)) {
        await db.addUserEvent(user)
      } else {
        const usr = allUsers.get(key)
        usr.time = new Date().getTime()
      }

      allUsers.set(key, user)
      // console.log('loadUsers', user)

      if (user._userId > 0 && isSchedule) {
        const userWasToday = await db.getUserWasToday(user)
        if (!userWasToday) {
          UsersToSaveUVGSheet.push(user)
        }
        await db.addUserToTimeLine(user)
      }

      if (user.agent === 'zoom'){
        if (user.joined){
          const udate = new Date()
          udate.setHours( udate.getHours() + 4 )
          user.time = new Date(udate).getTime()
        } else {
          allUsers.delete(key)
        }
      }


    }

  } catch (err) {
    alertMsg('loadUsers Error: ', err.message)
  }

}

const onTimerEvent = async () => {
  const schedule = await ifEndSchedule()
  if (schedule) {
    infoMsg('onTimerEvent - start')
    await getLastMeetingReport()
    const calc = await startCalcUsers()
    if (calc) {
      await saveToTimeLine(calc)
      await saveUsers(calc)
    }
    await saveTenPresence()
    rearmTimer()
    infoMsg('onTimerEvent - end')
  } else {
    rearmTimer()
  }
  removeTimeoutUsers();

  ///////////// FIND USERS TO SAVE IN UVG TABLE SHEET
  if (UsersToSaveUVGSheet.length > 0) {
    try {
      await saveUsersData(UsersToSaveUVGSheet)
      UsersToSaveUVGSheet.splice(0, UsersToSaveUVGSheet.length) // empty array
    } catch (e) {
      alertMsg(e.message)
    }
  }

}

const rearmTimer = () => {
  clearTimeout(timer)
  const now = new Date()
  const delay = 60000 - (now.getTime() % 60000); // exact ms to next minute interval
  timer = setTimeout(() => {
    onTimerEvent()
  }, delay);
}

export const init = () => {
  infoMsg('Started!')
  onTimerEvent()
}

init()

