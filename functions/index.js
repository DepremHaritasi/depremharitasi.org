const functions = require("firebase-functions");
const firebaseAdmin = require("firebase-admin");
const geofire = require("geofire-common");

require("dotenv").config();

const serviceAccount = require("./serviceAccountKey.json");
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const firebaseAdminDB = firebaseAdmin.firestore();

exports.api = functions
  .runWith({
    minInstances: 1,
    maxInstances: 5,
    // memory: "512MB",
  })
  .https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Content-Type", "application/json");
    if (request.method !== "GET") {
      return response.status(403).send("Forbidden!");
    }

    let { lat, lng } = request.query;
    lat = Number(lat);
    lng = Number(lng);

    if (!lat || !lng) {
      return response.send({ success: false });
    }

    const center = [lat, lng];
    const radiusInM = 10 * 1000;

    const bounds = geofire.geohashQueryBounds(center, radiusInM);
    const promises = [];
    for (const b of bounds) {
      const q = firebaseAdminDB
        .collection("location")
        .orderBy("geohash")
        .startAt(b[0])
        .endAt(b[1])
        .limit(800);
      promises.push(q.get());
    }

    const matchingDocs = await Promise.all(promises).then((snapshots) => {
      const matchingDocs = [];

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const lat = doc.get("lat");
          const lng = doc.get("lng");

          const distanceInKm = geofire.distanceBetween([lat, lng], center);
          const distanceInM = distanceInKm * 1000;
          if (distanceInM <= radiusInM) {
            const data = doc.data();
            delete data.id;
            delete data.addressSlug;
            delete data.slug;
            delete data.isGoogleGeocoded;
            delete data.locationBounds;
            delete data.locationType;
            delete data.version;
            delete data.geoPoint;
            delete data.location;
            delete data.hash;
            delete data.geohash;
            delete data.country;

            if (data.locationType !== "APPROXIMATE") {
              matchingDocs.push(data);
            }
          }
        }
      }

      return matchingDocs;
    });

    return response.send({
      version: "0.1.1",
      lat,
      lng,
      records: matchingDocs,
    });
  });
