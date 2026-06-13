import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

// Fix lamejs ReferenceError in Node.js environment
// @ts-ignore
import MPEGMode from "lamejs/src/js/MPEGMode.js";
// @ts-ignore
import Lame from "lamejs/src/js/Lame.js";
(global as any).MPEGMode = MPEGMode;
(global as any).Lame = Lame;

// @ts-ignore
import lamejsLib from "lamejs";

const lamejs = (lamejsLib as any).default || lamejsLib;

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with generous limit for audio and video transfers
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

import fs from "fs";
import { exec } from "child_process";
import crypto from "crypto";

// Ensure /tmp directory structure is ready
const TMP_DIR = path.join("/tmp", "video-renders");
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// REST API to merge video and generated voiceover
app.post("/api/combine-video", async (req, res) => {
  let tempId = crypto.randomUUID();
  let inputVideoPath = "";
  let inputAudioPath = "";
  let outputVideoPath = "";

  try {
    const { videoData, audioData, format, mixAudio } = req.body;

    if (!videoData) {
      return res.status(400).json({ error: "No video file provided for stitching." });
    }
    if (!audioData) {
      return res.status(400).json({ error: "No voice-over audio file provided." });
    }

    const targetFormat = format === "mov" ? "mov" : "mp4";

    // Standardize extensions and clean up old runs to protect root disk space
    try {
      const files = fs.readdirSync(TMP_DIR);
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(TMP_DIR, file);
        const stats = fs.statSync(filePath);
        // Delete files older than 15 minutes
        if (now - stats.mtimeMs > 15 * 60 * 1000) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (cleanupErr) {
      console.warn("Temporary directory maintenance warning:", cleanupErr);
    }

    // Capture input video extension by scanning header or fallback
    let videoExt = "mp4";
    if (videoData.includes("video/quicktime") || videoData.includes(".mov")) {
      videoExt = "mov";
    } else if (videoData.includes("video/webm")) {
      videoExt = "webm";
    }

    inputVideoPath = path.join(TMP_DIR, `input_${tempId}.${videoExt}`);
    inputAudioPath = path.join(TMP_DIR, `input_${tempId}.wav`);
    outputVideoPath = path.join(TMP_DIR, `output_${tempId}.${targetFormat}`);

    // Strip data schemes if present and write binaries to disk
    const videoClean = videoData.replace(/^data:video\/\w+;base64,/, "");
    const audioClean = audioData.replace(/^data:audio\/\w+;base64,/, "");

    fs.writeFileSync(inputVideoPath, Buffer.from(videoClean, "base64"));
    fs.writeFileSync(inputAudioPath, Buffer.from(audioClean, "base64"));

    // FFmpeg execution command constructor
    let ffmpegCmd = "";
    if (mixAudio) {
      // Stitches background audio with primary narrator track. Falls back to substitution if zero channels
      ffmpegCmd = `ffmpeg -y -i "${inputVideoPath}" -i "${inputAudioPath}" -filter_complex "[0:a]volume=0.3[a1];[1:a]volume=1.2[a2];[a1][a2]amix=inputs=2:duration=first[a]" -map 0:v:0 -map "[a]" -c:v copy -c:a aac -shortest "${outputVideoPath}"`;
    } else {
      // Standard professional replacement
      ffmpegCmd = `ffmpeg -y -i "${inputVideoPath}" -i "${inputAudioPath}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "${outputVideoPath}"`;
    }

    console.log("Running FFmpeg script command:", ffmpegCmd);

    exec(ffmpegCmd, (error, stdout, stderr) => {
      // If the mix command erred, it is highly likely that the video file has no original audio track.
      // In that case, we seamlessly fall back to simple sound replacement.
      if (error && mixAudio) {
        console.warn("Mixing failed (likely no pre-existing sound track). Retrying with pure sound overlay...");
        const fallbackCmd = `ffmpeg -y -i "${inputVideoPath}" -i "${inputAudioPath}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "${outputVideoPath}"`;
        exec(fallbackCmd, (fallbackErr) => {
          // Cleanup input assets immediately to maintain zero footprint
          try {
            if (fs.existsSync(inputVideoPath)) fs.unlinkSync(inputVideoPath);
            if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
          } catch (e) {}

          if (fallbackErr) {
            console.error("FFmpeg fallback execution failed:", fallbackErr);
            return res.status(500).json({ error: "FFmpeg render processing failed completely: " + fallbackErr.message });
          }

          res.json({
            success: true,
            downloadUrl: `/api/download-video/${tempId}?format=${targetFormat}`
          });
        });
        return;
      }

      // Cleanup
      try {
        if (fs.existsSync(inputVideoPath)) fs.unlinkSync(inputVideoPath);
        if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
      } catch (e) {}

      if (error) {
        console.error("FFmpeg primary execution failed:", error, stderr);
        return res.status(500).json({ error: "FFmpeg process error: " + error.message });
      }

      res.json({
        success: true,
        downloadUrl: `/api/download-video/${tempId}?format=${targetFormat}`
      });
    });

  } catch (error: any) {
    console.error("Server video compilation failure:", error);
    try {
      if (inputVideoPath && fs.existsSync(inputVideoPath)) fs.unlinkSync(inputVideoPath);
      if (inputAudioPath && fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
    } catch (_) {}
    res.status(500).json({ error: error.message || "An error occurred during video compilation." });
  }
});

// Download video file endpoint
app.get("/api/download-video/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;
    const ext = format === "mov" ? "mov" : "mp4";
    const targetFile = path.join(TMP_DIR, `output_${id}.${ext}`);

    if (!fs.existsSync(targetFile)) {
      return res.status(404).send("The requested video render file has expired or was not found.");
    }

    res.download(targetFile, `keeper_voiceover.${ext}`, (err) => {
      // Delete rendered file to keep the disk clean and compliant after serving
      try {
        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile);
        }
      } catch (cleanErr) {
        console.warn("Cleanup post download failed:", cleanErr);
      }
    });
  } catch (err: any) {
    res.status(500).send("Storage retrieval error: " + err.message);
  }
});

