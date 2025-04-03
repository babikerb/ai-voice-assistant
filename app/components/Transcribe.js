"use client";
import { useEffect, useRef, useState } from "react";
import {
  FaExclamationTriangle,
  FaMicrophone,
  FaRedo,
  FaStop,
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
          "Xenova/whisper-small",
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
          voice.name.includes("Microsoft Zira") ||
          voice.lang.includes("en-US")
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
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Model loading status */}
      {modelStatus === "loading" && (
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-blue-800">
            Loading voice recognition model... ({progress}%)
          </p>
          <p className="text-sm text-blue-600 mt-1">
            First-time setup downloads ~500MB (please be patient)
          </p>
        </div>
      )}

      {/* Model error state */}
      {modelStatus === "error" && (
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <FaExclamationTriangle /> Model Failed to Load
          </h3>
          <p className="text-red-600 mb-2">
            Couldn't load the voice recognition model.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      )}

      {/* Main interface */}
      {modelStatus === "loaded" && (
        <>
          <button
            onClick={toggleRecording}
            disabled={permissionDenied || isProcessing}
            className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? (
              <>
                <FaStop />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <FaMicrophone />
                <span>
                  {isProcessing ? "Processing..." : "Start Recording"}
                </span>
              </>
            )}
          </button>

          {permissionDenied && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-1">
                Microphone Access Required
              </h4>
              <p className="text-yellow-700 text-sm">
                Please allow microphone access in your browser settings to use
                voice features.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow border">
              <h3 className="font-bold text-gray-700 mb-2">Your Speech:</h3>
              <div className="min-h-20 p-3 bg-gray-50 rounded">
                {transcript || (
                  <p className="text-gray-400 italic">
                    {isRecording
                      ? "Listening..."
                      : "Your transcription will appear here"}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-700">AI Response:</h3>
                {apiError && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <FaRedo size={12} /> Retry
                  </button>
                )}
              </div>
              <div
                className={`min-h-20 p-3 rounded ${
                  apiError ? "bg-red-50 text-red-700" : "bg-blue-50"
                }`}
              >
                {apiError ? (
                  <div className="flex items-start gap-2">
                    <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{aiResponse}</p>
                      <p className="text-xs mt-1">{apiError}</p>
                    </div>
                  </div>
                ) : (
                  <p>
                    {aiResponse || (
                      <span className="text-gray-400 italic">
                        AI response will appear here
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
