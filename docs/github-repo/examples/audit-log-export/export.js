const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const API_KEY = process.env.SIX_SENSE_API_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_PREFIX = process.env.S3_PREFIX || "sixsense-audit-logs";

async function exportAuditLog() {
  if (!API_KEY) {
    throw new Error("Missing SIX_SENSE_API_KEY");
  }
  if (!S3_BUCKET) {
    throw new Error("Missing S3_BUCKET");
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startDate = yesterday.toISOString().split("T")[0];
  const endDate = today.toISOString().split("T")[0];

  const url = `https://api.sixsensesolutions.net/v1/audit-log?start_date=${startDate}&end_date=${endDate}&limit=1000`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Audit log export failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${S3_PREFIX}/${startDate}.json`,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    })
  );

  console.log(
    `Exported ${data.events?.length || 0} events to s3://${S3_BUCKET}/${S3_PREFIX}/${startDate}.json`
  );
}

exportAuditLog().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
