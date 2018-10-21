import React, { Component } from 'react';
import injectSheet from 'react-jss';
import TimeAgo from 'react-timeago';
import { merge } from './containers/compose';
import withTemperatures from './containers/data/withTemperatures';

const styles = {
  shell: {
    width: '100vw',
    height: '100vh',
    maxWidth: 900,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderBottom: '1px solid #ededed',
  },
  sensorValue: {
    fontSize: 28,
  },
  sensorName: {
    textTransform: 'uppercase',
    color: '#777',
    fontSize: 18,
    paddingTop: 6,
  },
  tempItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 0',
  },
  time: {
    fontSize: 10,
  },
};

class App extends Component {
  render() {
    const { classes, temperatures } = this.props;
    console.log('temperatures', temperatures);
    console.log('version', process.env.REACT_APP_VERSION);
    return (
      <div className={classes.shell}>
        <div className={classes.header}>
          <div>temp@home</div>
        </div>
        <div className={classes.temperatures}>
          {temperatures.map(d => (
            <div key={d.sensorId} className={classes.tempItem}>
              <div className={classes.sensorValue}>{d.value} °C</div>
              <TimeAgo className={classes.time} date={d.time} />
              <div className={classes.sensorName}>{d.sensorId}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default merge(
  withTemperatures,
  injectSheet(styles),
)(App);
