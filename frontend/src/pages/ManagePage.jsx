import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BookForm from '../components/BookForm.jsx';
import Cover from '../components/Cover.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import SearchField from '../components/SearchField.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { adminApi, friendlyError, queryApi } from '../services/api.js';
import { matchesBook, money } from '../services/format.js';

const projected = (command) => ['query', 'pedidos'].every((target) => command.entregas[target] === 'PROCESSADO');
const pendingMessage = 'Alteração registrada e aguardando sincronização.';

async function waitForProjection(command) {
  for (let attempt = 0; attempt < 8 && !projected(command); attempt++) {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    try {
      const response = await adminApi.get('/admin/comandos/' + command.commandId, { timeout: 1000 });
      command = response.data;
    } catch {
      break;
    }
  }
  return command;
}

function AdminCard({ book, pending, onEdit, onDelete }) {
  const status = pending?.has(String(book.id));
  return (
    <article className="admin-card">
      <Link to={'/livro/' + book.id} className="admin-card__cover"><Cover book={book} /></Link>
      <div>
        <span className="tag">{book.genero}</span>
        <h2><Link to={'/livro/' + book.id}>{book.nome}</Link></h2>
        <p className="author">{book.autor}</p>
        <div className="admin-card__stock">
          <strong>{money(book.preco)}</strong>
          <span>{book.estoque} {book.estoque === 1 ? 'unidade' : 'unidades'}</span>
        </div>
        <span className={'status sync-status' + (status == null ? ' status--unknown' : status ? ' status--pending' : '')}>
          {status == null ? 'Status indisponível' : status ? 'Aguardando sincronização' : 'Sincronizado'}
        </span>
      </div>
      <div className="admin-card__actions">
        <button className="outline-button" type="button" onClick={onEdit} aria-label={'Editar ' + book.nome}>
          <Icon name="edit" size={16} /> Editar
        </button>
        <button className="outline-button danger-button" type="button" onClick={onDelete} aria-label={'Excluir ' + book.nome}>
          <Icon name="trash" size={16} /> Excluir
        </button>
      </div>
    </article>
  );
}