// Initialize Gemini SDK lazily, with standard User-Agent header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please add it in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

/**
 * Packs 16-bit Mono PCM buffer into a standard 44-byte RIFF WAV container.
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const wavHeader = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  const fileSize = 36 + dataSize;

  // RIFF Chunk
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(fileSize, 4);
  wavHeader.write("WAVE", 8);

  // Format Subchunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);               // Subchunk1Size (16)
  wavHeader.writeUInt16LE(1, 20);                // AudioFormat (1 = PCM)
  wavHeader.writeUInt16LE(1, 22);                // NumChannels (1 = Mono)
  wavHeader.writeUInt32LE(sampleRate, 24);       // SampleRate
  wavHeader.writeUInt32LE(sampleRate * 2, 28);   // ByteRate (SampleRate * MonoChannel * 2 Bytes)
  wavHeader.writeUInt16LE(2, 32);                // BlockAlign (1 Channel * 2 Bytes = 2)
  wavHeader.writeUInt16LE(16, 34);               // BitsPerSample (16-bit)

  // Data Subchunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(dataSize, 40);         // Subchunk2Size

  return Buffer.concat([wavHeader, pcmBuffer]);
}

/**
 * Converts 16-bit Mono PCM buffer into an MP3 buffer using lamejs.
 */
function pcmToMp3(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const channels = 1; // mono
  const kbps = 128; // standard voice-over quality
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);

  const numSamples = Math.floor(pcmBuffer.length / 2);
  const pcmData = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    pcmData[i] = pcmBuffer.readInt16LE(i * 2);
  }

  const mp3Chunks: Buffer[] = [];
  const sampleBlockSize = 1152; // LAME encoder standard block size
  for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
    const chunk = pcmData.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Chunks.push(Buffer.from(mp3buf));
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Chunks.push(Buffer.from(mp3buf));
  }

  return Buffer.concat(mp3Chunks);
}

/**
 * Generates an atmospheric cinematic fallback drone when Gemini TTS is quota-exhausted or missing.
 * Sound characteristics fit the selected narrator to maintain deep artistic immersion.
 */
