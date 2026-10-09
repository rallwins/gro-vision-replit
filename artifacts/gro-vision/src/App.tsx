import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Check, CircleHelp, Crosshair, ImagePlus, LoaderCircle, PackageSearch, RotateCcw, ScanLine, Sparkles, Upload, X } from 'lucide-react';
import { CATALOG, productById, type ModelProgress, type ProductDetection } from './lib/catalog';
import { detectGroceryProducts } from './lib/detector';

type Sample = { src: string; title: string; kind: string };
const samples: Sample[] = [
  { src: '/samples/coke-glass-bottle.webp', title: 'Glass bottle', kind: 'Single package' },
  { src: '/samples/coke-can.jpg', title: 'Cola can', kind: 'Single package' },
  { src: '/samples/assorted-cans.jpg', title: 'Assorted cans', kind: 'Multi-item scene' },
  { src: '/samples/soda-bottles.jpeg', title: 'Soda bottles', kind: 'Multi-item scene' },
  { src: '/samples/coke-pet-15l.jpeg', title: 'Cola PET bottle', kind: 'Single package' },
  { src: '/samples/pepsi-can.jpg', title: 'Pepsi can', kind: 'Single package' },
];

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanIdRef = useRef(0);
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [selectedSample, setSelectedSample] = useState('');
  const [detections, setDetections] = useState<ProductDetection[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [modelProgress, setModelProgress] = useState<ModelProgress>({ status: 'Ready when you are' });
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setStageSize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    }));
    observer.observe(node);
    return () => observer.disconnect();
  }, [imageUrl]);

  const currentImage = useMemo(() => imageUrl, [imageUrl]);
  const setChosenImage = (url: string, name: string, sample = '') => {
    scanIdRef.current += 1;
    if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl(url);
    setImageName(name);
    setSelectedSample(sample);
    setDetections([]);
    setSelectedId('');
    setError('');
    setIsRunning(false);
    setModelProgress({ status: 'Image ready to scan' });
  };
  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, or WebP image to continue.');
      return;
    }
    setChosenImage(URL.createObjectURL(file), file.name);
  };
  const chooseSample = (sample: Sample) => setChosenImage(sample.src, sample.title, sample.src);

  const runScan = async () => {
    if (!currentImage || isRunning) return;
    const scanId = ++scanIdRef.current;
    setError('');
    setIsRunning(true);
    setDetections([]);
    setSelectedId('');
    try {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = currentImage;
      await image.decode();
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      const results = await detectGroceryProducts(image, (progress) => {
        if (scanId === scanIdRef.current) setModelProgress(progress);
      });
      if (scanId !== scanIdRef.current) return;
      setDetections(results);
      setSelectedId(results[0]?.id ?? '');
      setModelProgress({ status: results.length ? 'Scan complete' : 'No catalog matches found' });
    } catch (scanError) {
      if (scanId !== scanIdRef.current) return;
      setError(scanError instanceof Error ? scanError.message : 'The scan did not finish. Please try again.');
      setModelProgress({ status: 'Scan needs another try' });
    } finally {
      if (scanId === scanIdRef.current) setIsRunning(false);
    }
  };

  const resetScan = () => {
    scanIdRef.current += 1;
    if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl('');
    setImageName('');
    setSelectedSample('');
    setDetections([]);
    setSelectedId('');
    setError('');
    setIsRunning(false);
    setModelProgress({ status: 'Ready when you are' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const correctProduct = (detectionId: string, productId: string) => {
    const product = productById(productId);
    if (!product) return;
    setDetections((existing) => existing.map((detection) => detection.id === detectionId
      ? { ...detection, productId, label: product.modelLabel, alternatives: [], uncertainSize: false, uncertainIdentity: false }
      : detection));
  };

  const progressWidth = modelProgress.progress === undefined ? 0 : Math.max(3, Math.min(100, modelProgress.progress));
  const imageScale = Math.min(stageSize.width / imageSize.width, stageSize.height / imageSize.height);
  const renderedWidth = imageSize.width * imageScale;
  const renderedHeight = imageSize.height * imageScale;

  return (
    <main className="app-shell">
      <div className="page-wrap">
        <header className="topbar">
          <div className="brand" data-testid="brand-gro-vision">
            <div className="brand-mark"><Crosshair size={19} strokeWidth={2.1} /></div>
            <div className="brand-name">gro<span>·</span>vision</div>
          </div>
          <div className="top-label"><span className="live-dot" /> IN-BROWSER PRODUCT SCAN</div>
        </header>

        <section className="hero fade-in">
          <div>
            <div className="eyebrow">A clearer read of the basket</div>
            <h1>See what's in<br />the <em>shopping photo.</em></h1>
            <p className="hero-copy">Drop in a shelf or basket image. Gro-Vision finds visible packages, shows its working, and lets you correct a close call.</p>
          </div>
          <div className="hero-side" data-testid="scan-count">
            <div className="scan-number">{detections.length.toString().padStart(2, '0')}</div>
            <div className="scan-caption">items identified</div>
          </div>
        </section>

        <section className="workbench" aria-label="Grocery image scanner">
          <div className="panel image-panel">
            <div className="panel-head">
              <div className="panel-title">01 / Image input</div>
              <div className="head-actions">
                {imageUrl && <button className="icon-btn" type="button" onClick={resetScan} aria-label="Reset image" data-testid="button-reset"><X size={16} /></button>}
                <button className="ghost-btn" type="button" onClick={() => fileInputRef.current?.click()} data-testid="button-upload"><ImagePlus size={14} /> Upload photo</button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => handleFiles(event.target.files)} data-testid="input-image" />
            <div
              className={`dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); handleFiles(event.dataTransfer.files); }}
              onClick={() => !imageUrl && fileInputRef.current?.click()}
              role={imageUrl ? undefined : 'button'}
              tabIndex={imageUrl ? undefined : 0}
              onKeyDown={(event) => { if (!imageUrl && (event.key === 'Enter' || event.key === ' ')) fileInputRef.current?.click(); }}
              data-testid="dropzone-image"
            >
              {imageUrl ? (
                <div className="image-stage" ref={stageRef}>
                  <img
                    src={imageUrl}
                    alt={`Selected grocery photo: ${imageName}`}
                    data-testid="image-original"
                    onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                  />
                  <div className="image-scrim" />
                  <div className="scan-guide" />
                  <div
                    className="detection-overlay"
                    style={{
                      width: `${renderedWidth}px`,
                      height: `${renderedHeight}px`,
                      left: `${(stageSize.width - renderedWidth) / 2}px`,
                      top: `${(stageSize.height - renderedHeight) / 2}px`,
                    }}
                  >
                    {detections.map((detection, index) => {
                      const left = detection.box.xmin / imageSize.width * 100;
                      const top = detection.box.ymin / imageSize.height * 100;
                      const width = (detection.box.xmax - detection.box.xmin) / imageSize.width * 100;
                      const height = (detection.box.ymax - detection.box.ymin) / imageSize.height * 100;
                      const product = productById(detection.productId);
                      return (
                        <button
                          type="button"
                          key={detection.id}
                          className={`detection-box ${selectedId === detection.id ? 'selected' : ''}`}
                          style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                          onClick={(event) => { event.stopPropagation(); setSelectedId(detection.id); }}
                          aria-label={`Select detected item ${index + 1}: ${product?.brand} ${product?.name}`}
                          data-testid={`box-detection-${detection.id}`}
                        >
                          <span>{String(index + 1).padStart(2, '0')}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="image-meta"><span>{imageName}</span><span>{imageSize.width} × {imageSize.height}</span></div>
                </div>
              ) : (
                <div className="empty-upload">
                  <div className="upload-symbol"><Upload size={23} /></div>
                  <h2>Bring a grocery photo into view</h2>
                  <p>Drop an image here or browse your device. The original stays in this browser.</p>
                  <button type="button" className="upload-link" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }} data-testid="button-browse">Browse files <ArrowUpRight size={13} /></button>
                  <span className="file-note">JPG · PNG · WEBP</span>
                </div>
              )}
            </div>
            <div className="image-footer">
              <span className="image-source" data-testid="text-image-source">{imageUrl ? imageName : 'No image selected'}</span>
              <button className="primary-btn" type="button" disabled={!imageUrl || isRunning} onClick={runScan} data-testid="button-scan">
                {isRunning ? <><span className="spinner" /> Scanning</> : <><ScanLine size={15} /> {detections.length ? 'Scan again' : 'Read this photo'}</>}
              </button>
            </div>
          </div>

          <aside className="panel results-panel">
            <div className="panel-head results-head">
              <div>
                <div className="panel-title">02 / Visual readout</div>
                <div className="result-count"><strong data-testid="text-item-count">{detections.length}</strong><span>{detections.length === 1 ? 'package found' : 'packages found'}</span></div>
              </div>
              {detections.length > 0 && <button type="button" className="icon-btn" onClick={() => { setDetections([]); setSelectedId(''); }} aria-label="Clear results" data-testid="button-clear-results"><RotateCcw size={15} /></button>}
            </div>
            <div className="model-status" data-testid="status-model">
              <span className="status-icon">{isRunning ? <LoaderCircle size={12} className="spin-icon" /> : error ? <AlertTriangle size={12} /> : <Check size={12} />}</span>
              <span>{modelProgress.status}</span>
            </div>
            {isRunning && <div className="progress-track" aria-label="Model download progress"><div className="progress-fill" style={{ width: `${progressWidth || 8}%` }} /></div>}
            {error && <div className="error-box" role="alert" data-testid="status-error"><strong>Could not complete the scan.</strong> {error}<button className="upload-link" type="button" onClick={runScan} data-testid="button-retry">Retry</button></div>}
            <div className="results-list">
              {!detections.length && !isRunning && !error ? (
                <div className="result-empty" data-testid="empty-results"><div><PackageSearch size={28} /><br />Your item-by-item readout will appear here.<br />Choose a photo, then run a scan.</div></div>
              ) : null}
              {isRunning && !detections.length && <div className="result-empty" data-testid="loading-results"><div><Sparkles size={26} /><br />Looking for visible packages…<br />First model use may take a little longer.</div></div>}
              {!isRunning && !error && imageUrl && detections.length === 0 && modelProgress.status === 'No catalog matches found' && <div className="result-empty" data-testid="empty-matches"><div><CircleHelp size={27} /><br />No catalog match stood out in this image.<br />Try a closer, well-lit photo.</div></div>}
              {detections.map((detection, index) => {
                const product = productById(detection.productId);
                if (!product) return null;
                const alternatives = detection.alternatives?.map(productById).filter((item) => item !== undefined) ?? [];
                const lowConfidence = detection.score < .12;
                return (
                  <article
                    key={detection.id}
                    className={`result-card ${selectedId === detection.id ? 'selected' : ''}`}
                    onClick={() => setSelectedId(detection.id)}
                    data-testid={`card-detection-${detection.id}`}
                  >
                    <div className="result-index">{String(index + 1).padStart(2, '0')}</div>
                    <div className="result-copy">
                      <div className="result-brand">{product.brand}</div>
                      <div className="result-name">{product.name}{detection.uncertainSize ? ' · size uncertain' : product.size !== 'Glass' ? ` · ${product.size}` : ''}</div>
                      <div className="result-variant">{product.packageType}{detection.uncertainSize ? ' · size uncertain' : ''}</div>
                      {lowConfidence && <span className="low-confidence"><CircleHelp size={10} /> Check this match</span>}
                      {detection.uncertainIdentity && <span className="low-confidence"><CircleHelp size={10} /> Review product match</span>}
                      {alternatives.length > 0 && <div className="result-variant">Also considered: {alternatives.map((item) => `${item.brand} ${item.variant} ${item.size}`).join(' · ')}</div>}
                    </div>
                    <div className="result-score" title="Model ranking score, not a probability">{Math.round(detection.score * 100)} pts</div>
                    <label className="result-edit">
                      <select
                        aria-label={`Correct item ${index + 1} catalog match`}
                        value={detection.productId}
                        onChange={(event) => correctProduct(detection.id, event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        data-testid={`select-correction-${detection.id}`}
                      >
                        {CATALOG.map((option) => <option key={option.id} value={option.id}>{option.brand} {option.name} · {option.packageType} · {option.size}</option>)}
                      </select>
                    </label>
                  </article>
                );
              })}
            </div>
            <div className="result-tools">
              <span className="plain-note">Model scores rank its suggestions; they are not calibrated probabilities.</span>
              <span className="mono" style={{ fontSize: 8, color: '#8c9084' }}>OWL-ViT</span>
            </div>
          </aside>
        </section>

        <section className="sample-section">
          <div className="section-header">
            <div><div className="eyebrow">Try a real package photo</div><h2>Start with a sample</h2></div>
            <p>Each image follows the same live model path as an upload. Sizes in sample packaging may not be legible.</p>
          </div>
          <div className="sample-grid">
            {samples.map((sample) => (
              <button
                type="button"
                className={`sample-card ${selectedSample === sample.src ? 'active' : ''}`}
                key={sample.src}
                onClick={() => chooseSample(sample)}
                data-testid={`button-sample-${sample.src.split('/').pop()?.replace(/\W/g, '-')}`}
              >
                <span className="sample-image"><img src={sample.src} alt="" loading="lazy" /></span>
                <span className="sample-caption">{sample.title}<span className="sample-kind">{sample.kind}</span></span>
              </button>
            ))}
          </div>
        </section>

        <div className="disclosure" data-testid="text-model-disclosure">
          <CircleHelp size={17} />
          <div><strong>What this read can and can't tell you.</strong> This uses pretrained zero-shot vision against a local grocery catalog; the example photos are not fine-tuning data. Exact size and variant matching remains approximate, especially where a label is small or turned away. Correct any prediction with the catalog selector.</div>
        </div>

        <section className="roadmap" aria-label="Product roadmap">
          <div><h2>Next on the shelf</h2><div className="roadmap-sub">A practical path from vision to verified inventory.</div></div>
          <div className="phases">
            <div className="phase"><span className="phase-no">PHASE 01 · NOW</span><strong>See &amp; correct</strong><p>Multi-item scan, visible boxes, and manual catalog correction.</p></div>
            <div className="phase"><span className="phase-no">PHASE 02</span><strong>Read the fine print</strong><p>OCR, barcode reading, and saved inventory for repeat work.</p></div>
            <div className="phase"><span className="phase-no">PHASE 03</span><strong>Measure what matters</strong><p>Larger labeled real-store dataset, fine-tuning, and measured validation.</p></div>
          </div>
        </section>
        <footer className="footer"><span>Gro-Vision · Visual grocery scan</span><span>Private by default · Runs in this browser</span></footer>
      </div>
    </main>
  );
}

export default App;
