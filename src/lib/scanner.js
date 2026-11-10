// Reads barcodes from the camera.
//   1. If the browser has the built-in BarcodeDetector, use it (fast, no extra download).
//   2. Otherwise load the ZXing library on demand (works in browsers without BarcodeDetector).
// Either way, startScanner resolves with a stop() function that turns the camera off.

export const cameraSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

function unavailable(message) {
  const error = new Error(message);
  error.name = 'ScannerUnavailable';
  return error;
}

async function startNative(video, onCode) {
  const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  video.srcObject = stream;
  await video.play();

  let stopped = false;
  let timer = null;
  const tick = async () => {
    if (stopped) return;
    try {
      const codes = await detector.detect(video);
      if (codes.length > 0 && !stopped) onCode(codes[0].rawValue);
    } catch {
      /* a frame that cannot be read is fine, try the next one */
    }
    if (!stopped) timer = setTimeout(tick, 200); // about 5 looks a second keeps the phone cool
  };
  timer = setTimeout(tick, 0);

  return () => {
    stopped = true;
    clearTimeout(timer);
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };
}

async function startZxing(video, onCode) {
  let library;
  try {
    library = await import('@zxing/browser');
  } catch {
    throw unavailable("Camera scanning isn't available in this browser. Type the barcode number instead.");
  }
  const reader = new library.BrowserMultiFormatReader();
  const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
    if (result) onCode(result.getText());
  });
  return () => controls.stop();
}

export async function startScanner(video, onCode) {
  if (!cameraSupported()) {
    throw unavailable('The camera needs a secure (https) page. Type the barcode number instead.');
  }
  return 'BarcodeDetector' in window ? startNative(video, onCode) : startZxing(video, onCode);
}

// A plain-language message for whatever went wrong while starting the camera.
export function cameraMessage(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow the camera for this site in your browser settings, or type the barcode number.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device. Type the barcode number instead.';
    case 'NotReadableError':
      return 'The camera is being used by another app. Close it and try again, or type the barcode number.';
    case 'ScannerUnavailable':
      return error.message;
    default:
      return "Couldn't start the camera. Type the barcode number instead.";
  }
}
