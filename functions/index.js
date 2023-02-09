const functions = require("firebase-functions");
const firebaseAdmin = require("firebase-admin");
const geofire = require("geofire-common");
const axios = require("axios");

require("dotenv").config();

const serviceAccount = require("./serviceAccountKey.json");
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const firebaseAdminDB = firebaseAdmin.firestore();

const formatDate = (t) => {
  try {
    const date = new Date(t);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const hour = date.getHours();
    const minute = date.getMinutes();

    const formattedDate = `${day}-${month}-2023 ${hour}:${minute}`;
    return formattedDate;
  } catch (error) {
    return date;
  }
};

const searchTemplate = (title, query, results, links) => {
  return `<!doctype html>
    <head>
      <title>${title}</title>
      <meta
        property="og:image"
        content="https://depremharitasi.org/images/preview.png"
      />
      <link rel="stylesheet" href="https://depremharitasi.org/style.css" />
    </head>
    <body>
      <h1>${title}</h1>
      <h2>${
        query ? `${query}`.toLocaleUpperCase().replaceAll("+", " ") : ``
      }</h2>
      <section>
        <form action="/ara" class="search" method="GET">
          <input type="text" name="q" placeholder="Malzeme talepleri, İsim+Şehir gibi aramalar yapabilirsiniz" />
          <button type="submit" class="button">Ara</button>
        </form>
      </section>
      <main>
      ${
        results?.length > 0
          ? results.map((result) => {
              return `<div>

              <h5><strong>${result.address_detail}</strong></h5>
            <h6>Güncelleme tarihi: ${formatDate(result.updated_at)}</h6>

            ${result.fullname ? `<p>İsim: ${result.fullname}</p>` : ""}
            ${result.city ? `<p>Şehir: ${result.city}</p>` : ""}
            ${result.district ? `<p>Mahalle: ${result.district}</p>` : ""}
            ${
              result.street
                ? `<p>Sokak: ${result.street} / ${result.street2}</p>`
                : ""
            }
            ${result.apartment ? `<p>Apartman: ${result.apartment}</p>` : ""}

            ${result.kaynak ? `<p>Kaynak: ${result.source}</p>` : ""}

            <hr />
          </div>`;
            })
          : ``
      }

      ${
        links?.length > 0
          ? links.map((result) => {
              return `<div>
            <p><a href="/ara?q=${result}">${result} ihtiyaçları -></a></p>
            <hr />
          </div>`;
            })
          : ``
      }
      </main>
    </body>
  </html>`.replaceAll(">,<", "><");
};

exports.ara = functions.https.onRequest(async (request, response) => {
  response.set("Access-Control-Allow-Methods", "GET");
  response.set("Content-Type", "text/html");

  if (request.method !== "GET") {
    return response.status(403).send("Forbidden!");
  }

  let { q } = request.query;
  if (!q) {
    return response.send(
      searchTemplate(
        "Kayıtlarda Ara",
        "",
        [],
        [
          "Termal Kamera",
          "Çadır",
          "Yemek",
          "Su",
          "Kıyafet",
          "İlaç",
          "Kan",
          "hilti",
          "şaloma",
          "tüp",
          "kablo",
          "vinç",
          "İş Makinesi",
          "Elektrik",
          "Jeneratör",
          "çocuk bezi",
          "kadın pedi",
          "operatör",
          "mama",
          "çocuk",
          "malzeme",
        ]
      )
    );
  }
  // q = q.replace(/[^a-zA-Z0-9\s]/g, "");
  q = q.replace(/\s/g, "+");

  const url = `
  https://depremyardim.com/help/datatable?start=0&
    length=25&
    columns%5B0%5D%5Bdata%5D=city&
    columns%5B0%5D%5Bname%5D=&
    columns%5B0%5D%5Bsearchable%5D=true&
    columns%5B0%5D%5Borderable%5D=true&
    columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&
    columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&
    columns%5B1%5D%5Bdata%5D=address&
    columns%5B1%5D%5Bname%5D=&
    columns%5B1%5D%5Bsearchable%5D=true&
    columns%5B1%5D%5Borderable%5D=true&
    columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&
    columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&
    columns%5B2%5D%5Bdata%5D=address_detail&
    columns%5B2%5D%5Bname%5D=&
    columns%5B2%5D%5Bsearchable%5D=true&
    columns%5B2%5D%5Borderable%5D=true&
    columns%5B3%5D%5Bdata%5D=maps_link&
    columns%5B3%5D%5Bname%5D=&
    columns%5B3%5D%5Bsearchable%5D=true&
    columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&
    columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&
    columns%5B4%5D%5Bdata%5D=fullname&
    columns%5B4%5D%5Bname%5D=&
    columns%5B4%5D%5Bsearchable%5D=true&
    columns%5B4%5D%5Borderable%5D=true&
    columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&
    columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&
    order%5B0%5D%5Bcolumn%5D=0&
    order%5B0%5D%5Bdir%5D=asc&
    search%5Bvalue%5D=${q}&
    search%5Bregex%5D=false
  `
    .replaceAll(/\s/g, "")
    .trim();
  const res = await axios.get(url);
  const data = res.data.data;

  response.send(searchTemplate("Sonuçlar: ", q, data, []));
});

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
