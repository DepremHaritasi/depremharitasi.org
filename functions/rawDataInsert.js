const slugify = require("slugify");
const firebaseAdmin = require("firebase-admin");
const { sehir } = require("sehir");
const serviceAccount = require("./serviceAccountKey.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const firebaseAdminDB = firebaseAdmin.firestore();

const depremyardimData = require("./outsourceData/depremyardim7.json");

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
    .replaceAll("  ", " ")
    .trim();
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

const slug = (value) => {
  return slugify(value, {
    replacement: "_",
    remove: /[*+~.,()'"!:@\/]/g,
    lower: true,
    strict: false,
    trim: true,
  });
};

const valuesSlug = (record) => {
  return slug(Object.values(record).join("_"));
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
      address: item.adres ? fixTerms(item.adres) : null,
    };
    itemNew.addressSlug = slug(itemNew.address);
    itemNew.slug = valuesSlug(itemNew);
    itemNew.version = "initial_record";
    itemNew.isGoogleGeocoded = false;

    if (itemNew.addressSlug.length < 4) return;

    const exists = await checkRecordExists(itemNew.slug);
    if (!exists) {
      const docRef = await firebaseAdminDB
        .collection("location")
        .doc(itemNew.slug)
        .set(itemNew);

      console.log("Document written with ID: ", docRef);
    }
  });
};

main();
