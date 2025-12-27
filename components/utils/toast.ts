export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

function ensureContainer() {
  const id = 'app-toast-container';
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement('div');
    container.id = id;
    container.style.position = 'fixed';
    container.style.right = '16px';
    container.style.top = '16px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message: string, variant: ToastVariant = 'info', timeout = 4500) {
  const container = ensureContainer();
  const el = document.createElement('div');
  el.textContent = message;
  el.style.minWidth = '200px';
  el.style.maxWidth = '420px';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';
  el.style.color = '#fff';
  el.style.fontSize = '13px';
  el.style.lineHeight = '1.2';
  el.style.opacity = '0';
  el.style.transform = 'translateY(-6px)';
  el.style.transition = 'opacity 180ms ease, transform 180ms ease';

  switch (variant) {
    case 'success':
      el.style.background = 'linear-gradient(90deg,#16a34a,#059669)';
      break;
    case 'error':
      el.style.background = 'linear-gradient(90deg,#ef4444,#dc2626)';
      break;
    case 'warning':
      el.style.background = 'linear-gradient(90deg,#f59e0b,#d97706)';
      break;
    default:
      el.style.background = 'linear-gradient(90deg,#374151,#111827)';
  }

  container.appendChild(el);

  // force reflow then animate in
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  const to = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(() => { el.remove(); }, 200);
  }, timeout);

  // allow click to dismiss
  el.addEventListener('click', () => {
    clearTimeout(to);
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(() => { el.remove(); }, 180);
  });

  return () => {
    clearTimeout(to);
    if (el.parentElement) el.remove();
  };
}

export default showToast;
