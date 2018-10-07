const fetch = require('node-fetch');
const config = {
  bridgeIp: '',
  userId: '',
  sensors: [{
    name: 'corridor',
    id: 8,
  }, {
    name: 'hallway',
    id: 12,
  }, {
    name: 'staircase',
    id: 22,
  }, {
    name: 'basement',
    id: 26,
  }],
};
/* response
 { ok: true,
  temperature: 2027,
  lastupdated: '2018-10-07T11:52:44',
  battery: 94 }
*/
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
/* response
values [ { name: 'corridor',
    id: 8,
    ok: true,
    temperature: 2027,
    lastupdated: '2018-10-07T12:07:43',
    battery: 94 },
  { name: 'hallway',
    id: 12,
    ok: true,
    temperature: 2036,
    lastupdated: '2018-10-07T12:08:25',
    battery: 100 },
  { name: 'staircase',
    id: 22,
    ok: true,
    temperature: 1766,
    lastupdated: '2018-10-07T12:09:31',
    battery: 100 },
  { name: 'basement',
    id: 26,
    ok: true,
    temperature: 1859,
    lastupdated: '2018-10-07T12:09:03',
    battery: 100 } ]
*/
const pollTemperatures = async () => {
  const values = [];
  for (const sensor of config.sensors) {
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
sensors/{name}/{yyyy-mm-dd}/
  avg
  battery
  max
  min
  values  // use timestamp as key
    {ts} value
*/

// TODO: First read current values for day matching new value
// Calculate new avg, max, min
// Add battery and value to values
// Update firebase

//const createFirebaseUpdate = (values)
// return object we can pass to firebase.update

const readSensorDailyLog = (sensorName, day) => {
  return {
    avg: 20,
    battery: 95,
    min: 19,
    max: 21,
    values: {
      '1538924852': 20,
      '1538924553': 21,
    },
  };
};

const createUpdate = (sensorName, daily, values) => {
  // update daily log item with new value
  const updated = {
    ...daily,
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
  
  // TODO: Recalculate avg, min, max
  // TODO: Create update object
  //  'sensorName/yyyy-mm-dd/avg': 22
  //  'sensorName/yyyy-mm-dd/values/1534545645': 21.23
  // etc
  console.log('updated', updated);
};

const main = async () => {
  /*console.time('poll');
  const values = await pollTemperatures();
  console.timeEnd('poll');
  console.log('values', values);*/
  const test = [ { name: 'corridor',
  id: 8,
  ok: true,
  temperature: 2027,
  lastupdated: '2018-10-07T12:07:43',
  battery: 94 },
{ name: 'hallway',
  id: 12,
  ok: true,
  temperature: 2036,
  lastupdated: '2018-10-07T12:08:25',
  battery: 100 },
{ name: 'staircase',
  id: 22,
  ok: true,
  temperature: 1766,
  lastupdated: '2018-10-07T12:09:31',
  battery: 100 },
{ name: 'basement',
  id: 26,
  ok: true,
  temperature: 1859,
  lastupdated: '2018-10-07T12:09:03',
  battery: 100 } ];

  createUpdate('test', readSensorDailyLog(), test[0]);

};

main();
