const https = require('https');
const fs = require('fs');
const path = require('path');

const models = [
    'tiny_face_detector_model-shard1',
    'tiny_face_detector_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_landmark_68_model-weights_manifest.json'
];

const modelDir = path.join(__dirname, 'models');

if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir);
}

models.forEach(model => {
    const url = `https://raw.githubusercontent.com/vladmandic/face-api/master/model/${model}`;
    const file = fs.createWriteStream(path.join(modelDir, model));
    https.get(url, response => {
        response.pipe(file);
        console.log(`Downloading ${model}...`);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${model}`);
        });
    }).on('error', err => {
        fs.unlink(path.join(modelDir, model), () => {});
        console.error(`Error downloading ${model}:`, err.message);
    });
});