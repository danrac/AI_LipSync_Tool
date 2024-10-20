// main.jsx

#include "json2.js"
#include "Base64Decoder.jsx"

function handleCEPAction(action, param1, param2) {
    switch(action) {
        case 'uploadVisemes':
            uploadVisemes(param1, param2); // fileName, base64Data
            break;
        case 'saveVisemeLabels':
            saveVisemeLabels(param1); // JSON string
            break;
        case 'importAudio':
            importAudio(param1, param2); // fileName, base64Data
            break;
        case 'generateLipSync':
            generateLipSync();
            break;
        default:
            postStatus('Unknown action: ' + action);
    }
}

function uploadVisemes(fileName, base64Data) {
    try {
        var projectFolder = app.project.file.parent.fsName;
        var tempDir = projectFolder + "/viseme_temp/";
        var tempFolder = new Folder(tempDir);
        if (!tempFolder.exists) {
            tempFolder.create();
        }
        var visemeFile = new File(tempDir + fileName);
        if (visemeFile.exists) {
            postStatus(`Viseme "${fileName}" already exists.`);
            return;
        }
        if (visemeFile.open("w")) {
            var binaryData = decodeBase64(base64Data);
            visemeFile.encoding = "BINARY";
            visemeFile.write(binaryData);
            visemeFile.close();
            
            // Import the viseme file into After Effects
            var importOptions = new ImportOptions(visemeFile);
            var importedFile = app.project.importFile(importOptions);
            
            // Delete the temporary file after import
            if (visemeFile.remove()) {
                postStatus(`Viseme "${fileName}" uploaded, imported, and temporary file removed successfully.`);
            } else {
                postStatus(`Viseme "${fileName}" uploaded and imported, but failed to remove temporary file.`);
            }
        } else {
            postStatus(`Failed to save viseme "${fileName}".`);
        }
    } catch (error) {
        postStatus(`Error uploading viseme: ${error.message}`);
    }
}



function saveVisemeLabels(jsonString) {
    try {
        var mappings = JSON.parse(jsonString);
        var projectFolder = app.project.file.parent.fsName;
        var mappingFile = new File(projectFolder + "/viseme_mappings.json");
        
        if (mappingFile.open("w")) {
            mappingFile.write(JSON.stringify(mappings, null, 4));
            mappingFile.close();
            postStatus('Viseme labels saved successfully.');
        } else {
            postStatus('Failed to save viseme labels.');
        }
    } catch (error) {
        postStatus(`Error saving viseme labels: ${error.message}`);
    }
}

function importAudio(fileName, base64Data) {
    try {
        var projectFolder = app.project.file.parent.fsName;
        var tempDir = projectFolder + "/audio_temp/";
        var tempFolder = new Folder(tempDir);
        if (!tempFolder.exists) {
            tempFolder.create();
        }
        var audioFile = new File(tempDir + fileName);
        if (audioFile.open("w")) {
            var binaryData = decodeBase64(base64Data);
            audioFile.write(binaryData);
            audioFile.close();
            
            // Import the audio file into After Effects
            var importOptions = new ImportOptions(audioFile);
            var importedAudio = app.project.importFile(importOptions);
            
            // Add the audio to the active composition
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                app.beginUndoGroup('Import Audio');
                var audioLayer = comp.layers.add(importedAudio);
                audioLayer.name = fileName;
                app.endUndoGroup();
                
                postStatus(`Audio "${fileName}" imported successfully.`);
            } else {
                postStatus('No active composition found.');
            }
        } else {
            postStatus(`Failed to save audio "${fileName}".`);
        }
    } catch (error) {
        postStatus(`Error importing audio: ${error.message}`);
    }
}

