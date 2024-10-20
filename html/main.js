// main.js

const csInterface = new CSInterface();

// Function to handle status updates from ExtendScript
function handleStatusUpdate(message) {
    updateStatus(message);
}

// Expose this function globally so ExtendScript can call it
window.handleStatusUpdate = handleStatusUpdate;

document.getElementById('upload-visemes').addEventListener('click', () => {
    const files = document.getElementById('viseme-upload').files;
    if (files.length === 0) {
        updateStatus('No visemes selected.');
        return;
    }
    const visemeFiles = Array.from(files);
    updateStatus(`Uploading ${visemeFiles.length} visemes...`);
    
    // Read each file and send to ExtendScript
    visemeFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Data = e.target.result.split(',')[1]; // Get base64 string
            csInterface.evalScript(`handleCEPAction('uploadVisemes', '${file.name}', '${base64Data}')`);
        };
        reader.readAsDataURL(file);
    });
});

document.getElementById('save-viseme-labels').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.viseme-item input');
    const visemeMappings = [];
    inputs.forEach(input => {
        const phoneme = input.value.trim().toUpperCase();
        const fileName = input.getAttribute('data-file');
        if (phoneme && fileName) {
            visemeMappings.push({ phoneme, fileName });
        }
    });
    
    if (visemeMappings.length === 0) {
        updateStatus('No phoneme labels provided.');
        return;
    }
    
    updateStatus('Saving viseme labels...');
    csInterface.evalScript(`handleCEPAction('saveVisemeLabels', '${JSON.stringify(visemeMappings)}')`);
});

document.getElementById('import-audio').addEventListener('click', () => {
    const file = document.getElementById('audio-upload').files[0];
    if (!file) {
        updateStatus('No audio file selected.');
        return;
    }
    updateStatus(`Importing audio: ${file.name}`);

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1]; // Get base64 string
        updateStatus('Sending audio for phoneme extraction...');
        
        try {
            const response = await fetch('http://localhost:3000/extract-phonemes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: new FormData().append('audio', file),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Transcription:', data.transcription);
            console.log('Phonemes:', data.phonemes);

            // Send phoneme data to ExtendScript
            csInterface.evalScript(`handleCEPAction('receivePhonemeData', '${JSON.stringify(data.phonemes)}')`);

            updateStatus('Phoneme data received and sent to After Effects.');
        } catch (error) {
            console.error('Error uploading audio:', error);
            updateStatus(`Error uploading audio: ${error.message}`);
        }
    };
    reader.readAsDataURL(file);
});

// Generate LipSync
document.getElementById('generate-lipsync').addEventListener('click', () => {
    updateStatus('Generating lip-sync animation...');
    csInterface.evalScript(`handleCEPAction('generateLipSync', '', '')`);
});

function updateStatus(message) {
    const statusElement = document.getElementById('status');
    statusElement.innerText = message;
    statusElement.style.color = 'white'; // Reset color if previously red
}

function displayError(message) {
    const statusElement = document.getElementById('status');
    statusElement.innerText = `Error: ${message}`;
    statusElement.style.color = 'red';
}
