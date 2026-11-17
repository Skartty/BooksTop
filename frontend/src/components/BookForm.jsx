import { useState } from 'react';

const empty = { nome: '', autor: '', genero: '', capa: '', descricao: '', preco: '', estoque: '' };

function validate(form) {
  const errors = {};
  for (const name of ['nome', 'autor', 'genero']) {
    if (!form[name].trim()) errors[name] = 'Preencha este campo.';
  }
  try {
    const url = new URL(form.capa.trim());
    if (!['http:', 'https:'].includes(url.protocol)) errors.capa = 'Informe um link HTTP ou HTTPS.';
  } catch {
    errors.capa = 'Informe a URL completa da capa.';
  }
  const preco = Number(form.preco.trim().replace(',', '.'));
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(form.preco.trim()) || !Number.isFinite(preco) || preco <= 0) {
    errors.preco = 'Use um preço maior que zero e até duas casas decimais.';
  }
  const estoque = Number(form.estoque.trim());
  if (!/^\d+$/.test(form.estoque.trim()) || !Number.isSafeInteger(estoque)) {
    errors.estoque = 'Informe um estoque inteiro igual ou maior que zero.';
  }
  return { errors, payload: { ...form, preco, estoque } };
}

function Field({ label, name, error, multiline, ...props }) {
  const Control = multiline ? 'textarea' : 'input';
  const id = 'livro-' + name;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Control id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? 'erro-' + name : undefined} {...props} />
      {error && <small id={'erro-' + name}>{error}</small>}
    </div>
  );
}

export default function BookForm({ book, onSave, onCancel, busy, operationError }) {
  const [form, setForm] = useState(() => book ? {
    nome: book.nome,
    autor: book.autor,
    genero: book.genero,
    capa: book.capa,
    descricao: book.descricao ?? '',
    preco: String(book.preco).replace('.', ','),
    estoque: String(book.estoque),
  } : empty);
  const [errors, setErrors] = useState({});

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function fields(name) {
    return { name, value: form[name], error: errors[name], onChange: change, disabled: busy, required: name !== 'descricao' };
  }

  function submit(event) {
    event.preventDefault();
    const { errors, payload } = validate(form);
    setErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      event.currentTarget.elements.namedItem(firstError).focus();
      return;
    }
    if (book && payload.estoque === book.estoque) delete payload.estoque;
    onSave(payload);
  }

  return (
    <form className="book-form" onSubmit={submit} noValidate aria-busy={busy}>
      <Field label="Nome do livro" {...fields('nome')} />
      <div className="form-grid">
        <Field label="Autor" {...fields('autor')} />
        <Field label="Gênero" {...fields('genero')} />
      </div>
      <Field label="URL da capa" {...fields('capa')} type="url" placeholder="https://…" />
      <Field label="Descrição (opcional)" {...fields('descricao')} multiline rows={3} />
      <div className="form-grid">
        <Field label="Preço (R$)" {...fields('preco')} inputMode="decimal" placeholder="39,90" />
        <Field label="Estoque" {...fields('estoque')} inputMode="numeric" placeholder="0" />
      </div>
      {operationError && <p className="form-error" role="alert">{operationError}</p>}
      <div className="modal__actions">
        <button className="outline-button" type="button" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : book ? 'Salvar alterações' : 'Cadastrar livro'}
        </button>
      </div>
    </form>
  );
}
