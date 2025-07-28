let threadId = null;

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

    // Step 1: Whisper transcription
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

    // Step 2: Send transcript to Assistant
    const chatResponse = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: transcript.text,
        threadId: threadId // may be null the first time
      })
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error("Chat API error:", errorText);
      alert("Failed to get a GPT response. Please check your API key or try again.");
      return;
    }

    const chatData = await chatResponse.json();

    if (!chatData.reply) {
      console.error("Chat API returned no reply:", chatData);
      alert("Something went wrong generating the response. Please try again.");
      return;
    }

    // Save threadId for future use
    if (chatData.threadId && !threadId) {
      threadId = chatData.threadId;
    }

    const reply = chatData.reply;
    document.getElementById("gpt-response").innerText = `GPT: ${reply}`;

    // Speak it back
    const utterance = new SpeechSynthesisUtterance(reply);
    speechSynthesis.speak(utterance);
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 5000); // 5s clip
}
