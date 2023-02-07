const firebaseAdmin = require("firebase-admin");
const ngeohash = require("ngeohash");

require("dotenv").config();
const serviceAccount = require("./serviceAccountKey.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const firebaseAdminDB = firebaseAdmin.firestore();

const main = async () => {
  const snapshot = await firebaseAdminDB
    .collection("location")
    .where("version", "==", "v1")
    //.limit(1000)
    .get();

  if (snapshot.empty) {
    console.log("No matching documents.");
    return;
  }

  const records = [];
  snapshot.forEach((doc) => {
    records.push({ ...doc.data(), id: doc.id });
  });
  const data = {};
  records.forEach(async (record) => {
    if (!record?.location?.lat) return;

    record.hash = ngeohash.encode(record.location.lat, record.location.lng);
    record.lat = record.location.lat;
    record.lng = record.location.lng;
    record.version = "v1";

    console.log(record.hash);

    try {
      const r = await firebaseAdminDB
        .collection("location")
        .doc(record.id)
        .update(record);
      return r;
    } catch (error) {
      console.log("********", error);
    }
  });
  console.log(data);
};

main();
