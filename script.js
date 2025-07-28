// script.js

let questionNumber = 1;
let threadId = null; // Persist in memory

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  mediaRecorder.ondataavailable = e => chunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const audioFile = new File([blob], "speech.webm");

    const formData = new FormData();
    formData.append("file", audioFile);

    // Step 1: Whisper transcription via your serverless API
    const transcriptRes = await fetch("/api/transcribe", {
      method: "POST",
      body: formData
    });

    if (!transcriptRes.ok) {
      const errorText = await transcriptRes.text();
      console.error("Transcribe API error:", errorText);
      alert("Transcription failed. Please try again.");
      return;
    }

    const transcript = await transcriptRes.json();

    if (!transcript.text || typeof transcript.text !== "string") {
      console.error("Transcript is missing or invalid:", transcript);
      alert("Transcript failed. Please try again.");
      return;
    }

    document.getElementById("transcript").innerText = `Transcript: ${transcript.text}`;

    // Step 2: Send transcript to GPT via /api/chat
    const chatResponse = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: threadId, // send the current thread
        messages: [{ role: "user", content: transcript.text }]
      })
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error("Chat API error:", errorText);
      alert("Failed to get a GPT response. Please check your API key or try again.");
      return;
    }

    const chatData = await chatResponse.json();

    if (!chatData.choices || !chatData.choices[0]) {
      console.error("Chat API returned no choices:", chatData);
      alert("Something went wrong generating the response. Please try again.");
      return;
    }

    const reply = chatData.choices[0].message.content;
    threadId = chatData.threadId || threadId; // Store threadId if returned

    document.getElementById("gpt-response").innerText = `GPT: ${reply}`;
    document.getElementById("question-count").innerText = `Q${++questionNumber}`;

    // Step 3: Read aloud with improved voice selection
    const utterance = new SpeechSynthesisUtterance(reply);
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => /Google UK English Female|Google US English|Microsoft/.test(v.name));
    if (preferredVoice) utterance.voice = preferredVoice;
    speechSynthesis.speak(utterance);
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 10000); // Stop after 10s
}

function resetInterview() {
  threadId = null;
  questionNumber = 1;
  document.getElementById("question-count").innerText = `Q${questionNumber}`;
  document.getElementById("transcript").innerText = "Transcript:";
  document.getElementById("gpt-response").innerText = "GPT:";
}
