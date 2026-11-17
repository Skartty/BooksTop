import { useState } from 'react';
import Icon from './Icon.jsx';

export default function Cover({ book, eager = false }) {
  const [failedSrc, setFailedSrc] = useState();
  const alt = 'Capa de ' + book.nome;
  const variant = [...String(book.nome)].reduce((sum, letter) => sum + letter.codePointAt(0), 0) % 5;
  if (!book.capa || failedSrc === book.capa) {
    return (
      <div className={'cover-fallback cover-fallback--' + variant} role="img" aria-label={alt + ' indisponível'}>
        <Icon name="book" size={21} />
        <span>{book.nome}</span>
        <small>{book.autor}</small>
      </div>
    );
  }
  return (
    <img src={book.capa} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
      onError={() => setFailedSrc(book.capa)}
      onLoad={(event) => {
        if (event.currentTarget.naturalWidth < 2) setFailedSrc(book.capa);
      }} />
  );
}
