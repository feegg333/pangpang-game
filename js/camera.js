// 相機與陀螺儀（AR 效果用）

let stream = null;

export async function startCamera(video, facing = 'environment') {
  stopCamera();
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera');
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  video.setAttribute('playsinline', '');
  video.muted = true;
  video.srcObject = stream;
  await video.play().catch(() => {});
  await new Promise((r) => (video.readyState >= 2 ? r() : (video.onloadeddata = r)));
  return stream;
}

export function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
}

// iPhone 要在點擊事件裡請求陀螺儀權限
export async function requestMotion() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      return (await DeviceOrientationEvent.requestPermission()) === 'granted';
    }
  } catch { return false; }
  return true;
}

// 讓 AR 怪物「固定」在空間中：手機轉向時，怪物往反方向移動
export function trackOrientation(onMove) {
  let base = null;
  const handler = (e) => {
    const yaw = e.webkitCompassHeading != null ? -e.webkitCompassHeading : e.alpha;
    const pitch = e.beta;
    if (yaw == null || pitch == null) return;
    if (!base) base = { yaw, pitch };
    let dy = yaw - base.yaw;
    if (dy > 180) dy -= 360;
    if (dy < -180) dy += 360;
    const dp = pitch - base.pitch;
    onMove(dy, dp);
  };
  window.addEventListener('deviceorientation', handler);
  return () => window.removeEventListener('deviceorientation', handler);
}

let wakeLock = null;
export async function keepAwake() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* 不支援就算了 */ }
}
export function releaseAwake() {
  try { wakeLock?.release(); } catch { /* */ }
  wakeLock = null;
}
