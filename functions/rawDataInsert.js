const geocoder = require("google-geocoder");
const slugify = require("slugify");
const firebaseAdmin = require("firebase-admin");
const to = require("await-to-js").default;
const { sehir } = require("sehir");
const serviceAccount = require("./serviceAccountKey.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const firebaseAdminDB = firebaseAdmin.firestore();

const depremyardimData = require("./outsourceData/depremyardim7.json");

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

const valuesSlug = (record) => {
  return slugify(Object.values(record).join("_"), {
    replacement: "_",
    remove: /[*+~.,()'"!:@\/]/g,
    lower: true,
    strict: false,
    trim: true,
  });
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
    address: record.adres,
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const splitIntoChunks = (arr, chunkSize) => {
  const R = [];
  for (let i = 0, len = arr.length; i < len; i += chunkSize)
    R.push(arr.slice(i, i + chunkSize));
  return R;
};

const main = async () => {
  //console.log("filtered", filtered);
  filtered.forEach(async (item) => {
    // console.log(item);

    if (!item.konum_mahalle) return;
    if (!item.adres) return;

    const itemNew = {
      city: sehir.default(item.konum_il),
      district: `${item.konum_ilce}`.trim().toLocaleLowerCase(),
      neighborhood: `${item.konum_mahalle}`.trim().toLocaleLowerCase(),
      nameSurname: item.isimsoyisim
        ? `${item.isimsoyisim}`.trim().toLocaleLowerCase()
        : null,
      address: item.adres ? `${item.adres}`.trim().toLocaleLowerCase() : null,
    };

    itemNew.slug = valuesSlug(itemNew);
    itemNew.version = "initial_record";
    itemNew.isGoogleGeocoded = false;

    // firebase check if exists
    const exists = await checkRecordExists(itemNew.slug);
    if (!exists) {
      const docRef = await firebaseAdminDB
        .collection("location")
        .doc(itemNew.slug)
        .set(itemNew);

      console.log("Document written with ID: ", docRef);
    }
    await sleep(1000);
  });
};

main();
