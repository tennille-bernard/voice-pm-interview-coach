let mediaRecorder;
let audioChunks = [];
let threadId = null;
let questionCount = 1;

const transcriptPara = document.getElementById("transcript");
const gptResponsePara = document.getElementById("gpt-response");
const questionCounter = document.getElementById("question-count");

function updateQuestionCounter() {
  questionCounter.textContent = `Q${questionCount}`;
}

function resetInterview() {
  threadId = null;
  questionCount = 1;
  transcriptPara.innerHTML = "<strong>Transcript:</strong>";
  gptResponsePara.innerHTML = "<strong>GPT:</strong>";
  updateQuestionCounter();
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob, "input.webm");

    try {
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

      const { text } = await transcriptRes.json();

      if (!text || text.trim() === "") {
        console.error("Transcript is missing or empty:", text);
        alert("Transcription was empty. Please try again.");
        return;
      }

      transcriptPara.innerHTML = `<strong>Transcript:</strong> ${text}`;

      // Step 2: Send transcript to GPT assistant
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: threadId,
          messages: [{ role: "user", content: text }]
        })
      });

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        console.error("Chat API error:", errorText);
        alert("GPT response failed. Please try again.");
        return;
      }

      const data = await chatResponse.json();
      const gptReply = data.reply;
      threadId = data.threadId;

      gptResponsePara.innerHTML = `<strong>GPT:</strong> ${gptReply}`;
      questionCount++;
      updateQuestionCounter();
    } catch (err) {
      console.error("Unexpected error during processing:", err);
      alert("Unexpected error occurred. Please try again.");
    }
  };

  mediaRecorder.start();

  setTimeout(() => {
    mediaRecorder.stop();
  }, 10000); // Record for 10 seconds
}

updateQuestionCounter();
