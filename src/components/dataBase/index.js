import moment from "moment";
import mariadb from 'mariadb'
import {config} from "@core/config";
import {getDateTime} from "@core/utils";
import {alertMsg, infoMsg} from "@core/logger";

const USER_TIMEOUT = 5 * 60 * 1000;

const pool = mariadb.createPool({
  host: config.DataBase.host,
  user: config.DataBase.user,
  password: config.DataBase.password,
  charset: config.DataBase.charset,
  database: config.DataBase.database,
  connectionLimit: 10
});


export const getUserIdFromKey = async (id) => {
  if (!id || id === '') {
    return 0
  }
  let conn;
  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT user_id FROM users_keys WHERE user_key = ?', [id])

    if (rows && rows.length > 0) {
      return rows[0].user_id
    }
    return 0
  } catch (err) {
    infoMsg(err.message);
    return 0
  } finally {
    if (conn) conn.release();
  }
}

export const getUserIdFromName = async (name) => {
  if (!name || name === '') {
    return 0
  }
  let conn;
  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT user_id FROM users_aliases WHERE INSTR(LOWER(?),LOWER(user_alias)) > 0', [name])

    if (rows && rows.length > 0) {
      return rows[0].user_id
    }
    return 0
  } catch (err) {
    infoMsg(err.message);
    return 0
  } finally {
    if (conn) conn.release();
  }
}

export const getUserWasToday = async (user) => {
  let conn;
  try {
    conn = await pool.getConnection()
    const rows = await conn.query('select user_id from timeline where user_id = ? and DATE(date_enter) = CURDATE()', [user._userId])
    return rows?.length > 0;

  } catch (err) {
    infoMsg(err.message);
    return false
  } finally {
    if (conn) conn.release();
  }
}

export const deleteOldRecords = async () => {
  let conn;
  try {
    conn = await pool.getConnection()
    await conn.query('DELETE FROM timeline WHERE DATE(date_enter) <> CURDATE()')
    await conn.query('DELETE FROM timeline_cam WHERE DATE(date_enter) <> CURDATE()')
    await conn.query('DELETE FROM users_events WHERE event_date < NOW() - INTERVAL 24 HOUR')

  } catch (err) {
    infoMsg(err.message);
  } finally {
    if (conn) conn.release();
  }
}

export const addUserEvent = async (user) => {
  let conn;
  try {
    conn = await pool.getConnection()
    await conn.query('INSERT INTO users_events(user_id, event_date, name, `key`, email) VALUES(?,NOW(),?,?,?)', [
      user._userId,
      user.username,
      user.key,
      user.email
    ])
  } catch (err) {
    infoMsg(err.message);
  } finally {
    if (conn) conn.release();
  }
}

const _addUserToTimeLine = async (user, table) => {
  let conn;

  try {
    conn = await pool.getConnection()
    const rows = await conn.query(`SELECT *
                                   FROM ${table}
                                   WHERE DATE(date_enter) = CURDATE()
                                     AND user_id = ?
                                   ORDER BY date_enter DESC LIMIT 1`, [user._userId])
    if (rows && rows.length === 0) {
      await conn.query(`INSERT INTO ${table}(user_id, date_enter, date_exit)
                        VALUES (?, NOW(), NOW())`, [user._userId])
    } else {
      const now = new Date().getTime()
      const dte = new Date(rows[0].date_exit).getTime()
      if (now > dte) {
        if (now - dte < USER_TIMEOUT) {
          await conn.query(`UPDATE ${table}
                            SET date_exit = NOW()
                            WHERE id = ?`, [rows[0].id])
        } else {
          await conn.query(`INSERT INTO ${table}(user_id, date_enter, date_exit)
                            VALUES (?, NOW(), NOW())`, [user._userId])
        }
      }
    }
  } catch (err) {
    infoMsg(err.message)
  } finally {
    if (conn) conn.release();
  }
}

export const addUserToTimeLine = async (user) => {
  if (user._userId === 0) {
    return
  }
  await _addUserToTimeLine(user, 'timeline')
  if(user.camera === true){
    await _addUserToTimeLine(user, 'timeline_cam')
  }
}

export const getUsersTimeLine = async (date) => {
  let conn;
  const result = []
  try {
    conn = await pool.getConnection()
    const users = await conn.query('SELECT id, ten, name FROM users')
    if (users && users.length > 0) {
      for (const user of users) {

        const tlUser = {
          name: user.name,
          userId: user.id,
          ten: user.ten,
          rangesCamera: [],
          rangesEnterExit: []
        }
        tlUser.rangesEnterExit = await conn.query('SELECT date_enter, date_exit FROM timeline WHERE DATE(date_enter) = DATE(?) AND user_id = ?', [date, user.id])

        tlUser.rangesCamera = await conn.query('SELECT date_enter, date_exit FROM timeline_cam WHERE DATE(date_enter) = DATE(?) AND user_id = ?', [date, user.id])

        result.push(tlUser)
      }
    }
    return result
  } catch (err) {
    infoMsg(err.message)
    return result
  } finally {
    if (conn) conn.release();
  }
}

