import Icon from './Icon.jsx';

export default function SearchField({ value, onChange, label }) {
  return (
    <label className="search-field">
      <Icon name="search" size={20} />
      <span className="visually-hidden">{label}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)}
        placeholder="Título, autor ou gênero" />
    </label>
  );
}
