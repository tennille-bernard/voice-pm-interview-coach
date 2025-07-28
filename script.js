""let threadId = null;
let questionCount = 0;

async function startRecording(reset = false) {
  if (reset) {
    threadId = null;
    questionCount = 0;
    document.getElementById("question-number").innerText = "";
    document.getElementById("transcript").innerText = "";
    document.getElementById("gpt-response").innerText = "";
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  mediaRecorder.ondataavailable = e => chunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const audioFile = new File([blob], "speech.webm");

    const formData = new FormData();
    formData.append("file", audioFile);

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
    document.getElementById("transcript").innerText = `Transcript: ${transcript.text}`;

    if (!transcript.text || typeof transcript.text !== "string") {
      console.error("Transcript is missing or invalid:", transcript);
      alert("Transcript failed. Please try again.");
      return;
    }

    const chatResponse = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: transcript.text }],
        threadId,
        reset
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
    threadId = chatData.threadId;
    questionCount++;

    document.getElementById("question-number").innerText = `Q${questionCount}`;
    document.getElementById("gpt-response").innerText = `GPT: ${reply}`;

    const utterance = new SpeechSynthesisUtterance(reply);
    speechSynthesis.speak(utterance);
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 5000); // 5s clip
}

// Reset interview button handler
document.getElementById("reset-button").addEventListener("click", () => startRecording(true));
