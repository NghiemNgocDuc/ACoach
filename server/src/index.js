require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const speech = require("@google-cloud/speech");
const { PA } = require("./analysis/PA");
const { gFollowups } = require("./analysis/FG");
const { getOpenAIak } = require("./utils/ak");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });


const speechClient = new speech.SpeechClient({
  keyFilename: "./fundamental-run-472018-j4-f9e30ffa6932.json",
});


const LIVE_FEEDBACK_INTERVAL_MS = 3000; 


function getCustomPromptForAnalysisType(analysisType) {
  const prompts = {
    general: `Analyze this presentation transcript and provide constructive feedback. Focus on:
1. Content clarity and structure
2. Communication effectiveness
3. Areas for improvement
4. Strengths to maintain
Provide specific, actionable advice in 2-3 sentences.`,

    teaching: `Analyze this teaching session and provide constructive feedback. Focus on:
1. Content clarity and structure
2. Communication effectiveness
3. Areas for improvement
4. Strengths to maintain
Provide specific, actionable advice in 2-3 sentences.`,

    interview: `The following transcript is from an interview. Evaluate the candidate based on:
1. Communication skills
2. Confidence and poise
3. Ability to handle pressure
4. Adaptability and flexibility
5. Problem-solving skills
Provide specific, actionable advice in 2-3 sentences.`,
  };

  return prompts[analysisType] || prompts.general;
}



const speechConfig = {
  encoding: "WEBM_OPUS",
  sampleRateHertz: 48000,
  languageCode: "en-US",
  enableWordTimeOffsets: true,
  enableAutomaticPunctuation: true,
  model: "latest_long",
};

io.on("connection", (socket) => {
  console.log("client connected", socket.id);

  
  socket._transcript = [];
  socket._lastFeedbackTimestamp = Date.now();
  socket._recognizeStream = null;
  socket._isStreamActive = false;
  socket._analysisType = "general"; 

  
  const startRecognitionStream = () => {
    socket._recognizeStream = speechClient
      .streamingRecognize({
        config: speechConfig,
        interimResults: true,
      })
      .on("data", (data) => {
        if (data.results && data.results.length > 0) {
          const result = data.results[0];

          if (result.isFinal && result.alternatives && result.alternatives[0]) {
            const transcript = result.alternatives[0];

            
            if (transcript.words && transcript.words.length > 0) {
              const words = transcript.words.map((word) => ({
                word: word.word,
                startTime: word.startTime
                  ? parseFloat(word.startTime.seconds || 0) +
                    parseFloat(word.startTime.nanos || 0) / 1000000000
                  : 0,
                endTime: word.endTime
                  ? parseFloat(word.endTime.seconds || 0) +
                    parseFloat(word.endTime.nanos || 0) / 1000000000
                  : 0,
              }));

             
              socket._transcript.push(...words);

             
              const transcriptText = words.map((w) => w.word).join(" ");
              console.log(`Sending transcript: "${transcriptText}"`);
              socket.emit("transcript", { text: transcriptText });

           
              const now = Date.now();
              if (
                now - socket._lastFeedbackTimestamp >
                LIVE_FEEDBACK_INTERVAL_MS
              ) {
                console.log(`Sending live feedback for socket: ${socket.id}`);

          
                if (socket._transcript.length > 0) {
                  try {
                    const analyzer = new PA(
                      socket._transcript,
                    );
                    analyzer
                      .FullAnalysis({
                        ak: getOpenAIak(),
                        customPrompt: getCustomPromptForAnalysisType(
                          socket._analysisType,
                        ),
                      })
                      .then(async (liveReport) => {
                     
                        try {
                          const { questions, rich } = await gFollowups(
                            socket._transcript,
                            {
                              ak: getOpenAIak(),
                              analysisType: socket._analysisType,
                              total: 6,
                            },
                          );
                          liveReport.followUpQuestions = questions;
                          liveReport.followUpDetails = rich; 
                        } catch (e) {
                          console.error("followups live error:", e);
                        }
                        socket.emit("live-feedback", liveReport);
                      });
                  } catch (error) {
                    console.error(
                      "Error creating analyzer for live feedback:",
                      error,
                    );
                  }
                }

            
                socket._lastFeedbackTimestamp = now;
              }
            }
          } else if (!result.isFinal) {
          
            const interimText = result.alternatives[0]?.transcript || "";
            if (interimText.trim()) {
              socket.emit("interim-transcript", { text: interimText });
            }
          }
        }
      })
      .on("error", (error) => {
        console.error("Google Cloud Speech error:", error);
        socket.emit("transcription-error", {
          message: "Speech recognition error occurred",
          error: error.message,
        });

      
        setTo(() => {
          if (socket.connected) {
            startRecognitionStream();
          }
        }, 1000);
      })
      .on("end", () => {
        console.log("Recognition stream ended for socket:", socket.id);
      });
  };

  
  startRecognitionStream();

  
  socket.on("set-analysis-type", (data) => {
    console.log(`Received analysis type change:`, data);
    socket._analysisType = data.analysisType || "general";
    console.log(
      `Analysis type set to: ${socket._analysisType} for socket: ${socket.id}`,
    );
  });

  socket.on("audio-chunk", async (arrayBuffer) => {
    if (socket._recognizeStream && !socket._recognizeStream.destroyed) {
      try {
        
        const audioBuffer = Buffer.from(arrayBuffer);
        socket._recognizeStream.write(audioBuffer);
      } catch (error) {
        console.error("Error writing audio chunk:", error);
      }
    }
  });

  socket.on("end-stream", async () => {
    console.log(
      `Stream ended. Running FINAL analysis for socket: ${socket.id}`,
    );

    // End the recognition stream
    if (socket._recognizeStream && !socket._recognizeStream.destroyed) {
      socket._recognizeStream.end();
    }

    if (socket._transcript && socket._transcript.length > 0) {
      try {
        const analyzer = new PA(socket._transcript);
        const finalReport = await analyzer.FullAnalysis({
          ak: getOpenAIak(),
          customPrompt: getCustomPromptForAnalysisType(socket._analysisType),
        });
        try {
          const { questions, rich } = await gFollowups(
            socket._transcript,
            {
              ak: getOpenAIak(),
              analysisType: socket._analysisType,
              total: 8,
            },
          );
          finalReport.followUpQuestions = questions; 
          finalReport.followUpDetails = rich;
        } catch (e) {
          console.error("followups final error:", e);
        }
        
        socket.emit("final-analysis", finalReport);
      } catch (error) {
        console.error("Error during final analysis:", error);
        socket.emit("analysis-error", {
          message: "Failed to analyze the presentation.",
          error: error.message,
        });
      }
    } else {
      console.log(`No transcript data to analyze for socket: ${socket.id}`);
      socket.emit("analysis-error", {
        message: "No transcript was generated to analyze.",
      });
    }

  
    socket._transcript = [];
  });

  socket.on("disconnect", () => {
    console.log("client disconnected", socket.id);

   
    if (socket._recognizeStream && !socket._recognizeStream.destroyed) {
      socket._recognizeStream.end();
    }

  
    socket._transcript = [];
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log("Google Cloud Speech-to-Text initialized");
});