function generateAtmosphericFallback(text: string, voice: string): Buffer {
  const charCount = text.length;
  // Calculate dynamic duration in seconds based on character length
  const durationSec = Math.max(3.2, Math.min(9.5, charCount * 0.065));
  const sampleRate = 24000;
  const totalSamples = Math.floor(durationSec * sampleRate);
  const pcmBuffer = Buffer.alloc(totalSamples * 2);

  const isDeep = voice === "Fenrir" || voice === "Charon";
  const freq = isDeep ? 65.41 : 110.0; // Deep rumble C2 vs mid-range A2 hum

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Slow ambient volume envelope for smooth fade-ins and fade-outs
    let envelope = 1;
    if (t < 0.6) {
      envelope = t / 0.6;
    } else if (t > durationSec - 0.6) {
      envelope = (durationSec - t) / 0.6;
    }

    // High-fidelity base waveform (fundamental + fifth harmonic for rich space vibe)
    let sampleVal = Math.sin(2 * Math.PI * freq * t) * 0.55;
    sampleVal += Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.22; // Fifth interval
    sampleVal += Math.sin(2 * Math.PI * (freq * 2.0) * t) * 0.12; // Octave

    // LFO (Low Frequency Oscillator) sweep modulation
    const lfo = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.35 * t);
    sampleVal *= lfo;

    // Tailored atmospheric overlays based on character profile:
    if (voice === "Fenrir") {
      // Powerful primordial fire hum + sub bass
      sampleVal += Math.sin(2 * Math.PI * 32.7 * t) * 0.25; // Sub-bass sub-harmonic
      if (Math.random() < 0.00015) {
        sampleVal += (Math.random() - 0.5) * 0.45; // Sparse crackle pops for fireplace
      }
    } else if (voice === "Charon") {
      // Mysterious mechanical pulsar modulations
      sampleVal += Math.sin(2 * Math.PI * 180 * t) * 0.04 * Math.sin(2 * Math.PI * 4 * t);
    } else if (voice === "Kore") {
      // Glittering ancient sun shimmering waves
      sampleVal += Math.sin(2 * Math.PI * 330 * t) * 0.02 * Math.sin(2 * Math.PI * 1.5 * t);
      sampleVal += Math.sin(2 * Math.PI * 440 * t) * 0.015 * Math.sin(2 * Math.PI * 2.5 * t);
    } else {
      // Storyteller dynamic breathing waves
      sampleVal += Math.sin(2 * Math.PI * 220 * t) * 0.03 * Math.sin(2 * Math.PI * 0.8 * t);
    }

    // Convert into 16-bit signed PCM LE integer
    let intVal = Math.floor(sampleVal * 15000 * envelope);
    if (intVal > 32767) intVal = 32767;
    if (intVal < -32768) intVal = -32768;

    pcmBuffer.writeInt16LE(intVal, i * 2);
  }

  return pcmBuffer;
}

// REST API endpoint to generate single-speaker audio chunk using Gemini TTS
app.post("/api/voiceovers", async (req, res) => {
  try {
    const { text, voice, style } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text content is required to generate audio." });
    }

    let ai;
    let fallbackMode = false;
    let fallbackReason = "";

    try {
      ai = getGeminiClient();
    } catch (err: any) {
      fallbackMode = true;
      fallbackReason = "Gemini API key is not configured in Secrets.";
    }

    let pcmBuffer: Buffer | null = null;

    if (!fallbackMode && ai) {
      try {
        const instructionPrompt = style 
          ? `State the following text in a voice style that is ${style}. Do not say anything except the requested text. Text: "${text}"`
          : `Say: "${text}"`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: instructionPrompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Fenrir' },
              },
            },
          },
        });

        const base64PCM = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64PCM) {
          throw new Error("API base64 raw data block is missing.");
        }
        pcmBuffer = Buffer.from(base64PCM, "base64");
      } catch (err: any) {
        console.warn("Gemini premium TTS pipeline failed or quota rate limited. Deploying Crucible synthesis fallback.", err.message);
        fallbackMode = true;
        
        if (err.message && (err.message.includes("429") || err.message.toLowerCase().includes("quota") || err.message.includes("exhausted"))) {
          fallbackReason = "Premium TTS voice-cast quota limit reached (free tier allows 10 calls/day limit on Model: gemini-3.1-flash-tts).";
        } else {
          fallbackReason = err.message || "Gemini returned empty narrative candidates.";
        }
      }
    }

    // If API unavailable, rate-limited, or failed, apply our beautiful immersive atmospheric sound
    if (fallbackMode || !pcmBuffer) {
      pcmBuffer = generateAtmosphericFallback(text, voice || 'Fenrir');
    }

    // Prepare WAV
    const wavBuffer = pcmToWav(pcmBuffer, 24000);
    const base64Wav = wavBuffer.toString("base64");

    // Prepare MP3
    const mp3Buffer = pcmToMp3(pcmBuffer, 24000);
    const base64Mp3 = mp3Buffer.toString("base64");

    res.json({
      audioUrl: `data:audio/wav;base64,${base64Wav}`,
      mp3Url: `data:audio/mp3;base64,${base64Mp3}`,
      duration: (pcmBuffer.length / 2) / 24000,
      fallback: fallbackMode,
      fallbackReason: fallbackReason
    });
  } catch (error: any) {
    console.error("Error generating voiceover:", error);
    res.status(500).json({ error: error.message || "An error occurred while calling the Gemini TTS engine." });
  }
});