export const addZoomUsersToTimeLine = async (users) => {
  let conn;
  try {
    conn = await pool.getConnection()
    for (const user of users) {
      let userId = 0

      if (user.id === '') {
        userId = await getUserIdFromName(user.name)
      } else {
        userId = await getUserIdFromKey(user.id)
      }

      if (userId > 0) {
        const userDateEnter = moment(user.join_time).unix()
        const userDateExit = moment(user.leave_time).unix()
        const userTL = await conn.query('SELECT user_id, UNIX_TIMESTAMP(date_enter) as date_enter, UNIX_TIMESTAMP(date_exit) as date_exit FROM timeline WHERE DATE(date_enter) = CURDATE() AND user_id=?', [userId])

        userTL.push({
          user_id: userId,
          date_enter: userDateEnter,
          date_exit: userDateExit
        })

        userTL.sort((a, b) => {
          return a.date_enter - b.date_enter
        })

        const result = []
        let curEnd = 0
        let curIdx = -1
        for (const u of userTL) {
          if (u.date_enter > curEnd) {
            curIdx++
            result[curIdx] = u
          } else {
            if (u.date_exit > result[curIdx].date_exit) {
              result[curIdx].date_exit = u.date_exit
            }
          }
          curEnd = Math.max(curEnd, u.date_exit, result[curIdx].date_exit)
        }

        await conn.query('DELETE FROM timeline WHERE DATE(date_enter) = CURDATE() AND user_id=?', [userId])

        for (const u of result) {
          await conn.query('INSERT INTO timeline(user_id, date_enter, date_exit) VALUES(?,FROM_UNIXTIME(?),FROM_UNIXTIME(?))', [u.user_id, u.date_enter, u.date_exit])
        }

      }
    }
  } catch (err) {
    infoMsg(err.message)
  } finally {
    if (conn) conn.release();
  }
}

export const getUserName = async (id) => {
  if(id <= 0){
    return ''
  }
  let conn;
  try {
    conn = await pool.getConnection()
    const result = await conn.query('select name FROM users WHERE id = ?', [id])
    if (result && result.length > 0) {
      return result[0].name
    }
  } catch (err) {
    infoMsg(err.message)
  } finally {
    if (conn) conn.release();
  }
}

export const getUsersEvents = async () => {
  let conn;
  try {
    conn = await pool.getConnection()
    const result = await conn.query('select users_events.*, users.name as real_name FROM users_events LEFT JOIN users ON users.id = users_events.user_id ORDER BY users_events.event_date ASC')
    return result.map((e) => {
      return {...e, event_date: getDateTime(e.event_date)}
    })
  } catch (err) {
    infoMsg(err.message)
  } finally {
    if (conn) conn.release();
  }
}


export const getUserData = async (id) => {
  let conn;
  try {
    conn = await pool.getConnection()
    const user = await conn.query('select * FROM users WHERE id = ?', [id])
    if (user?.length === 0) {
      throw new Error(`User with id = ${id} not found!`)
    }
    const userKeys = await conn.query('select id, user_key as val FROM users_keys WHERE user_id = ?', [id])
    const userAliases = await conn.query('select id, user_alias as val FROM users_aliases WHERE user_id = ?', [id])
    return {user: user[0], userKeys, userAliases}
  } catch (err) {
    infoMsg(err.message)
    throw new Error(err)
  } finally {
    if (conn) conn.release();
  }
}

export const getPresenceTypes = async () => {
  let conn;
  try {
    conn = await pool.getConnection()
    return await conn.query('SELECT * FROM presence_types')
  } catch (err) {
    infoMsg(err.message)
  } finally {
    if (conn) conn.release();
  }
}

export const saveUsersPresences = async (users) => {
  let conn;
  try {
    conn = await pool.getConnection()
    for (const user of users) {
      for (const presenceValue of user.presenceValues) {
        try {
          await conn.query(`INSERT INTO users_presence(user_id, p_id, p_date, p_val)
                            VALUES (?, ?, CURDATE(), ?)`, [
            user.userId,
            presenceValue.presenceId,
            presenceValue.value
          ])
        } catch (err) {
          infoMsg(err.message)
        }
      }
    }
  } catch (err) {
    infoMsg(err.message)
  } finally {
    if (conn) conn.release();
  }
}

