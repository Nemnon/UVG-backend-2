import axios from "axios";
import {config} from "@core/config";
import * as querystring from "querystring";
import {loadUsers} from "@/components/main";
import {alertMsg} from "@core/logger";
import {ifSchedule} from "@/components/dataBase";

let token
let timer

const checkExpire = () => {
  if (!token) {
    return true
  }
  return new Date().getTime() > token.expire
}

const chekToken = async () => {
  if (checkExpire()) {
    let res = await updateToken()
    if (!res) {
      res = await getNewAccessToken()
    }
    return res
  } else {
    return true
  }
}

const setToken = (newToken) => {

  let expire = new Date();
  expire.setSeconds(expire.getSeconds() + newToken.expires_in - 30);

  let expireRefresh = new Date();
  expireRefresh.setSeconds(expireRefresh.getSeconds() + newToken.refresh_expires_in - 30);

  token = {
    ...newToken,
    expire: expire.getTime(),
    expireRefresh: expireRefresh.getTime()
  }
}

const updateToken = async () => {
  if (!token || new Date().getTime() > token.expireRefresh) {
    return false
  }
  const params = {
    'grant_type': 'refresh_token',
    'refresh_token': token.refresh_token,
    'client_id': 'galaxy'
  }

  try {
    const res = await axios.post(config.arvut.tokenUrl, querystring.stringify(params))
    const data = res.data

    if (data?.access_token) {
      setToken(data)
      return true
    } else {
      alertMsg('updateToken error:', JSON.stringify(res.data))
    }
  } catch (err) {
    alertMsg('updateToken error:', err.message)
  }
  return false
}

const getNewAccessToken = async () => {
  try {
    const res = await axios.post(config.arvut.tokenUrl, querystring.stringify(config.arvut.tokenAuthData))
    const data = res.data

    if (data?.access_token) {
      setToken(data)
      return true
    } else {
      alertMsg('getNewAccessToken error:', JSON.stringify(res.data))
    }
  } catch (err) {
    alertMsg('getNewAccessToken error:', err.message)
  }
  return false
}

const getUsersInRoom = async (room) => {
  let users = []
  try {
    if (token) {
      const {data} = await axios.get('https://gxydb.kli.one/galaxy/room/' + room, {
        headers: {authorization: `${token.token_type} ${token.access_token}`}
      })
      if (data.users) {
        users = data.users
      }
    }
  } catch (e) {
    alertMsg('getUsersInRoom error:', e.message)
  }
  return users
}

const getUsersInRooms = async () => {
  let res = await chekToken()
  if (!res) {
    throw new Error('getUsersInRooms error: No active token')
  }
  const rooms = config.arvut.rooms
  const promises = rooms.map(async (room) => {
    const usr = await getUsersInRoom(room)
    return usr.map((a) => {
      return {
        agent: 'arvut',
        key: a.id,
        email: a.email,
        username: a.username || a.display,
        camera: a.camera,
        time: new Date().getTime(),
        _userId: 0
      }
    })
  })

  const data = await Promise.all(promises)

  return data.flat()
}

const runRequest = async () => {
  try {
    const schedule = await ifSchedule()
    if (schedule) {
      const users = await getUsersInRooms()
      if (users?.length > 0) {
        loadUsers(users)
      }
    }
  } catch (e) {
    alertMsg('runRequest Error: ', e.message)
  }
  timer = setTimeout(() => {
    runRequest()
  }, config.arvut.getRoomsPeriod)
}

runRequest()
