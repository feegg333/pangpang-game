// 畫面切換與小工具
import { bunnySVG } from './monsters.js';

const app = () => document.getElementById('app');
let cleanups = [];

export function onCleanup(fn) { cleanups.push(fn); }

export function render(html) {
  cleanups.forEach((f) => { try { f(); } catch { /* */ } });
  cleanups = [];
  app().innerHTML = html;
  window.scrollTo(0, 0);
  return app();
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function on(sel, ev, fn) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.addEventListener(ev, fn);
  return el;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function bunny(text) {
  return `<div class="bunny-talk">${bunnySVG()}<div class="bubble">${text}</div></div>`;
}

let toastTimer;
export function toast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

export function confetti(n = 70) {
  const box = document.createElement('div');
  box.className = 'burst';
  const colors = ['#FF8FB1', '#FFD86B', '#8EE3C8', '#9AD4FF', '#C8A2FF'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = 1.6 + Math.random() * 1.8 + 's';
    p.style.animationDelay = Math.random() * 0.5 + 's';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const params = new URLSearchParams(location.search);
export const DEBUG = params.has('debug');
