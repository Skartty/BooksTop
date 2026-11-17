import Icon from './Icon.jsx';

export default function EmptyState({ title, text, icon = 'book', children }) {
  return (
    <section className="empty-state">
      <span className="empty-state__icon"><Icon name={icon} size={28} /></span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children}
    </section>
  );
}
