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
    formData.append("model", "whisper-1");

    // Whisper to text
    const transcript = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: "PM_GPT_Key"
      },
      body: formData
    }).then(res => res.json());

    document.getElementById("transcript").innerText = `Transcript: ${transcript.text}`;

    // GPT-4 reply
    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer PM_GPT_Key",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: transcript.text }]
      })
    }).then(res => res.json());

    const reply = chatResponse.choices[0].message.content;
    document.getElementById("gpt-response").innerText = `GPT: ${reply}`;

    // Speak it back
    const utterance = new SpeechSynthesisUtterance(reply);
    speechSynthesis.speak(utterance);
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 5000); // 5s clip
}
