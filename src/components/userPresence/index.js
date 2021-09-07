import {deleteOldRecords, getPresenceTypes, getUsersTimeLine, saveUsersPresences} from "@/components/dataBase";
import {infoMsg} from "@core/logger";

export const startCalcUsers = async () => {
  try{
    const date = new Date()
    const tl = await getUsersTimeLine(date)
    const pt = await getPresenceTypes()
    const calc = calcUsers(tl, date, pt)
    saveUsersPresences(calc)
      .then(()=>{
        deleteOldRecords()
      })
    return calc
  } catch (err) {
    infoMsg('startCalcUsers Error: ', err.message)
  }
}

const createRanges = (date, rangesTypes) => {
  const ranges = []
  const now = new Date(date)
  for (const range of rangesTypes) {
    let start = new Date(now)
    start.setHours(range.start_h)
    start.setMinutes(range.start_m)
    start.setSeconds(0)

    let end = new Date(now)
    end.setHours(range.end_h)
    end.setMinutes(range.end_m)
    end.setSeconds(0)
    ranges.push(
      {
        presenceId: range.id,
        presenceName: range.name,
        startDate: start.getTime(),
        endDate: end.getTime()}
    )
  }

  return ranges
}

const calcUserRange = (user, range) => {
  let value = 0
  let start = 0
  let stop = 0

  const userEndDate = user.date_exit.getTime()
  const userStartDate = user.date_enter.getTime()
  if( userStartDate < range.endDate && userEndDate > range.startDate ){

    if( userStartDate < range.startDate ){
      start = range.startDate;
    } else {
      start = userStartDate;
    }

    if( userEndDate < range.endDate ){
      stop = userEndDate;
    } else {
      stop = range.endDate;
    }

    value = stop - start;
  }

  return value
}

const calcUserRanges = (user, ranges) => {

  const result = {
    userId: user.userId,
    name: user.name,
    ten: user.ten,
    presenceValues: []
  }
  for (const range of ranges) {
    let rangeUserValue = 0

    if(range.presenceId === 5){ // CAMERA
      for (const userEE of user.rangesCamera) {
        rangeUserValue += calcUserRange(userEE, range)
      }
    } else {
      for (const userEE of user.rangesEnterExit) {
        rangeUserValue += calcUserRange(userEE, range)
      }
    }

    result.presenceValues.push({
      presenceId: range.presenceId,
      presenceName: range.presenceName,
      value: Math.round(rangeUserValue * 100 / (range.endDate - range.startDate))
    })
  }

  return result
}

export const calcUsers = (users, date, presentsTypes) => {
  const ranges = createRanges(date, presentsTypes)
  const result = []
  for (const tlUser of users) {
    result.push(
      calcUserRanges(tlUser, ranges)
    )
  }
  return result
}