function generateLipSync() {
    try {
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem) {
            app.beginUndoGroup('Generate LipSync');
            
            // Assume a character layer is selected
            var layer = comp.selectedLayers[0];
            if (layer) {
                // Add a slider control to represent viseme index
                var slider = layer.Effects.addProperty("ADBE Slider Control");
                slider.name = "Viseme Index";
                
                // Load viseme mappings from JSON
                var projectFolder = app.project.file.parent.fsName;
                var mappingFile = new File(projectFolder + "/viseme_mappings.json");
                var visemeMappings = [];
                
                if (mappingFile.exists) {
                    if (mappingFile.open("r")) {
                        var jsonContent = mappingFile.read();
                        mappingFile.close();
                        visemeMappings = JSON.parse(jsonContent);
                    }
                } else {
                    postStatus('Viseme mappings file not found.');
                    return;
                }
                
                // Create a phoneme to viseme map
                var phonemeToViseme = {};
                for (var i = 0; i < visemeMappings.length; i++) {
                    phonemeToViseme[visemeMappings[i].phoneme] = visemeMappings[i].fileName;
                }
                
                // TODO: Implement phoneme extraction and mapping
                // For PoC, we'll simulate phoneme data
                var phonemeData = [
                    { phoneme: 'A', startTime: 0.0, endTime: 0.5 },
                    { phoneme: 'B', startTime: 0.5, endTime: 1.0 },
                    // Add more phoneme entries as needed
                ];
                
                // Assign unique indices to visemes
                var visemeIndexMap = {};
                var currentIndex = 1;
                for (var phoneme in phonemeToViseme) {
                    visemeIndexMap[phoneme] = currentIndex++;
                }
                
                // Iterate through phonemes and create keyframes
                phonemeData.forEach(function(entry) {
                    var phoneme = entry.phoneme;
                    var startTime = entry.startTime;
                    var endTime = entry.endTime;
                    
                    var visemeIndex = visemeIndexMap[phoneme];
                    if (visemeIndex) {
                        slider.property("ADBE Slider Control-0001").setValueAtTime(startTime, visemeIndex);
                        slider.property("ADBE Slider Control-0001").setValueAtTime(endTime, visemeIndex);
                    }
                });
                
                // Add easing to keyframes
                addEasingToKeyframes(slider.property("ADBE Slider Control-0001"));
                
                // Apply expressions to control viseme visibility
                applyVisemeExpressions(comp, layer, slider, visemeMappings, visemeIndexMap);
                
                app.endUndoGroup();
                postStatus('Lip-sync keyframes generated successfully.');
            } else {
                postStatus('No layer selected. Please select a character layer.');
            }
        } else {
            postStatus('No active composition found.');
        }
    } catch (error) {
        postStatus(`Error generating lip-sync: ${error.message}`);
    }
}

function addEasingToKeyframes(sliderProperty) {
    for (var i = 1; i <= sliderProperty.numKeys; i++) {
        var ease = new KeyframeEase(0.5, 33);
        sliderProperty.setTemporalEaseAtKey(i, [ease], [ease]);
    }
}

function applyVisemeExpressions(comp, layer, slider, visemeMappings, visemeIndexMap) {
    for (var phoneme in visemeIndexMap) {
        var visemeFile = visemeMappings.find(v => v.phoneme === phoneme).fileName;
        var visemeLayer = comp.layers.byName(visemeFile);
        if (visemeLayer) {
            var visemeIndex = visemeIndexMap[phoneme];
            var expression = `
                var index = effect("Viseme Index")("Slider");
                var currentViseme = Math.round(index);
                if (currentViseme == ${visemeIndex}) { 100 } else { 0 }
            `;
            visemeLayer.opacity.expression = expression;
        }
    }
}

function postStatus(message) {
    // Call the handleStatusUpdate function in CEP panel
    var script = `handleStatusUpdate('${message.replace(/'/g, "\\'")}')`;
    var cs = new CSInterface();
    cs.evalScript(script);
}

function decodeBase64(base64Str) {
    return Base64.decode(base64Str); // Assuming the library provides a `Base64.decode` method
}