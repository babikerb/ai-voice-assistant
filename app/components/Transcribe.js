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
      mediaRecorderRef.current.stream.getTracks().forEach((track, index) => {
        setTimeout(() => track.stop(), index * 100);
      });
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
      // Clean the response
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
      // Stop any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      const cleanText = text.replace(/\[INST\].*?\[\/INST\]/g, "").trim();
      utterance.text = cleanText;

      // Configure voice options
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.includes("Microsoft Zira") || voice.lang.includes("en-US")
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Customize speech
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech synthesis not supported");
    }
  };

  // Load voices when component mounts
  useEffect(() => {
    if ("speechSynthesis" in window) {
      // Some browsers need voices to be loaded first
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log("Available voices:", voices);
      };

      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleRecordingStop = async () => {
    setIsProcessing(true);
    setApiError(null);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });

      // Transcribe audio
      const text = await transcribeAudio(audioBlob);
      setTranscript(text);

      // Get AI response
      const response = await generateAIResponse(text);
      setAiResponse(response);

      // Speak response
      await speak(response);
    } catch (error) {
      console.error("Processing error:", error);

      if (!aiResponse) {
        setAiResponse("Error: " + error.message);
      }
    } finally {
      setIsProcessing(false);
      if (!isIOS) {
        cleanupMediaResources();
      } else {
        // For iOS, delay cleanup
        setTimeout(cleanupMediaResources, 1000);
      }
    }
  };

  const toggleRecording = async (e) => {
    e.preventDefault();
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
    <div className="max-w-md mx-auto p-6 bg-gray-50 rounded-xl shadow-sm">
      {/* Model loading status */}
      <AnimatePresence>
        {modelStatus === "loading" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <motion.div
                  className="bg-blue-600 h-2.5 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-sm font-medium text-blue-700 whitespace-nowrap">
                {progress}%
              </span>
            </div>
            <p className="text-blue-800 flex items-center gap-2">
              <FaInfoCircle className="flex-shrink-0" />
              Loading voice recognition model...
            </p>
            <p className="text-xs text-blue-600 mt-1 pl-6">
              First-time setup downloads ~500MB (please be patient)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model error state */}
      {modelStatus === "error" && (
        <div className="bg-red-50 p-4 rounded-lg mb-6 border border-red-200">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-800">Model Failed to Load</h3>
              <p className="text-red-600 text-sm mb-3">
                Couldn't load the voice recognition model.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main interface */}
      {modelStatus === "loaded" && (
        <div className="space-y-6">
          {/* Recording button with pulse animation */}
          <motion.button
            capture="user"
            onClick={(e) => toggleRecording(e)}
            disabled={permissionDenied || isProcessing}
            className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            } text-white font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden`}
            whileTap={{ scale: 0.98 }}
          >
            {isRecording && (
              <motion.div
                className="absolute inset-0 bg-red-400 opacity-20"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            {isRecording ? (
              <>
                <FaStop className="flex-shrink-0" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <FaMicrophone className="flex-shrink-0" />
                <span>
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Processing
                      </motion.span>
                    </span>
                  ) : (
                    "Start Recording"
                  )}
                </span>
              </>
            )}
          </motion.button>

          {/* Permission warning */}
          {permissionDenied && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-800 mb-1">
                    Microphone Access Required
                  </h4>
                  <p className="text-amber-700 text-sm">
                    Please allow microphone access in your browser settings to
                    use voice features.
                  </p>
                  <button
                    onClick={requestMicrophonePermission}
                    className="mt-2 text-sm text-amber-700 underline hover:text-amber-900"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transcript and Response Cards */}
          <div className="space-y-4">
            {/* Transcript Card */}
            <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Your Speech
                </h3>
                {transcript && (
                  <button
                    onClick={() => navigator.clipboard.writeText(transcript)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Copy
                  </button>
                )}
              </div>
              <div className="min-h-24 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {transcript ? (
                  <p className="text-gray-800 whitespace-pre-line">
                    {transcript}
                  </p>
                ) : (
                  <p className="text-gray-400 italic">
                    {isRecording
                      ? "Listening..."
                      : "Your transcription will appear here"}
                  </p>
                )}
              </div>
            </div>

            {/* AI Response Card */}
            <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  AI Response
                </h3>
                <div className="flex items-center gap-3">
                  {aiResponse && (
                    <button
                      onClick={() => speak(aiResponse)}
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                      title="Read aloud"
                    >
                      <FaVolumeUp size={14} />
                    </button>
                  )}
                  {apiError && (
                    <button
                      onClick={handleRetry}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <FaRedo size={12} /> Retry
                    </button>
                  )}
                </div>
              </div>
              <div
                className={`min-h-24 p-4 rounded-lg border ${
                  apiError
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-purple-50 border-purple-100"
                }`}
              >
                {apiError ? (
                  <div className="flex items-start gap-3">
                    <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{aiResponse}</p>
                      <p className="text-xs mt-1 text-red-600">{apiError}</p>
                    </div>
                  </div>
                ) : aiResponse ? (
                  <p className="text-gray-800 whitespace-pre-line">
                    {aiResponse}
                  </p>
                ) : (
                  <p className="text-gray-400 italic">
                    AI response will appear here
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
