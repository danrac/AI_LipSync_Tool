// server/server.js

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { SpeechClient } = require('@google-cloud/speech');
const path = require('path');
const fs = require('fs');

// Initialize Express App
const app = express();
const port = 3000;

// Enable CORS for all origins (for development purposes)
app.use(cors());

// Configure Multer for file uploads
const upload = multer({
    dest: 'uploads/', // Temporary storage directory
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB file size limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /wav|mp3|flac|m4a|aac/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only audio files are allowed!'));
    },
});

// Initialize Google Cloud Speech Client
const speechClient = new SpeechClient();

// Helper Function: Simulate Phoneme Extraction (For PoC)
const simulatePhonemeExtraction = (durationSeconds) => {
    // Simple simulation: Divide audio duration into equal phoneme segments
    const phonemes = ['A', 'E', 'I', 'O', 'U', 'M', 'N', 'S', 'T', 'K'];
    const phonemeDuration = durationSeconds / phonemes.length;
    const phonemeData = phonemes.map((phoneme, index) => ({
        phoneme,
        startTime: parseFloat((index * phonemeDuration).toFixed(2)),
        endTime: parseFloat(((index + 1) * phonemeDuration).toFixed(2)),
    }));
    return phonemeData;
};

// POST Endpoint: /extract-phonemes
app.post('/extract-phonemes', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded.' });
        }

        const audioFilePath = path.resolve(req.file.path);
        const audioBytes = fs.readFileSync(audioFilePath).toString('base64');

        // Audio Configuration
        const audio = {
            content: audioBytes,
        };
        const config = {
            encoding: 'LINEAR16', // Adjust based on your audio file's encoding
            sampleRateHertz: 16000, // Adjust based on your audio file's sample rate
            languageCode: 'en-US',
            enableWordTimeOffsets: true, // Enables word-level time offsets
            // Note: Google Speech-to-Text doesn't provide phoneme-level data
            // For phoneme extraction, additional processing is required
        };
        const request = {
            audio: audio,
            config: config,
        };

        // Transcribe Audio
        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        // Simulate Phoneme Data (Replace with Actual Phoneme Extraction)
        const audioDurationSeconds = 5; // Placeholder: Replace with actual audio duration
        const phonemeData = simulatePhonemeExtraction(audioDurationSeconds);

        // Clean Up: Delete Uploaded File
        fs.unlinkSync(audioFilePath);

        // Respond with Phoneme Data
        res.json({
            transcription,
            phonemes: phonemeData,
        });
    } catch (error) {
        console.error('Error in /extract-phonemes:', error);
        res.status(500).json({ error: error.message });
    }
});

// After transcription
const { spawn } = require('child_process');

// Function to perform forced alignment
const performForcedAlignment = (audioPath, transcription, callback) => {
    const aligner = spawn('mfa_align', [
        '/path/to/dictionary', // Replace with actual dictionary path
        '/path/to/acoustic/model', // Replace with actual model path
        audioPath,
        'output_directory',
    ]);

    aligner.stdout.on('data', (data) => {
        console.log(`MFA Output: ${data}`);
    });

    aligner.stderr.on('data', (data) => {
        console.error(`MFA Error: ${data}`);
    });

    aligner.on('close', (code) => {
        if (code === 0) {
            // Read the alignment results and extract phoneme timings
            const alignmentFile = '/path/to/output_directory/your_audio.TextGrid'; // Replace accordingly
            // Parse TextGrid and extract phoneme data
            // This requires parsing Praat's TextGrid format
            callback(null, phonemeData);
        } else {
            callback(new Error('Forced alignment failed.'));
        }
    });
};


// Start the Server
app.listen(port, () => {
    console.log(`Phoneme extraction server running at http://localhost:${port}`);
});
