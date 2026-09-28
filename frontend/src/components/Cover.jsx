import { useState } from 'react';
export default function Cover({ src, alt, className = '' }) { const [failed, setFailed] = useState(false); return failed ? <div className={`cover-fallback ${className}`} aria-label={`Capa indisponível: ${alt}`} role="img"><span>BT</span></div> : <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />; }
