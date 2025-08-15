const audioSrc = new Audio("/audio/shineNCS.mp3");
audioSrc.crossOrigin = "anonymous";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

//creating audio context and connecting to media source to speakers
const mediaSrc = audioContext.createMediaElementSource(audioSrc);

//analyser setup
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
analyser.smoothingTimeConstant = 0.8;
const frequency = new Uint8Array(analyser.frequencyBinCount);

//connections
mediaSrc.connect(analyser);
analyser.connect(audioContext.destination);

//setting animation frame initially as 0
let rafId = null;

function startLoop() {
  if (rafId != null) return;
  const loop = () => {
    analyser.getByteFrequencyData(frequency);
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

//file upload support
let currentBlobUrl = null;

function loadTrack(file) {
  if (!file || !/^audio\//.test(file.type)) {
    alert("Please choose an audio file (mp3, wav, ogg, etc.)");
    return;
  }

  audioSrc.pause();
  stopLoop();

  // Revoke old blob URL to avoid leaks
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }

  // Create new blob URL and swap source
  currentBlobUrl = URL.createObjectURL(file);
  audioSrc.src = currentBlobUrl;
  audioSrc.dataset.filename = file.name;

  audioSrc.onloadedmetadata = () => {
    const song = document.getElementById("song");
    if (song) song.textContent = `ready: ${file.name}`;
  };
}
//  end upload support

const audio = () => {
  const play = document.getElementById("play");
  const pause = document.getElementById("pause");
  const volume = document.getElementById("vol");
  const song = document.getElementById("song");
  const fileInput = document.getElementById("file");

  // Wire file picker
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) loadTrack(file);
    });
  }

  play.addEventListener("click", async () => {
    if (audioContext.state !== "running") await audioContext.resume();
    await audioSrc.play().catch(() => {});
    startLoop();

    // Prefer chosen filename if it's a blob:, otherwise fall back to URL tail
    const pretty =
      audioSrc.dataset.filename ||
      decodeURIComponent(audioSrc.src.split("/").pop() || "");
    song.textContent = `now playing: ${pretty}`;
  });

  pause.addEventListener("click", () => {
    audioSrc.pause();
    stopLoop();
    song.textContent = "";
  });

  volume.addEventListener("input", (event) => {
    const vol = parseFloat(event.target.value);
    audioSrc.volume = Math.min(1, Math.max(0, vol));
  });

  // Clean up blob URL when leaving page
  window.addEventListener("beforeunload", () => {
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
  });
};

export { audio, analyser, frequency, loadTrack };
export default audio;