// REST API endpoint to merge multiple WAV items sequentially with silent pauses
app.post("/api/merge", async (req, res) => {
  try {
    const { segments, pauseDuration } = req.body;
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: "At least one audio segment is required to merge." });
    }

    const silenceGapSec = typeof pauseDuration === "number" ? pauseDuration : 1.2;
    const samplesPerSilence = Math.floor(silenceGapSec * 24000);
    const bytesPerSilence = samplesPerSilence * 2; // 16-bit mono = 2 bytes
    const silenceBuffer = Buffer.alloc(bytesPerSilence); // Creates zero-amplitude PCM buffer

    const combinedPcmChunks: Buffer[] = [];

    for (let i = 0; i < segments.length; i++) {
      const base64Audio = segments[i];
      if (!base64Audio) continue;

      // Extract base64 payload (could be WAV or MP3, but we should extracts the raw PCM)
      // Since segments sent here can be raw PCM or WAV, we handle extracting PCM.
      // We designed the UI to send the base64 WAV, from which we strip the 44-byte header.
      const base64Clean = base64Audio.replace(/^data:audio\/\w+;base64,/, "");
      const fullBuffer = Buffer.from(base64Clean, "base64");

      // Skip WAV container's 44-byte header if present
      let rawPcm: Buffer;
      if (fullBuffer.length > 44) {
        // Simple check: RIFF header signals WAV
        if (fullBuffer.toString("utf8", 0, 4) === "RIFF") {
          rawPcm = fullBuffer.subarray(44);
        } else {
          // If it isn't WAV, it could be raw PCM already
          rawPcm = fullBuffer;
        }
      } else {
        rawPcm = fullBuffer;
      }

      combinedPcmChunks.push(rawPcm);

      // Append silent block between sections (skip the final trailing separator)
      if (i < segments.length - 1) {
        combinedPcmChunks.push(silenceBuffer);
      }
    }

    const finalPcmBuffer = Buffer.concat(combinedPcmChunks);
    
    // Prepare WAV
    const finalWavBuffer = pcmToWav(finalPcmBuffer, 24000);
    const base64CombinedWav = finalWavBuffer.toString("base64");

    // Prepare MP3
    const finalMp3Buffer = pcmToMp3(finalPcmBuffer, 24000);
    const base64CombinedMp3 = finalMp3Buffer.toString("base64");

    res.json({
      audioUrl: `data:audio/wav;base64,${base64CombinedWav}`,
      mp3Url: `data:audio/mp3;base64,${base64CombinedMp3}`,
      duration: (finalPcmBuffer.length / 2) / 24000
    });
  } catch (error: any) {
    console.error("Error merging audio segments:", error);
    res.status(500).json({ error: error.message || "An error occurred during audio stitching." });
  }
});

async function start() {
  // Integrate Vite dev middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on http://localhost:${PORT}`);
  });
}

start();
