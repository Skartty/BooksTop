export default function EmptyState({ title, text, children }) { return <section className="empty-state"><span>⌁</span><h2>{title}</h2><p>{text}</p>{children}</section>; }