export default function ManagePage() {
  const [books, setBooks] = useState(null);
  const [pending, setPending] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [recentId, setRecentId] = useState(null);
  const currentRead = useRef(null);
  const lastRequest = useRef(null);
  const createButton = useRef(null);
  const { showToast } = useToast();

  const refresh = useCallback((showLoading = false) => {
    currentRead.current?.abort();
    const controller = new AbortController();
    currentRead.current = controller;
    const { signal } = controller;
    if (showLoading) setLoading(true);
    queryApi.get('/produtos', { signal }).then(({ data }) => {
      if (signal.aborted) return;
      setBooks(data);
      setReadError('');
    }).catch((error) => {
      if (!signal.aborted) setReadError(friendlyError(error, 'catalog'));
    }).finally(() => {
      if (!signal.aborted) setLoading(false);
    });
    adminApi.get('/admin/sincronizacao', { signal }).then(({ data }) => {
      if (!signal.aborted) setPending(new Set(data.pendentes.map(String)));
    }).catch(() => {
      if (!signal.aborted) setPending(null);
    });
  }, []);

  useEffect(() => {
    refresh();
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 5500);
    return () => {
      window.clearInterval(poll);
      currentRead.current?.abort();
    };
  }, [refresh]);

  function openDialog(type, book) {
    lastRequest.current = null;
    setOperationError('');
    setDialog({ type, book });
  }

  async function submit(payload) {
    if (busy) return;
    const { type, book } = dialog;
    const method = { create: 'post', edit: 'put', delete: 'delete' }[type];
    const url = book ? '/admin/produtos/' + book.id : '/admin/produtos';
    const request = JSON.stringify({ method, url, payload });
    if (lastRequest.current?.request !== request) {
      lastRequest.current = { request, key: window.crypto?.randomUUID?.() };
    }

    setBusy(true);
    setOperationError('');
    try {
      const { data } = await adminApi.request({
        method, url, data: payload, headers: { 'Idempotency-Key': lastRequest.current.key },
      });
      const command = await waitForProjection(data);
      const success = {
        create: 'Livro cadastrado com sucesso.',
        edit: 'Livro atualizado com sucesso.',
        delete: 'Livro excluído com sucesso.',
      }[type];
      if (projected(command)) {
        showToast(success, 'success', command.status === 'PENDENTE' ? pendingMessage : undefined);
      } else {
        showToast(pendingMessage, 'info');
      }
      if (type !== 'delete') {
        setRecentId(command.produtoId);
        if (!matchesBook(payload, search)) setSearch('');
      }
      setDialog(null);
      refresh();
      if (type === 'delete') requestAnimationFrame(() => createButton.current?.focus());
    } catch (error) {
      const message = friendlyError(error, 'management');
      setOperationError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const visible = (books ?? []).filter((book) => matchesBook(book, search));
  const recent = visible.findIndex((book) => book.id === recentId);
  if (recent > 0) visible.unshift(...visible.splice(recent, 1));
  const close = () => setDialog(null);

  return (
    <main className="page-shell">
      <div className="page-heading manage-heading">
        <div>
          <h1>Gerenciar livros</h1>
          <p>Cadastre títulos e acompanhe o estoque do catálogo.</p>
        </div>
        <button className="primary-button" type="button" ref={createButton} onClick={() => openDialog('create')}>
          <Icon name="plus" size={19} /> Cadastrar novo livro
        </button>
      </div>
      <section aria-label="Livros cadastrados">
        <div className="manage-toolbar">
          <div>
            {books && <strong>{visible.length} {visible.length === 1 ? 'livro' : 'livros'}</strong>}
            {pending?.size > 0 && <p className="pending-count">{pending.size} {pending.size === 1 ? 'livro aguardando' : 'livros aguardando'} sincronização</p>}
          </div>
          <div className="section-tools">
            <SearchField value={search} onChange={setSearch} label="Buscar livros cadastrados" />
            <button type="button" className="outline-button" onClick={() => refresh(true)} disabled={loading}>
              <Icon name="refresh" size={17} /> Atualizar
            </button>
          </div>
        </div>
        {loading && !books && <Loader label="Carregando livros cadastrados…" />}
        {!loading && readError && !books && (
          <EmptyState title="Não foi possível carregar os livros" text={readError}>
            <button className="primary-button" onClick={() => refresh(true)}>Tentar novamente</button>
          </EmptyState>
        )}
        {books && (
          <>
            {readError && <p role="status" className="form-error">{readError}</p>}
            {visible.length ? (
              <div className="admin-grid">
                {visible.map((book) => <AdminCard key={book.id} book={book} pending={pending}
                  onEdit={() => openDialog('edit', book)} onDelete={() => openDialog('delete', book)} />)}
              </div>
            ) : <EmptyState title="Nenhum livro encontrado" text={search ? 'Tente buscar por outro título, autor ou gênero.' : 'Cadastre o primeiro livro para começar.'} />}
          </>
        )}
      </section>
      {dialog?.type === 'delete' && (
        <Modal title="Excluir livro?" onCancel={close} busy={busy}
          description={<>Você quer excluir <strong>“{dialog.book.nome}”</strong>? O livro sairá do catálogo e novas compras serão bloqueadas. O histórico de pedidos será preservado.</>}>
          {operationError && <p className="form-error" role="alert">{operationError}</p>}
          <div className="modal__actions">
            <button type="button" className="outline-button" disabled={busy} onClick={close}>Cancelar</button>
            <button type="button" className="primary-button" disabled={busy} onClick={() => submit()}>
              <Icon name="trash" size={17} /> {busy ? 'Excluindo…' : 'Excluir livro'}
            </button>
          </div>
        </Modal>
      )}
      {dialog && dialog.type !== 'delete' && (
        <Modal title={dialog.type === 'create' ? 'Cadastrar livro' : 'Editar livro'} onCancel={close} busy={busy}>
          <BookForm book={dialog.book} onSave={submit} onCancel={close} busy={busy} operationError={operationError} />
        </Modal>
      )}
    </main>
  );
}
