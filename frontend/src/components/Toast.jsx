import Icon from './Icon.jsx';

export default function Toast({ message, detail, type, dismiss }) {
  const icon = type === 'success' ? 'check' : 'alert';
  return (
    <div className={'toast toast--' + type}>
      <span className="toast__icon"><Icon name={icon} size={17} /></span>
      <div role={type === 'error' ? 'alert' : 'status'}>
        <p>{message}</p>
        {detail && <small>{detail}</small>}
      </div>
      <button type="button" className="icon-button" onClick={dismiss} aria-label="Fechar mensagem">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
