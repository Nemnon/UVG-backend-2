import moment from "moment";

export function copyObject(data){
  return JSON.parse(JSON.stringify(data))
}

export async function wait(ms){
  return new Promise(resolve=>setTimeout(resolve,ms))
}

export function log(...args){
  console.log(getDateTime(), ...args)
}

export function getDate(d = undefined){
  return moment(d).format('YYYY-MM-DD')
}

export function getDateTime(d= undefined){
  return moment(d).format('YYYY-MM-DD HH:mm:ss')
}

export function getHM(d= undefined){
  return moment().format('H:mm')
}

