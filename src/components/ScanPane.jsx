import { useEffect, useRef, useState } from 'react';
import { digitsOnly, isValidGtin, lookupBarcode, scaleProduct } from '../lib/barcode.js';
import { cameraMessage, cameraSupported, startScanner } from '../lib/scanner.js';
import { toNumber } from '../lib/meals.js';
import { round1 } from '../lib/nutrition.js';

// Scan a barcode with the camera (or type it), look the product up, choose how much you ate, then add it.
// Like the other panes it calls onAdd({ name, serving, calories, protein, carbs, fat }) and leaves the rest to the caller.
// When a scan gives no usable result it offers a button that calls onCustom(name), so the caller can open its Custom form.
export default function ScanPane({ onAdd, addLabel = 'Add food', onCustom, customLabel = 'Add it as a custom food' }) {
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState('idle'); // idle, scanning, loading, found, missing or error
  const [message, setMessage] = useState('');
  const [product, setProduct] = useState(null);
  const [amount, setAmount] = useState('');
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

  async function lookup(code) {
    attempt.current += 1;
    stopCamera();
    const id = ++requestId.current;
    setPhase('loading');
    setMessage('');
    setProduct(null);
    try {
      const found = await lookupBarcode(code);
      if (id !== requestId.current) return;
      if (!found) {
        setPhase('missing');
        return;
      }
      setProduct(found);
      setAmount(String(found.servingAmount ?? 100));
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
        const code = digitsOnly(raw);
        if (finished || ![8, 12, 13, 14].includes(code.length)) return; // ignore anything that is not a product barcode
        finished = true;
        stopCamera();
        lookup(code);
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
    const code = digitsOnly(typed);
    if (!isValidGtin(code)) {
      setPhase('error');
      setMessage("That doesn't look like a valid barcode. Check the digits printed under the bars.");
      return;
    }
    lookup(code);
  }

  // Shown whenever the scan cannot give a result, so nobody is left at a dead end.
  const customButton = (name = '') =>
    onCustom ? (
      <button type="button" className="btn secondary" onClick={() => onCustom(name)}>
        {customLabel}
      </button>
    ) : null;

  const grams = toNumber(amount);
  const totals = product && grams ? scaleProduct(product, grams) : null;

  function add() {
    if (!totals) return;
    onAdd({
      name: product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase()) ? `${product.name} (${product.brand})` : product.name,
      serving: `${grams} ${product.unit}`,
      ...totals,
    });
    setProduct(null);
    setTyped('');
    setPhase('idle');
  }

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
        <div className="product-card">
          <h2>{product.name}</h2>
          {product.brand && <p className="muted">{product.brand}</p>}

          {!product.hasNutrition ? (
            <>
              <p className="note">This product has no calorie information in the database. You can add it yourself from the label.</p>
              {customButton(product.name)}
            </>
          ) : (
            <>
              <p className="muted small">
                Per 100 {product.unit}: {product.per100.calories} kcal &nbsp; P {product.per100.protein} g &nbsp; C {product.per100.carbs} g &nbsp; F{' '}
                {product.per100.fat} g
              </p>
              <label className="field compact">
                <span>Amount you ate ({product.unit})</span>
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {product.servingText && <small className="hint">Serving size on the pack: {product.servingText}</small>}
              </label>
              <p className="muted small">
                {totals ? `${totals.calories} kcal` : '0 kcal'} &nbsp; P {totals ? totals.protein : 0} g &nbsp; C {totals ? totals.carbs : 0} g &nbsp; F{' '}
                {totals ? totals.fat : 0} g
              </p>
              <button type="button" className="btn" onClick={add} disabled={!totals}>
                {addLabel}
              </button>
            </>
          )}

          <p className="muted small">
            Data from{' '}
            <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
              Open Food Facts
            </a>
            , a community database. Check it against the pack.
          </p>
        </div>
      )}
    </div>
  );
}