export const getTenStats = async () => {
  let conn;
  let result = []
  try {
    conn = await pool.getConnection()
    result = await conn.query(`

        SELECT presence.ten,
               presence.avg_presence,
               cam.avg_cam
        FROM (
                 SELECT users.ten,
                        ROUND(AVG(users_presence.p_val), 1) avg_presence
                 FROM users_presence
                          LEFT JOIN users ON users_presence.user_id = users.id
                 WHERE users_presence.p_id < 5
                   AND users_presence.p_date >= DATE_SUB(LAST_DAY(NOW()), INTERVAL DAY(LAST_DAY(NOW()))-1 DAY)
                   AND users_presence.p_date <= LAST_DAY(NOW())
                 GROUP BY users.ten
             ) presence

                 LEFT JOIN
             (
                 SELECT users.ten,
                        ROUND(AVG(users_presence.p_val), 1) avg_cam
                 FROM users_presence
                          LEFT JOIN users ON users_presence.user_id = users.id
                 WHERE users_presence.p_id > 4
                   AND users_presence.p_date >= DATE_SUB(LAST_DAY(NOW()), INTERVAL DAY(LAST_DAY(NOW()))-1 DAY)
                   AND users_presence.p_date <= LAST_DAY(NOW())
                 GROUP BY users.ten
             ) cam
             ON cam.ten = presence.ten;
    `)

    return result

  } catch (err) {
    infoMsg(err.message)
    return result
  } finally {
    if (conn) conn.release();
  }

}

export const loginUser = async (name, password) => {
  let conn;
  try {
    conn = await pool.getConnection()
    const result = await conn.query('select * FROM admins WHERE name = ? AND password = ?', [name, password])
    return result?.length > 0
  } catch (err) {
    infoMsg(err.message)
    return false
  } finally {
    if (conn) conn.release();
  }
}

export const getUsersList = async () => {
  let conn;
  try {
    conn = await pool.getConnection()
    return await conn.query('select * FROM users ORDER BY ten, id')
  } finally {
    if (conn) conn.release();
  }
}

export const updateUser = async (user) => {
  let conn;
  try {
    conn = await pool.getConnection()
    if (user.id === 0) {
      const newUser = await conn.query('INSERT INTO users(ten, name) VALUES(?,?) ', [user.ten, user.name])
      user.id = newUser.insertId
    } else {
      await conn.query('UPDATE users SET name = ?, ten = ? WHERE id = ?', [user.name, user.ten, user.id])
    }

    for (const key of user.userKeys) {
      if (key.mod === 'm') {
        await conn.query('UPDATE users_keys SET user_key = ? WHERE id = ?', [key.val, key.id])
      }
      if (key.mod === 'n') {
        await conn.query('INSERT INTO users_keys(user_id, user_key) VALUES(?,?) ', [user.id, key.val])
      }
      if (key.mod === 'd') {
        await conn.query('DELETE FROM users_keys WHERE id = ?', [key.id])
      }
    }
    for (const alias of user.userAliases) {
      if (alias.mod === 'm') {
        await conn.query('UPDATE users_aliases SET user_alias = ? WHERE id = ?', [alias.val, alias.id])
      }
      if (alias.mod === 'n') {
        await conn.query('INSERT INTO users_aliases(user_id, user_alias) VALUES(?,?) ', [user.id, alias.val])
      }
      if (alias.mod === 'd') {
        await conn.query('DELETE FROM users_aliases WHERE id = ?', [alias.id])
      }
    }
    return user.id
  } catch (err) {
    infoMsg(err.message)
    throw new Error(err)
  } finally {
    if (conn) conn.release();
  }
}


export const addLog = async (date, msg, cnt) => {
  let conn;
  try {
    conn = await pool.getConnection()
    await conn.query('INSERT INTO logs(date, msg, cnt) VALUES(?,?,?)', [date, msg, cnt])
    await conn.query('DELETE FROM logs WHERE date < NOW() - INTERVAL 3 DAY')
    return true
  } catch (err) {
    return false
  } finally {
    if (conn) conn.release();
  }
}

export const ifSchedule = async () => {
  let conn;
  try {
    conn = await pool.getConnection()
    const now = new Date()

    const dbSchedule = await conn.query('select * FROM schedule WHERE day_of_week = ?', [now.getDay()])
    if (dbSchedule.length === 0) throw new Error('Schedule is empty!')
    const schedule = dbSchedule[0]

    let startDate = new Date()
    startDate.setHours(schedule.start_h)
    startDate.setMinutes(schedule.start_m)
    startDate.setSeconds(0)

    let endDate = new Date()
    endDate.setHours(schedule.end_h)
    endDate.setMinutes(schedule.end_m)
    endDate.setSeconds(0)

    return now > startDate && now < endDate
  } catch (err) {
    alertMsg('ifSchedule error: ', err.message)
    return false
  } finally {
    if (conn) conn.release();
  }
}


export const ifEndSchedule = async () => {
  let conn;
  try {
    conn = await pool.getConnection()
    const now = new Date()
    const dbSchedule = await conn.query('select * FROM schedule WHERE day_of_week = ?', [now.getDay()])
    if (dbSchedule.length === 0) throw new Error('Schedule is empty!')
    const schedule = dbSchedule[0]
    return now.getHours() === schedule.end_h && now.getMinutes() === schedule.end_m
  } finally {
    if (conn) conn.release();
  }
}


export const getLogs = async () => {
  let conn;
  try {
    conn = await pool.getConnection()
    return await conn.query(`select id, DATE_FORMAT(date, '%Y-%m-%d %T') as date, msg, cnt
                             FROM logs`)
  } finally {
    if (conn) conn.release();
  }
}
