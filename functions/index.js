const functions = require("firebase-functions");

require("dotenv").config();

const Airtable = require("airtable");
const baseId = process.env.BASE_ID;
const tableId = process.env.TABLE_ID;
const token = process.env.AIRTABLE_TOKEN;

const base = new Airtable({ apiKey: token }).base(baseId);
const table = base(tableId);

const getRecords = async () => {
  const records = await table.select().all();
  return records;
};

exports.data = functions.https.onRequest(async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Content-Type", "application/json");
  if (request.method !== "GET") {
    response.status(403).send("Forbidden!");
  }

  const records = await getRecords();
  const recordsJson = records
    .map((record) => {
      let data = record._rawJson;
      if (data.fields["Konum"] && data.fields["Konum"].includes(",")) {
        data.fields["Lat"] = parseFloat(
          data.fields["Konum"].split(",")[0].trim()
        );
        data.fields["Long"] = parseFloat(
          data.fields["Konum"].split(",")[1].trim()
        );
      }
      return {
        ...data,
      };
    })
    .filter((record) => {
      const fields = Object.keys(record.fields);
      if (fields.includes("Konum") && record.fields["Konum"].includes(",")) {
        return true;
      }
      return false;
    });

  response.send({
    version: "0.1.0",
    records: recordsJson,
  });
});