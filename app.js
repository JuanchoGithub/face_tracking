// Wait for all scripts to load before initializing
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize TensorFlow.js
        await tf.ready();
        console.log('TensorFlow.js initialized with backend:', tf.getBackend());
        
        let currentFilter = 'clown';
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Create image objects for filters
        const filterImages = {
            clown: new Image(),
            glasses: new Image(),
            hat: new Image()
        };

        // Load filter images from SVG files
        filterImages.clown.src = 'filters/clown-nose.svg';
        filterImages.glasses.src = 'filters/glasses.svg';
        filterImages.hat.src = 'filters/hat.svg';

        // Wait for all images to load
        await Promise.all(Object.values(filterImages).map(img => new Promise(resolve => {
            img.onload = resolve;
        })));

        window.setFilter = function(filter) {
            currentFilter = filter;
        };

        // Load face-api.js models first
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('https://vladmandic.github.io/face-api/model/'),
            faceapi.nets.faceLandmark68Net.loadFromUri('https://vladmandic.github.io/face-api/model/')
        ]);
        console.log('Face-API.js models loaded successfully');

        // Start video with proper initialization sequence
        async function startVideo() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 720,
                        height: 560,
                        facingMode: 'user'
                    } 
                });
                video.srcObject = stream;
                
                // Wait for video to be ready
                await new Promise(resolve => {
                    video.onloadedmetadata = () => {
                        video.play().then(resolve);
                    };
                });
                
                console.log('Video stream initialized successfully');
                return true;
            } catch (err) {
                console.error('Error accessing webcam:', err);
                return false;
            }
        }

        // Only start face detection after video is successfully initialized
        if (await startVideo()) {
            const detectFaces = async () => {
                try {
                    const detections = await faceapi
                        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks();

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    if (detections && detections.length > 0) {
                        const displaySize = { width: video.width, height: video.height };
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);

                        resizedDetections.forEach(detection => {
                            const landmarks = detection.landmarks;
                            const nose = landmarks.getNose();
                            const jawline = landmarks.getJawOutline();

                            switch(currentFilter) {
                                case 'clown':
                                    ctx.drawImage(
                                        filterImages.clown,
                                        nose[3].x - 25,
                                        nose[3].y - 25,
                                        50,
                                        50
                                    );
                                    break;
                                case 'glasses':
                                    const leftEye = landmarks.getLeftEye();
                                    const eyeWidth = leftEye[3].x - leftEye[0].x;
                                    ctx.drawImage(
                                        filterImages.glasses,
                                        leftEye[0].x - eyeWidth,
                                        leftEye[0].y - eyeWidth/2,
                                        eyeWidth * 4,
                                        eyeWidth * 2
                                    );
                                    break;
                                case 'hat':
                                    const topOfHead = Math.min(...jawline.map(pt => pt.y));
                                    ctx.drawImage(
                                        filterImages.hat,
                                        jawline[0].x - 30,
                                        topOfHead - 120,
                                        jawline[16].x - jawline[0].x + 60,
                                        120
                                    );
                                    break;
                            }
                        });
                    }
                    requestAnimationFrame(detectFaces);
                } catch (error) {
                    console.error('Error in face detection:', error);
                    requestAnimationFrame(detectFaces);
                }
            };

            detectFaces();
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
});