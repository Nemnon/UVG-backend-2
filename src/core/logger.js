import {addLog} from "@/components/dataBase";
import {sendTelegramMessage} from "@/components/telegramBot";

let timer
let messages = {}

const addMessage = (type, ...args) => {
  // console.log(args)
  const newMsg = args.join(' ')
  const msg = messages[newMsg]
  if (!msg) {
    messages[newMsg] = {
      cnt: 1,
      date: new Date(),
      type
    }
  } else {
    messages[newMsg].cnt ++
  }
}

const RunJob = async () => {
  const msgKeys = Object.keys(messages)
  if (msgKeys.length > 0) {
    for (const key of msgKeys) {
      const msg = messages[key]
      const addResult = await addLog(msg.date, key, msg.cnt)
      if (!addResult) {
        console.log(key, msg.cnt)
      }
      if (msg.type === 'telegram') {
        sendTelegramMessage(key)
      }
    }
  }
  messages = {}
  timer = setTimeout(() => {
    RunJob()
  }, 60000)
}

RunJob()


export const infoMsg = (...args) => addMessage('db', ...args)
export const alertMsg = (...args) => addMessage('telegram', ...args)
