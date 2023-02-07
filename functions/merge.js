const geocoder = require("google-geocoder");
const slugify = require("slugify");
const firebaseAdmin = require("firebase-admin");
const to = require("await-to-js").default;

require("dotenv").config();
const serviceAccount = require("./serviceAccountKey.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const firebaseAdminDB = firebaseAdmin.firestore();

const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;


const geo = geocoder({
  key: mapsApiKey,
});

const fixTerms = (content) => {
  return content
    .toLocaleLowerCase()
    .replaceAll("no1", "no 1")
    .replaceAll("no2", "no 2")
    .replaceAll("no3", "no 3")
    .replaceAll("no4", "no 4")
    .replaceAll("no5", "no 5")
    .replaceAll("no6", "no 6")
    .replaceAll("no7", "no 7")
    .replaceAll("no8", "no 8")
    .replaceAll("no9", "no 9")
    .replaceAll("mah.", "mahallesi ")
    .replaceAll("sok.", "sokak ")
    .replaceAll("apt.", "apartmanı ")
    .replaceAll("blv. ", "bulvarı ")
    .replaceAll("nu:", "no ")
    .replaceAll(".:", ": ")

    .replaceAll(" ,", " ")
    .replaceAll("  ", " ");
};

const dataHasMahalle = (content) => {
  return (
    content.includes("mahalle") ||
    content.includes("mah.") ||
    content.includes("mah ")
  );
};

const dataHasNumbers = (content) => {
  return /\d/.test(content);
};

const dataHasBuilding = (content) => {
  return (
    content.includes("apartman") ||
    content.includes("apt.") ||
    content.includes("apt ") ||
    content.includes("blok") ||
    content.includes("bina") ||
    content.includes("no") ||
    content.includes("numara")
  );
};

const addressSlug = (record) => {
  return slugify(
    `${record.formatted_address}_${record?.location?.lat}_${record?.location?.lng}`,
    {
      replacement: "_",
      remove: /[*+~.,()'"!:@\/]/g,
      lower: true,
      strict: false,
      trim: true,
    }
  );
};

const checkRecordExists = async (slug) => {
  const snapshot = await firebaseAdminDB
    .collection("location")
    .where("slug", "==", slug)
    .get();

  if (snapshot.empty) {
    return false;
  }

  return true;
};

const saveRecord = async (record) => {
  const data = {
    slug: record.slug,
    //seed_data: { ...record.seedData },
    city: record.konum_il,
    district: record.konum_ilce,
    address: record.konum_adres,
    name_surname: record.isimsoyisim,
    formatted_address: record.formatted_address,
    lat: record.location.lat,
    lng: record.location.lng,
    location: new firebaseAdmin.firestore.GeoPoint(
      record.location.lat,
      record.location.lng
    ),
  };
  if (record.street_number) {
    data.street_number = record.street_number.short_name;
  }
  if (record.route) {
    data.route = record.route;
  }
  if (record.postal_code) {
    data.postal_code = record.postal_code.short_name;
  }
  const docRef = await firebaseAdminDB
    .collection("location")
    .doc(data.slug)
    .set(data);

  console.log("Document written with ID: ", docRef);
};

const getGeoCodeResponse = (address) => {
  return new Promise((resolve, reject) => {
    try {
      geo.find(address, (err, res) => {
        if (err) reject();
        if (res.length === 0) reject();
        const geoObject = res[0];
        if (!geoObject) reject();
        resolve(geoObject);
      });
    } catch (error) {
      reject();
    }
  });
};

const sleep = async (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const splitIntoChunks = (arr, chunkSize) => {
  const R = [];
  for (let i = 0, len = arr.length; i < len; i += chunkSize)
    R.push(arr.slice(i, i + chunkSize));
  return R;
};

const parseItem = async (item) => {
  console.log("----------------------------------");
  const itemRecord = fixTerms(Object.values(item).join(" "));
  console.log("itemRecord", itemRecord);
  [responseErr, response] = await to(getGeoCodeResponse(itemRecord));
  if (responseErr) {
    console.log("responseErr", responseErr);
    return;
  }
  if (response.location_type === "APPROXIMATE") return;

  // return itemRecord;

  console.log("response", response);
  const addressSlugified = addressSlug(response);
  console.log("addressSlugified", addressSlugified);
  console.log("item", item);
  console.log("response", response);

  const recordData = JSON.parse(
    JSON.stringify({
      ...response,
    })
  );

  if (addressSlugified) {
    recordData.slug = addressSlugified;
  }

  console.log("recordData", recordData);

  if (!recordData.location) return;
  if (!recordData.slug) return;

  await saveRecord(recordData);

  console.log("----------------------------------");
};

const main = async () => {
  // get 10 records from locations that isGoogleGeocoded is false
  const snapshot = await firebaseAdminDB
    .collection("location")
    .where("isGoogleGeocoded", "==", false)
    .limit(10)
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
    const addressMerged = fixTerms(
      `${record.address} ${record.neighborhood} ${record.district} ${record.city}`
    );

    if (record?.address_slug) {
      record.addressSlug = record.address_slug;
      delete record.address_slug;
    }

    //console.log(addressMerged);

    const [err1, geoCodeResponse] = await to(getGeoCodeResponse(addressMerged));
    //console.log(geoCodeResponse);
    if (err1) {
      console.log("************", err1);
    }

    if (!geoCodeResponse?.location?.lat) return;
    if (!geoCodeResponse?.formatted_address) return;

    if (geoCodeResponse?.postal_code?.long_name) {
      record.postalCode = geoCodeResponse.postal_code.long_name;
    }
    if (geoCodeResponse?.country?.long_name) {
      record.country =
        `${geoCodeResponse.country.long_name}`.toLocaleLowerCase();
    }
    if (geoCodeResponse?.location_type) {
      record.locationType = geoCodeResponse.location_type;
    }
    if (geoCodeResponse?.location_bounds) {
      record.locationBounds = geoCodeResponse.location_bounds;
    }
    record.location = geoCodeResponse.location;
    record.geoPoint = new firebaseAdmin.firestore.GeoPoint(
      geoCodeResponse.location.lat,
      geoCodeResponse.location.lng
    );
    record.formattedAddress = geoCodeResponse.formatted_address;
    record.isGoogleGeocoded = true;

    console.log(record);

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
