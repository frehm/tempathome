const fetch = require('node-fetch');
const admin = require('firebase-admin');
const schedule = require('node-schedule');
const serviceAccount = require('C:\\development\\service accounts\\tempathome-b77a7.json');

const getConfig = async () => {
  try {
    const c = await admin.database().ref(`config/hue`).once('value');
    return c.val();  
  } catch (err) {
    console.error('no config found', err);
    return null;
  }
};

const getTemperature = async (bridgeIp, userId, sensorId) => {
  const url = `http://${bridgeIp}/api/${userId}/sensors/${sensorId}`;
  try {
    const res = await fetch(url, { method: 'GET', timeout: 3000 });
    const json = await res.json();

    if (res.ok && !Array.isArray(json)) {
      return {
        ok: true,
        ...json.state,
        battery: json.config.battery,
      };
    }
    return {
      ok: false,
      status: res.statusText,
      error: Array.isArray(json) ? json[0].error.description : 'Unknown error',
    };
  } catch (err) {
    console.log('err', err);
    return {
      ok: false,
      status: 0,
      error: err.message,
    };
  }
};

const pollTemperatures = async config => {
  const values = [];
  for (const sensor of Object.values(config.sensors)) {
    const t = await getTemperature(config.bridgeIp, config.userId, sensor.id);
    if (t.ok) {
      values.push({
        ...sensor,
        ...t,
      });
    }
  }
  return values;
};

/* firebase structure
temperatures/{name}/{yyyy-mm-dd}/
  avg
  battery
  max
  min
  values  // use timestamp as key
    {ts} value
*/

const readSensorDailyLog = async (sensorName, day) => {
  try {
    const snap = await admin.database().ref(`temperatures/${sensorName}/${day}`).once('value');
    return snap.val();
  } catch (err) {
    return null;
  }
};

const createUpdate = (sensorName, daily, values) => {
  // update daily log item with new value
  const updated = {
    battery: values.battery,
    values: {
      ...daily.values,
      [new Date(`${values.lastupdated}Z`).getTime()]: values.temperature / 100,
    },
  };
  const n = Object.values(updated.values).length;
  if (n > 0) {
    let sum = 0;
    let max = Number.MIN_VALUE;
    let min = Number.MAX_VALUE;
    Object.values(updated.values).forEach(d => {
      sum += d;
      max = d > max ? d : max;
      min = d < min ? d : min;
    });
    updated.avg = sum / n;
    updated.min = min;
    updated.max = max;
  } else {
    updated.avg = 0;
    updated.min = 0;
    updated.max = 0;
  }
  
  return updated;
};

const addNewTemperature = async sensorValues => {
  const day = new Date(`${sensorValues.lastupdated}Z`).toISOString().slice(0, 10);
  const dailyData = await readSensorDailyLog(sensorValues.name, day);
  const updated = createUpdate(sensorValues.name, dailyData || {}, sensorValues);
  const key = `temperatures/${sensorValues.name}/${day}`;
  return {
    [`${key}/avg`]: updated.avg,
    [`${key}/battery`]: updated.battery,
    [`${key}/max`]: updated.max,
    [`${key}/min`]: updated.min,
    [`${key}/values/${new Date(`${sensorValues.lastupdated}Z`).getTime()}`]: sensorValues.temperature / 100,
    [`temperature/${sensorValues.name}`]: {
      time: new Date(`${sensorValues.lastupdated}Z`).toISOString(),
      value: sensorValues.temperature / 100,
    },
  };
};

let isPolling = false;

const poll = async () => {
  if (isPolling) return;
  isPolling = true;
  try {
    console.log(`${new Date().toISOString()} polling...`);
    const config = await getConfig();
    console.time('poll bridge');
    const temps = await pollTemperatures(config);
    console.timeEnd('poll bridge');
    let update = {};
    console.time('update values');
    for (const sensor of temps) {
      const add = await addNewTemperature(sensor);
      update = {
        ...update,
        ...add,
      };
    }
    console.timeEnd('update values');
    console.time('update firebase');
    await admin.database().ref().update(update);
    console.timeEnd('update firebase');  
  } catch (err) {
    console.error('Polling failed', err.message);
  }
  finally {
    isPolling = false;
  }
};

const main = async () => {
  console.log('connecting to firebase');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://tempathome-b77a7.firebaseio.com"
  });
  console.log('initialized firebase');

  // every 5 minutes
  const pollJob = schedule.scheduleJob('*/5 * * * *', poll);

  process.on('SIGINT', () => {
    console.log('closing collector from SIGINT in 2 sec!');
    pollJob.cancel();
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  });
};

main();
