import React from 'react';
import shallowEqual from 'shallowequal';
import firebase from '../services/firebase';

// Default composer components
const LoadingComponent = () => (
  <div style={{ color: '#333', alignSelf: 'center', margin: '12px 0' }}>Loading...</div>
);

const ErrorComponent = err => (
  <p style={{ color: 'red' }}>
    {err.message}
  </p>
);

// Pick specific properties from an object. Move to a separate utils module?
const pick = (obj, fields) => Object.assign({}, ...fields.map(key => ({ [key]: obj[key] })));

// Composer HOC (derived from react-komposer)
function compose(dataLoader, options = {}) {
  return function composeChild(Child) {
    const {
      errorHandler = err => { throw err; },
      loadingHandler = () => null,
      env = {},
      pure = false,
      propsToWatch = null, // Watch all the props.
      shouldSubscribe = null,
      shouldUpdate = null,
    } = options;

    class Container extends React.Component {
      constructor(props, ...args) {
        super(props, ...args);
        this.state = {};
        this.subscribe(props);
      }

      componentDidMount() {
        this.mounted = true;
      }

      componentWillReceiveProps(props) {
        this.subscribe(props);
      }

      shouldComponentUpdate(nextProps, nextState) {
        if (shouldUpdate) {
          return shouldUpdate(this.props, nextProps);
        }

        if (!pure) {
          return true;
        }

        return (
          !shallowEqual(this.props, nextProps) ||
          this.state.error !== nextState.error ||
          !shallowEqual(this.state.data, nextState.data)
        );
      }

      componentWillUnmount() {
        this.unmounted = true;
        this.unsubscribe();
      }

      shouldSubscribe(props) {
        const firstRun = !this.cachedWatchingProps;
        const nextProps = pick(props, propsToWatch);
        const currentProps = this.cachedWatchingProps || {};
        this.cachedWatchingProps = nextProps;

        if (firstRun) return true;
        if (typeof shouldSubscribe === 'function') {
          return shouldSubscribe(currentProps, nextProps);
        }

        if (propsToWatch === null) return true;
        if (propsToWatch.length === 0) return false;
        return !shallowEqual(currentProps, nextProps);
      }

      subscribe(props) {
        if (!this.shouldSubscribe(props)) return;

        const onData = (error, data) => {
          if (this.unmounted) {
            throw new Error(`Trying to set data after component(${Container.displayName}) has unmounted.`);
          }

          const payload = { error, data };

          if (!this.mounted) {
            // Ignore react/no-direct-mutation-state since component is not yet mounted
            // eslint-disable-next-line
            this.state = {
              ...this.state,
              ...payload,
            };
            return;
          }

          this.setState(payload);
        };

        // We need to do this before subscribing again.
        this.unsubscribe();
        this.stop = dataLoader(props, onData, env);
      }

      unsubscribe() {
        if (this.stop) {
          this.stop();
        }
      }

      render() {
        const { data, error } = this.state;

        if (error) {
          return errorHandler(error);
        }

        if (!data) {
          return loadingHandler();
        }

        const finalProps = {
          ...this.props,
          ...data,
        };

        return (
          <Child {...finalProps} />
        );
      }
    }

    return Container;
  };
}

const setDefaults = (mainOptions = {}) => (
  (dataLoader, otherOptions = {}) => {
    const options = {
      ...mainOptions,
      ...otherOptions,
    };

    return compose(dataLoader, options);
  }
);

// Make it easier to wrap components in multiple hoc's
export const merge = (...enhancers) => (
  Child => enhancers.reduce((C, enhancer) => enhancer(C), Child)
);

// Export composer with default options and env
export default setDefaults({
  pure: false,
  propsToWatch: [],
  loadingHandler: LoadingComponent,
  errorHandler: ErrorComponent,
  env: {
    auth: firebase.auth(),
    database: firebase.database(),
    firestore: firebase.firestore(),
  },
});
