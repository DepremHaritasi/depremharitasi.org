const firebaseAdmin = require("firebase-admin");
const geofire = require("geofire-common");

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
    //.limit(100)
    .get();

  if (snapshot.empty) {
    console.log("No matching documents.");
    return;
  }

  const records = [];
  snapshot.forEach((doc) => {
    records.push({ ...doc.data(), id: doc.id });
  });
  records.forEach(async (record) => {
    if (!record?.location?.lat) return;

    // console.log("record", record);

    const geohash = geofire.geohashForLocation([
      record.location.lat,
      record.location.lng,
    ]);

    record.geohash = geohash;
    record.version = "v2";

    console.log(geohash);


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
};

main();
