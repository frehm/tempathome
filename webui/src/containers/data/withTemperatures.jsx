import compose from '../compose';

const withTemperatures = (props, onData, env) => {
  const ref = env.database.ref('temperature');
  const listener = ref.on('value', snap => {
    const temperatures = [];
    snap.forEach(child => {
      temperatures.push({
        sensorId: child.key,
        ...child.val(),
      });
    });
    onData(null, { temperatures });
  });
  return () => { ref.off('value', listener); };
};

export default compose(withTemperatures);
