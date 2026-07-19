/** Shared horizontal product card styles (manage + public shop). */
export const productCardCss = `
.foleio-product-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foleio-product-card {
  display: flex;
  gap: 14px;
  align-items: stretch;
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: #2b2b2b;
  box-sizing: border-box;
  text-align: left;
  color: inherit;
  font: inherit;
}
button.foleio-product-card {
  cursor: pointer;
}
.foleio-product-card-media {
  position: relative;
  flex-shrink: 0;
  width: 108px;
  height: 108px;
  border-radius: 12px;
  overflow: hidden;
  background: #1a1a1a;
}
.foleio-product-card-media img,
.foleio-product-card-media > span {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  display: block;
}
.foleio-product-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.foleio-product-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.foleio-product-card-title {
  margin: 0;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
}
.foleio-product-card-stock {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(22, 163, 74, 0.16);
  color: #86efac;
  font-family: var(--font-body), sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}
.foleio-product-card-stock.is-out {
  background: rgba(255, 255, 255, 0.06);
  color: #828282;
}
.foleio-product-card-desc {
  margin: 0;
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.foleio-product-card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 4px;
}
.foleio-product-card-price {
  margin: 0;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}
.foleio-product-card-price .is-compare {
  margin-right: 6px;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  text-decoration: line-through;
}
.foleio-product-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.foleio-product-card-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: #fafafa;
  color: #151515;
  cursor: pointer;
  flex-shrink: 0;
}
.foleio-product-card-icon-btn:hover {
  opacity: 0.92;
}
.foleio-product-card-icon-btn.is-ghost {
  background: rgba(255, 255, 255, 0.08);
  color: #adadad;
}
.foleio-product-card-icon-btn.is-danger {
  background: rgba(252, 165, 165, 0.14);
  color: #fca5a5;
}
.foleio-product-card-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.foleio-product-card-icon-btn svg {
  width: 16px;
  height: 16px;
}
.foleio-product-card-shop-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  background: #fafafa;
  color: #151515;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
}
.foleio-product-card-badges {
  position: absolute;
  top: 6px;
  left: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
}
.foleio-product-card-discount {
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  padding: 3px 6px;
  border-radius: 999px;
  background: #16a34a;
  color: #ecfdf5;
}
@media (max-width: 420px) {
  .foleio-product-card-media {
    width: 88px;
    height: 88px;
  }
  .foleio-product-card-title {
    font-size: 15px;
  }
  .foleio-product-card-price {
    font-size: 16px;
  }
}
`;
