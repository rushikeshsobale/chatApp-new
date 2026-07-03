// One-off repair: some Muser documents got `interests` overwritten with `[]`
// (an array) instead of the schema's nested-object shape, by a since-fixed bug
// in the /complete-profile onboarding handler. This resets those documents'
// `interests` back to a valid empty object so subsequent updates don't throw
// "Cannot create field 'x' in element {interests: []}".
require("dotenv").config();
const mongoose = require("mongoose");
const Muser = require("../Modules/Muser");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await Muser.collection.updateMany(
    { interests: { $type: "array" } },
    {
      $set: {
        interests: {
          music: [],
          sports: [],
          movies: [],
          books: [],
          hobbies: [],
        },
      },
    }
  );

  console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
