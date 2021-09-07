import moment from "moment";
import {config} from "@core/config";
import {GoogleSpreadsheet} from "google-spreadsheet";
import {getPresenceTypes} from "@/components/dataBase";
import {alertMsg} from "@core/logger";

const doc = new GoogleSpreadsheet('10Cw0NZRdyX7__5EsaIt3Aw3WWCG8_7whm7WEt359c7w');

const auth = async () => {
  await doc.useServiceAccountAuth(config.GoogleServiceAccount)
  await doc.loadInfo()
}

export const saveUsers = async (users) => {
  try {
    const presentsTypes = getPresenceTypes()
    if(!presentsTypes){
      alertMsg('Polonskiy saveUsers Error: No active DataBase')
      return
    }
    const newSheetName = 'Посещаемость'
    await auth()
    let sheet = doc.sheetsByTitle[newSheetName]
    const date = moment().format('DD.MM.YYYY')
    const rows=[]

    for (const user of users) {
      for (const presenceVal of user.presenceValues) {
        rows.push([
          user.name,
          user.ten + '-ая',
          date,
          presenceVal.presenceName,
          presenceVal.value
        ])
      }
    }

    await sheet.addRows(rows, {insert:false, raw: false})

  }catch (err) {
    alertMsg('PolonskiyComponent saveUsers Error: ',err.message)
    return false
  }
}

