import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  region: 'af-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadDir = path.resolve('public/assets');
const bucket = 'cdn.hustlestudio.co.za';

function getMimeType(file) {
  if (file.endsWith('.mp4')) return 'video/mp4';
  if (file.endsWith('.mp3')) return 'audio/mpeg';
  if (file.endsWith('.webp')) return 'image/webp';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function upload() {
  if (!fs.existsSync(uploadDir)) {
    console.warn('No local assets directory found. Skipping upload.');
    return;
  }

  const files = [];
  const walk = (dir) => {
    for (const item of fs.readdirSync(dir)) {
      const filepath = path.join(dir, item);
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        walk(filepath);
      } else {
        files.push(filepath);
      }
    }
  };

  walk(uploadDir);

  for (const file of files) {
    const key = file.replace(`${path.resolve('public')}${path.sep}`, '').replace(/\\/g, '/');
    const body = fs.readFileSync(file);
    await s3
      .upload({
        Bucket: bucket,
        Key: key,
        Body: body,
        ACL: 'public-read',
        ContentType: getMimeType(file),
      })
      .promise();
    console.log('Uploaded:', key);
  }
}

upload().catch((error) => {
  console.error('CDN upload failed', error);
  process.exitCode = 1;
});
