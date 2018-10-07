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

const main = async () => {
  console.time('poll');
  const values = await pollTemperatures();
  console.timeEnd('poll');
  console.log('values', values);
};

main();
