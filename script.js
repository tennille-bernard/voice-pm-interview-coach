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

    const
