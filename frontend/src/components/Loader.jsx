export default function Loader({ label = 'Carregando…' }) {
  return <div className="loader" role="status"><span aria-hidden="true" />{label}</div>;
}
