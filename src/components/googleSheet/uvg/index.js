import {config} from "@core/config";
import {getHM} from "@core/utils";
import {getTenStats} from "@/components/dataBase";
import {GoogleSpreadsheet} from "google-spreadsheet";
import {alertMsg} from "@core/logger";

const doc = new GoogleSpreadsheet(config.UVGGoogleSheet.UVGSheetId);

const auth = async () => {
  await doc.useServiceAccountAuth(config.GoogleServiceAccount)
  await doc.loadInfo()
}

const getUsersSheetName = () => {
  const months =['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь']
  const now = new Date()
  return `${now.getFullYear()} ${months[now.getMonth()]}`
}

export const saveUsersData = async (users) => {
  try {
    const now = new Date()
    const nowDay = now.getDate()
    const nowColumnIndex = config.UVGGoogleSheet.usersSheet.usersDataStartColumn + nowDay - 1

    await auth()
    const sheetName = getUsersSheetName()
    const sheet = doc.sheetsByTitle[sheetName]
    if (!sheet) {
      alertMsg('saveUsersData Error: ',sheetName, '- Not Found!')
      return false
    }

    const range = {
      startRowIndex: config.UVGGoogleSheet.usersSheet.startRowIndex,
      endRowIndex: sheet.rowCount,
      startColumnIndex: 0,
      endColumnIndex: sheet.columnCount
    }

    await sheet.loadCells(range)

    for (let rowIndex = config.UVGGoogleSheet.usersSheet.startRowIndex; rowIndex < sheet.rowCount; rowIndex++) {
      const userIdCell = sheet.getCell(rowIndex, 0).value
      if(userIdCell){
        const sheetUser = users.find(u=>u._userId === userIdCell)
        if(sheetUser){
          const userCell = sheet.getCell(rowIndex, nowColumnIndex)
          userCell.formula = `=TIMEVALUE("${getHM()}")`
          userCell.numberFormat = {type: 'TIME', pattern: 'h":"mm'}
        }
      }
    }

    await sheet.saveUpdatedCells()
    return true
  }catch (err) {
    alertMsg('saveUsersData Error: ',err)
    return false
  }

}


export const saveTenPresence = async () => {
  try {

    await auth()
    const sheetName = getUsersSheetName()
    const sheet = doc.sheetsByTitle[sheetName]
    if (!sheet) {
      alertMsg('saveUsersData Error: ',sheetName, '- Not Found!')
      return false
    }

    const range = {
      startRowIndex: config.UVGGoogleSheet.usersSheet.startRowIndex,
      endRowIndex: sheet.rowCount,
      startColumnIndex: 0,
      endColumnIndex: sheet.columnCount
    }

    const tenPresence = await getTenStats()

    await sheet.loadCells(range)

    for (let rowIndex = config.UVGGoogleSheet.usersSheet.startRowIndex; rowIndex < sheet.rowCount; rowIndex++) {
      const userIdCell = sheet.getCell(rowIndex, 0).value
      if(userIdCell){
        const sheetTen = tenPresence?.find((u)=> 'T'+u.ten === userIdCell)
        if(sheetTen){
          const tenCell = sheet.getCell(rowIndex, 2)
          tenCell.value = `${sheetTen.avg_presence}% ${sheetTen.avg_cam}%`
        }
      }
    }

    await sheet.saveUpdatedCells()
    return true
  }catch (err) {
    alertMsg('saveTenPresence Error: ',err)

    return false
  }

}

export const saveToTimeLine = async (users) => {
  try {
    const date = new Date()
    const day = date.getDate()*4-2;

    await auth()
    const sheet = doc.sheetsByTitle[config.UVGGoogleSheet.timeLineSheetName]
    if (!sheet) {
      alertMsg('saveToTimeLine Error: ',config.UVGGoogleSheet.timeLineSheetName, '- Not Found!')
      return false
    }

    const range = {
      startRowIndex: 1,
      endRowIndex: sheet.rowCount,
      startColumnIndex: 0,
      endColumnIndex: sheet.columnCount
    }

    await sheet.loadCells(range)

    for (let rowIndex = 1; rowIndex < sheet.rowCount; rowIndex++) {
      const userIdCell = sheet.getCell(rowIndex, 0).value
      if(userIdCell){

        const tlUser = users.filter(u=>u.userId === userIdCell)

        if(tlUser.length > 0){
          const user = tlUser[0]
          let col = 0
          for (const presenceVal of user.presenceValues) {
            if(presenceVal.presenceId===5){
              sheet.getCell(rowIndex+1, day).value = presenceVal.value
            } else {
              sheet.getCell(rowIndex, day+col).value = presenceVal.value
            }
            col ++
          }
        }
      }
    }

    await sheet.saveUpdatedCells()


    return true

  }catch (err) {
    alertMsg('saveToTimeLine Error: ',err)
    return false
  }
}


