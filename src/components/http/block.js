import {config} from "@core/config";
import {infoMsg} from "@core/logger";


const countToBlock = config.block.countToBlock
const blockTimeOut = config.block.blockTimeOut // 1 day
const watchIps = {}

export const addToWatch = (ip) => {
  const wip = watchIps[ip]
  if (!wip) {
    watchIps[ip] = {
      ip,
      count: 1,
      lastDate: new Date().getTime(),
      block: false
    }
  } else {
    wip.count ++
    wip.lastDate = new Date().getTime()
    if (wip.count >= countToBlock) {
      wip.block = true
      infoMsg(ip, '- is blocked now')
    }
  }
}

export const isBlocked = (ip) => {
  for (const key of Object.keys(watchIps)) {
    if (watchIps[key].lastDate + blockTimeOut < new Date().getTime()) {
      if (watchIps[key].block){
        infoMsg(key, '- lock timed out, removed from watchlist.')
      }
      delete watchIps[key]
    }
  }
  const wip = watchIps[ip]
  if (wip?.block){
    wip.lastDate = new Date().getTime()
    return true
  }
  return false
}
