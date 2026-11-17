/**
 * Render a fixed-height list with only the visible rows in the DOM.
 *
 * The list keeps the native scroll bar with an internal full-height spacer.
 * The renderer is deliberately synchronous once a frame is scheduled so
 * delegated events from the review page continue to work.
 *
 * @param {HTMLElement} container Scrollable container.
 * @param {Object} options
 * @param {number} options.itemHeight Fixed row height in pixels.
 * @param {(item: unknown, index: number) => string} options.renderItem Row renderer.
 * @param {number} [options.overscan=5] Rows rendered outside the viewport.
 * @returns {{setItems: Function, scrollToIndex: Function, refresh: Function, reset: Function, destroy: Function}}
 */
export function createVirtualList(container, { itemHeight, renderItem, overscan = 5 }) {
  if (!container || typeof container.addEventListener !== 'function') {
    throw new TypeError('createVirtualList 需要可捲動的容器元素');
  }
  if (!Number.isFinite(itemHeight) || itemHeight <= 0) {
    throw new TypeError('createVirtualList 的 itemHeight 必須是正數');
  }
  if (typeof renderItem !== 'function') {
    throw new TypeError('createVirtualList 的 renderItem 必須是函式');
  }

  const rowHeight = Math.max(1, Math.round(itemHeight));
  const extraRows = Math.max(0, Math.floor(overscan));
  const originalStyles = {
    height: container.style.height,
    position: container.style.position,
  };
  let items = [];
  let scrollTop = 0;
  let frameId = null;
  let destroyed = false;

  const requestFrame =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback) => setTimeout(callback, 0);
  const cancelFrame =
    typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout;

  const cancelScheduledRender = () => {
    if (frameId === null) return;
    cancelFrame(frameId);
    frameId = null;
  };

  const render = () => {
    if (destroyed) return;
    frameId = null;
    const maxScrollTop = Math.max(0, items.length * rowHeight - container.clientHeight);
    scrollTop = Math.min(Math.max(0, Number(container.scrollTop) || 0), maxScrollTop);
    if (container.scrollTop !== scrollTop) container.scrollTop = scrollTop;
    const visibleStart = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.max(1, Math.ceil(container.clientHeight / rowHeight));
    const start = Math.max(0, visibleStart - extraRows);
    const end = Math.min(items.length, visibleStart + visibleCount + extraRows);

    const rows = items
      .slice(start, end)
      .map((item, offset) => {
        const index = start + offset;
        const rendered = renderItem(item, index);
        return `<div class="virtual-item" data-virtual-index="${index}" style="position:absolute;top:${index * rowHeight}px;height:${rowHeight}px;width:100%;">${rendered ?? ''}</div>`;
      })
      .join('');
    container.innerHTML = `<div class="virtual-spacer" style="position:relative;height:${items.length * rowHeight}px;width:100%;">${rows}</div>`;
  };

  const scheduleRender = () => {
    if (destroyed || frameId !== null) return;
    frameId = requestFrame(render);
  };

  const onScroll = () => {
    scrollTop = Number(container.scrollTop) || 0;
    scheduleRender();
  };

  const resetStyles = () => {
    container.style.height = originalStyles.height;
    container.style.position = originalStyles.position;
  };

  container.addEventListener('scroll', onScroll, { passive: true });
  render();

  return {
    setItems(nextItems) {
      if (destroyed) return;
      cancelScheduledRender();
      items = Array.isArray(nextItems) ? nextItems.slice() : [];
      render();
    },
    scrollToIndex(index, { behavior = 'auto', block = 'nearest' } = {}) {
      if (destroyed || !Number.isInteger(index) || index < 0 || index >= items.length) return false;
      const targetTop = index * rowHeight;
      const targetBottom = targetTop + rowHeight;
      const viewportTop = Number(container.scrollTop) || 0;
      const viewportBottom = viewportTop + container.clientHeight;
      let nextScrollTop = viewportTop;
      if (block === 'center') {
        nextScrollTop = targetTop - Math.max(0, (container.clientHeight - rowHeight) / 2);
      } else if (targetTop < viewportTop) {
        nextScrollTop = targetTop;
      } else if (targetBottom > viewportBottom) {
        nextScrollTop = targetBottom - container.clientHeight;
      }
      const maxScrollTop = Math.max(0, items.length * rowHeight - container.clientHeight);
      nextScrollTop = Math.min(Math.max(0, nextScrollTop), maxScrollTop);
      if (nextScrollTop !== viewportTop) {
        container.scrollTo?.({ top: nextScrollTop, behavior }) ||
          (container.scrollTop = nextScrollTop);
      }
      scrollTop = nextScrollTop;
      cancelScheduledRender();
      render();
      return true;
    },
    refresh() {
      if (destroyed) return;
      cancelScheduledRender();
      render();
    },
    reset() {
      if (destroyed) return;
      cancelScheduledRender();
      items = [];
      scrollTop = 0;
      container.scrollTop = 0;
      container.innerHTML = '';
      resetStyles();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelScheduledRender();
      container.removeEventListener('scroll', onScroll);
      resetStyles();
    },
  };
}
