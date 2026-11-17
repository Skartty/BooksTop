import { useId, useLayoutEffect, useRef } from 'react';

export default function Modal({ title, description, onCancel, busy, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog className="modal" ref={dialog} aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}>
      <h2 id={titleId}>{title}</h2>
      {description && <p id={descriptionId} className="modal__description">{description}</p>}
      {children}
    </dialog>
  );
}
