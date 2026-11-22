// Android Chrome：遊戲開著時可以直接在頁面裡感應，不用重開網頁（Web NFC）
// iPhone 不支援 Web NFC，會走「碰貼紙 → 通知 → 開啟網址」的流程，一樣能玩。

let started = false;
let handler = null;

export const webNfcSupported = () => 'NDEFReader' in window;

export function setNfcHandler(fn) { handler = fn; }

// 必須在使用者點擊時呼叫（第一次會跳出權限詢問）
export async function enableInAppNfc() {
  if (started || !webNfcSupported()) return started;
  try {
    const reader = new window.NDEFReader();
    await reader.scan();
    started = true;
    reader.onreading = (e) => {
      for (const rec of e.message.records) {
        if (rec.recordType !== 'url' && rec.recordType !== 'absolute-url') continue;
        try {
          const u = new URL(new TextDecoder().decode(rec.data));
          const n = u.searchParams.get('n'), k = u.searchParams.get('k');
          if (n && handler) handler(n, k);
        } catch { /* 不是我們的貼紙 */ }
      }
    };
  } catch { /* 使用者拒絕或沒開 NFC */ }
  return started;
}

export const nfcActive = () => started;
