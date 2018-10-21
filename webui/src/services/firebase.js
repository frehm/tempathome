import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyDZsxFnAipMwb54OBVV0k5_-IuOPCkhQFM',
  authDomain: 'tempathome-b77a7.firebaseapp.com',
  databaseURL: 'https://tempathome-b77a7.firebaseio.com',
  projectId: 'tempathome-b77a7',
  storageBucket: 'tempathome-b77a7.appspot.com',
  messagingSenderId: '420051895443',
};

firebase.initializeApp(config);

export default firebase;
