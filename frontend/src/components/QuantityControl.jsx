import Icon from './Icon.jsx';

export default function QuantityControl({ value, onChange, min = 1, max, book }) {
  const suffix = book ? ' de ' + book : '';
  return (
    <div className="quantity">
      <button type="button" aria-label={'Diminuir quantidade' + suffix} disabled={value <= min}
        onClick={() => onChange(value - 1)}><Icon name="minus" size={15} /></button>
      <output aria-label={'Quantidade' + suffix}>{value}</output>
      <button type="button" aria-label={'Aumentar quantidade' + suffix} disabled={value >= max}
        onClick={() => onChange(value + 1)}><Icon name="plus" size={15} /></button>
    </div>
  );
}
