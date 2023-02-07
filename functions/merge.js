const geocoder = require("google-geocoder");
const slugify = require("slugify");
const firebaseAdmin = require("firebase-admin");
const to = require("await-to-js").default;

const serviceAccount = require("./serviceAccountKey.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const firebaseAdminDB = firebaseAdmin.firestore();

const depremyardimData = require("./outsourceData/depremyardim4.json");

const mapsApiKey = "AIzaSyA7pB6adt-ET8e7kidoNkNhAQEerxYVg4s";

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

const filtered = depremyardimData.filter((item) => {
  const itemKey = fixTerms(Object.values(item).join(" "));
  const hasMahalle = dataHasMahalle(itemKey);
  const hasNumbers = dataHasNumbers(itemKey);
  const hasBuilding = dataHasBuilding(itemKey);

  if ((hasMahalle && hasNumbers) || hasBuilding) {
    return true;
  }
  return false;
});

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

const chunks = splitIntoChunks(filtered, 10);

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

chunks.slice(0, 5).forEach(async (chunk) => {
  await Promise.all(
    chunk.map(async (item) => {
      [err, response] = await to(parseItem(item));
    })
  );
});

// filtered.slice(0, 50).forEach(async (item) => {
//   const itemRecord = fixTerms(Object.values(item).join(" "));

//   if (itemRecord.location_type === "APPROXIMATE") return;
//   console.log("----------------------------------");
//   const response = await getGeoCodeResponse(itemRecord);
//   const addressSlugified = addressSlug(response);
//   const recordExists = await checkRecordExists(addressSlugified);

//   if (!recordExists) {
//     const recordData = JSON.parse(
//       JSON.stringify({
//         ...response,
//         seedData: item,
//         slug: addressSlugified,
//       })
//     );
//     return Promise.all([sleep(2000), saveRecord(recordData), sleep(2000)]);
//   }

//   console.log("----------------------------------");
// });

console.log("filtered", filtered.length);