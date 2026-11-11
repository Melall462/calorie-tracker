import { useEffect, useRef, useState } from 'react';
import { digitsOnly, isValidGtin, lookupBarcode } from '../lib/barcode.js';
import { cameraMessage, cameraSupported, startScanner } from '../lib/scanner.js';
import { useFoods } from '../lib/FoodsContext.js';
import ProductCard from './ProductCard.jsx';

// Scan a barcode with the camera (or type it), look the product up, choose how much you ate, then add it.
// Like the other panes it calls onAdd({ name, serving, calories, protein, carbs, fat }) and leaves the rest to the caller.
// When a scan gives no usable result it offers a button that calls onCustom(name, barcode), so the caller can open its
// Custom form with the barcode kept. Products found are remembered in My foods, and a barcode already in My foods is
// found straight away, without the internet.
export default function ScanPane({ onAdd, addLabel = 'Add food', onCustom, customLabel = 'Add it as a custom food' }) {
  const foods = useFoods();
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState('idle'); // idle, scanning, loading, found, missing or error
  const [message, setMessage] = useState('');
  const [product, setProduct] = useState(null);
  const [code, setCode] = useState(''); // the barcode of the last lookup, kept for the custom-food button
  const [fromSaved, setFromSaved] = useState(false);
  const videoRef = useRef(null);
  const stopRef = useRef(null);
  const requestId = useRef(0); // lets us ignore an answer that arrives after the person has moved on
  const attempt = useRef(0); // numbers each camera start, so a camera that finishes starting after Stop is switched straight off

  const stopCamera = () => {
    stopRef.current?.();
    stopRef.current = null;
  };
  useEffect(
    () => () => {
      attempt.current += 1;
      stopCamera();
    },
    [] // turn the camera off when leaving this tab
  );

  async function lookup(barcode) {
    attempt.current += 1;
    stopCamera();
    const id = ++requestId.current;
    setPhase('loading');
    setMessage('');
    setProduct(null);
    setCode(barcode);
    setFromSaved(false);
    // A food already in My foods (scanned before, or typed in against this barcode) needs no internet.
    const saved = foods.byCode(barcode);
    if (saved) {
      foods.touch(saved.id);
      setProduct(saved);
      setFromSaved(true);
      setPhase('found');
      return;
    }
    try {
      const found = await lookupBarcode(barcode);
      if (id !== requestId.current) return;
      if (!found) {
        setPhase('missing');
        return;
      }
      const product = { ...found, code: barcode };
      if (product.hasNutrition) foods.remember(product); // saved as soon as it is scanned, so it is there next time
      setProduct(product);
      setPhase('found');
    } catch (e) {
      if (id !== requestId.current) return;
      setPhase('error');
      setMessage(e.message);
    }
  }

  async function startCamera() {
    requestId.current += 1;
    const mine = ++attempt.current;
    setMessage('');
    setProduct(null);
    setPhase('scanning');
    let finished = false;
    try {
      const stop = await startScanner(videoRef.current, (raw) => {
        const scannedCode = digitsOnly(raw);
        if (finished || ![8, 12, 13, 14].includes(scannedCode.length)) return; // ignore anything that is not a product barcode
        finished = true;
        stopCamera();
        lookup(scannedCode);
      });
      // The camera can finish starting after the person has already pressed Stop or left: switch it straight off.
      if (finished || attempt.current !== mine) stop();
      else stopRef.current = stop;
    } catch (e) {
      if (attempt.current !== mine) return;
      setPhase('error');
      setMessage(cameraMessage(e));
    }
  }

  function cancelCamera() {
    attempt.current += 1;
    stopCamera();
    setPhase('idle');
  }

  function submitTyped(e) {
    e.preventDefault();
    const typedCode = digitsOnly(typed);
    if (!isValidGtin(typedCode)) {
      setCode('');
      setPhase('error');
      setMessage("That doesn't look like a valid barcode. Check the digits printed under the bars.");
      return;
    }
    lookup(typedCode);
  }

  // Shown whenever the scan cannot give a result, so nobody is left at a dead end.
  const customButton = (name = '') =>
    onCustom ? (
      <button type="button" className="btn secondary" onClick={() => onCustom(name, code)}>
        {customLabel}
      </button>
    ) : null;

  return (
    <div className="pane">
      {cameraSupported() ? (
        <>
          <div className={phase === 'scanning' ? 'scanner' : 'scanner off'}>
            <video ref={videoRef} playsInline muted aria-label="Camera view" />
          </div>
          {phase === 'scanning' ? (
            <>
              <p className="muted small" role="status">
                Point the camera at the barcode and hold it steady.
              </p>
              <button type="button" className="btn secondary" onClick={cancelCamera}>
                Stop camera
              </button>
            </>
          ) : (
            <button type="button" className="btn" onClick={startCamera}>
              Scan with camera
            </button>
          )}
        </>
      ) : (
        <p className="muted small">Camera scanning needs a secure (https) page. You can still type the number below.</p>
      )}

      <form className="scan-form" onSubmit={submitTyped}>
        <label className="field">
          <span>Or type the number under the barcode</span>
          <input inputMode="numeric" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="3017620422003" />
        </label>
        <button type="submit" className="btn secondary" disabled={digitsOnly(typed).length === 0 || phase === 'loading'}>
          Look up
        </button>
      </form>

      {phase === 'loading' && (
        <p className="muted" role="status">
          Looking that up…
        </p>
      )}
      {phase === 'error' && (
        <>
          <p className="error" role="alert">
            {message}
          </p>
          {customButton()}
        </>
      )}
      {phase === 'missing' && (
        <>
          <p className="note" role="status">
            We couldn&apos;t find that barcode. Open Food Facts doesn&apos;t have every product, so you can add this one yourself.
          </p>
          {customButton()}
        </>
      )}

      {phase === 'found' && product && (
        <ProductCard
          key={product.id ?? product.code}
          product={product}
          addLabel={addLabel}
          onCustom={onCustom}
          customLabel={customLabel}
          note={fromSaved ? <p className="muted small">From your saved foods, so no internet was needed.</p> : null}
          onAdd={(item) => {
            onAdd(item);
            if (product.hasNutrition) foods.remember(product); // using it again moves it to the top of My foods
            setProduct(null);
            setTyped('');
            setPhase('idle');
          }}
        />
      )}
    </div>
  );
}
