import axios from "axios";
import {config} from "@core/config";
import {infoMsg} from "@core/logger";

let timer

let messagesToSend = {}


const sendMessage = async (msg) => {
  await axios.get(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage?chat_id=${config.telegram.channel}&text=${encodeURI(msg)}`)
    .catch(err => {
      infoMsg('TelegramComponent error: ', err.message)
    })
}

export const sendTelegramMessage = (msg) => {
  let cnt = messagesToSend[msg] || 0
  cnt++
  messagesToSend[msg] = cnt
}


const RunJob = async () => {
  const ifCnt = (key) => key + (messagesToSend[key] > 1 ? ` (${messagesToSend[key]})` : '')
  const msg = Object.keys(messagesToSend).map(ifCnt).join('\n\n')
  messagesToSend = {}
  if (msg) await sendMessage(msg)

  timer = setTimeout(() => {
    RunJob()
  }, 60000)
}

RunJob()
