# ACoach
Next-gen AI analytics for confident communication.

## Inspiration
Public speaking is a very critical ability, but people hardly receive real-time feedback while practicing it. That was exactly what we wanted to build-something that feels like a personal AI coach, listening and watching as it helps you improve on the spot.

## What it does
ACoach uses AI to analyze your speech, tone, and body language in real time. It provides instantaneous feedback on pacing, filler words, clarity, and confidence, with camera-based analysis including posture and gestures. Users can quickly switch between modes like presentation, interview, or teaching for tailored coaching.

## How we built it
We used React + Vite for the frontend, ensuring a smooth and modern interface. Socket.IO is integrated for real-time streaming between client and server.
The backend runs on Node.js, and it integrates Google Cloud Speech-to-Text for transcription and OpenAI GPT models for qualitative analysis and feedback generation.

## Challenges we ran into
Managing real-time audio streaming with no latency.
Handling rate limits and token usage from AI APIs.
Combination of audio and video analysis results in a unified feedback loop.

## Accomplishments that we're proud of
Created a live AI-powered feedback system that works in real time.
Designed a clean, intuitive UI for quick setup and analysis.
Created several analysis modes that update the AI prompts in real time according to the desired purpose. Presentation, interview, and teaching are all modes, for example.

## What we learned
We learned how to handle streaming data pipelines, optimize OpenAI API usage, and design AI-powered interfaces that deliver value immediately.

## How to use it
Firstly, enable Google Cloud Speech-to-Text, download the json file and paste that in server. Rename the file in .env. Secondly, create openai-key.txt in server folder and paste in the paid OpenAI key to handle various request. Set up node and npm then run it. Press start button to start the application.

## What's next for ACoach
Add emotion and gesture recognition by using vision models.
Support multi-language coaching and accent training. 
Build a dashboard showing progress over time based on metrics such as confidence and clarity.
