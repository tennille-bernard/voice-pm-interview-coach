async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const audioFile = new File([blob], "speech.webm");

    const formData = new FormData();
    formData.append("file", audioFile);

    // Step 1: Send audio to Whisper transcription endpoint
    const transcriptRes = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!transcriptRes.ok) {
      const errorText = await transcriptRes.text();
      console.error("Transcribe API error:", errorText);
      alert("Transcription failed. Please try again.");
      return;
    }

    const transcript = await transcriptRes.json();
    document.getElementById("transcript").innerText = `Transcript: ${transcript.text}`;

    // Step 2: Validate transcript
    if (!transcript.text || typeof transcript.text !== "string") {
      console.error("Transcript is missing or invalid:", transcript);
      alert("Transcript failed. Please try again.");
      return;
    }

    // Step 3: Send transcript to GPT via serverless API
    const chatResponse = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: transcript.text }],
      }),
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
    document.getElementById("gpt-response").innerText = `GPT: ${reply}`;

    // Step 4: Speak the GPT response
    const utterance = new SpeechSynthesisUtterance(reply);
    speechSynthesis.speak(utterance);
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
}
