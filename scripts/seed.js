const { Client } = require("pg");

const TOTAL = 10_000_000;
const BATCH = 50_000;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  console.log("Seeding started...");

  for (let i = 0; i < TOTAL; i += BATCH) {
    const values = [];

    for (let j = i + 1; j <= i + BATCH && j <= TOTAL; j++) {
      values.push(
        `('User ${j}','user${j}@example.com',
        (ARRAY['US','IN','GB','DE','FR'])[floor(random()*5)+1],
        (ARRAY['free','basic','premium'])[floor(random()*3)+1],
        round((random()*1000)::numeric,2))`
      );
    }

    await client.query(`
      INSERT INTO users (name,email,country_code,subscription_tier,lifetime_value)
      VALUES ${values.join(",")}
    `);

    console.log(`Inserted ${Math.min(i + BATCH, TOTAL)} / ${TOTAL}`);
  }

  await client.end();
  console.log("Seeding finished.");
}

run();
