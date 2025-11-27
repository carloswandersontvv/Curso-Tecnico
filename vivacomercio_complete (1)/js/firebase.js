// Cole aqui sua configuração do Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJ.firebaseapp.com",
  projectId: "SEU_PROJ",
  storageBucket: "SEU_PROJ.appspot.com",
  messagingSenderId: "ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
