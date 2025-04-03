"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  FaExclamationTriangle,
  FaInfoCircle,
  FaMicrophone,
  FaRedo,
  FaStop,
  FaVolumeUp,
} from "react-icons/fa";
import { styles } from "./TranscribeStyles";

export default function Transcribe() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [modelStatus, setModelStatus] = useState("loading");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const modelRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastRequestTimeRef = useRef(0);

  // Load Whisper model
  useEffect(() => {
    isMountedRef.current = true;

    const loadModel = async () => {
      try {
        const { pipeline } = await import("@xenova/transformers");
        const model = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-tiny",
          {
            progress_callback: (p) => {
              if (isMountedRef.current) {
                setProgress(Math.round((p.loaded / p.total) * 100));
              }
            },
          }
        );

        if (isMountedRef.current) {
          modelRef.current = model;
          setModelStatus("loaded");
        }
      } catch (error) {
        console.error("Failed to load model:", error);
        if (isMountedRef.current) {
          setModelStatus("error");
        }
      }
    };

    loadModel();

    return () => {
      isMountedRef.current = false;
      cleanupMediaResources();
    };
  }, []);

  const cleanupMediaResources = () => {
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionDenied(false);
      return true;
    } catch (error) {
      console.error("Permission denied:", error);
      setPermissionDenied(true);
      return false;
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      if (!modelRef.current) {
        throw new Error("Voice model not loaded");
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const result = await modelRef.current(audioUrl);
      return result.text;
    } catch (error) {
      console.error("Transcription failed:", error);
      throw error;
    }
  };

  const generateAIResponse = async (text) => {
    try {
      const now = Date.now();
      if (now - lastRequestTimeRef.current < 2000) {
        throw new Error("Please wait before making another request");
      }
      lastRequestTimeRef.current = now;

      if (!text || text.trim().length === 0) {
        throw new Error("No transcription text provided");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `API request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      return data.reply
        .replace(/\[INST\].*?\[\/INST\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    } catch (error) {
      console.error("AI response error:", error);
      setApiError(error.message);
      throw error;
    }
  };

  const speak = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance();
      const cleanText = text.replace(/\[INST\].*?\[\/INST\]/g, "").trim();
      utterance.text = cleanText;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.includes("Microsoft Zira") || voice.lang.includes("en-US")
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech synthesis not supported");
    }
  };

  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log("Available voices:", voices);
      };

      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);

  const handleRecordingStop = async () => {
    setIsProcessing(true);
    setApiError(null);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const text = await transcribeAudio(audioBlob);
      setTranscript(text);

      const response = await generateAIResponse(text);
      setAiResponse(response);

      await speak(response);
    } catch (error) {
      console.error("Processing error:", error);
      if (!aiResponse) {
        setAiResponse("Error: " + error.message);
      }
    } finally {
      setIsProcessing(false);
      cleanupMediaResources();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (!(await requestMicrophonePermission())) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = handleRecordingStop;
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      setPermissionDenied(true);
    }
  };

  const handleRetry = async () => {
    if (!transcript) return;
    setApiError(null);
    setIsProcessing(true);

    try {
      const response = await generateAIResponse(transcript);
      setAiResponse(response);
      await speak(response);
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="transcribe-container">
        {/* Model loading status */}
        <AnimatePresence>
          {modelStatus === "loading" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="model-loading-card"
            >
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="progress-text">{progress}%</span>
              </div>
              <p className="loading-text">
                <FaInfoCircle />
                Loading voice recognition model...
              </p>
              <p className="loading-note">
                First-time setup downloads ~500MB (please be patient)
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Model error state */}
        {modelStatus === "error" && (
          <div className="error-card">
            <div className="error-content">
              <FaExclamationTriangle className="text-red-500 mt-0.5" />
              <div>
                <h3 className="error-title">Model Failed to Load</h3>
                <p className="error-message">
                  Couldn't load the voice recognition model.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="reload-button"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main interface */}
        {modelStatus === "loaded" && (
          <div>
            {/* Recording button */}
            <motion.button
              onClick={toggleRecording}
              disabled={permissionDenied || isProcessing}
              className={`record-button ${
                isRecording ? "recording" : "not-recording"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isRecording && (
                <motion.div
                  className="pulse-animation"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <div className="flex items-center gap-3">
                {isRecording ? (
                  <>
                    <FaStop className="text-xl" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <FaMicrophone className="text-xl" />
                    <span>{isProcessing ? "Processing..." : "Start Recording"}</span>
                  </>
                )}
              </div>
            </motion.button>

            {/* Permission warning */}
            {permissionDenied && (
              <div className="permission-warning">
                <div className="warning-content">
                  <FaExclamationTriangle className="text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="warning-title">Microphone Access Required</h4>
                    <p className="warning-message">
                      Please allow microphone access in your browser settings to
                      use voice features.
                    </p>
                    <button
                      onClick={requestMicrophonePermission}
                      className="try-again-button"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript and Response Cards */}
            <div>
              {/* Transcript Card */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <span className="dot blue-dot" />
                    Your Speech
                  </h3>
                  {transcript && (
                    <button
                      onClick={() => navigator.clipboard.writeText(transcript)}
                      className="card-action"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <div className="card-content">
                  {transcript ? (
                    <p className="transcript-text">{transcript}</p>
                  ) : (
                    <p className="placeholder-text">
                      {isRecording ? "Listening..." : "Speech transcription will appear here"}
                    </p>
                  )}
                </div>
              </div>

              {/* AI Response Card */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <span className="dot purple-dot" />
                    AI Response
                  </h3>
                  <div className="ai-response-actions">
                    {aiResponse && (
                      <button
                        onClick={() => speak(aiResponse)}
                        className="action-button"
                        title="Read aloud"
                      >
                        <FaVolumeUp size={18} />
                      </button>
                    )}
                    {apiError && (
                      <button
                        onClick={handleRetry}
                        className="retry-button"
                      >
                        <FaRedo size={14} />
                        Retry
                      </button>
                    )}
                  </div>
                </div>
                <div
                  className={`card-content ${
                    apiError ? "error-card" : "bg-purple-50/80"
                  }`}
                >
                  {apiError ? (
                    <div className="error-response">
                      <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="error-main">{aiResponse}</p>
                        <p className="error-detail">{apiError}</p>
                      </div>
                    </div>
                  ) : aiResponse ? (
                    <p className="transcript-text">{aiResponse}</p>
                  ) : (
                    <p className="placeholder-text">AI response will appear here</p>
                  )}
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="disclaimer">
              <p>
                <FaInfoCircle className="disclaimer-icon" />
                This interface uses AI-powered speech recognition (Whisper-tiny model).
                Responses may contain inaccuracies and should be verified independently.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}