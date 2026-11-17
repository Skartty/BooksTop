const shapes = {
  book: <><path d="M12 6a8 8 0 0 0-9-1.5v14A8 8 0 0 1 12 20a8 8 0 0 1 9-1.5v-14A8 8 0 0 0 12 6Z"/><path d="M12 6v14M6 8.5l3 .7m-3 3 3 .7m6-3.7 3-.7m-3 4.4 3-.7"/></>,
  heart: <path d="M20.8 8.6c0 4.1-8.8 9.6-8.8 9.6S3.2 12.7 3.2 8.6a4.5 4.5 0 0 1 8.8-1.1 4.5 4.5 0 0 1 8.8 1.1Z"/>,
  bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.5 4.5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  left: <path d="M20 12H4m6-6-6 6 6 6"/>,
  right: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  down: <path d="M12 4v16m-6-6 6 6 6-6"/>,
  refresh: <><path d="M20 11a8 8 0 1 0-1.9 6.1M20 4v7h-7"/></>,
  edit: <><path d="m14 6 4 4M4 20l4.5-1 11-11a2.8 2.8 0 1 0-4-4l-11 11L4 20Z"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  alert: <><path d="M12 7v6m0 4h.01"/><circle cx="12" cy="12" r="9"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
};

export default function Icon({ name, size = 20 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      {shapes[name]}
    </svg>
  );
}
