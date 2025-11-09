import React from "react";
import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import "./mainapp.css";
import CompVisionAna from "./components/CompVisionAna";
import VN from "./components/VN";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";
const socket = io(SOCKET_URL);

function App() {
  const [transcript, setTranscript] = useState("");
  const [liveFeedback, setLiveFeedback] = useState(null);
  const [finalAnalysis, setFinalAnalysis] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [videoStream, setVS] = useState(null);
  const [videoFeedbackEnabled, VideoFeedbackEnabled] = useState(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("general");
  const [isWaitingForFirstFeedback, setIsWaitingForFirstFeedback] =
    useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState({
    eyeContact: {
      isLookingAtCamera: false,
      eContactPercentage: 0,
      gazeDirection: 'center'
    },
    bodyLanguage: {
      posture: 'good',
      hGestures: 0,
      movement: 'minimal',
      confidence: 0
    }
  });
  const mRecorderRef = useRef(null);
  const videoR = useRef(null);
  const stoppingR = useRef(false);

  useEffect(() => {
    
    socket.on("transcript", (data) => {
      setTranscript((prev) => prev + " " + data.text);
    });

    
    socket.on("interim-transcript", (data) => {
      
      console.log("Interim:", data.text);
    });

    socket.on("live-feedback", (data) => {
      setLiveFeedback(data);
      setIsWaitingForFirstFeedback(false);
    });

    socket.on("final-analysis", (data) => {
      setFinalAnalysis(data);
      setIsRecording(false);
      setIsWaitingForFirstFeedback(false);
    });

    socket.on("analysis-error", (data) => {
      setError(data.message);
      setIsRecording(false);
      setIsWaitingForFirstFeedback(false);
    });

    socket.on("transcription-error", (data) => {
      
      setIsWaitingForFirstFeedback(false);
    });

    

    return () => {
      socket.off("transcript");
      socket.off("interim-transcript");
      socket.off("live-feedback");
      socket.off("final-analysis");
      socket.off("analysis-error");
      socket.off("transcription-error");
    };
  }, []);

  
  useEffect(() => {
    socket.emit("set-analysis-type", { analysisType: selectedAnalysisType });
  }, [selectedAnalysisType]);

  
  const hVA = (analysis) => {
    setVisionAnalysis(analysis);
  };

  const sRecord = async () => {
    try {
      setError(null);
      setTranscript("");
      setLiveFeedback(null);
      setFinalAnalysis(null);
      setIsWaitingForFirstFeedback(true);

      console.log("Starting recording with video:", videoFeedbackEnabled);

      
      const mediaConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      };

      if (videoFeedbackEnabled) {
        mediaConstraints.video = {
          width: { ideal: 320, max: 480 }, 
          height: { ideal: 240, max: 360 }, 
          facingMode: "user",
          frameRate: { ideal: 15, max: 20 }, 
        };
      }

      console.log("Requesting media with constraints:", mediaConstraints);
      const stream =
        await navigator.mediaDevices.getUserMedia(mediaConstraints);
      console.log(
        "Media stream obtained:",
        stream.getTracks().map((t) => `${t.kind}: ${t.label}`),
      );

      
      if (videoFeedbackEnabled) {
        console.log("Setting up video stream:", stream);
        console.log("Video tracks:", stream.getVideoTracks());
        setVS(stream);

        
        setTo(() => {
          if (videoR.current) {
            console.log("Setting video srcObject");
            videoR.current.srcObject = stream;
            
            videoR.current.play().catch((err) => {
              console.error("Video play error:", err);
            });
          } else {
            console.error("videoR.current is still null after timeout!");
          }
        }, 100);
      }

      

      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        
        mimeType = "audio/ogg;codecs=opus";
      } 

      console.log("Using MIME type:", mimeType);

      
      const audioOnlyStream = new MediaStream([stream.getAudioTracks()[0]]);
      const mediaRecorder = new MediaRecorder(
        audioOnlyStream,
        mimeType ? { mimeType } : {},
      );
      mRecorderRef.current = mediaRecorder;

      
      mediaRecorder.fullStream = stream;

      mediaRecorder.addEventListener("dataavailable", async (e) => {
        if (!e.data || e.data.size === 0) return;
        console.log("Audio chunk size:", e.data.size, "bytes");
        const arrayBuffer = await e.data.arrayBuffer();
        socket.emit("audio-chunk", arrayBuffer);
      });

      mediaRecorder.addEventListener("start", () => {
        console.log("MediaRecorder started successfully");
        setIsRecording(true);
      });

      mediaRecorder.addEventListener("stop", () => {  
        console.log("MediaRecorder onstop");
        setIsRecording(false);
      });

      mediaRecorder.addEventListener("error", (e) => {
        console.error("MediaRecorder error:", e);
        setError("Recording error occurred. Please try again.");
        setIsRecording(false);
      });

      
      mediaRecorder.start(250);
    } catch (err) {
      setError("Failed to access camera/microphone. Please check permissions.");
      console.error("Error starting recording:", err);
      setIsRecording(false);
    }
  };

  const toggleVideoFeedback = () => {
    VideoFeedbackEnabled(!videoFeedbackEnabled);
    if (isRecording) {
      stopRecording();
      setTo(() => {
        sRecord();
      }, 50);
    }
  };

  const stopRecording = () => {
    if (stoppingR.current) return;          
      stoppingR.current = true;
  
    console.log("Stopping recording...");

    setIsRecording(false);
    socket.emit("end-stream"); 

    const mr = mRecorderRef.current;

    if (mr && mr.state !== "inactive") {
      try { mr.stop(); } catch (e) { /* ignore */ }
    }

    const fullStream = mr?.fullStream || videoR.current?.srcObject;
      if (fullStream) {
        fullStream.getTracks().forEach((track) => {
        console.log(`Stopping ${track.kind} track:`, track.label);
        track.stop();
      });

    
    setVS(null);
    if (videoR.current) videoR.current.srcObject = null;

    console.log("Recording stopped");

    
    setTo(() => { stoppingR.current = false; }, 200);
    }
  };

  const mCard = ({ title, value, feedback, score }) => (
    <div className={`metric-card ${score}`}>
      <h3>{title}</h3>
      <div className="metric-value">{value}</div>
      <p className="metric-feedback">{feedback}</p>
    </div>
  );

  const rMetrics = (data, showAIFeedback = true) => {
    if (!data) return null;

    return (
      <div className="metrics-grid">
        <mCard
          title="Speaking Pace"
          value={`${data.pacing?.wpm || 0} WPM`}
          feedback={data.pacing?.feedback}
          score={data.pacing?.score}
        />
        <mCard
          title="Filler Words"
          value={`${data.fillerWords?.percentage || 0}%`}
          feedback={data.fillerWords?.feedback}
          score={data.fillerWords?.score}
        />
        <mCard
          title="Pauses"
          value={`${data.pauses?.longPauseCount || 0} long pauses`}
          feedback={data.pauses?.feedback}
          score={data.pauses?.score}
        />
        <mCard
          title="Readability"
          value={`Grade ${data.readability?.smogIndex || 0}`}
          feedback={data.readability?.feedback}
          score={data.readability?.score}
        />
        {data.qualitativeFeedback && showAIFeedback && (
          <div className="qualitative-feedback-card">
            <h3>AI Feedback</h3>
            <div className="feedback-content">
              <div className="ai-feedback-text">
                {data.qualitativeFeedback.feedback
                  .split(/\d+\.|\n/)
                  .map((segment, index) => {
                    const cleanSegment = segment.trim();
                    if (!cleanSegment) return null;

                    
                    const isNumberedPoint =
                      data.qualitativeFeedback.feedback.includes(`${index}.`) ||
                      cleanSegment.length > 20;

                    return (
                      <div
                        key={index}
                        className={
                          isNumberedPoint ? "feedback-point" : "feedback-text"
                        }
                      >
                        {cleanSegment}
                      </div>
                    );
                  })
                  .filter(Boolean)}
              </div>
            </div>
            {data.qualitativeFeedback.source === "error" && (
              <p className="error-note">Note:  fallback analysis</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <header>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "40px",
            justifyContent: "center",
          }}
        >
        </div>
      </header>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="controls">
        <button
          onClick={sRecord}
          disabled={isRecording}
          className={`control-btn start-btn ${isRecording ? "disabled" : ""}`}
        >
          {isRecording ? "Record your voice" : "Start"}
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className={`control-btn stop-btn ${!isRecording ? "disabled" : ""}`}
        >
          Stop
        </button>
        
      </div>

      <div className="main-content">
        {/* Top section: Video and Feedback side by side */}
        <div className="top-section">
          {/* Video Section - Left */}
          <section className="video-section">
            <h2>
              
              {isRecording && (
                <span
                  style={{
                    marginLeft: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <div
                    className="pulse"
                    style={{ width: "12px", height: "12px" }}
                  ></div>
                </span>
              )}
            </h2>
            <div className="video-container">
              {!videoFeedbackEnabled ? (
                <div className="video-placeholder">
                  <div className="placeholder-icon"></div>
                  <p>Video sturned off</p>
                </div>
              ) : videoStream ? (
                <>
                  <video
                    ref={videoR}
                    autoPlay
                    muted
                    playsInline
                    className="presentation-video"
                    onLoadedMetadata={() => console.log("Video metadata loaded")}
                    onCanPlay={() => console.log("Video can play")}
                    onError={(e) => console.error("Video error:", e)}
                    onLoadStart={() => console.log("Video load started")}
                  />
                  <CompVisionAna 
                    videoR={videoR} 
                    onUpdate={hVA}
                    isActive={isRecording}
                  />
                </>
              ) : (
                <div className="video-placeholder">
                  <div className="placeholder-icon">This is your video</div>
                  <p>Start speaking after clicking the Speak button above</p>
                </div>
              )}
            </div>

            {/* Vision Analysis - Show when video is enabled and recording, or when stopped with final analysis */}
            {videoFeedbackEnabled && (isRecording || finalAnalysis) && (
              <VN 
                eyeContactData={visionAnalysis.eyeContact}
                bodyLanguageData={visionAnalysis.bodyLanguage}
                isActive={isRecording}
              />
            )}
          </section>

          {/* Feedback Section - Right */}
          <section className="feedback-section">
            
            {isWaitingForFirstFeedback && (
              <div className="loading-feedback">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>Analyzing your presentation</p>
              </div>
            )}

            {liveFeedback && !finalAnalysis && (
              <div className="live-feedback">
                
                {rMetrics(liveFeedback, false)}
              </div>
            )}

            {finalAnalysis && (
              <div className="final-analysis">
        
                {rMetrics(finalAnalysis, true)}

                {finalAnalysis.followUpQuestions &&
                  finalAnalysis.followUpQuestions.length > 0 && (
                    <div className="followup-questions">
                      <h4>Follow-up</h4>
                      <ul>
                        {finalAnalysis.followUpQuestions.map(
                          (question, index) => (
                            <li key={index}>{question}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {!liveFeedback && !finalAnalysis && !isWaitingForFirstFeedback && (
              <div className="feedback-placeholder">
                <div className="placeholder-icon">Live Feedback coach</div>
                <p>Your feedback will appear here</p>
              </div>
            )}
          </section>
        </div>

        {/* Bottom section: Transcript */}
        <section className="transcript-section">
          
          <div className="transcript-content">
            {transcript || "Speak and see the content of your presentation here "}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
