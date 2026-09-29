// The Mongolian app's Firebase web config: the "Mongolian" web app Fred
// registered in the life-hub-fred project (Project settings → General → Your
// apps). The same project, and so the same account, as Life Hub.
//
// It is not a secret: every web app ships it, and the database rules
// (firestore.rules in the Life Hub repository) are what keep the data private
// to Fred's account. See SYNC.md.
//
// null = no sync: the app then keeps its progress on this device only.

export const firebaseConfig = {
  apiKey: 'AIzaSyBcvMPBLxQAdOhL-8kslPenwCM_qz_TFmg',
  authDomain: 'life-hub-fred.firebaseapp.com',
  projectId: 'life-hub-fred',
  storageBucket: 'life-hub-fred.firebasestorage.app',
  messagingSenderId: '789038327074',
  appId: '1:789038327074:web:77ab9cc7d663b0ec42317b',
};
