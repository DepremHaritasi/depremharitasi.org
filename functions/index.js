const functions = require("firebase-functions");
const firebaseAdmin = require("firebase-admin");
const ngeohash = require("ngeohash");
const geofire = require("geofire-common");

require("dotenv").config();

const Airtable = require("airtable");
const baseId = process.env.BASE_ID;
const tableId = process.env.TABLE_ID;
const token = process.env.AIRTABLE_TOKEN;

const base = new Airtable({ apiKey: token }).base(baseId);
const table = base(tableId);

const serviceAccount = require("./serviceAccountKey.json");
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const firebaseAdminDB = firebaseAdmin.firestore();

// import json file
const depremyardimData = require("./outsourceData/depremyardim7.json");

const getRecords = async () => {
  const records = await table.select().all();
  return records;
};

// exports.data = functions.https.onRequest(async (request, response) => {
//   response.set("Access-Control-Allow-Origin", "*");
//   response.set("Content-Type", "application/json");
//   if (request.method !== "GET") {
//     response.status(403).send("Forbidden!");
//   }

//   const records = await getRecords();
//   const recordsJson = records
//     .map((record) => {
//       let data = record._rawJson;
//       if (data.fields["Konum"] && data.fields["Konum"].includes(",")) {
//         data.fields["Lat"] = parseFloat(
//           data.fields["Konum"].split(",")[0].trim()
//         );
//         data.fields["lng"] = parseFloat(
//           data.fields["Konum"].split(",")[1].trim()
//         );
//       }
//       delete data.fields["Telefon"];
//       return {
//         ...data,
//       };
//     })
//     .filter((record) => {
//       const fields = Object.keys(record.fields);
//       if (fields.includes("Konum") && record.fields["Konum"].includes(",")) {
//         return true;
//       }
//       return false;
//     });

//   response.send({
//     version: "0.1.0",
//     records: recordsJson,
//   });
// });

// exports.depremyardim = functions.https.onRequest(async (request, response) => {
//   response.set("Access-Control-Allow-Origin", "*");
//   response.set("Content-Type", "application/json");
//   if (request.method !== "GET") {
//     response.status(403).send("Forbidden!");
//   }

//   response.send({
//     version: "7SUBAT_15:12",
//     records: depremyardimData,
//   });
// });

const getGeohashRange = (
  latitude,
  lngitude,
  distance // miles
) => {
  const lat = 0.0144927536231884; // degrees latitude per mile
  const lon = 0.0181818181818182; // degrees lngitude per mile

  const lowerLat = latitude - lat * distance;
  const lowerLon = lngitude - lon * distance;

  const upperLat = latitude + lat * distance;
  const upperLon = lngitude + lon * distance;

  const lower = ngeohash.encode(lowerLat, lowerLon);
  const upper = ngeohash.encode(upperLat, upperLon);

  return {
    lower,
    upper,
  };
};

exports.api = functions
  .runWith({
    // Keep 5 instances warm for this latency-critical function
    // minInstances: 3,
    maxInstances: 5,
    // increase ram
    //memory: "512MB",
  })
  .https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Content-Type", "application/json");
    if (request.method !== "GET") {
      response.status(403).send("Forbidden!");
    }
    let { lat, lng } = request.query;
    lat = Number(lat);
    lng = Number(lng);

    if (!lat || !lng) {
      lat = 36.2021974510878;
      lng = 36.16074412901604;
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
        .limit(1000);

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

            if (data.locationType !== "APPROXIMATE") {
              matchingDocs.push(data);
            }
          }
        }
      }

      return matchingDocs;
    });

    response.send({
      version: "0.1.1",
      lat,
      lng,
      records: matchingDocs,
    });
  });
