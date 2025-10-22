import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();
getToken(messaging, { vapidKey: "BEArAfCpposSLGj32fqn87oeujpKgsZGk4SBh_sQBAIhL-j_388AAfnXEEH2V4LKU5oG6rAsoRYpktPubutARJw" })  // ← Firebaseの公開鍵を貼る
  .then(token => {
    // 生徒IDに紐づけてFirestoreへ登録
    firebase.firestore().collection("students").doc(studentId)
      .update({ fcmToken: token });
  });
