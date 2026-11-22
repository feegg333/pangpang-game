// MediaPipe 骨架辨識（在手機瀏覽器裡跑，iPhone / Android 都支援）
const VER = '0.10.14';
const BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/wasm`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let landmarker = null;
let loading = null;

export function loadPose() {
  if (landmarker) return Promise.resolve(landmarker);
  if (loading) return loading;
  loading = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import(BUNDLE);
    const files = await FilesetResolver.forVisionTasks(WASM);
    const make = (delegate) => PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    try { landmarker = await make('GPU'); } catch { landmarker = await make('CPU'); }
    return landmarker;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

// 平滑處理，避免關節點抖動造成誤判
let smooth = null;
let lastTs = -1;
export function detect(video, now) {
  if (!landmarker || video.readyState < 2) return null;
  const ts = Math.max(Math.round(now), lastTs + 1);
  lastTs = ts;
  const res = landmarker.detectForVideo(video, ts);
  const lm = res?.landmarks?.[0];
  if (!lm) { smooth = null; return null; }
  if (!smooth) smooth = lm.map((p) => ({ ...p }));
  else {
    const a = 0.55;
    for (let i = 0; i < lm.length; i++) {
      smooth[i].x += (lm[i].x - smooth[i].x) * a;
      smooth[i].y += (lm[i].y - smooth[i].y) * a;
      smooth[i].z += (lm[i].z - smooth[i].z) * a;
      smooth[i].visibility = lm[i].visibility;
    }
  }
  return smooth;
}

export function resetSmoothing() { smooth = null; }

const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28]];

// 把骨架畫在畫面上（考慮 object-fit: cover 的裁切）
export function drawSkeleton(canvas, video, lm, color = '#FFD86B') {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  if (!lm) return;
  const vw = video.videoWidth, vh = video.videoHeight;
  const s = Math.max(W / vw, H / vh);
  const ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
  const P = (i) => [ox + lm[i].x * vw * s, oy + lm[i].y * vh * s];
  g.lineCap = 'round';
  for (const [a, b] of BONES) {
    if ((lm[a].visibility ?? 1) < 0.4 || (lm[b].visibility ?? 1) < 0.4) continue;
    g.strokeStyle = 'rgba(59,42,42,.75)'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(...P(a)); g.lineTo(...P(b)); g.stroke();
    g.strokeStyle = color; g.lineWidth = 6;
    g.beginPath(); g.moveTo(...P(a)); g.lineTo(...P(b)); g.stroke();
  }
  for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    if ((lm[i].visibility ?? 1) < 0.4) continue;
    g.fillStyle = '#fff'; g.strokeStyle = '#3b2a2a'; g.lineWidth = 3;
    g.beginPath(); g.arc(...P(i), i === 0 ? 9 : 6, 0, Math.PI * 2); g.fill(); g.stroke();
  }
}
