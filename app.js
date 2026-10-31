/* PANTHEON 웹앱 — 홍석진 대표님 PANTHEON v0.1 화면 구조 그대로 + 판테온 DB(Supabase pt_ 표)
   2026-10-22 AX팀 김현우
   · 로그인 = 헤임달 계정 (같은 Supabase · 같은 주소라 헤임달에 로그인돼 있으면 그대로 들어옴)
   · 쓰는 사람 = 헤임달 승인 구성원 (DB 가 막음 — pt_can_use)
   · 누가·언제·무엇을 = DB 트리거가 pt_change 에 남김 (화면은 그 기록을 보여 주기만)
   · 질문·명함 읽기 = pt_ask 에 넣으면 사무실 PC 판테온 봇이 Claude 로 처리해 답을 씀 (키는 PC 에만)
   · 이번 범위 = 10/21 회의 지시(엔티티 DB·등록·명함·회사 연결·연락) — 모니터링·딜은 숨김 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 비밀번호 재설정 메일 링크로 들어왔는지 — supabase 가 주소를 읽어 지우기 전에 본다 (헤임달과 같은 방식)
let RECOVERY = /type=recovery/.test(location.hash || '');
const SB = createClient('https://dwoiobqucmikbtikfjwk.supabase.co', 'sb_publishable_K6BW26u2jRkTBDwuMqaaFA_3HkfnOc9');
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const icons = {chart:'<path d="M4 20V10 M10 20V4 M16 20v-7 M22 20H2"/>',studio:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>',home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',entities:'<path d="M12 3 3 8l9 5 9-5-9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5"/>',contacts:'<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8 17c0-4 8-4 8 0 M2 7h3 M2 12h3 M2 17h3"/>',admin:'<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 3 3-1 2 3 4-1 1-3 3-1 1-4-3-2 1-3-3-3-3 1Z"/><circle cx="12" cy="12" r="3"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',bell:'<path d="M5 16h14l-2-3V8a5 5 0 0 0-10 0v5l-2 3Z M10 20h4"/>',plus:'<path d="M12 5v14 M5 12h14"/>',download:'<path d="M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5"/>',arrow:'<path d="M4 12h16 m-5-5 5 5-5 5"/>',up:'<path d="m3 16 7-7 4 4 7-9 M15 4h6v6"/>',warning:'<path d="M12 3 2 21h20L12 3Z M12 9v5 M12 17v.2"/>',close:'<path d="m6 6 12 12 M6 18 18 6"/>',side:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/>',big:'<path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m3 18 5-5 4 4 3-3 6 6"/>',link:'<path d="m9 15 6-6 M7 14l-2 2a3 3 0 0 0 4 4l4-4 M11 8l4-4a3 3 0 0 1 4 4l-2 2"/>'};
const icon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[n]||icons.entities}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPES = ['회사','브랜드','IP·유명인','기관','미디어·매체','미디어·OTT','판매 채널'];
const COLOR = {'회사':'gray','브랜드':'','기관':'purple','IP·유명인':'yellow','미디어·매체':'purple','미디어·OTT':'purple','판매 채널':'gray','거래처 담당자':''};
const PUBLIC_MAIL = new Set(['gmail.com','naver.com','daum.net','hanmail.net','kakao.com','nate.com','outlook.com','hotmail.com','icloud.com','yahoo.com']);
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const kst = iso => { try { return new Date(iso).toLocaleString('ko-KR', {timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false}) + ' KST'; } catch { return iso || ''; } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).replace(/-/g, '');

/* ---------- 상태 ---------- */
let me = null, myName = '', isAdmin = false;
let all = [];
let page = 'home', filter = '전체', query = '', activeDetail = null, lastAnswer = '';
const menus = [['home','대시보드'],['entities','엔티티 DB'],['contacts','연락처'],['chart','IP 차트'],['studio','제안서 스튜디오'],['admin','DB 관리']];
const navMenus = () => menus.filter(m => (m[0] !== 'admin' || isAdmin) && (m[0] !== 'studio' || studioCan) && (m[0] !== 'chart' || ipcCan));
const byId = id => all.find(e => e.id === id);
const isContact = e => e.type === '거래처 담당자';
const entities = () => all.filter(e => !isContact(e)), contacts = () => all.filter(isContact);
const contactsOf = e => all.filter(x => isContact(x) && x.parentId === e.id);
// 운영 브랜드 · 소속 IP·매체 (2026-10-26) — 브랜드·IP·매체의 소속 회사 = parent_id (거래처 담당자와 같은 연결)
const kidsOf = e => all.filter(x => !isContact(x) && x.parentId === e.id);
const HOLDERS = ['회사', '기관'];
const KID_TYPES = ['브랜드', 'IP·유명인', '미디어·매체', '미디어·OTT', '판매 채널'];
// 상태 용어·숫자는 여기 하나로 센다 (10-31 대표님 UX 리뷰 ⑤) — 기관·IP·유명인은 거래처 담당자가 없는 것이 보통이라 「담당자 없음」에서 뺀다
const needsContact = e => !['기관', 'IP·유명인'].includes(e.type);
const noContact = e => needsContact(e) && !contactsOf(e).length;
const PILL_NOREL = '<span class="pill warn">근거 없음</span>', PILL_NOC = '<span class="pill muted">담당자 없음</span>';
const ymd = iso => { try { return new Date(iso).toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul'}); } catch { return ''; } };
const isPhone = () => matchMedia('(max-width:600px)').matches;
const kidsText = ks => !ks.length ? '' : ks.every(k => k.type === '브랜드') ? `브랜드 ${ks.length}개` : `연결 엔티티 ${ks.length}개`;

function fromRow(r) {
  const en = r.en || '';
  const w = en.split(/[\s\-:&]+/).filter(Boolean);
  return {id:r.id, type:r.kind, name:r.name, en, aliases:r.aliases||[], parentId:r.parent_id, agencyText:r.agency||'',
    role:r.role||'', rel:r.rel||'', points:r.points||[], facts:r.facts||[], note:r.note, sides:r.sides||[], owners:r.owners||[],
    img:r.img||'', cardImg:r.card_img||'', createdBy:r.created_by||'', first:r.first_seen||'', last:r.last_seen||'', hidden:!!r.hidden, updated:r.updated_at||'',
    color:COLOR[r.kind]||'', initial: en ? (w.length === 1 ? w[0].slice(0,3) : w.slice(0,3).map(x => x[0]).join('')).toUpperCase() : r.name.slice(0,1)};
}
// 등록한 직원 (10-28 홍석진 대표님 요청) — 누가 연락처·관계를 갖고 있는지. 웹·슬랙으로 등록한 사람
const registrar = e => (e.createdBy && (MEMBERS || []).find(m => m.id === e.createdBy)?.name) || '';
const agencyOf = e => (e.parentId && byId(e.parentId)?.name) || e.agencyText || '';
const toRow = p => {           // 화면 칸 → DB 칸 (보낸 것만)
  const m = {name:'name', en:'en', type:'kind', aliases:'aliases', parentId:'parent_id', agencyText:'agency', role:'role', rel:'rel',
             points:'points', facts:'facts', note:'note', sides:'sides', owners:'owners', img:'img', cardImg:'card_img', first:'first_seen', last:'last_seen'};
  const o = {}; for (const [k, v] of Object.entries(p)) if (m[k]) o[m[k]] = v; return o;
};

// 알림 — undo 를 주면 「되돌리기」 단추가 붙고 8초 동안 보인다. 창(dialog) 위에도 보이게 popover 로 띄운다
function toast(s, undo) {
  const t = $('#toast'); t.textContent = '';
  const sp = document.createElement('span'); sp.textContent = s; t.appendChild(sp);
  if (undo) { const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-undo'; b.textContent = undo.label || '되돌리기';
    b.onclick = async () => { b.disabled = true; t.classList.remove('visible'); clearTimeout(window.tt); try { await undo.fn(); } catch (e) { toast('되돌리지 못했습니다: ' + (e?.message || '')); } }; t.appendChild(b); }
  t.classList.toggle('has-undo', !!undo);
  try { if (!t.hasAttribute('popover')) t.setAttribute('popover', 'manual'); t.hidePopover?.(); t.showPopover?.(); } catch {}
  t.classList.add('visible'); clearTimeout(window.tt);
  window.tt = setTimeout(() => { t.classList.remove('visible'); setTimeout(() => { try { if (!t.classList.contains('visible')) t.hidePopover?.(); } catch {} }, 300); }, undo ? 8000 : 2800);
}
// 확인 창 — 단추에 실제 행동을 적는다(「확인」 금지). 돌려주는 값: true(ok) · false(cancel 단추) · null(Esc·바깥)
function confirmBox({title, body = '', ok, cancel = '취소', danger = false}) {
  return new Promise(res => {
    let d = $('#ask'); if (!d) { d = document.createElement('dialog'); d.id = 'ask'; d.className = 'ask'; document.body.appendChild(d); }
    d.innerHTML = `<h2>${esc(title)}</h2>${body ? `<p>${body}</p>` : ''}<div class="modal-actions"><button class="button" type="button" data-a="0">${esc(cancel)}</button><button class="button ${danger ? 'danger' : 'primary'}" type="button" data-a="1">${esc(ok)}</button></div>`;
    const end = v => { d.close(); res(v); };
    d.querySelector('[data-a="0"]').onclick = () => end(false); d.querySelector('[data-a="1"]').onclick = () => end(true);
    d.oncancel = ev => { ev.preventDefault(); end(null); };
    d.showModal(); d.querySelector('[data-a="1"]').focus();
  });
}
// 작성 중인 내용이 있으면 닫기 전에 묻는다 — 「계속 작성」이 기본, 「닫기」를 골라야 닫힌다
const askLeave = () => confirmBox({title: '작성 중인 내용이 있어요', body: '저장하지 않고 닫으면 입력한 내용이 사라집니다.', ok: '계속 작성', cancel: '저장하지 않고 닫기'}).then(v => v === false);

/* ---------- 이미지 (비공개 저장소 → 잠깐 쓰는 주소) ---------- */
const imgUrl = {}, imgLoading = new Set();
function imgSrc(path) {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('blob:')) return path;
  if (imgUrl[path]) return imgUrl[path];
  if (!imgLoading.has(path)) {
    imgLoading.add(path);
    SB.storage.from('pt-files').createSignedUrl(path, 3600).then(({data}) => {
      if (data?.signedUrl) { imgUrl[path] = data.signedUrl; rerender(); }
    });
  }
  return '';
}
let rr; function rerender() { clearTimeout(rr); rr = setTimeout(() => { if (!$('#modal').open) render(); if (activeDetail && !$('#modal').open && !$('#drawer').hidden) openDetail(activeDetail, true); }, 150); }
function resize(file, longest, quality = .85, square = false) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      let sx = 0, sy = 0, sw = im.width, sh = im.height;
      if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
      const k = Math.min(1, longest / Math.max(sw, sh)), c = document.createElement('canvas');
      c.width = Math.round(sw * k); c.height = Math.round(sh * k);
      c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? res({blob: b, url: URL.createObjectURL(b)}) : rej(), 'image/jpeg', quality);
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(); };
    im.src = url;
  });
}
async function upload(blob, folder) {
  const path = `${folder}/${today()}/${uid()}.jpg`;
  const { error } = await SB.storage.from('pt-files').upload(path, blob, {contentType: 'image/jpeg', upsert: false});
  if (error) throw error;
  return path;
}

/* ---------- 저장 (DB 가 누가·언제를 채우고 기록을 남김) ---------- */
async function save(id, patch, isNew = false) {
  const row = toRow(patch);
  const q = isNew ? SB.from('pt_entity').insert({id, ...row}).select().single()
                  : SB.from('pt_entity').update(row).eq('id', id).select().single();
  const { data, error } = await q;
  if (error) { toast(/permission|row-level|policy/i.test(error.message) ? '저장할 권한이 없습니다. 헤임달 승인이 필요합니다.' : '저장하지 못했습니다: ' + error.message); return null; }
  const e = fromRow(data), i = all.findIndex(x => x.id === id);
  if (i >= 0) all[i] = e; else all.push(e);
  return e;
}
async function load() {
  const [{ data, error }] = await Promise.all([SB.from('pt_entity').select('*').order('name').limit(5000), loadMembers()]);
  if (error) throw error;
  all = data.map(fromRow);
}

/* ---------- 화면 조각 ---------- */
const avatar = e => { const s = imgSrc(e.img); return `<span class="entity-avatar ${s ? 'has-img' : e.color || ''}">${s ? `<img src="${s}" alt="">` : esc(e.initial)}</span>`; };
function entityCard(e) { const c = contactsOf(e).length; return `<article class="entity-card" data-detail="${e.id}" tabindex="0" role="button" aria-label="${esc(e.name)} 상세 보기"><div class="entity-top">${avatar(e)}<div><b>${esc(e.name)}</b><small>${esc(e.en || agencyOf(e))}</small></div></div><span class="entity-category">${esc(e.type)}</span>${e.parentId && byId(e.parentId) ? ` <span class="entity-category">${esc(byId(e.parentId).name)}</span>` : ''}${e.hidden ? ' <span class="entity-category">숨김</span>' : ''}${e.rel ? `<p class="entity-rel">${esc(e.rel)}</p>` : `<p class="entity-rel none">${PILL_NOREL}</p>`}<div class="card-bottom"><span>${[c ? '담당자 ' + c + '명' : noContact(e) ? '담당자 없음' : '', kidsText(kidsOf(e)), registrar(e) && '등록 ' + registrar(e)].filter(Boolean).join(' · ')}</span><span>상세 보기 ↗</span></div></article>`; }
function stats() { const es = entities(), cs = contacts(); return `<div class="stats"><div class="stat" data-stat="전체" role="button" tabindex="0" aria-label="엔티티 전체 보기"><div class="stat-label">${icon('entities')} 등록 엔티티</div><div class="stat-value">${es.length}<small>개</small></div><div class="stat-bottom"><span class="positive">판테온 DB</span> · 전 직원 공유</div></div><div class="stat" data-stat="contacts" role="button" tabindex="0" aria-label="연락처 보기"><div class="stat-label">${icon('contacts')} 거래처 담당자</div><div class="stat-value">${cs.length}<small>명</small></div><div class="stat-bottom">회사별로 연결해 관리</div></div><div class="stat" data-stat="IP·유명인" role="button" tabindex="0" aria-label="IP·유명인 보기"><div class="stat-label">${icon('up')} IP·유명인</div><div class="stat-value">${es.filter(e => e.type === 'IP·유명인').length}<small>명</small></div><div class="stat-bottom">계약·협업 중인 인물</div></div><div class="stat highlight" data-stat="담당자 연결" role="button" tabindex="0" aria-label="담당자 연결 회사 보기"><div class="stat-label">${icon('link')} 담당자 연결 회사</div><div class="stat-value">${es.filter(e => contactsOf(e).length).length}<small>곳</small></div><div class="stat-bottom">거래처 담당자가 등록된 회사</div></div></div>`; }
const EXAMPLES = ['골포스트가 협업한 리그·매체는?', '사운드스루 제작지원 브랜드 목록', '브이티코스메틱 담당자 누구야?', '포켓몬이랑 지금 뭐 하고 있어?'];
function askPanel() { return `<section class="panel ask-panel"><div class="panel-head"><div><div class="panel-title">무엇이든 물어보세요 <small>ASK PANTHEON</small></div><p class="panel-caption">판테온 DB를 검색해 Claude가 답변합니다. 슬랙 「Pantheon」 봇에서도 같은 답변을 받을 수 있습니다.</p></div></div><div class="ask-body"><div class="ask-row"><input id="ask-input" type="search" autocomplete="off" placeholder="예: 게티이미지 담당자 누구야?"><button class="button primary" id="ask-btn" type="button">질문하기</button></div><div class="ask-examples">${EXAMPLES.map(x => `<button type="button" data-ask="${esc(x)}">${esc(x)}</button>`).join('')}</div><div class="ask-answer" id="ask-answer" ${lastAnswer ? '' : 'hidden'}>${lastAnswer}</div></div></section>`; }
function alerts() { const es = entities(); const noC = es.filter(noContact).length, nr = es.filter(e => !e.rel).length, ip = es.filter(e => e.type === 'IP·유명인').length; return `<div class="side-stack"><section class="panel"><div class="panel-head"><div class="panel-title">확인이 필요한 항목</div><span class="alert-count">2건</span></div><div class="alert-list"><button class="alert-row" data-state-go="담당자 없음"><span class="alert-symbol green">${icon('link')}</span><span class="alert-text">담당자 없음<small>${noC}곳 · 명함을 등록하면 연결됩니다</small></span></button><button class="alert-row" data-state-go="근거 없음"><span class="alert-symbol red">${icon('warning')}</span><span class="alert-text">관계 근거 없음<small>${nr}개 · 내부 담당자 확인이 필요합니다</small></span></button></div></section><section class="panel"><div class="alert-list"><button class="alert-row" data-filter-go="IP·유명인"><span class="alert-symbol">${icon('up')}</span><span class="alert-text">활용 가능한 IP·유명인<small>${ip}명 · 엔티티 DB에서 보기</small></span></button></div></section></div>`; }
const STATES = ['전체', '담당자 있음', '담당자 없음', '근거 없음'];
let entState = '전체', entSort = {k: 'name', d: 1}, entView = 'table';
try { entView = localStorage.getItem('pt-ent-view') || 'table'; } catch {}
function filters() { const types = TYPES.filter(t => entities().some(e => e.type === t)); return `<div class="filter-rows"><div class="tabs" role="group" aria-label="유형"><span class="filter-label">유형</span>${['전체', ...types].map(t => `<button class="tab ${filter === t ? 'active' : ''}" data-filter="${t}">${t}</button>`).join('')}</div><div class="tabs" role="group" aria-label="상태"><span class="filter-label">상태</span>${STATES.map(t => `<button class="tab ${entState === t ? 'active' : ''}" data-state="${t}">${t}</button>`).join('')}</div></div>`; }
const sideOf = e => e.sides.join(' · ');
function entSorted(arr) { const {k, d} = entSort, v = e => k === 'type' ? e.type : k === 'side' ? sideOf(e) : k === 'contacts' ? contactsOf(e).length : k === 'updated' ? e.updated : e.name; return arr.slice().sort((a, b) => { const x = v(a), y = v(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'ko')) * d || a.name.localeCompare(b.name, 'ko'); }); }
function entityTable(arr) {
  const th = (k, t) => `<th aria-sort="${entSort.k === k ? (entSort.d > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-sort" data-sort="${k}">${t}${entSort.k === k ? (entSort.d > 0 ? ' ▲' : ' ▼') : ''}</button></th>`;
  return `<div class="table-wrap"><table class="et"><thead><tr>${th('name', '이름')}${th('type', '유형')}${th('side', '관련 계열사')}<th>관계 근거</th>${th('contacts', '담당자')}${th('updated', '최근 수정')}</tr></thead><tbody>${entSorted(arr).map(e => { const c = contactsOf(e).length; return `<tr class="clickable" data-detail="${e.id}" tabindex="0"><td><span class="et-name">${avatar(e)}<span><b>${esc(e.name)}</b>${e.en && e.en !== e.name ? `<small>${esc(e.en)}</small>` : ''}</span></span></td><td><span class="pill">${esc(e.type)}</span>${e.hidden ? ' <span class="pill muted">숨김</span>' : ''}</td><td>${esc(sideOf(e) || '—')}</td><td class="et-rel">${e.rel ? esc(e.rel) : PILL_NOREL}</td><td>${c ? c + '명' : noContact(e) ? PILL_NOC : '—'}</td><td>${e.updated ? esc(ymd(e.updated)) : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
}
// 목록 안 검색 (②) — 입력하면 바로 거르고, 걸려 있으면 칩으로 알리고, 0건이면 지우기·등록 단추
const localForm = ph => `<form class="table-tools local-form" id="local-form" role="search"><input class="local-search" id="local-q" type="search" placeholder="${ph} 검색" value="${esc(query)}" aria-label="이 목록에서 검색" autocomplete="off"></form>${query.trim() ? `<div class="q-chip">「${esc(query.trim())}」 검색 중 <button type="button" class="q-clear" aria-label="검색 해제">✕ 해제</button></div>` : ''}`;
const noHits = (what, add) => `<div class="empty"><p><b>${query.trim() ? `「${esc(query.trim())}」에 맞는 ${what}가 없습니다.` : `조건에 맞는 ${what}가 없습니다.`}</b></p><p>${query.trim() ? '<button class="button q-clear" type="button">검색 지우기</button> ' : ''}<button class="button primary" type="button" data-add>${add}</button></p></div>`;
const hay = e => [e.name, e.en, registrar(e), agencyOf(e), e.role, e.rel, e.note, ...e.aliases, ...e.sides, ...e.owners, ...e.facts, ...e.points, ...kidsOf(e).flatMap(k => [k.name, k.en, ...k.aliases])].join(' ').toLowerCase();
const LINKED = '담당자 연결';   // 오버뷰 「담당자 연결 회사」 — 거래처 담당자가 연결된 회사만
const stateOk = e => entState === '전체' || (entState === '담당자 있음' ? contactsOf(e).length > 0 : entState === '담당자 없음' ? noContact(e) : !e.rel);
const match = e => (filter === '전체' || e.type === filter) && stateOk(e) && hay(e).includes(query.trim().toLowerCase());
function contactTable(arr) { return `<div class="table-wrap"><table class="ct"><thead><tr><th>이름</th><th>회사 연결</th><th>직함</th><th>연락처(업무)</th><th>등록한 직원</th><th>명함</th></tr></thead><tbody>${arr.map(c => `<tr class="clickable" data-detail="${c.id}" tabindex="0"><td data-label="이름">${esc(c.name)}</td><td data-label="회사">${c.parentId ? `<button type="button" class="pill good ref-pill" data-open-ent="${c.parentId}">${esc(agencyOf(c))}</button>` : esc(c.agencyText || '회사 미연결')}</td><td data-label="직함">${esc(c.role || '—')}</td><td data-label="연락처">${c.points[0] ? `${esc(c.points[0])} ${contactLink(c.points[0])}` : '—'}</td><td data-label="등록한 직원">${esc(registrar(c) || '—')}</td><td data-label="명함">${c.cardImg ? '<span class="pill good">있음</span>' : '—'}</td></tr>`).join('') || `<tr><td colspan="6"><div class="empty">${NOT_FOUND}</div></td></tr>`}</tbody></table></div>`; }

// 통합 검색 (10-26) — 어느 메뉴에서든 엔티티·거래처 담당자 전체에서 찾는다. Enter: 하나면 바로 상세
const NOT_FOUND = '등록되지 않은 정보입니다. 다시 한 번 확인해 주세요.';
let backPage = 'home';
const searchHits = q => { const t = q.trim().toLowerCase(); return t ? all.filter(e => hay(e).includes(t)) : []; };
function searchView() {
  const hits = searchHits(query), es = hits.filter(e => !isContact(e)), cs = hits.filter(isContact);
  if (!hits.length) return `<section class="panel"><div class="empty"><p><b>${NOT_FOUND}</b></p><p>이름·영문 이름·별칭·브랜드명·연락처로 검색할 수 있습니다.</p></div></section>`;
  return (es.length ? `<section class="panel"><div class="panel-head"><div class="panel-title">엔티티 <small>${es.length}건</small></div></div><div class="entity-grid">${es.map(entityCard).join('')}</div></section>` : '')
       + (cs.length ? `<section class="panel" style="margin-top:16px"><div class="panel-head"><div class="panel-title">거래처 담당자 <small>${cs.length}명</small></div></div>${contactTable(cs)}</section>` : '');
}
function render() {
  if (page !== 'search' && !navMenus().some(m => m[0] === page)) page = 'home';
  $('#nav').innerHTML = navMenus().map(([key, title]) => `<a class="nav-item ${page === key ? 'active' : ''}" href="#${key}" data-page="${key}"${page === key ? ' aria-current="page"' : ''}>${icon(key)}<span>${title}</span>${key === 'contacts' ? `<span class="nav-count">${contacts().length}</span>` : ''}</a>`).join('');
  const title = {home:['대시보드','거래처·IP·담당자 정보를 한곳에서 확인하세요.'], entities:['엔티티 DB','더올마이티·골포스트·사운드스루의 거래처·브랜드·기관·IP 목록입니다.'], contacts:['연락처','거래처 담당자의 연락처를 확인하고 바로 연락할 수 있습니다.'], chart:['IP 차트','요즘 뜨는 신규 IP와 전체 IP 순위입니다. 하루 4번 새로 매깁니다.'], studio:['제안서 스튜디오','IP를 입력하면 리서치·제안서·이미지는 판테온 봇이 진행하고, 담당자는 결정 단계에서만 확인합니다.'], search:['검색 결과', `「${query.trim()}」 검색 결과 ${searchHits(query).length}건입니다. 하나만 나오면 Enter로 바로 상세를 엽니다.`], admin:['DB 관리','누가 언제 무엇을 수정했는지 확인하고, 필요하면 이전 내용으로 복원할 수 있습니다.']}[page];
  $('#crumb').textContent = page === 'search' ? '검색 결과' : menus.find(m => m[0] === page)?.[1];
  $('#page-title').innerHTML = title[0] + '<span class="title-dot">.</span>';
  document.title = title[0] + ' · PANTHEON';
  $('#page-subtitle').textContent = title[1];
  $('#export-btn').innerHTML = icon('download') + '내보내기';
  $('#add-btn').innerHTML = icon('plus') + (page === 'contacts' ? '연락처 등록' : page === 'studio' ? (studio.tab === 'refs' ? '레퍼런스 등록' : '새 프로젝트') : '엔티티 등록');
  $('#export-btn').hidden = !['entities', 'contacts'].includes(page);          // 그 화면의 주 기능 단추만 (리뷰 7)
  $('#add-btn').hidden = !['home', 'entities', 'contacts', 'studio'].includes(page);
  let html = '';
  if (page === 'home') html = stats() + `<div class="main-grid">${askPanel()}${alerts()}</div>`;
  if (page === 'entities') { const arr = entities().filter(match), cards = entView === 'card' || isPhone(); html = `<div class="notice">엔티티 ${entities().length}개가 등록되어 있습니다. 등록·수정한 내용은 전 직원에게 공유되며 변경 이력이 기록됩니다.</div><section class="panel"><div class="panel-head"><div class="panel-title">엔티티 목록 <small>${arr.length}개</small></div><div class="view-toggle" role="group" aria-label="보기 방식"><button type="button" class="segment ${cards ? '' : 'active'}" data-view="table" aria-pressed="${!cards}">표</button><button type="button" class="segment ${cards ? 'active' : ''}" data-view="card" aria-pressed="${cards}">카드</button></div></div><div class="watch-toolbar">${filters()}</div>${localForm('이름·영문 이름·별칭·브랜드명')}${arr.length ? (cards ? `<div class="entity-grid">${entSorted(arr).map(entityCard).join('')}</div>` : entityTable(arr)) : noHits('엔티티', '엔티티 등록')}</section>`; }
  if (page === 'contacts') { const arr = contacts().filter(c => hay(c).includes(query.trim().toLowerCase())); html = `<div class="notice">「연락처 등록」에서 명함 사진을 업로드하면 판테온 봇이 내용을 자동으로 입력하고, 명함 이미지도 함께 저장합니다. 거래처 담당자는 회사에 연결되어 회사 상세의 「등록된 담당자」에도 표시됩니다.</div><section class="panel"><div class="panel-head"><div class="panel-title">연락처 <small>CONTACTS</small></div><span class="nav-count">${query.trim() ? arr.length + ' / ' : ''}${contacts().length}</span></div>${localForm('이름·회사·직함·연락처')}${arr.length ? contactTable(arr) : noHits('연락처', '연락처 등록')}</section>`; }
  if (page === 'admin') html = adminView();
  if (page === 'studio') html = studioView();
  if (page === 'chart') html = chartView();
  if (page === 'search') html = searchView();
  $('#content').innerHTML = html;
  bindContent();
}

/* ---------- 상세 ---------- */
// 상세는 주소에 남긴다 #<화면>/<id> (10-31 대표님 UX 리뷰 ④) — 링크로 바로 열고, 뒤로가기로 닫는다
let routed = false, ignoreHash = false, lastFocus = null;
function setRoute(id) { const h = '#' + (page === 'search' ? 'entities' : page) + '/' + id; if (location.hash === h) return; try { if (location.hash.includes('/')) history.replaceState(null, '', h); else { history.pushState(null, '', h); routed = true; } } catch {} }
async function openRoute(pg, id) { if (byId(id)) return openDetail(id); if (pg === 'studio') { if (!studio.list) await loadStudio(); return openProposal(id); } if (pg === 'chart') return openIp(id); }
function hideDrawer() { $('#drawer').hidden = true; $('#overlay').hidden = true; activeDetail = null; ipc.open = null; document.body.style.overflow = ''; if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); lastFocus = null; }
function closeDrawer() {
  if ($('#drawer').hidden) return;
  hideDrawer();
  if (!location.hash.includes('/')) return;
  if (routed) { routed = false; ignoreHash = true; history.back(); } else try { history.replaceState(null, '', '#' + location.hash.slice(1).split('/')[0]); } catch {}
}
// 상세는 기본으로 크게(가운데 창) · 머리의 단추로 오른쪽 사이드바와 바꾼다 (10-29 김현우) — 고른 모양은 이 브라우저에 기억
let drawerSide = false;
try { drawerSide = localStorage.getItem('pt-drawer') === 'side'; } catch {}
const drawerModeBtn = () => drawerSide ? `<button class="icon-btn" id="drawer-mode" title="크게 보기" aria-label="크게 보기">${icon('big')}</button>` : `<button class="icon-btn" id="drawer-mode" title="사이드바로 보기" aria-label="사이드바로 보기">${icon('side')}</button>`;
function showDrawer(content, keepScroll, label = 'ENTITY') {
  const top = keepScroll ? $('#drawer').scrollTop : 0;
  if (!keepScroll && $('#drawer').hidden) lastFocus = document.activeElement;
  $('#drawer').classList.toggle('big', !drawerSide);
  $('#drawer').innerHTML = `<div class="drawer-header"><span>PANTHEON / ${label}</span><span class="drawer-tools">${location.hash.includes('/') ? `<button class="icon-btn" id="drawer-link" title="링크 복사" aria-label="링크 복사">${icon('link')}</button>` : ''}${drawerModeBtn()}<button class="icon-btn" id="close-drawer" aria-label="닫기">${icon('close')}</button></span></div>${content}`;
  const flip = () => { drawerSide = !drawerSide; try { localStorage.setItem('pt-drawer', drawerSide ? 'side' : 'big'); } catch {} $('#drawer').classList.toggle('big', !drawerSide); $('#drawer-mode').outerHTML = drawerModeBtn(); $('#drawer-mode').onclick = flip; };
  $('#drawer-mode').onclick = flip;
  $('#drawer-link')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); toast('링크를 복사했습니다. 슬랙에 붙여넣으면 이 화면이 바로 열립니다.'); } catch { toast(location.href); } });
  $('#drawer').hidden = false; $('#overlay').hidden = false; document.body.style.overflow = 'hidden';
  $('#close-drawer').onclick = closeDrawer; $('#drawer').scrollTop = top; if (!keepScroll) $('#close-drawer').focus();
  $$('#drawer [data-open]').forEach(b => b.onclick = () => openDetail(b.dataset.open));
  $$('#drawer [data-copy]').forEach(b => b.onclick = async () => { const el = document.getElementById(b.dataset.copy); try { await navigator.clipboard.writeText(el.textContent); b.textContent = '복사됨'; } catch { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = '선택됨'; } setTimeout(() => b.textContent = '복사', 1800); });
}
const linkList = arr => `<div class="link-list">${arr.map(m => `<button type="button" data-open="${m.id}"><b>${esc(m.name)}</b><span>${esc(m.role || m.type)}</span></button>`).join('')}</div>`;
// 연락처 한 줄 — 이메일은 메일 쓰기, 전화번호는 바로 걸기(폰) · 복사 (회의 지시: 새 직원이 보고 바로 연락)
const contactLink = p => { const m = String(p).match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/); if (m) return `<a class="point-go" href="mailto:${esc(m[0])}">메일</a>`; const t = String(p).match(/\+?\d[\d\s().-]{7,}\d/); return t && t[0].replace(/\D/g, '').length >= 8 ? `<a class="point-go" href="tel:${t[0].replace(/[^\d+]/g, '')}">전화</a>` : ''; };
const pointsBlock = e => e.points.map((p, i) => `<div class="point"><code id="pt-${e.id}-${i}">${esc(p)}</code><span class="point-acts">${contactLink(p)}<button type="button" data-copy="pt-${e.id}-${i}">복사</button></span></div>`).join('');
const noteOf = e => e.note ?? e.facts.join('\n');
const noteBlock = e => `<div class="detail-block"><h3>리서치 노트</h3><textarea id="research-note" placeholder="확인한 내용과 출처를 기록하세요." aria-label="리서치 노트">${esc(noteOf(e))}</textarea><button class="button primary" id="save-note">노트 저장</button><p>업무 기록의 내용으로 시작합니다. 저장한 노트는 전 직원에게 공유되며 변경 이력이 기록됩니다.</p></div>`;
function bindNote(e) { $('#save-note').onclick = async () => { const b = $('#save-note'); b.disabled = true; const ok = await save(e.id, {note: $('#research-note').value}); b.disabled = false; if (ok) toast('리서치 노트를 저장했습니다.'); }; }
const adminTools = e => isAdmin ? `<button class="button" id="hide-entity">${e.hidden ? '숨김 해제' : '숨기기'}</button>` : '';
function bindAdminTools(e) { $('#hide-entity')?.addEventListener('click', async () => { const { error } = await SB.rpc('pt_set_hidden', {entity: e.id, value: !e.hidden}); if (error) return toast('변경하지 못했습니다: ' + error.message); await load(); render(); openDetail(e.id);
  toast(e.hidden ? '숨김을 해제했습니다.' : '숨김 처리했습니다. DB 관리자만 볼 수 있습니다.', {fn: async () => { const r = await SB.rpc('pt_set_hidden', {entity: e.id, value: !!e.hidden}); if (r.error) throw r.error; await load(); render(); openDetail(e.id); toast('되돌렸습니다.'); }}); }); }

// 내부 담당자 이력 (10-26) — 최초 등록자 → 주 담당자 지정·변경(인수인계)을 시각과 함께. 변경 기록에서 담당자 항목만 (pt_owner_history)
function ownerHistoryHtml(rows) {
  if (!rows.length) return '<p>기록된 이력이 없습니다.</p>';
  const who = r => esc(r.actor_name) + (r.via === 'slack' ? ' (슬랙)' : '');
  const items = rows.map(r => {
    const b = r.before_owners || [], a = r.after_owners || [], lines = [];
    if (r.op === 'insert') { lines.push(`<b>최초 등록</b> · 등록자 ${who(r)}`); if (a.length) lines.push(`주 담당자 <b>${esc(a[0])}</b>${a.length > 1 ? ` · 내부 담당자 ${a.slice(1).map(esc).join(', ')}` : ''}`); }
    else {
      if ((b[0] || '') !== (a[0] || '')) lines.push(b[0] && a[0] ? `<b>주 담당자 변경</b> ${esc(b[0])} → <b>${esc(a[0])}</b>` : a[0] ? `<b>주 담당자 지정</b> ${esc(a[0])}` : `<b>주 담당자 해제</b> ${esc(b[0])}`);
      const added = a.filter(x => !b.includes(x) && x !== a[0]), removed = b.filter(x => !a.includes(x) && x !== b[0]);
      if (added.length) lines.push(`내부 담당자 추가 ${added.map(esc).join(', ')}`);
      if (removed.length) lines.push(`내부 담당자 제외 ${removed.map(esc).join(', ')}`);
      if (!lines.length) lines.push('내부 담당자 순서 변경');
      lines.push(`변경자 ${who(r)}`);
    }
    return `<li><time>${esc(kst(r.at))}</time><span>${lines.join('<br>')}</span></li>`;
  });
  return `<ol class="owner-hist">${items.join('')}</ol>`;
}
async function loadOwnerHistory(id) {
  const { data, error } = await SB.rpc('pt_owner_history', {entity: id});
  const box = $('#owner-hist'); if (!box || activeDetail !== id) return;
  box.innerHTML = error ? '<p>이력을 불러오지 못했습니다.</p>' : ownerHistoryHtml(data || []);
}
function openDetail(id, keep) {
  const e = byId(id); if (!e) return; activeDetail = id;
  if (!keep) setRoute(id);
  if (isContact(e)) return openContact(e, keep);
  const cs = contactsOf(e), parent = e.parentId && byId(e.parentId);
  showDrawer(`${avatar(e)}<h2>${esc(e.name)}</h2><span class="detail-sub">${esc(e.en ? e.en + ' · ' : '')}${esc(e.type)}</span><div class="drawer-actions"><button class="button" id="edit-entity">정보 수정</button>${adminTools(e)}</div><div class="detail-block"><h3>기본 정보 및 관계</h3><div class="detail-row"><span>소속 / 권리 관계</span><b>${parent ? `<button class="ref" type="button" data-open="${parent.id}">${esc(parent.name)}</button>` : esc(e.agencyText || '—')}</b></div><div class="detail-row"><span>관계 근거</span><b>${e.rel ? esc(e.rel) : PILL_NOREL}</b></div><div class="detail-row"><span>내부 담당자</span><b>${ownersLine(e.owners)}</b></div><div class="detail-row"><span>등록한 직원</span><b>${esc(registrar(e) || '—')}</b></div>${kidsOf(e).length ? `<div class="detail-row"><span>운영 브랜드 · 연결 엔티티</span><b>${kidsOf(e).length}개</b></div>${linkList(kidsOf(e))}` : ''}<div class="detail-row"><span>등록된 담당자</span><b>${cs.length}명</b></div>${cs.length ? linkList(cs) : ''}${pointsBlock(e)}</div><div class="detail-block"><h3>별칭</h3>${[e.name, ...e.aliases].map(a => `<span class="tag">${esc(a)}</span>`).join('')}</div><div class="detail-block"><h3>내부 담당자 이력</h3><div id="owner-hist"><p>이력을 불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div></div>${noteBlock(e)}`, keep);
  $('#edit-entity').onclick = () => entityModal(e); bindNote(e); bindAdminTools(e); loadOwnerHistory(e.id);
}
function openContact(c, keep) {
  const org = c.parentId && byId(c.parentId), card = imgSrc(c.cardImg);
  showDrawer(`<span class="entity-avatar">${esc(c.name.slice(0, 2))}</span><h2>${esc(c.name)}</h2><span class="detail-sub">${esc(c.role ? c.role + ' · ' : '')}거래처 담당자</span><div class="drawer-actions"><button class="button" id="edit-contact">정보 수정</button>${adminTools(c)}</div><div class="detail-block"><h3>기본 정보 및 관계</h3><div class="detail-row"><span>회사 연결</span><b>${org ? `<button class="ref" type="button" data-open="${org.id}">${esc(org.name)}</button> <button class="text-btn" type="button" id="link-company">변경</button>` : `<button class="button" type="button" id="link-company">${icon('link')} 회사 미연결 · 연결하기</button>`}</b></div><div class="detail-row"><span>관계 근거</span><b>${c.rel ? esc(c.rel) : PILL_NOREL}</b></div><div class="detail-row"><span>내부 담당자</span><b>${ownersLine(c.owners)}</b></div><div class="detail-row"><span>등록한 직원</span><b>${esc(registrar(c) || '—')}</b></div>${pointsBlock(c) || '<p>기록된 업무 연락처가 없습니다.</p>'}</div><div class="detail-block"><h3>명함</h3>${c.cardImg ? (card ? `<button type="button" id="card-view" style="border:0;padding:0;background:none;width:100%"><img src="${card}" alt="${esc(c.name)} 명함" style="width:100%;border:1px solid #e4eae4;border-radius:7px;display:block"></button><p>클릭하면 크게 볼 수 있습니다.</p>` : '<p>명함을 불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>') : '<p>등록된 명함이 없습니다.</p>'}<label class="button" style="display:inline-flex;margin-top:6px;cursor:pointer">${c.cardImg ? '명함 변경' : '명함 이미지 업로드'}<input id="card-replace" type="file" accept="image/*" hidden></label></div><div class="detail-block"><h3>내부 담당자 이력</h3><div id="owner-hist"><p>이력을 불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div></div>${noteBlock(c)}`, keep, 'CONTACT');
  bindNote(c); bindAdminTools(c); loadOwnerHistory(c.id);
  $('#link-company').onclick = () => linkModal(c);
  $('#edit-contact').onclick = () => contactEditModal(c);
  $('#card-view')?.addEventListener('click', () => modal(`<h2>${esc(c.name)} 명함</h2><img src="${card}" alt="${esc(c.name)} 명함" style="width:100%;border-radius:7px;margin-top:10px"><div class="modal-actions"><button class="button primary" data-cancel>닫기</button></div>`));
  $('#card-replace').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; try { const r = await resize(f, 1600, .82); const path = await upload(r.blob, 'cards'); if (await save(c.id, {cardImg: path})) { openDetail(c.id); toast('명함 이미지를 저장했습니다.'); } } catch { toast('이미지를 업로드하지 못했습니다.'); } };
}

/* ---------- 내부 담당자 입력 (헤임달 참석자 입력과 같은 방식) ----------
   이름 입력 후 Enter · 헤임달 승인 직원이면 정식 이름으로 맞추고 소속을 보여 줌 · 없는 이름은 빨갛게 · 맨 앞 = 주 담당자 */
let MEMBERS = null;
async function loadMembers() {
  if (MEMBERS) return MEMBERS;
  const { data } = await SB.from('hd_member').select('id,name,company,dept').eq('approved', true).order('name');
  MEMBERS = (data || []).filter(m => (m.name || '').trim());
  let dl = document.getElementById('pt-mnames');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'pt-mnames'; document.body.appendChild(dl); }
  dl.innerHTML = MEMBERS.map(m => `<option value="${esc(m.name)}">`).join('');
  return MEMBERS;
}
const flatName = t => (t || '').replace(/\s/g, '');
function findMember(nm) {
  const t = flatName(nm); if (t.length < 2) return null;
  return (MEMBERS || []).find(m => { const x = flatName(m.name); return x && (t.includes(x) || x.includes(t)); }) || null;
}
const memberSub = m => [...new Set([m.company, m.dept].filter(Boolean))].join(' · ');
// 이름 칩 입력 — 이름 입력 후 Enter. 찾으면 정식 이름으로 맞추고, 못 찾으면 빨간 칩
function chipInput(host, initial, o) {
  host.innerHTML = `<div class="atin"><input type="text" list="${o.list}" placeholder="이름 입력 후 Enter"></div><small class="atnote">${o.note}</small>`;
  const box = host.querySelector('.atin'), inp = host.querySelector('input');
  let vals = (initial || []).map(x => (x || '').trim()).filter(Boolean);
  const draw = () => {
    [...box.querySelectorAll('.atc')].forEach(x => x.remove());
    vals.forEach((v, i) => {
      const hit = o.find(v), c = document.createElement('span'), main = o.main && i === 0, sub = hit ? o.sub(hit) : '';
      c.className = 'atc' + (hit ? '' : ' out') + (main ? ' main' : '');
      c.title = o.title(hit, v);
      c.innerHTML = `${main ? `<em>${o.main}</em>` : ''}<span>${esc(v)}</span>${o.badge ? `<em>${o.badge(hit)}</em>` : ''}${sub ? `<small>${esc(sub)}</small>` : ''}<button type="button" aria-label="${esc(v)} 삭제">×</button>`;
      c.querySelector('button').onclick = ev => { ev.stopPropagation(); vals.splice(i, 1); draw(); };
      if (o.main) c.onclick = () => { if (i) { vals.unshift(vals.splice(i, 1)[0]); draw(); } };
      box.insertBefore(c, inp);
    });
  };
  const add = t => {
    t = (t || '').replace(/,+$/, '').trim(); if (!t) return;
    const hit = o.find(t); if (hit) t = hit.name;          // 정식 이름으로 맞춤 (「김성효 팀장」 → 「김성효」)
    if (!vals.some(v => flatName(v) === flatName(t))) vals.push(t);
    inp.value = ''; draw();
  };
  // 한글 조합 중 Enter 는 조합이 끝난 뒤에 넣음 (헤임달과 같은 처리)
  let composing = false, wantAdd = false;
  inp.addEventListener('compositionstart', () => { composing = true; });
  inp.addEventListener('compositionend', () => { composing = false; if (wantAdd) { wantAdd = false; add(inp.value); } });
  inp.onkeydown = e => {
    const ime = composing || e.isComposing || e.keyCode === 229;
    if (e.key === 'Enter') { e.preventDefault(); if (ime) { wantAdd = true; return; } add(inp.value); }
    else if (e.key === ',') { if (ime) return; e.preventDefault(); add(inp.value); }
    else if (e.key === 'Backspace' && !ime && !inp.value && vals.length) { vals.pop(); draw(); }
  };
  inp.onblur = () => { if (!composing) add(inp.value); };
  inp.onpaste = e => { const t = (e.clipboardData || window.clipboardData).getData('text') || ''; if (/[,\n]/.test(t)) { e.preventDefault(); t.split(/[,\n]/).forEach(add); } };
  draw(); o.load?.().then(draw).catch(() => {});
  return { value() { add(inp.value); return vals.slice(); } };
}
const memberChips = (host, initial, o) => chipInput(host, initial, {list: 'pt-mnames', find: findMember, sub: memberSub, load: loadMembers,
  title: (hit) => hit ? [hit.name, memberSub(hit)].filter(Boolean).join(' · ') : '헤임달에 등록되지 않은 사람입니다', ...o});
const ownersInput = (host, initial) => memberChips(host, initial, {main: '주 담당자', note: '맨 앞 사람이 <b>주 담당자</b>입니다. 이름을 클릭하면 주 담당자로 지정됩니다. <span class="err">빨간 이름</span>은 헤임달에 등록되지 않은 사람입니다.'});
const ownersLine = owners => owners.length ? owners.map((o, i) => `${i === 0 ? '<span class="main-badge">주 담당자</span> ' : ''}${esc(o)}`).join(' · ') : '—';

/* ---------- 창 ---------- */
function modal(content) {
  const m = $('#modal'); m.innerHTML = content; m.dataset.dirty = ''; m.showModal();
  m.oninput = ev => { if (!ev.target.matches('[type=search], [data-nodirty]')) m.dataset.dirty = '1'; };
  const leave = async () => { if (!m.dataset.dirty || await askLeave()) { m.dataset.dirty = ''; m.close(); } };
  m.oncancel = ev => { if (m.dataset.dirty) { ev.preventDefault(); leave(); } };
  m.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', leave));
}
function companyOptions(selected) { const es = entities().filter(e => e.type !== 'IP·유명인').sort((a, b) => a.name.localeCompare(b.name, 'ko')); return es.map(e => `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${esc(e.name)}${e.en ? ' · ' + esc(e.en) : ''} (${esc(e.type)})</option>`).join(''); }
function linkModal(c) {
  modal(`<form id="link-form"><h2>회사 연결</h2><p>${esc(c.name)} 님의 소속 회사를 선택하세요. 연결하면 회사 상세의 「등록된 담당자」에도 표시됩니다.</p><label>회사 찾기<input id="link-find" type="search" autocomplete="off" placeholder="이름·영문명·별칭"></label><label>회사<select id="link-select" size="8" required>${companyOptions(c.parentId)}</select></label><div id="link-error" style="color:#ba775e;margin-top:12px;font-size:12px" role="alert"></div><p style="font-size:12px">목록에 없으면 「엔티티 등록」으로 회사를 먼저 등록한 뒤 연결하세요.</p><div class="modal-actions">${c.parentId ? '<button class="button" type="button" id="link-clear">연결 해제</button>' : ''}<button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">이 회사로 연결</button></div></form>`);
  $('#link-find').oninput = ev => { const q = ev.target.value.toLowerCase(); [...$('#link-select').options].forEach(o => { const e = byId(o.value); o.hidden = !!q && ![e.name, e.en, ...e.aliases].filter(Boolean).join(' ').toLowerCase().includes(q); }); $('#link-error').textContent = [...$('#link-select').options].some(o => !o.hidden) ? '' : '찾는 회사가 없습니다. 「엔티티 등록」으로 먼저 등록해 주세요.'; };
  const prevOrg = c.parentId ? byId(c.parentId) : null;
  const go = async org => { if (!await save(c.id, {parentId: org ? org.id : null, agencyText: org ? org.name : ''})) return; $('#modal').dataset.dirty = ''; $('#modal').close(); render(); openDetail(c.id);
    toast(org ? `${c.name} 님을 ${org.name}에 연결했습니다.` : `${c.name} 님의 회사 연결을 해제했습니다.`, {fn: async () => { if (!await save(c.id, {parentId: prevOrg ? prevOrg.id : null, agencyText: prevOrg ? prevOrg.name : ''})) return; render(); openDetail(c.id); toast('되돌렸습니다.'); }}); };
  $('#link-clear')?.addEventListener('click', () => go(null));
  $('#link-form').onsubmit = ev => { ev.preventDefault(); const org = byId($('#link-select').value); if (!org) { $('#link-error').textContent = '연결할 회사를 선택해 주세요.'; return; } go(org); };
}
function contactEditModal(c) {
  modal(`<form id="ce-form"><h2>연락처 수정</h2><p>저장한 내용은 전 직원에게 공유되며, 변경 이력이 기록됩니다.</p><label>이름 *<input id="ce-name" required maxlength="50" value="${esc(c.name)}"></label><label>직함 · 부서<input id="ce-role" maxlength="100" value="${esc(c.role)}"></label><label>연락처 (한 줄에 하나씩 입력)<textarea id="ce-points" rows="5" style="display:block;width:100%;border:1px solid #dde4d9;border-radius:5px;padding:10px;margin-top:8px;font:inherit">${esc(c.points.join('\n'))}</textarea></label><label>관계 근거<input id="ce-rel" maxlength="200" value="${esc(c.rel)}"></label><div class="field"><span class="flabel">내부 담당자</span><div id="ce-owners"></div></div><div id="ce-error" style="color:#ba775e;margin-top:14px;font-size:12px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">변경 저장</button></div></form>`);
  const owners = ownersInput($('#ce-owners'), c.owners);
  $('#ce-form').onsubmit = async ev => { ev.preventDefault(); const name = $('#ce-name').value.trim(); if (!name) { $('#ce-error').textContent = '이름을 입력해 주세요.'; return; } if (!await save(c.id, {name, role: $('#ce-role').value.trim(), points: $('#ce-points').value.split('\n').map(s => s.trim()).filter(Boolean), rel: $('#ce-rel').value.trim(), owners: owners.value()})) return; $('#modal').close(); render(); openDetail(c.id); toast('연락처를 수정했습니다.'); };
}
function entityModal(e) {
  modal(`<form id="entity-form"><h2>${e ? '엔티티 수정' : '새 엔티티 등록'}</h2><p>저장한 내용은 전 직원에게 공유되며, 변경 이력이 기록됩니다.</p><div class="img-field"><span id="img-preview">${avatar(e || {initial: '+', color: 'gray'})}</span><div><label for="entity-img" style="margin-top:0">프로필 이미지</label><input id="entity-img" type="file" accept="image/png,image/jpeg,image/webp"><button class="text-btn" type="button" id="img-clear" ${e?.img ? '' : 'hidden'}>이미지 삭제</button><small><b>권장 크기: 정사각형 500×500px 이상</b> (PNG·JPG, 15MB 이하)<br>로고 또는 인물 사진을 사용해 주세요. 정사각형이 아니면 가운데 부분을 잘라 240×240px로 저장합니다.</small></div></div><label>한글 이름 *<input id="entity-name" required maxlength="50" value="${esc(e?.name || '')}" placeholder="예: 분데스리가"></label><label>영문 이름<input id="entity-en" maxlength="80" value="${esc(e?.en || '')}" placeholder="예: BUNDESLIGA"></label><label>유형<select id="entity-type">${TYPES.map(t => `<option ${e?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>별칭 <input id="entity-alias" maxlength="200" value="${esc(e?.aliases.join(', ') || '')}" placeholder="쉼표로 구분해 주세요"></label><label>관계 근거 <input id="entity-rel" maxlength="200" value="${esc(e?.rel || '')}" placeholder="예: 골포스트 공식 미디어 파트너"></label><div class="field"><span class="flabel">내부 담당자</span><div id="entity-owners"></div></div><label id="parent-field">소속 회사<select id="entity-parent"><option value="">(없음)</option>${all.filter(x => HOLDERS.includes(x.type) && !x.hidden && x.id !== e?.id).sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(x => `<option value="${x.id}" ${x.id === e?.parentId ? 'selected' : ''}>${esc(x.name)}${x.en ? ' · ' + esc(x.en) : ''}</option>`).join('')}</select></label><div class="field" id="kids-field"><span class="flabel">운영 브랜드 · 연결 엔티티</span><div id="entity-kids"></div></div><div id="form-error" style="color:#ba775e;margin-top:15px;font-size:12px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">${e ? '변경 저장' : '엔티티 등록'}</button></div></form>`);
  let pending; // undefined = 그대로 · null = 지움 · Blob = 새 이미지
  const owners = ownersInput($('#entity-owners'), e?.owners || []);
  const kids = kidsInput($('#entity-kids'), e);
  const syncType = () => { const h = HOLDERS.includes($('#entity-type').value); $('#kids-field').hidden = !h; $('#parent-field').hidden = h; };
  $('#entity-type').onchange = syncType; syncType();
  const show = src => { $('#img-preview').innerHTML = avatar({...(e || {initial: '+', color: 'gray'}), img: src || ''}); $('#img-clear').hidden = !src; };
  $('#entity-img').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; if (f.size > 15e6) { $('#form-error').textContent = '15MB 이하 이미지를 선택해 주세요.'; return; } try { const r = await resize(f, 240, .85, true); pending = r.blob; show(r.url); $('#form-error').textContent = ''; } catch { $('#form-error').textContent = '이미지를 열 수 없습니다. PNG·JPG 파일을 선택해 주세요.'; } };
  $('#img-clear').onclick = () => { pending = null; $('#entity-img').value = ''; show(''); };
  $('#entity-form').onsubmit = async ev => {
    ev.preventDefault();
    const name = $('#entity-name').value.trim(), en = $('#entity-en').value.trim(), aliases = $('#entity-alias').value.split(',').map(s => s.trim()).filter(Boolean), rel = $('#entity-rel').value.trim(), type = $('#entity-type').value;
    if (!name) { $('#form-error').textContent = '한글 이름을 입력해 주세요.'; return; }
    const terms = [name, en, ...aliases].filter(Boolean).map(s => s.toLowerCase());
    if (all.some(x => x.id !== e?.id && [x.name, x.en, ...x.aliases].filter(Boolean).some(s => terms.includes(s.toLowerCase())))) { $('#form-error').textContent = '이름 또는 별칭이 같은 엔티티가 이미 있습니다. 기존 엔티티를 확인해 주세요.'; return; }
    const btn = $('#entity-form [type=submit]'); btn.disabled = true;
    try {
      const patch = {name, en: en.toUpperCase(), type, aliases, rel, owners: owners.value()};
      if (!HOLDERS.includes(type)) { const pid = $('#entity-parent').value || null; if (pid !== (e?.parentId || null)) { patch.parentId = pid; patch.agencyText = pid ? byId(pid).name : ''; } }
      if (pending === null) patch.img = '';
      else if (pending) patch.img = await upload(pending, 'profiles');
      const id = e ? e.id : 'e-' + uid().slice(0, 12);
      const done = await save(id, e ? patch : {...patch, first: today(), last: today()}, !e);
      if (!done) return;
      if (HOLDERS.includes(type) && !await kids.apply(done)) return;
      $('#modal').close(); render(); openDetail(id); toast(e ? '엔티티 정보를 수정했습니다.' : '엔티티를 등록했습니다.');
    } catch { $('#form-error').textContent = '이미지를 업로드하지 못했습니다. 다시 시도해 주세요.'; }
    finally { btn.disabled = false; }
  };
}

/* 운영 브랜드 · 연결 엔티티 입력 — 유형·한글·영문 이름을 넣고 추가. 이미 있는 엔티티는 연결, 없으면 저장할 때 새로 등록 */
function kidsInput(host, e) {
  const orig = e ? kidsOf(e).map(k => k.id) : [];
  let rows = e ? kidsOf(e).map(k => ({id: k.id, name: k.name, en: k.en, type: k.type})) : [];
  host.innerHTML = `<div class="kid-list"></div><div class="kid-add"><select id="kid-type" aria-label="유형">${KID_TYPES.map(t => `<option>${t}</option>`).join('')}</select><input id="kid-name" maxlength="50" placeholder="한글 이름"><input id="kid-en" maxlength="80" placeholder="영문 이름"><button type="button" class="button" id="kid-add">추가</button></div><small class="atnote">예) 브랜드 · 내셔널지오그래픽 어패럴 · NATIONAL GEOGRAPHIC APPAREL — 이미 등록된 엔티티는 그대로 연결하고, 없으면 저장할 때 새로 등록합니다. 왼쪽 상자를 누르면 로고 이미지를 등록할 수 있습니다(정사각형 500×500px 이상 권장).</small>`;
  const list = host.querySelector('.kid-list');
  const draw = () => {
    list.innerHTML = rows.map((r, i) => { const cur = r.id && byId(r.id);
      const logo = r.logo ? `<span class="entity-avatar has-img"><img src="${r.logo.url}" alt=""></span>` : cur && cur.img ? avatar(cur) : '<span class="kid-logo-empty">로고<br>등록</span>';
      return `<div class="kid-row${r.id ? '' : ' new'}"><label class="kid-logo" title="${esc(r.name)} 로고 이미지 등록 (정사각형 권장)">${logo}<input type="file" accept="image/png,image/jpeg,image/webp" data-logo="${i}" hidden></label><div class="kid-name"><b>${esc(r.name)}</b><small>${esc(r.type)}${r.en ? ' · ' + esc(r.en) : ''}</small></div>${r.id ? (r.moveFrom ? `<span class="kid-tag" title="${esc(r.moveFrom)}에서 이 회사로 소속이 변경됩니다">소속 변경</span>` : '') : '<span class="kid-tag">새로 등록</span>'}<button type="button" class="kid-x" data-i="${i}" aria-label="${esc(r.name)} 연결 해제">×</button></div>`; }).join('') || '<p class="atnote" style="margin:4px 0">연결된 엔티티가 없습니다.</p>';
    list.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { rows.splice(+b.dataset.i, 1); draw(); });
    list.querySelectorAll('[data-logo]').forEach(inp => inp.onchange = async ev => {      // 로고 — 프로필 이미지와 같이 240px 정사각형으로
      const f = ev.target.files[0]; if (!f) return;
      if (f.size > 15e6) return toast('15MB 이하 이미지를 선택해 주세요.');
      try { rows[+inp.dataset.logo].logo = await resize(f, 240, .85, true); draw(); } catch { toast('이미지를 열 수 없습니다. PNG·JPG 파일을 선택해 주세요.'); }
    });
  };
  const same = (a, b) => !!a && !!b && normCo(a) === normCo(b);
  const add = () => {
    const name = $('#kid-name').value.trim(), en = $('#kid-en').value.trim(); if (!name && !en) return;
    const hit = all.find(x => !isContact(x) && x.id !== e?.id && [x.name, x.en, ...x.aliases].some(s => same(s, name) || same(s, en)));
    if (hit ? rows.some(r => r.id === hit.id) : rows.some(r => same(r.name, name || en))) { $('#kid-name').value = $('#kid-en').value = ''; return; }
    rows.push(hit ? {id: hit.id, name: hit.name, en: hit.en, type: hit.type, moveFrom: hit.parentId && hit.parentId !== e?.id ? agencyOf(hit) : ''}
                  : {name: name || en, en: en.toUpperCase(), type: $('#kid-type').value});
    $('#kid-name').value = $('#kid-en').value = ''; $('#kid-name').focus(); draw();
  };
  let composing = false, wantAdd = false;      // 한글 조합 중 Enter 는 조합이 끝난 뒤에 추가 (헤임달과 같은 처리)
  ['#kid-name', '#kid-en'].forEach(sel => { const inp = host.querySelector(sel);
    inp.addEventListener('compositionstart', () => { composing = true; });
    inp.addEventListener('compositionend', () => { composing = false; if (wantAdd) { wantAdd = false; add(); } });
    inp.onkeydown = ev => { if (ev.key !== 'Enter') return; ev.preventDefault(); if (composing || ev.isComposing || ev.keyCode === 229) { wantAdd = true; return; } add(); }; });
  host.querySelector('#kid-add').onclick = add;
  draw();
  return {
    async apply(p) {         // 회사를 저장한 뒤 — 새로 등록 · 소속 변경 · 연결 해제 (하나하나 변경 기록에 남음)
      add();
      for (const r of rows) {
        const img = r.logo ? await upload(r.logo.blob, 'profiles') : null;
        if (!r.id) { if (!await save('e-' + uid().slice(0, 12), {name: r.name, en: r.en, type: r.type, parentId: p.id, agencyText: p.name, owners: p.owners, facts: [`${p.name} 연결 엔티티로 등록 ${today()}`], first: today(), last: today(), ...(img ? {img} : {})}, true)) return false; }
        else { const patch = {...(byId(r.id)?.parentId !== p.id ? {parentId: p.id, agencyText: p.name} : {}), ...(img ? {img} : {})};
          if (Object.keys(patch).length && !await save(r.id, patch)) return false; }
      }
      for (const id of orig) if (!rows.some(r => r.id === id)) { if (!await save(id, {parentId: null, agencyText: ''})) return false; }
      return true;
    }
  };
}

/* ---------- 명함으로 연락처 등록 ---------- */
const normCo = s => String(s || '').toLowerCase().replace(/\(주\)|㈜|주식회사|\binc\.?|\bco\.?,?\s*ltd\.?|\bltd\.?|\bcorp\.?|[\s.,·()\-]/g, '');
function matchCompany(...names) {
  const ns = names.map(normCo).filter(n => n.length >= 2); if (!ns.length) return null;
  const es = entities().filter(e => e.type !== 'IP·유명인');
  return es.find(e => [e.name, e.en, ...e.aliases].some(x => ns.includes(normCo(x))))
      || es.find(e => [e.name, e.en, ...e.aliases].map(normCo).filter(x => x.length >= 2).some(x => ns.some(n => n.includes(x) || x.includes(n)))) || null;
}
const domainOf = em => (em || '').toLowerCase().includes('@') ? em.toLowerCase().split('@').pop().trim() : '';
function matchByDomain(email) {          // 회사명이 없는 명함 — 이메일 도메인이 같은 담당자의 회사 (공용 메일 제외)
  const d = domainOf(email); if (!d || PUBLIC_MAIL.has(d)) return null;
  const c = contacts().find(x => x.parentId && x.points.some(p => domainOf(p) === d));
  return c ? byId(c.parentId) : null;
}
async function waitAsk(id, onTick, limitSec = 120) {
  const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < limitSec) {
    await new Promise(r => setTimeout(r, 1500));
    onTick?.(Math.round((Date.now() - t0) / 1000));
    const { data } = await SB.from('pt_ask').select('status,answer,result,entity_ids').eq('id', id).single();
    if (data && (data.status === 'done' || data.status === 'fail')) return data;
  }
  return null;
}
function contactModal() {
  const F = [['c-name','이름 *','명함에서 읽은 이름'],['c-title','직함 · 부서',''],['c-company','회사명 (명함 표기)',''],['c-email','이메일',''],['c-phone','사무실 전화',''],['c-mobile','휴대전화',''],['c-address','주소',''],['c-web','웹사이트','']];
  modal(`<form id="contact-form"><h2>연락처 등록</h2><p>명함 사진을 업로드하면 판테온 봇이 내용을 자동으로 입력합니다(약 20~40초). 저장 전에 내용을 확인해 주세요. 명함 이미지도 함께 저장됩니다.</p><label>명함 이미지<input id="c-card" type="file" accept="image/*" capture="environment"></label><div id="c-preview" hidden><img id="c-img" alt="업로드한 명함" style="width:100%;max-height:220px;object-fit:contain;border:1px solid #e4eae4;border-radius:7px;margin-top:10px;background:#fafbfa"></div><p id="c-status" class="ask-note" role="status" style="margin-top:8px"></p>${F.map(([id, l, ph]) => `<label>${l}<input id="${id}" maxlength="200" ${id === 'c-name' ? 'required' : ''} placeholder="${ph}"></label>`).join('')}<label>회사 연결<select id="c-org"><option value="">연결 안 함</option><option value="__new">새 회사로 등록 (입력한 회사명으로)</option>${companyOptions('')}</select></label><label>메모<input id="c-memo" maxlength="300" placeholder="예: 10/22 KREAM 미팅에서 받음"></label><div id="c-error" style="color:#ba775e;margin-top:14px;font-size:12px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit" id="c-save">연락처 등록</button></div></form>`);
  let cardPath = '';
  const setStatus = s => $('#c-status').textContent = s;
  const autoLink = (email, ...n) => { const m = matchCompany(...n) || matchByDomain(email); if (m) { $('#c-org').value = m.id; return m; } if (n.some(x => x && x.trim())) $('#c-org').value = '__new'; return null; };
  $('#c-company').onchange = () => autoLink($('#c-email').value, $('#c-company').value);
  $('#c-card').onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return; $('#c-error').textContent = '';
    let r; try { r = await resize(f, 1600, .82); } catch { $('#c-error').textContent = '이미지를 열 수 없습니다. JPG·PNG 사진을 선택해 주세요.'; return; }
    $('#c-img').src = r.url; $('#c-preview').hidden = false; $('#c-save').disabled = true;
    try {
      setStatus('명함 이미지를 업로드하는 중입니다…');
      cardPath = await upload(r.blob, 'cards');
      const { data, error } = await SB.from('pt_ask').insert({kind: 'ocr', image_path: cardPath}).select('id').single();
      if (error) throw error;
      const res = await waitAsk(data.id, s => setStatus(`판테온 봇이 명함을 읽는 중입니다… ${s}초`));
      if (!res) { setStatus(''); $('#c-error').textContent = '판테온 봇이 2분 안에 응답하지 않았습니다. 명함을 보고 직접 입력해 주세요. 명함 이미지는 저장됩니다.'; return; }
      if (res.status !== 'done' || !res.result) { setStatus(''); $('#c-error').textContent = '명함을 인식하지 못했습니다. 직접 입력해 주세요. 명함 이미지는 저장됩니다.'; return; }
      const v = k => String(res.result[k] || '').trim();
      [['c-name', v('name') || v('name_en')], ['c-title', v('title')], ['c-company', v('company') || v('company_en')], ['c-email', v('email')], ['c-phone', v('phone')], ['c-mobile', v('mobile')], ['c-address', v('address')], ['c-web', v('website')]].forEach(([id, val]) => { if (val && !$('#' + id).value) $('#' + id).value = val; });
      if (v('name_en') && v('name') && !$('#c-memo').value) $('#c-memo').value = '영문 이름: ' + v('name_en');
      const m = autoLink(v('email'), v('company'), v('company_en'));
      setStatus(`명함 내용을 입력했습니다. 내용을 확인해 주세요.${m ? ` 회사는 「${m.name}」로 자동 연결했습니다.` : v('company') ? ' 등록되지 않은 회사여서 새 회사로 등록하도록 선택해 두었습니다.' : ''}`);
    } catch (e) { setStatus(''); $('#c-error').textContent = '명함을 처리하지 못했습니다: ' + (e?.message || '') + ' — 직접 입력해 주세요.'; }
    finally { $('#c-save').disabled = false; }
  };
  $('#contact-form').onsubmit = async ev => {
    ev.preventDefault(); const g = id => $('#' + id).value.trim(); const name = g('c-name'), email = g('c-email');
    if (!name) { $('#c-error').textContent = '이름을 입력해 주세요.'; return; }
    let orgId = $('#c-org').value, org = orgId && orgId !== '__new' ? byId(orgId) : null;
    const dup = contacts().find(x => (email && x.points.some(p => p.toLowerCase() === email.toLowerCase())) || (x.name === name && (!org || x.parentId === org.id)));
    if (dup && !$('#contact-form').dataset.dupOk) { $('#c-error').innerHTML = `동일 인물로 보이는 연락처가 이미 있습니다: <b>${esc(dup.name)}</b>${agencyOf(dup) ? ' (' + esc(agencyOf(dup)) + ')' : ''}. 그래도 등록하려면 「연락처 등록」을 한 번 더 눌러 주세요.`; $('#contact-form').dataset.dupOk = '1'; return; }
    $('#c-save').disabled = true;
    try {
      if (orgId === '__new') {
        const co = g('c-company'); if (!co) { $('#c-error').textContent = '새 회사로 등록하려면 회사명을 입력해 주세요.'; return; }
        org = matchCompany(co) || await save('e-' + uid().slice(0, 12), {name: co, type: '회사', points: [g('c-web'), g('c-address')].filter(Boolean), facts: ['명함 등록으로 생성 ' + today()], first: today(), last: today()}, true);
        if (!org) return;
      }
      const c = await save('c-' + uid().slice(0, 12), {type: '거래처 담당자', name, role: g('c-title'), parentId: org ? org.id : null, agencyText: org ? org.name : '',
        points: [email, g('c-mobile') && '휴대전화 ' + g('c-mobile'), g('c-phone') && '전화 ' + g('c-phone'), g('c-address'), g('c-web')].filter(Boolean),
        facts: [g('c-memo'), '명함 등록 ' + today()].filter(Boolean), cardImg: cardPath, first: today(), last: today()}, true);
      if (!c) return;
      $('#modal').close(); go('contacts'); openDetail(c.id); toast(`${name} 님을 연락처에 등록했습니다.`);
    } finally { $('#c-save').disabled = false; }
  };
}

/* ---------- 질문하기 (사무실 PC 판테온 봇 → Claude) ---------- */
function renderAnswer(text) {
  let html = '', inList = false;
  for (let ln of esc(text).split(/\n/)) {
    ln = ln.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/「([^」]{1,40})」/g, (m, n) => { const e = all.find(x => [x.name, x.en, ...x.aliases].filter(Boolean).some(a => a.toLowerCase() === n.toLowerCase())); return e ? `<button class="ref" type="button" data-open="${e.id}">${n}</button>` : m; });
    if (/^\s*[-•*]\s+/.test(ln)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${ln.replace(/^\s*[-•*]\s+/, '')}</li>`; }
    else { if (inList) { html += '</ul>'; inList = false; } if (ln.trim()) html += `<p>${ln}</p>`; }
  }
  return html + (inList ? '</ul>' : '');
}
function bindAsk() {
  const btn = $('#ask-btn'); if (!btn) return;
  btn.onclick = ask; $('#ask-input').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) ask(); };
  $$('[data-ask]').forEach(b => b.onclick = () => { $('#ask-input').value = b.dataset.ask; ask(); });
  $$('#ask-answer [data-open]').forEach(b => b.onclick = () => openDetail(b.dataset.open));
}
async function ask() {
  const q = $('#ask-input').value.trim(); if (!q) return;
  const out = $('#ask-answer'), head = `<p class="muted">질문: ${esc(q)}</p>`;
  out.hidden = false; out.innerHTML = head + '<p class="muted">판테온 봇이 답변을 작성하는 중입니다…</p>'; $('#ask-btn').disabled = true;
  try {
    const { data, error } = await SB.from('pt_ask').insert({kind: 'ask', question: q}).select('id').single();
    if (error) throw error;
    const res = await waitAsk(data.id, s => { const p = out.querySelector('.muted:last-child'); if (p) p.textContent = `판테온 봇이 답변을 작성하는 중입니다… ${s}초`; }, 150);
    out.innerHTML = head + (!res ? '<div class="warn">판테온 봇이 응답하지 않습니다. 잠시 후 다시 질문해 주세요. 계속되면 AX팀에 알려 주세요.</div>'
      : res.status === 'done' ? renderAnswer(res.answer) : '<div class="warn">답변을 작성하지 못했습니다. 잠시 후 다시 질문해 주세요.</div>');
  } catch (e) { out.innerHTML = head + `<div class="warn">질문을 전송하지 못했습니다: ${esc(e?.message || '')}</div>`; }
  finally { lastAnswer = out.innerHTML; $('#ask-btn').disabled = false; bindAsk(); }
}

/* ---------- DB 관리 (관리자) — 변경 기록 · 질문 기록 ---------- */
const FIELD_KO = {name:'이름', en:'영문 이름', kind:'유형', aliases:'별칭', parent_id:'회사 연결', agency:'소속 / 회사', role:'직함', rel:'관계 근거', points:'연락처', facts:'업무 기록', note:'리서치 노트', sides:'관련 계열사', owners:'내부 담당자', img:'프로필 이미지', card_img:'명함 이미지', first_seen:'최초 확인일', last_seen:'최근 확인일', hidden:'숨김', id:'ID'};
const VIA_KO = {web: '웹', slack: '슬랙', server: '시스템 입력', sql: '시스템 입력'};
const OP_KO = {insert: '등록', update: '수정', delete: '삭제'};
const showVal = (k, v) => { if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return '(없음)'; if (k === 'img' || k === 'card_img') return '(이미지)'; if (k === 'parent_id') return byId(v)?.name || v; if (k === 'hidden') return v ? '숨김' : '보임'; if (Array.isArray(v)) return v.join(' / '); return String(v); };
let admin = {tab: 'log', changes: null, asks: null, people: {}, who: '', q: '', err: '', loading: false};
async function loadAdmin() {
  if (admin.loading) return; admin.loading = true; admin.err = ''; render();
  try {
    const [c, a] = await Promise.all([
      SB.from('pt_change').select('*').order('at', {ascending: false}).limit(500),
      SB.from('pt_ask').select('id,at,asker,via,slack_user,kind,question,status').order('at', {ascending: false}).limit(500)]);
    if (c.error) throw c.error; if (a.error) throw a.error;
    admin.changes = c.data; admin.asks = a.data;
    const ids = [...new Set([...c.data.map(x => x.actor), ...a.data.map(x => x.asker)].filter(Boolean))];
    if (ids.length) { const p = await SB.rpc('pt_people', {ids}); (p.data || []).forEach(x => admin.people[x.id] = x); }
  } catch (e) { admin.err = '기록을 불러오지 못했습니다: ' + (e?.message || ''); }
  admin.loading = false; render();
}
const whoName = (id, fallback) => id ? (admin.people[id]?.name || fallback || '이름 확인 불가') : '';
function adminView() {
  if (!isAdmin) return '<div class="notice">DB 관리는 DB 관리자만 볼 수 있습니다.</div>';
  if (!admin.changes && !admin.loading && !admin.err) setTimeout(loadAdmin);
  const tabs = `<div class="tabs" style="margin-bottom:16px">${[['log', '변경 기록'], ['asks', '질문 기록'], ['quality', '데이터 점검'], ['bot', '판테온 봇']].map(([k, t]) => `<button class="tab ${admin.tab === k ? 'active' : ''}" data-admin-tab="${k}">${t}</button>`).join('')}</div>`;
  if (admin.err) return tabs + `<div class="notice">${esc(admin.err)}</div>`;
  if (!admin.changes) return tabs + '<div class="empty"><p>기록을 불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>';
  if (admin.tab === 'asks') return tabs + asksPanel();
  if (admin.tab === 'quality') return tabs + qualityPanel();
  if (admin.tab === 'bot') return tabs + botPanel();
  const people = [...new Set(admin.changes.map(x => x.actor || '(화면 밖)'))];
  const list = admin.changes.filter(x => (!admin.who || (x.actor || '(화면 밖)') === admin.who) && (!admin.q || String(x.entity_name).toLowerCase().includes(admin.q.toLowerCase()))).slice(0, 300);
  return tabs + `
  <section class="panel"><div class="panel-head"><div class="panel-title">변경 기록 <small>AUDIT LOG</small> <span class="nav-count">${admin.changes.length}</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button" type="button" id="log-reload">${icon('clock')} 새로고침</button><button class="button" type="button" id="log-export">${icon('download')} 기록 CSV</button></div></div>
  <div class="watch-toolbar"><div style="display:flex;gap:8px;flex-wrap:wrap"><select class="table-select" id="log-who" aria-label="사람으로 거르기"><option value="">전체 사용자</option>${people.map(p => `<option value="${esc(p)}" ${admin.who === p ? 'selected' : ''}>${esc(p === '(화면 밖)' ? '시스템 입력' : whoName(p))}</option>`).join('')}</select><input class="table-select" id="log-q" type="search" placeholder="엔티티 이름" value="${esc(admin.q)}" aria-label="엔티티 이름으로 거르기"></div></div>
  <div class="table-wrap"><table><thead><tr><th>언제</th><th>누가</th><th>엔티티</th><th>무엇을</th><th>변경 내용 (이전 → 이후)</th><th>조치</th></tr></thead><tbody>${list.map(x => `<tr><td style="white-space:nowrap">${esc(kst(x.at))}</td><td>${x.actor ? esc(whoName(x.actor, x.actor_name)) : `<span class="pill">${esc(VIA_KO[x.via] || x.via)}</span>`}${x.reason ? `<small style="display:block;color:#9aa29d">${esc(x.reason)}</small>` : ''}</td><td><button class="text-btn" data-detail="${esc(x.entity_id)}">${esc(x.entity_name)}</button></td><td><span class="pill">${esc(OP_KO[x.op] || x.op)}</span></td><td style="font-size:12px;line-height:1.6">${x.op === 'insert' ? '<span style="color:#285541">새로 등록</span>' : (x.fields || []).map(k => `<div><b>${esc(FIELD_KO[k] || k)}</b>: <span style="color:#a0563a;text-decoration:line-through">${esc(showVal(k, x.before?.[k]))}</span> → <span style="color:#285541">${esc(showVal(k, x.after?.[k]))}</span></div>`).join('')}</td><td>${x.op === 'update' ? `<button class="text-btn" type="button" data-restore="${x.id}">이전 내용으로 복원</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">기록이 없습니다.</div></td></tr>'}</tbody></table></div></section>`;
}
function asksPanel() {
  const list = admin.asks.slice(0, 300);
  return `<section class="panel"><div class="panel-head"><div class="panel-title">질문 기록 <small>웹·슬랙</small> <span class="nav-count">${admin.asks.length}</span></div></div><div class="table-wrap"><table><thead><tr><th>언제</th><th>누가</th><th>어디서</th><th>무엇</th><th>상태</th></tr></thead><tbody>${list.map(a => `<tr><td style="white-space:nowrap">${esc(kst(a.at))}</td><td>${esc(whoName(a.asker) || '—')}</td><td>${a.via === 'slack' ? '슬랙' : '웹'}</td><td>${a.kind === 'ocr' ? '<span class="pill">명함 읽기</span>' : a.kind === 'restart' ? '<span class="pill">봇 재시작</span>' : esc(a.question)}</td><td>${{done: '답변 완료', fail: '실패', wait: '대기', work: '처리 중'}[a.status] || a.status}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">아직 질문이 없습니다.</div></td></tr>'}</tbody></table></div></section>`;
}
/* 판테온 봇 — 상태 보기 · 다시 시작 (헤임달 「처리 서버 → 다시 시작」과 같은 방식, DB 관리자만) */
async function loadBot() {
  const { data, error } = await SB.from('pt_bot').select('*').maybeSingle();
  admin.bot = error ? {err: error.message} : (data || {});
  if (page === 'admin' && admin.tab === 'bot') render();
  return admin.bot;
}
const agoText = sec => sec < 60 ? `${sec}초 전` : sec < 3600 ? `${Math.floor(sec / 60)}분 전` : `${Math.floor(sec / 3600)}시간 전`;
function botPanel() {
  if (!admin.bot) { setTimeout(loadBot); return '<div class="empty"><p>상태를 불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>'; }
  const b = admin.bot;
  if (b.err) return `<div class="notice">상태를 불러오지 못했습니다: ${esc(b.err)}</div>`;
  const age = b.beat_at ? Math.max(0, Math.round((Date.now() - new Date(b.beat_at)) / 1000)) : null;
  const alive = age !== null && age < 180;
  const stateText = !b.beat_at ? '기록 없음' : !alive ? '응답 없음' : b.connected ? '정상' : '슬랙 연결 끊김';
  return `<div class="quality-grid"><div class="stat ${alive && b.connected ? 'highlight' : ''}"><div class="stat-label">상태</div><div class="stat-value">${stateText}</div><div class="stat-bottom">${age === null ? '—' : '마지막 신호 ' + agoText(age)}</div></div><div class="stat"><div class="stat-label">시작 시각</div><div class="stat-value" style="font-size:17px">${b.started_at ? esc(kst(b.started_at)) : '—'}</div><div class="stat-bottom">${b.model ? '답변 모델 ' + esc(b.model) : ''}</div></div><div class="stat"><div class="stat-label">웹 요청 처리</div><div class="stat-value">${Number(b.handled || 0)}<small>건</small></div><div class="stat-bottom">시작 이후</div></div></div>
  <section class="panel"><div class="panel-head"><div><div class="panel-title">판테온 봇 <small>슬랙 질문 · 웹 질문 · 명함 읽기</small></div><p class="panel-caption">답변이 오지 않거나 상태가 「응답 없음」이면 재시작해 주세요. 재시작하는 약 20초 동안은 답변하지 않습니다.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button" id="bot-reload">${icon('clock')} 새로고침</button><button class="button primary" id="bot-restart">재시작</button></div></div>
  <div id="bot-msg" class="panel-caption" style="padding:0 23px 18px" role="status">${b.last_error ? '최근 오류: ' + esc(b.last_error) : ''}</div></section>`;
}
async function restartBot() {
  const msg = t => { const el = $('#bot-msg'); if (el) el.textContent = t; };
  const before = admin.bot?.started_at || '';
  $('#bot-restart').disabled = true;
  const { data, error } = await SB.from('pt_ask').insert({kind: 'restart', question: '판테온 봇 재시작'}).select('id').single();
  if (error) { $('#bot-restart').disabled = false; return msg('재시작하지 못했습니다: ' + error.message); }
  const res = await waitAsk(data.id, s => msg(`판테온 봇에 재시작을 요청했습니다… ${s}초`), 60);
  if (!res) { $('#bot-restart').disabled = false; return msg('판테온 봇이 응답하지 않습니다. 서버 PC가 켜져 있는지 확인해 주세요. 봇이 꺼져 있으면 5분 이내에 자동으로 재시작됩니다.'); }
  if (res.status === 'fail') { $('#bot-restart').disabled = false; return msg(res.answer || '재시작하지 못했습니다.'); }
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    await new Promise(r => setTimeout(r, 3000));
    msg(`판테온 봇을 재시작하는 중입니다… ${Math.round((Date.now() - t0) / 1000)}초`);
    const b = await SB.from('pt_bot').select('*').maybeSingle();
    if (b.data?.started_at && b.data.started_at !== before) { admin.bot = b.data; render(); toast('판테온 봇이 재시작되었습니다.'); return; }
  }
  admin.bot = null; render(); toast('판테온 봇이 아직 재시작되지 않았습니다. 잠시 후 새로고침해 주세요.');
}
function qualityPanel() {
  const es = entities(), hidden = all.filter(e => e.hidden);
  return `<div class="quality-grid"><div class="stat"><div class="stat-label">담당자 없음</div><div class="stat-value">${es.filter(noContact).length}<small>곳</small></div><div class="stat-bottom">회사·브랜드·매체 중 등록된 담당자가 없는 곳</div></div><div class="stat"><div class="stat-label">관계 근거 없음</div><div class="stat-value">${es.filter(e => !e.rel).length}<small>개</small></div><div class="stat-bottom">내부 담당자 확인 필요</div></div><div class="stat"><div class="stat-label">숨긴 항목</div><div class="stat-value">${hidden.length}<small>개</small></div><div class="stat-bottom">상세 화면에서 숨김 해제</div></div></div><section class="panel"><div class="panel-head"><div class="panel-title">데이터 점검</div><button class="button" id="admin-export">${icon('download')} 엔티티 CSV</button></div><div class="table-wrap"><table><thead><tr><th>엔티티</th><th>유형</th><th>관계 근거</th><th>등록된 담당자</th><th>조치</th></tr></thead><tbody>${[...es, ...hidden.filter(isContact)].sort((a, b) => ((!b.rel) + noContact(b)) - ((!a.rel) + noContact(a))).map(e => `<tr><td>${esc(e.name)}${e.hidden ? ' <span class="pill">숨김</span>' : ''}</td><td>${esc(e.type)}</td><td>${e.rel ? '<span class="pill good">입력됨</span>' : PILL_NOREL}</td><td>${contactsOf(e).length ? contactsOf(e).length + '명' : noContact(e) ? PILL_NOC : '—'}</td><td><button class="text-btn" data-detail="${e.id}">상세 확인 ↗</button></td></tr>`).join('')}</tbody></table></div></section>`;
}
function bindAdmin() {
  $$('[data-admin-tab]').forEach(b => b.onclick = () => { admin.tab = b.dataset.adminTab; render(); });
  $('#log-reload')?.addEventListener('click', () => { admin.changes = null; loadAdmin(); });
  $('#bot-reload')?.addEventListener('click', () => { admin.bot = null; render(); });
  $('#bot-restart')?.addEventListener('click', () => {
    modal(`<h2>판테온 봇 재시작</h2><p>판테온 봇을 재시작합니다. 약 20초 동안 슬랙·웹 질문에 답변하지 않습니다.</p><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="button" id="restart-go">재시작</button></div>`);
    $('#restart-go').onclick = () => { $('#modal').close(); restartBot(); };
  });
  $('#log-who')?.addEventListener('change', e => { admin.who = e.target.value; render(); });
  const q = $('#log-q'); if (q) q.onchange = e => { admin.q = e.target.value; render(); };
  $('#log-export')?.addEventListener('click', () => { const rows = [['언제(KST)', '누가', '어디서', '엔티티', '무엇을', '변경 항목', '이전', '이후', '메모'], ...admin.changes.flatMap(x => (x.op === 'insert' ? ['(새로 등록)'] : x.fields || []).map(k => [kst(x.at), whoName(x.actor, x.actor_name), VIA_KO[x.via] || x.via, x.entity_name, OP_KO[x.op] || x.op, FIELD_KO[k] || k, x.op === 'insert' ? '' : showVal(k, x.before?.[k]), x.op === 'insert' ? '' : showVal(k, x.after?.[k]), x.reason]))]; download('pantheon-change-log.csv', rows); });
  $$('[data-restore]').forEach(b => b.onclick = () => {
    const x = admin.changes.find(c => String(c.id) === b.dataset.restore); if (!x) return;
    modal(`<h2>복원 확인</h2><p><b>${esc(x.entity_name)}</b>을(를) ${esc(kst(x.at))}에 변경되기 <b>이전</b> 내용으로 복원합니다. 복원한 내용도 변경 기록에 남으며, 필요하면 다시 복원할 수 있습니다.</p><div class="table-wrap" style="max-height:260px;overflow:auto"><table><thead><tr><th>항목</th><th>현재</th><th>복원 후</th></tr></thead><tbody>${(x.fields || []).map(k => { const cur = byId(x.entity_id); return `<tr><td>${esc(FIELD_KO[k] || k)}</td><td>${esc(showVal(k, cur ? toRow(cur)[k] ?? cur[k] : null))}</td><td>${esc(showVal(k, x.before?.[k]))}</td></tr>`; }).join('')}</tbody></table></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="button" id="restore-go">${esc(x.entity_name)} 복원</button></div>`);
    $('#restore-go').onclick = async () => { $('#restore-go').disabled = true; const { error } = await SB.rpc('pt_restore', {change_id: x.id, side: 'before'}); $('#modal').close(); if (error) return toast('복원하지 못했습니다: ' + error.message); await load(); admin.changes = null; loadAdmin(); toast(`${x.entity_name}을(를) 복원했습니다.`); };
  });
}

/* ---------- 제안서 스튜디오 (2026-10-27 · 시험 기간: 홍석진·김현우·류성열만 — DB 가 pt_studio_can 으로 막음) ----------
   대표님 almighty-proposal-studio 의 흐름: IP 입력 → 인테이크 → (콜라보) 파트너 추천 → 리서치 → 컨셉 → 제안서 생성 → 이미지 계획 → 생성·삽입·QA
   사람은 게이트에서만 결정하고, 단계 작업은 pt_proposal_job 대기열에 넣어 판테온 봇(서버 PC)이 처리한다. 엔티티는 판테온 pt_entity 를 쓴다 */
let studioCan = false, ipcCan = false;         // IP 차트 — 우선 김현우만 (10-31 · sql/013 pt_ipchart_can)
const studio = {tab: 'projects', filter: 'all', list: null, refs: null, jobs: [], loading: false, err: ''};
const STAGES = ['IP 입력', '기본 정보', '파트너 IP 추천', '리서치', '컨셉 설계', '제안서 생성', '이미지 계획', '생성·삽입·검수'];
const GATES = {2: '기본 정보 확정', 3: '파트너 IP 선택', 5: '컨셉 확정', 7: '이미지 수급·크레딧 승인', 8: '반려 이미지 최종 판단'};
const JOB_OF = {3: 'partners', 4: 'research', 5: 'concepts', 6: 'build', 7: 'image_plan', 8: 'generate'};
// 같은 IP 조합·수신사로 만든 제안서는 한 프로젝트로 보고, 만든 순서대로 「제안서 1 · 2 · 3」 (10-29 김현우)
const pKey = p => [p.mode, p.ip_a_name, p.ip_b_name || '', (p.recipient || '').trim().toLowerCase()].join('|');
function propNo(p) {
  const same = (studio.list || []).filter(x => x.ip_b_name && pKey(x) === pKey(p)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const i = same.findIndex(x => x.id === p.id);
  return i < 0 ? null : {n: i + 1, of: same.length};
}
const propSub = p => { const no = propNo(p), c = p.data?.concept_selected?.name; return [no ? `제안서 ${no.n}` : '', c ? `「${c}」` : ''].filter(Boolean).join(' · '); };
const pTitle = p => p.mode === 'single' ? `${p.ip_a_name} 단독` : `${p.ip_a_name} × ${p.ip_b_name || '파트너 선택 전'}`;
const pStatus = p => p.status === 'done' ? '완료' : p.status === 'failed' ? '작업 실패' : p.status === 'working' ? `${STAGES[p.stage - 1]} 진행 중` : `${GATES[p.stage] || '확인'} 대기`;
const pPill = p => `<span class="pill ${p.status === 'done' ? 'good' : p.status === 'failed' ? 'bad' : p.status === 'waiting' ? 'wait' : ''}">${esc(pStatus(p))}</span>`;
const contactPoint = e => e ? '등록된 연락처 있음' : '등록된 연락처 없음';
const ipChips = (host, initial, list) => chipInput(host, initial, {list, find: entityByName, badge: contactPoint,
  sub: e => [e.type, contactsOf(e).length ? `등록된 담당자 ${contactsOf(e).length}명` : ''].filter(Boolean).join(' · '),
  title: e => e ? `판테온 엔티티 「${e.name}」` : '판테온 엔티티에 등록되지 않은 IP입니다',
  note: '판테온 엔티티에 등록된 IP는 <b>등록된 연락처 있음</b>, <span class="err">빨간 칩</span>은 등록되지 않은 IP입니다.'});
const entityByName = name => { const n = normCo(name); return n.length < 2 ? null : entities().find(e => [e.name, e.en, ...e.aliases].some(x => x && normCo(x) === n)) || null; };

async function loadStudio() {
  if (studio.loading) return; studio.loading = true; studio.err = '';
  try {
    const [p, r, j] = await Promise.all([
      SB.from('pt_proposal').select('*').order('updated_at', {ascending: false}),
      SB.from('pt_proposal_ref').select('*').eq('hidden', false).order('created_at', {ascending: false}),
      SB.from('pt_proposal_job').select('id,proposal_id,ref_id,kind,status,at,error,result,input').in('status', ['wait', 'work'])]);
    if (p.error) throw p.error; if (r.error) throw r.error; if (j.error) throw j.error;
    studio.list = p.data; studio.refs = r.data; studio.jobs = j.data;
  } catch (e) { studio.err = '제안서 스튜디오를 불러오지 못했습니다: ' + (e?.message || ''); }
  studio.loading = false; if (page === 'studio') render();
}

function studioView() {
  if (!studio.list && !studio.err) { setTimeout(loadStudio); return '<div class="empty"><p>불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>'; }
  const tabs = `<div class="tabs" style="margin-bottom:16px">${[['projects', '프로젝트', studio.list?.length], ['refs', '레퍼런스 라이브러리', studio.refs?.length], ['archive', '이미지 아카이브', studio.arch?.length]].map(([k, t, n]) => `<button class="tab ${studio.tab === k ? 'active' : ''}" data-studio-tab="${k}">${t}${n ? ` <span class="nav-count">${n}</span>` : ''}</button>`).join('')}</div>`;
  if (studio.err) return tabs + `<div class="notice">${esc(studio.err)}</div>`;
  return tabs + (studio.tab === 'refs' ? studioRefs() : studio.tab === 'archive' ? studioArchive() : studioProjects());
}

function studioProjects() {
  const all = studio.list, live = all.filter(p => p.status !== 'done'), wait = all.filter(p => p.status === 'waiting'), work = all.filter(p => p.status === 'working'), done = all.filter(p => p.status === 'done');
  // 숫자 카드를 누르면 그 건만 (10-29 김현우) · 다시 누르면 전체
  const F = {live: ['진행 중', live], wait: ['결정 대기', wait], work: ['판테온 봇 처리 중', work], done: ['완료', done]};
  const ps = F[studio.filter]?.[1] || all;
  const stat = (key, n, unit, bottom, hi) => `<div class="stat${hi ? ' highlight' : ''}${studio.filter === key ? ' on' : ''}" data-pfilter="${key}" role="button" tabindex="0" aria-pressed="${studio.filter === key}" aria-label="${F[key][0]} 프로젝트만 보기"><div class="stat-label">${F[key][0]}</div><div class="stat-value">${n}<small>${unit}</small></div><div class="stat-bottom">${bottom}</div></div>`;
  const decide = wait.length ? wait.map(p => `<button class="alert-row" data-proposal="${p.id}"><span class="alert-symbol">${icon('warning')}</span><span class="alert-text">${esc(pTitle(p))}<small>${esc(GATES[p.stage] || '확인')} 대기 · ${esc(kst(p.updated_at))}</small></span></button>`).join('') : '<p class="panel-caption" style="padding:0 0 18px">지금 결정할 프로젝트가 없습니다.</p>';
  const rows = ps.map(p => `<tr class="clickable" data-proposal="${p.id}" tabindex="0"><td>${esc(pTitle(p))}${propSub(p) ? ` <span class="prop-no">${esc(propSub(p))}</span>` : ''}<small class="cell-sub">${esc(p.recipient || '수신사 미정')}</small></td><td data-label="단계">${p.stage}. ${esc(STAGES[p.stage - 1])}</td><td data-label="버전">${p.data?.build ? `<b class="ver">v${p.data.build.version}</b>` : '—'}</td><td data-label="상태">${pPill(p)}${p.status === 'working' ? `<div data-prow="${p.id}">${rowProg(p)}</div>` : ''}</td><td data-label="업데이트" style="white-space:nowrap">${esc(kst(p.updated_at))}</td></tr>`).join('');
  return `<div class="stats">${stat('live', live.length, '건', `전체 ${all.length}건`)}${stat('wait', wait.length, '건', '담당자 확인이 필요한 단계')}${stat('work', work.length, '건', '리서치·생성 등 자동 단계')}${stat('done', done.length, '건', '제안서 전달 완료', true)}</div>
  <div class="main-grid"><section class="panel"><div class="panel-head"><div class="panel-title">${F[studio.filter] ? `${F[studio.filter][0]} 프로젝트 <small>${ps.length}건 · 최근 업데이트 순</small>` : '전체 프로젝트 <small>최근 업데이트 순</small>'}</div>${F[studio.filter] ? '<button class="text-btn" data-pfilter="all">전체 보기</button>' : ''}</div>${!ps.length && F[studio.filter] ? `<div class="empty"><p>${F[studio.filter][0]}인 프로젝트가 없습니다.</p></div>` : ps.length ? `<div class="table-wrap"><table class="ct"><thead><tr><th>프로젝트</th><th>현재 단계</th><th>버전</th><th>상태</th><th>업데이트</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty"><p>아직 프로젝트가 없습니다.<br>오른쪽 위 「새 프로젝트」에서 IP 하나로 시작하세요.</p></div>`}</section>
  <section class="panel"><div class="panel-head"><div class="panel-title">지금 결정할 항목</div>${wait.length ? `<span class="alert-count">${wait.length}건</span>` : ''}</div><div class="alert-list">${decide}</div></section></div>`;
}

function studioRefs() {
  const rs = studio.refs, st = {uploaded: '분석 대기', analyzing: '분석 중', ready: '분석 완료', failed: '분석 실패'};
  return `<section class="panel"><div class="panel-head"><div><div class="panel-title">레퍼런스 라이브러리 <small>${rs.length}건</small></div><p class="panel-caption">팀이 작성한 완성 제안서입니다. 새 제안서는 선택한 레퍼런스의 문체와 이미지 쓰는 법을 참고합니다. 페이지 구성은 컨셉 확정 때 「제안서 구성」에서 정합니다.</p></div></div>
  ${rs.length ? `<div class="table-wrap"><table class="ct"><thead><tr><th>제안서</th><th>IP</th><th>수신사</th><th>작성</th><th>분석</th><th>기본 포맷</th><th>파일</th></tr></thead><tbody>${rs.map(r => `<tr${r.status === 'ready' ? ` class="clickable" data-ref-view="${r.id}"` : ''}><td class="wrap-cell">${esc(r.title)}</td><td data-label="IP">${esc(r.ip_names || '—')}</td><td data-label="수신사">${esc(r.recipient || '—')}</td><td data-label="작성">${esc(r.author || '—')}</td><td data-label="분석">${r.status === 'ready' ? `<button class="text-btn" data-ref-view="${r.id}"><span class="pill good">분석 완료</span> 보기</button>` : r.status === 'failed' ? `<span class="pill bad" title="${esc(r.profile?.error || '')}">분석 실패</span> <button class="text-btn" data-ref-retry="${r.id}">다시 분석</button>` : refProg(r)}</td><td data-label="기본 포맷">${r.is_default ? '<span class="pill good">기본</span>' : `<button class="text-btn" data-ref-default="${r.id}">기본으로 지정</button>`}</td><td data-label="파일"><button class="text-btn" data-ref-open="${r.id}">열기 ↗</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>등록된 레퍼런스가 없습니다.<br>오른쪽 위 「레퍼런스 등록」에서 완성 제안서 PDF를 업로드해 주세요.</p></div>'}</section>`;
}

// 이미지 아카이브 (10-31 김현우 「Aside로 찾거나 힉스필드로 만든 이미지를 종류별로 정리해 나중에도 쓰게」)
// 판테온 봇이 이미지 작업이 끝날 때마다 pt_image_archive 에 복사본을 쌓는다(bot/src/archive.py). 여기선 보고·내려받고·다른 제안서에 넣는다
const AR_KIND = [['logo', '로고'], ['symbol', '심볼'], ['artist', '아티스트 사진'], ['official', '공식 이미지'], ['capture', '캡처'], ['reference', '참고 사례'], ['ai_concept', 'AI 컨셉'], ['mockup', '굿즈·목업'], ['texture', '배경·질감']];
const AR_KO = Object.fromEntries(AR_KIND), AR_SRC = {aside: 'Aside', higgsfield: '힉스필드', search: '자동 검색'};
const arF = {kind: '', source: '', ip: '', q: ''};
async function loadArchive() {
  if (studio.archLoading) return; studio.archLoading = true;
  const { data, error } = await SB.from('pt_image_archive').select('*').eq('hidden', false).order('created_at', {ascending: false}).limit(3000);
  studio.archLoading = false;
  if (error) { studio.archErr = '이미지 아카이브를 불러오지 못했습니다: ' + error.message; studio.arch = []; } else { studio.archErr = ''; studio.arch = data; }
  if (page === 'studio' && studio.tab === 'archive') render();
  window.dispatchEvent(new Event('pt-arch'));
}
const arIps = () => [...new Set((studio.arch || []).flatMap(a => a.ips || []))].sort((a, b) => a.localeCompare(b, 'ko'));
const arMatch = (a, f) => (!f.kind || a.kind === f.kind) && (!f.source || a.source === f.source) && (!f.ip || (a.ips || []).includes(f.ip))
  && (!f.q || [a.what, a.prompt, ...(a.ips || [])].join(' ').toLowerCase().includes(f.q.toLowerCase()));
const arProp = a => { const p = studio.list?.find(x => x.id === a.proposal_id); return p ? `${pTitle(p)}${propSub(p) ? ' · ' + propSub(p) : ''}` : ''; };
// 거르기 줄 + 사진 격자 — 탭 화면과 「아카이브에서 선택」 창이 같이 쓴다
function arFilters(f, id) {
  const all = studio.arch || [], n = k => all.filter(a => arMatch(a, {...f, kind: k})).length;
  return `<div class="ar-tools" id="${id}"><div class="ar-kinds" role="group" aria-label="종류">${[['', '전체'], ...AR_KIND].map(([k, t]) => `<button type="button" class="ar-chip${f.kind === k ? ' on' : ''}" data-ar-kind="${k}" aria-pressed="${f.kind === k}">${t} <small>${n(k)}</small></button>`).join('')}</div>
  <div class="ar-row"><select data-ar-src aria-label="출처" data-nodirty><option value="">모든 출처</option>${Object.entries(AR_SRC).map(([k, t]) => `<option value="${k}"${f.source === k ? ' selected' : ''}>${t}</option>`).join('')}</select><select data-ar-ip aria-label="IP" data-nodirty><option value="">모든 IP</option>${arIps().map(x => `<option${f.ip === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select><input type="search" data-ar-q placeholder="설명·IP·프롬프트 검색" value="${esc(f.q)}" aria-label="아카이브 검색"></div></div>`;
}
function arGrid(f, pick) {
  const xs = (studio.arch || []).filter(a => arMatch(a, f));
  if (!xs.length) return `<div class="empty"><p>${(studio.arch || []).length ? '조건에 맞는 이미지가 없습니다.' : '아직 보관된 이미지가 없습니다.<br>제안서 이미지를 확보하거나 생성하면 여기에 자동으로 모입니다.'}</p></div>`;
  return `<div class="ar-grid">${xs.slice(0, 300).map(a => `<button type="button" class="ar-card" data-ar="${a.id}"${pick ? ' data-ar-pick="1"' : ''}><div class="ithumb" data-ar-thumb="${esc(a.path)}"></div><span class="ar-meta"><b>${esc(AR_KO[a.kind] || a.kind)}</b><span class="pill">${esc(AR_SRC[a.source] || a.source)}</span></span><small>${esc(whatText(a.what) || '설명 없음')}</small><small class="ar-ip">${esc((a.ips || []).join(' · '))}</small></button>`).join('')}</div>${xs.length > 300 ? `<p class="panel-caption">${xs.length}장 중 300장만 보입니다. 종류·IP로 좁혀 주세요.</p>` : ''}`;
}
async function arThumbs(root) {
  const els = [...root.querySelectorAll('[data-ar-thumb]')], paths = [...new Set(els.map(e => e.dataset.arThumb))];
  for (let i = 0; i < paths.length; i += 100) {
    const { data } = await SB.storage.from('pt-studio').createSignedUrls(paths.slice(i, i + 100), 3600);
    (data || []).forEach(x => { if (x.signedUrl) root.querySelectorAll(`[data-ar-thumb="${CSS.escape(x.path)}"]`).forEach(el => { el.style.backgroundImage = `url("${x.signedUrl}")`; }); });
  }
}
// 거르기 묶기 — 바뀌면 redraw()
function arBind(root, f, redraw) {
  root.querySelectorAll('[data-ar-kind]').forEach(b => b.onclick = () => { f.kind = b.dataset.arKind; redraw(); });
  const s = root.querySelector('[data-ar-src]'), ip = root.querySelector('[data-ar-ip]'), q = root.querySelector('[data-ar-q]');
  if (s) s.onchange = () => { f.source = s.value; redraw(); };
  if (ip) ip.onchange = () => { f.ip = ip.value; redraw(); };
  if (q) { let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { f.q = q.value.trim(); redraw(true); }, 250); }; }
}
function studioArchive() {
  if (!studio.arch) { setTimeout(loadArchive); return '<div class="empty"><p>이미지 아카이브를 불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>'; }
  if (studio.archErr) return `<div class="notice">${esc(studio.archErr)}</div>`;
  return `<section class="panel"><div class="panel-head"><div><div class="panel-title">이미지 아카이브 <small>${studio.arch.length}장</small></div><p class="panel-caption">제안서를 만들며 Aside로 찾거나 힉스필드로 생성한 이미지입니다. 이미지를 누르면 크게 보고 내려받을 수 있고, 제안서 이미지 확인·수정 화면의 「아카이브에서 선택」으로 다른 제안서에 넣을 수 있습니다.</p></div></div>
  ${arFilters(arF, 'ar-tools')}<div id="ar-body">${arGrid(arF)}</div></section>`;
}
function bindArchive() {
  const host = $('#ar-tools'); if (!host) return;
  const redraw = keepInput => {
    if (keepInput) { $('#ar-body').innerHTML = arGrid(arF); } else { host.outerHTML = arFilters(arF, 'ar-tools'); $('#ar-body').innerHTML = arGrid(arF); bindArchive(); return; }
    arCards($('#ar-body')); arThumbs($('#ar-body'));
  };
  arBind(host, arF, redraw); arCards($('#ar-body')); arThumbs($('#ar-body'));
}
function arCards(root) { root.querySelectorAll('[data-ar]:not([data-ar-pick])').forEach(b => b.onclick = () => arView(b.dataset.ar)); }
async function arView(id) {
  const a = studio.arch.find(x => x.id === id); if (!a) return;
  const from = arProp(a);
  modal(`<div class="ar-view"><h2>${esc(AR_KO[a.kind] || a.kind)} <span class="pill">${esc(AR_SRC[a.source] || a.source)}</span></h2><div class="ar-big"><img id="ar-img" alt="${esc(whatText(a.what))}"></div>
  <div class="detail-row"><span>설명</span><b>${esc(whatText(a.what) || '—')}</b></div><div class="detail-row"><span>IP</span><b>${esc((a.ips || []).join(' · ') || '—')}</b></div>
  ${a.w && a.h ? `<div class="detail-row"><span>크기</span><b>${a.w} × ${a.h}</b></div>` : ''}${from ? `<div class="detail-row"><span>처음 쓴 제안서</span><b>${esc(from)}${a.slide ? ` · ${a.slide}페이지` : ''}</b></div>` : ''}
  <div class="detail-row"><span>보관한 날</span><b>${esc(kst(a.created_at))}</b></div>
  ${a.source_page ? `<div class="detail-row"><span>출처</span><b><a href="${esc(a.source_page)}" target="_blank" rel="noopener">${esc(a.source_page.replace(/^https?:\/\//, '').slice(0, 60))} ↗</a></b></div>` : ''}
  ${a.prompt ? `<details class="ar-prompt"><summary>생성 프롬프트</summary><p>${esc(a.prompt)}</p><button class="text-btn" type="button" id="ar-copy">프롬프트 복사</button></details>` : ''}
  <label>종류<select id="ar-kind" data-nodirty>${AR_KIND.map(([k, t]) => `<option value="${k}"${a.kind === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
  <div class="modal-actions"><button class="button" type="button" id="ar-hide">아카이브에서 빼기</button><button class="button" type="button" data-cancel>닫기</button><button class="button primary" type="button" id="ar-down">${icon('download')} 원본 내려받기</button></div></div>`);
  $('#modal').classList.add('wide'); $('#modal').addEventListener('close', () => $('#modal').classList.remove('wide'), {once: true});
  SB.storage.from('pt-studio').createSignedUrl(a.path, 3600).then(({ data }) => { if (data && $('#ar-img')) $('#ar-img').src = data.signedUrl; });
  $('#ar-copy')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(a.prompt); toast('프롬프트를 복사했습니다.'); } catch { toast('복사하지 못했습니다.'); } });
  $('#ar-down').onclick = async () => {
    const ext = a.path.split('.').pop(), name = `${(a.ips || []).join('_') || 'image'}_${AR_KO[a.kind] || a.kind}_${a.id.slice(0, 6)}.${ext}`.replace(/[\\/:*?"<>|\s]+/g, '_');
    const { data, error } = await SB.storage.from('pt-studio').createSignedUrl(a.path, 600, {download: name});
    if (error) return toast('내려받지 못했습니다: ' + error.message);
    const l = document.createElement('a'); l.href = data.signedUrl; l.download = name; document.body.appendChild(l); l.click(); l.remove();
  };
  $('#ar-kind').onchange = async ev => { const old = a.kind, k = ev.target.value;
    await optimistic(() => { a.kind = k; render(); }, () => SB.from('pt_image_archive').update({kind: k}).eq('id', a.id), () => { a.kind = old; ev.target.value = old; render(); });
    toast(`「${AR_KO[k]}」(으)로 옮겼습니다.`); };
  $('#ar-hide').onclick = async () => { const i = studio.arch.indexOf(a);
    $('#modal').close();
    const done = await optimistic(() => { studio.arch.splice(i, 1); render(); }, () => SB.from('pt_image_archive').update({hidden: true}).eq('id', a.id), () => { studio.arch.splice(i, 0, a); render(); }, '빼지 못해 원래대로 되돌렸습니다');
    if (done) toast('아카이브에서 뺐습니다.', {fn: async () => { const r = await SB.from('pt_image_archive').update({hidden: false}).eq('id', a.id); if (r.error) throw r.error; studio.arch.splice(i, 0, a); render(); toast('되돌렸습니다.'); }}); };
}
// 제안서 이미지 확인·수정 카드 「아카이브에서 선택」 — 고른 이미지를 그 자리에 넣는다(복사본 그대로 · 내 이미지로 교체와 같은 흐름)
const AR_NEAR = {official: 'official', logo: 'logo', capture: 'capture', reference: 'reference', ai_concept: 'ai_concept', mockup: 'mockup', texture: 'texture'};
function arPick(p, key, done) {
  const S = (studio.list?.find(x => x.id === p.id)?.data || p.data).images.slots, s = S[key];
  const ip = [p.ip_a_name, p.ip_b_name].filter(Boolean);
  const f = {kind: AR_NEAR[s.kind] || '', source: '', ip: '', q: ''};
  const draw = () => {
    const box = $('#arp'); if (!box) return;
    if (!studio.arch) { box.innerHTML = '<div class="empty"><p>이미지 아카이브를 불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>'; return; }
    box.innerHTML = arFilters(f, 'arp-tools') + `<div id="arp-body">${arGrid(f, true)}</div>`;
    arBind($('#arp-tools'), f, keep => { if (keep) { $('#arp-body').innerHTML = arGrid(f, true); bindPick(); } else draw(); });
    bindPick();
  };
  const bindPick = () => { const b = $('#arp-body'); arThumbs(b); b.querySelectorAll('[data-ar-pick]').forEach(c => c.onclick = async () => {
    const a = studio.arch.find(x => x.id === c.dataset.ar); if (!a) return;
    $('#modal').close(); if (await useArchive(p, key, a)) done?.(); }); };
  modal(`<div><h2>아카이브에서 선택</h2><p>${esc(whatText(s.what))} 위치에 넣을 이미지를 선택하세요. ${ip.length ? `${esc(ip.join(' · '))} 이미지만 보려면 IP를 선택하세요.` : ''}</p><div id="arp"></div><div class="modal-actions"><button class="button" type="button" data-cancel>닫기</button></div></div>`);
  $('#modal').classList.add('wide'); $('#modal').addEventListener('close', () => { $('#modal').classList.remove('wide'); window.removeEventListener('pt-arch', draw); }, {once: true});
  window.addEventListener('pt-arch', draw); draw(); if (!studio.arch) loadArchive();
}
async function useArchive(p, key, a) {
  const { data: row, error: e0 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single();
  if (e0) return toast('불러오지 못했습니다: ' + e0.message);
  const d = row.data, was = d.images.slots[key];
  const slots = {...d.images.slots, [key]: {...was, status: 'found', via: 'archive', archive_id: a.id, path: a.path, source_page: a.source_page || '', image_url: a.image_url || '', w: a.w, h: a.h, pos: {}, cand: undefined, before: undefined}};
  const { error } = await SB.from('pt_proposal').update({data: {...d, images: {...d.images, slots}}}).eq('id', p.id);
  if (error) return toast('저장하지 못했습니다: ' + error.message);
  await proposalEvent(p.id, `이미지 ${key} 을(를) 아카이브 이미지로 교체했습니다`);
  studio.list = null; await loadStudio(); toast('아카이브 이미지로 교체했습니다. 「변경 사항 반영」을 누르면 제안서에 들어갑니다.', {fn: async () => {
    const { data: r2 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single(); const d2 = r2.data;
    await SB.from('pt_proposal').update({data: {...d2, images: {...d2.images, slots: {...d2.images.slots, [key]: was}}}}).eq('id', p.id);
    await proposalEvent(p.id, `이미지 ${key} 교체를 되돌렸습니다`); studio.list = null; await loadStudio(); toast('원래 이미지로 되돌렸습니다.'); window.dispatchEvent(new Event('pt-refresh')); }});
  return true;
}
// 레퍼런스 분석 진행률 — 판테온 봇이 pt_proposal_job.result 에 3초마다 적는 값(1~100% · 남은 초)을 읽어 막대로
const refJob = r => studio.jobs.find(j => j.ref_id === r.id && j.kind === 'analyze_reference');
function refProg(r) {
  const j = refJob(r), g = j?.result;
  if (!j || j.status === 'wait' || !g) {
    const long = j && Date.now() - Date.parse(j.at) > 120000;
    return `<span class="ref-prog" data-ref-prog="${r.id}"><span class="pill">분석 대기</span><small>판테온 봇 작업 대기 중<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></small>${long ? '<small class="warn">2분 넘게 대기 중입니다. DB 관리에서 판테온 봇을 재시작해 주세요.</small>' : ''}</span>`;
  }
  return `<span class="ref-prog" data-ref-prog="${r.id}" data-k="r${r.id}" data-eta="${g.eta}" data-at="${esc(g.at)}" data-step="${esc(g.step || '')}"><span class="row"><span class="bar" role="progressbar" aria-valuenow="${g.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${g.progress}%"></i></span><b>${g.progress}%</b></span><small>${esc(g.step || '분석 중')}</small></span>`;
}
let studioPoll, studioTick;
async function pollRefJobs() {
  if (page !== 'studio') return;
  const ids = (studio.refs || []).filter(r => r.status === 'uploaded' || r.status === 'analyzing').map(r => r.id);
  if (!ids.length) return;
  const { data, error } = await SB.from('pt_proposal_job').select('id,proposal_id,ref_id,kind,status,at,error,result,input').eq('kind', 'analyze_reference').in('ref_id', ids).order('at', {ascending: false});
  if (error || page !== 'studio') return;
  if (ids.some(id => { const j = data.find(x => x.ref_id === id); return j && (j.status === 'done' || j.status === 'fail'); })) return loadStudio();
  studio.jobs = [...studio.jobs.filter(j => !ids.includes(j.ref_id)), ...data.filter(j => j.status === 'wait' || j.status === 'work')];
  ids.forEach(id => { const el = document.querySelector(`[data-ref-prog="${id}"]`), r = studio.refs.find(x => x.id === id); if (el && r) el.outerHTML = refProg(r); });
  studioPoll = setTimeout(pollRefJobs, 3000);
}
// 목록에서도 진행이 보이게 — 작업 중인 프로젝트가 있으면 3초마다 진행률·상태를 다시 읽는다
function rowProg(p) {
  // 도는 작업(진행률 있는 것 먼저)을 보여 준다 — 예전엔 아무 작업이나 잡아 「작업 대기 중」으로 보여 멈춘 줄 알았다 (10-30)
  const js = studio.jobs.filter(x => x.proposal_id === p.id && ['wait', 'work'].includes(x.status));
  const j = js.find(x => x.status === 'work' && x.result?.progress) || js.find(x => x.status === 'work') || js[0], g = j?.result;
  if (!j) return `<small class="row-prog">다음 작업을 준비하는 중<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></small>`;
  if (j.status === 'wait') return `<small class="row-prog">${esc(jobName(j))} 시작을 기다리는 중<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></small>`;
  if (!g?.progress) return `<span class="ref-prog row-prog"><span class="row"><span class="bar indet"><i></i></span></span><small>${esc(jobName(j))} 진행 중</small></span>`;
  return `<span class="ref-prog row-prog"><span class="row"><span class="bar"><i style="width:${g.progress}%"></i></span><b>${g.progress}%</b></span><small>${esc(g.step || '')}</small></span>`;
}
let listPoll;
async function pollProjects() {
  if (page !== 'studio' || studio.tab !== 'projects') return;
  const ids = (studio.list || []).filter(p => p.status === 'working').map(p => p.id);
  if (!ids.length) return;
  const [ps, js] = await Promise.all([SB.from('pt_proposal').select('id,status,stage').in('id', ids),
    SB.from('pt_proposal_job').select('id,proposal_id,ref_id,kind,status,at,error,result,input').in('proposal_id', ids).in('status', ['wait', 'work'])]);
  if (ps.error || js.error || page !== 'studio' || !studio.list) return;          // 그 사이 목록을 새로 읽는 중이면 그쪽에 맡긴다
  if (ps.data.some(x => { const o = studio.list.find(p => p.id === x.id); return o && (o.status !== x.status || o.stage !== x.stage); })) { studio.list = null; return loadStudio(); }
  studio.jobs = [...studio.jobs.filter(j => !ids.includes(j.proposal_id)), ...js.data];
  ids.forEach(id => { const el = document.querySelector(`[data-prow="${id}"]`), p = studio.list.find(x => x.id === id); if (el && p) el.innerHTML = rowProg(p); });
  listPoll = setTimeout(pollProjects, 3000);
}
function bindStudio() {
  clearTimeout(studioPoll); clearInterval(studioTick); clearTimeout(listPoll);
  if ((studio.list || []).some(p => p.status === 'working')) listPoll = setTimeout(pollProjects, 3000);
  if ((studio.refs || []).some(r => r.status === 'uploaded' || r.status === 'analyzing')) {
    studioPoll = setTimeout(pollRefJobs, 3000);
  }
  $$('[data-ref-view]').forEach(b => b.onclick = ev => { ev.stopPropagation(); openRef(b.dataset.refView); });
  $$('[data-ref-retry]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error } = await SB.from('pt_proposal_ref').update({status: 'uploaded', profile: null}).eq('id', b.dataset.refRetry);
    if (error) { b.disabled = false; return toast('다시 분석을 요청하지 못했습니다: ' + error.message); }
    const r = studio.refs.find(x => x.id === b.dataset.refRetry);
    await SB.from('pt_proposal_job').insert({ref_id: r.id, kind: 'analyze_reference', input: {file_path: r.file_path, retry: true}});
    await loadStudio(); toast('다시 분석을 요청했습니다.');
  });
  $$('[data-studio-tab]').forEach(b => b.onclick = () => { studio.tab = b.dataset.studioTab; if (studio.tab === 'archive') studio.arch = null; render(); });
  if (studio.tab === 'archive') bindArchive();
  $$('[data-pfilter]').forEach(b => { const pick = () => { const v = b.dataset.pfilter; studio.filter = studio.filter === v ? 'all' : v; render(); }; b.onclick = pick; b.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } }; });
  $$('[data-proposal]').forEach(b => { b.onclick = () => openProposal(b.dataset.proposal); b.onkeydown = e => { if (e.key === 'Enter') openProposal(b.dataset.proposal); }; });
  $$('[data-ref-open]').forEach(b => b.onclick = async () => { const r = studio.refs.find(x => x.id === b.dataset.refOpen); const { data, error } = await SB.storage.from('pt-studio').createSignedUrl(r.file_path, 600); if (error) return toast('파일을 열지 못했습니다.'); window.open(data.signedUrl, '_blank', 'noopener'); });
  $$('[data-ref-default]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const old = studio.refs.filter(r => r.is_default).map(r => r.id);
    if (old.length) await SB.from('pt_proposal_ref').update({is_default: false}).in('id', old);
    const { error } = await SB.from('pt_proposal_ref').update({is_default: true}).eq('id', b.dataset.refDefault);
    if (error) { b.disabled = false; return toast('기본 포맷을 지정하지 못했습니다: ' + error.message); }
    studio.refs = null; studio.list = null; await loadStudio(); toast('기본 포맷으로 지정했습니다.');
  });
}

const IMG_KIND = {official: '공식 이미지', logo: '로고', ai_concept: 'AI 컨셉 이미지', mockup: '목업', reference: '참고 사례', capture: '캡처', texture: '배경·질감'};
function openRef(id) {
  const r = studio.refs?.find(x => x.id === id), f = r?.profile; if (!f) return;
  activeDetail = 'r:' + id;
  const kinds = Object.entries(f.image_pattern?.by_kind || {}).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  const st = f.style || {};
  const pages = (f.pages || []).map(x => `<tr><td>${esc(x.page)}</td><td>${esc(x.role || '')}<small class="cell-sub">${esc(x.title || '')}</small></td><td>${esc(x.layout || '')}${(x.images || []).length ? `<small class="cell-sub">${x.images.map(i => esc(`${IMG_KIND[i.kind] || i.kind} ${i.ratio || ''}${i.what ? ' · ' + i.what : ''}`)).join('<br>')}</small>` : ''}</td></tr>`).join('');
  showDrawer(`<span class="entity-avatar">${icon('studio')}</span><h2>${esc(r.title)}</h2><span class="detail-sub">${esc([r.ip_names, r.recipient, r.author].filter(Boolean).join(' · '))}</span>
  <div class="detail-block"><h3>구성 요약</h3><p>${esc(f.summary || '')}</p><div class="detail-row"><span>페이지</span><b>${esc(f.page_count || (f.pages || []).length)}페이지</b></div><div class="detail-row"><span>이미지</span><b>${esc(f.image_pattern?.total || 0)}장</b></div>${r.is_default ? '<div class="detail-row"><span>기본 포맷</span><b><span class="pill good">기본</span></b></div>' : ''}</div>
  ${(f.acts || []).length ? `<div class="detail-block"><h3>섹션 구성</h3><ol class="rule-list">${f.acts.map(a => `<li><b>${esc(a.name || '')}</b> <span class="muted">· ${esc(a.pages || '')}페이지</span><br><small>${esc(a.purpose || '')}</small></li>`).join('')}</ol></div>` : ''}
  ${kinds.length ? `<div class="detail-block"><h3>이미지 사용</h3>${kinds.map(([k, n]) => `<div class="detail-row"><span>${esc(IMG_KIND[k] || k)}</span><b>${n}장</b></div>`).join('')}${f.image_pattern?.note ? `<p>${esc(f.image_pattern.note)}</p>` : ''}</div>` : ''}
  <div class="detail-block"><h3>문체·디자인</h3>${st.tone ? `<div class="detail-row"><span>문체</span><b>${esc(st.tone)}</b></div>` : ''}${st.type ? `<div class="detail-row"><span>글꼴</span><b>${esc(st.type)}</b></div>` : ''}${st.emphasis ? `<div class="detail-row"><span>강조</span><b>${esc(st.emphasis)}</b></div>` : ''}${(st.colors || []).length ? `<div class="detail-row"><span>주요 색</span><b>${st.colors.filter(c => /^#[0-9a-f]{3,8}$/i.test(c)).map(c => `<i class="swatch" style="background:${c}" title="${c}"></i>`).join('')}</b></div>` : ''}</div>
  ${(f.rules || []).length ? `<div class="detail-block"><h3>새 제안서 작성 기준</h3><ol class="rule-list">${f.rules.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
  ${pages ? `<div class="detail-block"><h3>페이지별 구성</h3><div class="table-wrap"><table class="ref-pages"><thead><tr><th>페이지</th><th>역할</th><th>배치·이미지</th></tr></thead><tbody>${pages}</tbody></table></div></div>` : ''}`);
}

const SCORE_KO = {fandom: '팬덤', world: '세계관', asset: '자산 결합', business: '사업성', timing: '타이밍', risk: '리스크'};
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return '출처'; } };
const srcLinks = urls => (urls || []).map(u => `<a class="src" href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join('');
// 단계 작업 진행률 — 판테온 봇이 job.result 에 3초마다 적는 값을 막대로 (레퍼런스 분석과 같은 모양)
function jobProg(j) {
  const g = j?.result;
  // 진행률을 남기지 않는 작업(자동 검수·Aside 등)도 돌고 있으면 움직이는 막대 + 경과 시간 (10-30)
  if (j && j.status === 'work' && !g) return `<div class="ref-prog wide job-prog run" data-since="${esc(j.claimed_at || j.at)}"><span class="row"><span class="bar indet" role="progressbar" aria-label="진행 중"><i></i></span></span><small>${esc(jobName(j) || '작업')} 진행 중</small></div>`;
  if (!j || j.status === 'wait' || !g) return `<p class="job-wait">${j?.kind === 'aside' ? 'Aside 작업 대기 중' : '판테온 봇 작업 대기 중'}<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>`;
  return `<div class="ref-prog wide job-prog" data-k="j${j.id}" data-eta="${g.eta}" data-at="${esc(g.at)}" data-step="${esc(g.step || '')}"><span class="row"><span class="bar" role="progressbar" aria-valuenow="${g.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${g.progress}%"></i></span><b>${g.progress}%</b></span><small>${esc(g.step || '진행 중')}</small></div>`;
}
// 한 단계에 작업이 둘일 때(리서치 = 공개 웹 + 팬·SNS) 막대를 이름과 함께 나란히 (10-28)
const JOB_KO = {qa: '자동 검수', partners: '파트너 추천', research: '공개 웹 리서치', concepts: '컨셉 설계', build: '제안서 생성', image_plan: '이미지 수급', finalize: '제안서 다시 생성', generate: 'AI 이미지 생성'};
// 이미지 한두 자리만 다루는 작업은 「26페이지 2번째 이미지 · 무엇」까지 보인다 (10-30 김현우 「몇 페이지 몇 번째 이미지인지」)
const jobWhere = j => { const keys = j.input?.keys || (j.input?.slots || []).map(x => x.key); if (!keys?.length || keys.length > 3) return '';
  const d = studio.list?.find(x => x.id === j.proposal_id)?.data || {}, S = d.images?.slots || {}, B = d.build?.boxes || {};
  return keys.map(k => { const s = S[k]; if (!s) return ''; const pg = +(B[k]?.page || s.slide);
    const same = Object.keys(S).filter(x => +(B[x]?.page || S[x].slide) === pg).sort((a, b) => (B[a]?.y ?? 0) - (B[b]?.y ?? 0) || (B[a]?.x ?? 0) - (B[b]?.x ?? 0) || a.localeCompare(b));
    const pgs = [...new Set((B[k]?.at || []).map(a => +a.page))].sort((a, b) => a - b);
    if (pgs.length > 1) return `${pgs.join('·')}페이지 이미지 「${whatText(s.what).slice(0, 24)}」`;      // 여러 페이지에 쓴 이미지
    return `${pg}페이지${same.length > 1 ? ` ${same.indexOf(k) + 1}번째` : ''} 이미지 「${whatText(s.what).slice(0, 24)}」`; }).filter(Boolean).join(', '); };
const jobName = j => { const base = j.kind === 'aside' ? (j.input?.task === 'social' ? '팬·SNS 조사 · Aside' : '이미지 검색 · Aside') : (JOB_KO[j.kind] || ''), w = j.kind === 'aside' && j.input?.task ? '' : jobWhere(j);
  return w ? `${base} · ${w}` : base; };
const jobsProg = list => `<div id="job-progs">${list.length > 1 || (list[0] && jobWhere(list[0])) ? list.map(j => `<p class="sub-label">${esc(j ? jobName(j) : '')}</p>${jobProg(j)}`).join('') : jobProg(list[0])}</div>`;
const liveJobs = id => studio.jobs.filter(j => j.proposal_id === id && ['wait', 'work'].includes(j.status)).sort((a, b) => a.id - b.id);
let propPoll;
async function pollProposal(id) {
  if (activeDetail !== 'p:' + id) return;
  const [p, j] = await Promise.all([SB.from('pt_proposal').select('*').eq('id', id).single(), SB.from('pt_proposal_job').select('id,proposal_id,ref_id,kind,status,at,error,result,input').eq('proposal_id', id).order('id', {ascending: false}).limit(4)]);
  if (activeDetail !== 'p:' + id || p.error || !studio.list) { if (activeDetail === 'p:' + id) propPoll = setTimeout(() => pollProposal(id), 3000); return; }
  const old = studio.list.find(x => x.id === id);
  if (old && (p.data.status !== old.status || p.data.stage !== old.stage)) { studio.list = null; await loadStudio(); return openProposal(id, true); }
  const got = j.data || [];
  if (got.length) {
    studio.jobs = [...studio.jobs.filter(x => !got.some(g => g.id === x.id)), ...got];
    const live = got.filter(x => ['wait', 'work'].includes(x.status)).sort((a, b) => a.id - b.id);
    const el = $('#job-progs'); if (el) el.outerHTML = jobsProg(live.length ? live : [got[0]]);
  }
  propPoll = setTimeout(() => pollProposal(id), 3000);
}
// 새 버전 알림 (10-29) — 판테온 탭을 며칠 열어 두면 예전 화면이 남는다(홍석진 대표님 10/27 화면). 5분마다·탭으로 돌아올 때 확인
const MY_VER = (document.querySelector('script[src*="app.js?v="]')?.src.match(/v=([\w]+)/) || [])[1] || '';
async function checkVersion() {
  if (!MY_VER || $('#new-ver')) return;
  try {
    const html = await (await fetch(location.pathname + '?nv=' + Date.now(), {cache: 'no-store'})).text();
    const v = (html.match(/app\.js\?v=([\w]+)/) || [])[1];
    if (v && v !== MY_VER) {
      const bar = document.createElement('div'); bar.id = 'new-ver';
      bar.innerHTML = '판테온이 업데이트되었습니다. <button class="button primary small" type="button">새로고침</button>';
      bar.querySelector('button').onclick = () => location.reload();
      document.body.appendChild(bar);
    }
  } catch {}
}
setInterval(checkVersion, 300000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });
function partnersPanel(p) {
  const P = p.data.partners;
  const cats = (P.categories || []).map(cat => {
    const cards = P.candidates.map((c, i) => [c, i]).filter(([c]) => c.category === cat.name).map(([c, i]) => {
      const e = entityByName(c.ip);
      return `<div class="pcard"><div class="pcard-head"><b>${esc(c.ip)}</b><span class="pill ${e ? 'good' : 'bad'}">${contactPoint(e)}</span></div><p>${esc(c.one_line_concept || '')}</p><div class="scores">${Object.entries(SCORE_KO).map(([k, n]) => `<span class="${k === 'risk' ? 'risk' : ''}" title="${n} ${c.scores?.[k] ?? '-'}/5">${n} <b>${c.scores?.[k] ?? '-'}</b><i style="--v:${(c.scores?.[k] || 0) * 20}%"></i></span>`).join('')}</div><div class="pcard-foot"><span>${srcLinks(c.evidence_urls)}</span><button class="button primary small" data-pick="${i}">이 파트너 선택</button></div></div>`;
    }).join('');
    return `<div class="pcat"><div class="pcat-head"><div><b>${esc(cat.name)}</b><small>${esc(cat.reason || '')}</small></div><button class="text-btn" data-reroll="${esc(cat.name)}">다른 후보</button></div>${cards}</div>`;
  }).join('');
  return `<div class="detail-block"><h3>결정 · 파트너 IP 선택</h3><p>카드 하나를 선택하면 판테온 봇이 두 IP 리서치를 시작합니다. 점수는 1~5점이며, 리스크 점수가 높을수록 위험합니다.</p>${P.ip_a_card?.summary ? `<p class="muted-box">${esc(p.ip_a_name)} · ${esc(P.ip_a_card.summary)}</p>` : ''}${cats}<div class="pcat"><div class="pcat-head"><div><b>직접 입력</b><small>추천 IP 중 적합한 IP가 없으면 원하는 IP를 직접 입력해 진행합니다.</small></div></div><datalist id="pb-ents">${entities().filter(e => !e.hidden).map(e => `<option value="${esc(e.name)}">`).join('')}</datalist><div class="ask-row"><input id="pb-own" list="pb-ents" maxlength="80" placeholder="예: 산리오" aria-label="파트너 IP"><button class="button primary" id="pb-own-go" type="button">이 IP로 진행</button></div><small class="atnote" id="pb-own-note"></small></div><div class="drawer-actions"><button class="button" id="recategorize">카테고리 변경 후 재추천</button></div></div>`;
}
const conceptCard = (c, i) => `<div class="pcard"><div class="pcard-head"><b>${esc(c.name)}</b></div>${c.key_copy ? `<p class="key-copy">“${esc(c.key_copy)}”</p>` : ''}<p>${esc(c.summary || '')}</p>${c.world ? `<details><summary>세계관</summary><p>${esc(c.world)}</p></details>` : ''}${(c.axes || []).length ? `<p class="sub-label">연결 포인트</p><ul class="axes">${c.axes.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}${(c.formats || []).length ? `<p class="sub-label">실행 포맷</p><ul class="axes">${c.formats.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}${c.why ? `<small class="why">${esc(c.why)}</small>` : ''}${i !== undefined ? `<div class="pcard-foot"><span></span><button class="button primary small" data-concept="${i}">이 컨셉으로 확정</button></div>` : ''}</div>`;
const DECK_PARTS = [['space', '공간·체험'], ['product', '상품'], ['content', '콘텐츠']];
// 제안서 구성 — 실행 파트·분량·참고할 레퍼런스(여럿 조합)를 골라 원고를 만든다 (10-30 원태 이사님 「한 템플릿만 따라간다 · 선택해서 조합」)
function deckStyleBox(p) {
  const st = p.data.deck_style || {}, parts = st.parts || DECK_PARTS.map(x => x[0]), refs = (studio.refs || []).filter(r => r.status === 'ready');
  const chosen = st.refs || (p.ref_id ? [p.ref_id] : refs.filter(r => r.is_default).map(r => r.id));
  return `<details class="pv-fold" open><summary><b>제안서 구성</b> <small>확정 전에 선택</small></summary>
    <div class="ds-row"><span>실행 파트</span><div>${DECK_PARTS.map(([k, n]) => `<label class="chk"><input type="checkbox" data-ds-part="${k}"${parts.includes(k) ? ' checked' : ''}> ${n}</label>`).join('')}</div></div>
    <div class="ds-row"><span>분량</span><div>${[['full', '전체 30~45페이지'], ['short', '요약 15~20페이지']].map(([k, n]) => `<label class="chk"><input type="radio" name="ds-len" value="${k}"${(st.length || 'full') === k ? ' checked' : ''}> ${n}</label>`).join('')}</div></div>
    ${refs.length ? `<div class="ds-row"><span>참고 레퍼런스</span><div>${refs.map(r => `<label class="chk"><input type="checkbox" data-ds-ref="${esc(r.id)}"${chosen.includes(r.id) ? ' checked' : ''}> ${esc(r.title)}</label>`).join('')}<small class="muted">여러 개를 선택하면 문체·이미지 쓰는 법을 섞어 씁니다.</small></div></div>
    <div class="ds-row"><span>레퍼런스 반영</span><div>${[['tone', '문체·디자인만 참고(구성은 위 선택대로)'], ['follow', '구성까지 그대로 따르기']].map(([k, n]) => `<label class="chk"><input type="radio" name="ds-ref" value="${k}"${(st.ref_mode || 'tone') === k ? ' checked' : ''}> ${n}</label>`).join('')}</div></div>` : ''}
    <div class="ds-row"><span>추가 요청</span><div><input id="ds-note" maxlength="300" value="${esc(st.note || '')}" placeholder="예: 굿즈 비중을 크게, 팝업은 한 곳만"></div></div>
  </details>`;
}
const readDeckStyle = () => ({parts: $$('[data-ds-part]').filter(x => x.checked).map(x => x.dataset.dsPart), length: $('input[name="ds-len"]:checked')?.value || 'full',
  refs: $$('[data-ds-ref]').filter(x => x.checked).map(x => x.dataset.dsRef), ref_mode: $('input[name="ds-ref"]:checked')?.value || 'tone', note: ($('#ds-note')?.value || '').trim()});
const conceptsPanel = p => `<div class="detail-block"><h3>결정 · 컨셉 확정</h3><p>하나를 확정하면 아래 구성으로 제안서를 생성합니다.</p>${deckStyleBox(p)}${p.data.concepts.candidates.map((c, i) => conceptCard(c, i)).join('')}
  <details class="pv-fold"><summary><b>컨셉 수정 요청</b> <small>마음에 드는 후보가 없을 때</small></summary><textarea id="cc-ins" rows="3" maxlength="1500" placeholder="예: 2번 컨셉을 상품 중심으로, 세계관보다 팬 참여형으로 다시"></textarea><div class="drawer-actions"><button class="button" id="cc-go">이 요청으로 컨셉 다시 받기</button></div></details></div>`;
// 팬·SNS 조사 — Aside 가 인스타그램·틱톡·X·유튜브·팬 커뮤니티에서 읽은 것 (10-28)
const PLAT_KO = {instagram: '인스타그램', tiktok: '틱톡', x: 'X', youtube: '유튜브', naver: '네이버', community: '커뮤니티'};
function socialBlock(S) {
  if (S.failed) return `<div class="detail-block"><h3>팬·SNS</h3><p>${esc(S.error || '이번에는 팬·SNS 조사를 진행하지 못했습니다.')}</p></div>`;
  if (!S.ips) return '';
  const fact = f => `<li>${esc(f.text)} ${f.url ? `<a class="src" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(host(f.url))}${f.as_of ? ' · ' + esc(f.as_of) : ''}</a>` : ''}</li>`;
  const theme = (v, key, body) => `<li><b>${esc(v[key])}</b> ${esc(v[body] || '')} ${srcLinks(v.urls)}</li>`;
  const list = (title, arr, fn) => (arr || []).length ? `<p><b>${title}</b></p><ul class="facts">${arr.map(fn).join('')}</ul>` : '';
  const ips = S.ips.map(x => `<details class="research"><summary><b>${esc(x.name)}</b> <small>채널 ${x.channels.length}개 · 반응 ${x.loves.length + x.dislikes.length + x.collab_reactions.length}개</small></summary>
    ${list('채널', x.channels, c => `<li>${esc(PLAT_KO[c.platform] || c.platform)} · ${esc(c.name || '')}${c.followers ? ` <b>${esc(c.followers)}</b>` : ''}${c.note ? ` · ${esc(c.note)}` : ''} <a class="src" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(host(c.url))}${c.as_of ? ' · ' + esc(c.as_of) : ''}</a></li>`)}
    ${list('수치', x.metrics, fact)}${list('팬 용어', x.fan_terms, t => `<li><b>${esc(t.term)}</b> ${esc(t.meaning || '')} ${t.url ? srcLinks([t.url]) : ''}</li>`)}
    ${list('좋아하는 점', x.loves, v => theme(v, 'theme', 'detail'))}${list('싫어하는 점', x.dislikes, v => theme(v, 'theme', 'detail'))}
    ${list('지난 협업 반응', x.collab_reactions, v => theme(v, 'collab', 'reaction'))}${list('도입에 쓸 장면', x.hooks, fact)}</details>`).join('');
  const caps = (S.captures || []).length ? `<p><b>캡처 ${S.captures.length}장</b></p><div class="iboard">${S.captures.map(c => `<div class="icard"><div class="ithumb" data-thumb="${esc(c.path)}" data-label="팬·SNS 캡처"></div></div>`).join('')}</div>` : '';
  const locked = (S.locked || []).length ? `<p><b>가입이 필요해 확인하지 못한 채널</b></p><ul class="facts">${S.locked.map(l => `<li>${esc(l.site)} · ${esc(l.need || '')} ${l.url ? srcLinks([l.url]) : ''}</li>`).join('')}</ul>` : '';
  return `<div class="detail-block"><h3>팬·SNS</h3>${ips}${caps}${locked}</div>`;
}
function researchBlock(R) {
  const fact = f => `<li>${esc(f.text)} ${f.url ? `<a class="src" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(host(f.url))}${f.as_of ? ' · ' + esc(f.as_of) : ''}</a>` : ''}</li>`;
  return `<div class="detail-block"><h3>리서치</h3>${(R.ips || []).map(x => `<details class="research"><summary><b>${esc(x.name)}</b> <small>출처가 확인된 사실 ${x.facts.length}개</small></summary><p>${esc(x.summary || '')}</p>${x.fandom ? `<p><b>팬덤</b> ${esc(x.fandom)}</p>` : ''}${x.world ? `<p><b>세계관·정서</b> ${esc(x.world)}</p>` : ''}<ul class="facts">${x.facts.map(fact).join('')}</ul>${(x.collabs || []).length ? `<p><b>지난 협업</b></p><ul class="facts">${x.collabs.map(fact).join('')}</ul>` : ''}${(x.hooks || []).length ? `<p><b>도입에 쓸 장면</b></p><ul class="facts">${x.hooks.map(h => fact({...h, text: h.text + (h.note ? ` (${h.note})` : '')})).join('')}</ul>` : ''}${(x.risks || []).length ? `<p><b>유의 사항</b> ${x.risks.map(esc).join(' · ')}</p>` : ''}</details>`).join('')}${(R.common_ground || []).length ? `<p><b>공통점</b></p><ul class="facts">${R.common_ground.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}</div>`;
}

// 지금 원고에 쓰인 이미지만 — 새 디자인 적용·수정 버전에서 빠진 이미지는 숫자·목록에 넣지 않는다 (10-30 에스파 SIGNAL 21개)
const liveSlots = d => { const S = d.images?.slots || {}, ks = new Set((d.build?.deck?.slides || []).flatMap(x => (x.images || []).map(i => i.key)));
  return ks.size ? Object.fromEntries(Object.entries(S).filter(([k]) => ks.has(k))) : S; };
const SLOT_ST = {found: ['good', '확보'], uploaded: ['good', '직접 업로드'], generated: ['good', 'AI 생성'], missing: ['bad', '미확보'], ai: ['wait', 'AI 생성 대기']};
function imagesPanel(p) {
  const S = liveSlots(p.data), keys = Object.keys(S).sort();
  const n = st => keys.filter(k => S[k].status === st).length;
  const E = p.data.images.ai_estimate, nW = keys.filter(k => S[k].widen && S[k].status === 'found').length, nAi = n('ai') + nW;
  const aiWhat = [n('ai') ? `AI 이미지 ${n('ai')}장` : '', nW ? `세로 사진 좌우 확장 ${nW}장` : ''].filter(Boolean).join(' + ');
  const ai = nAi ? (E && E.count === nAi ? `<div class="ai-box"><b>${aiWhat} · 예상 약 $${E.usd}</b><small>힉스필드 ${esc((E.model || '').replace('higgsfield-ai/', ''))} · 실패하거나 부적절 판정된 이미지는 청구되지 않습니다</small><div class="drawer-actions"><button class="button primary" id="ai-go" data-usd="${E.usd}">승인 후 생성</button><button class="text-btn" id="ai-est">견적 다시 받기</button></div></div>` : `<div class="ai-box"><b>${aiWhat}</b><small>생성 전에 힉스필드 견적을 먼저 받습니다(비용 없음)</small><div class="drawer-actions"><button class="button" id="ai-est">견적 받기</button></div></div>`) : '';
  // 대표님 설계(10-30 김현우): 결정 카드에는 숫자·확인할 곳·버튼만 — 이미지는 「이미지 수정」에서 실제 페이지를 보며 누른다
  const qa = qaOf(p.data), flags = qa?.flags || [], final = p.stage >= 8 || !nAi;
  const stat = (label, v, cls, go) => `<button class="pv-stat${cls ? ' ' + cls : ''}" type="button" data-review="${go || 1}"><b>${v}</b><span>${label}</span></button>`;
  const firstMiss = keys.find(k => S[k].status === 'missing'), firstAi = keys.find(k => S[k].status === 'ai');
  return `<div class="detail-block pv-decide"><h3>지금 할 일 · ${final ? '최종 확인' : '이미지 수급·AI 이미지 승인'}</h3>
  <div class="pv-stats">${stat('확보', n('found') + n('uploaded') + n('generated'), 'good')}${stat('미확보', n('missing'), n('missing') ? 'bad' : '', firstMiss && S[firstMiss].slide)}${stat('AI 생성 대기', n('ai'), n('ai') ? 'wait' : '', firstAi && S[firstAi].slide)}${qa ? stat('검수에서 확인할 곳', flags.length, flags.length ? 'bad' : 'good', flags[0]?.slide) : ''}</div>
  ${ai}${qaBlock(p)}
  <div class="pv-main-act"><button class="button primary" data-review="${flags[0]?.slide || 1}">${icon('image')} 제안서 화면에서 이미지 확인·수정</button><small>페이지에서 이미지를 클릭하면 교체·위치 조정·다시 생성할 수 있습니다</small></div>
  <div class="drawer-actions pv-final"><button class="button" id="img-rerender">변경 사항 반영</button><button class="button primary" id="img-done">이 버전으로 완료</button></div></div>`;
}
// 이미지 설명에 섞여 온 내부 파일 경로(proposals/…/cap_03.jpg)는 화면에 보이지 않게 (10-30)
const whatText = t => String(t || '').replace(/\s*\(?(?:proposals|social)\/[^\s)]*\)?/g, '').trim();
const KIND_KO_IMG = {official: '공식 이미지', logo: '로고', ai_concept: 'AI 컨셉', mockup: '목업', reference: '참고 사례', capture: '캡처', texture: '배경·질감'};
async function loadImgThumbs(slots) {
  const paths = [...new Set(Object.values(slots).map(s => s.path).filter(Boolean))];
  if (!paths.length) return;
  const { data } = await SB.storage.from('pt-studio').createSignedUrls(paths, 900);
  (data || []).forEach(x => { if (!x.signedUrl) return; $$(`#drawer [data-thumb="${CSS.escape(x.path)}"]`).forEach(el => {
    el.style.backgroundImage = `url("${x.signedUrl}")`; el.dataset.src = x.signedUrl;
    el.classList.add('zoom'); el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', '크게 보기');
  }); });
}
// 이미지 크게 보기 (10-29 김현우) — 원본 전체 + 제안서 자리 비율로 가운데를 잘라 넣은 모양(실제 제안서와 같은 방식)
// 이미지 크게 보기 · 위치 맞추기 (10-29 김현우) — 원본 전체 + 제안서 상자(실제 그려진 크기) 안에서 끌어 옮기기
// 판테온 봇이 그릴 때와 같은 방식: 채우기는 x·y(0~1) 위치를 남기고 자르고, 맞춤는 자르지 않는다
const POS_TOP = ['official', 'capture', 'reference'];
const defaultPos = s => ({x: 0.5, y: POS_TOP.includes(s?.kind) ? 0.15 : 0.5, fit: s?.kind === 'logo' ? 'contain' : 'cover', zoom: 1});
// 다시 만들기 (10-29 김현우) — 고친 프롬프트·아쉬운 점은 제안서 데이터(prompt_log)에 쌓이고, 다음 원고를 쓸 때 판테온 봇이 참고한다
const AI_KINDS = ['ai_concept', 'mockup', 'texture'];
const regenBox = s => { const ai = AI_KINDS.includes(s.kind) && !s.widened;
  return `<details class="regen"><summary>이미지 다시 생성</summary>
  <label>아쉬운 점<input id="rg-why" maxlength="200" placeholder="예: 얼굴이 너무 크게 나옴 · 배경이 너무 밝음"></label>
  ${ai ? `<label>생성 프롬프트 (영문)<textarea id="rg-prompt" rows="5">${esc(s.prompt || '')}</textarea></label>`
       : `<label>좌우 확장 추가 지시(영문 권장)<textarea id="rg-prompt" rows="3" placeholder="예: extend as a dark concert stage with purple haze">${esc(s.widen_extra || '')}</textarea></label>`}
  <button class="button" type="button" id="rg-go">${ai ? '이 프롬프트로 다시 생성' : '이 지시로 다시 확장'}</button><small>견적 확인 후 승인하면 생성합니다. 수정한 내용은 다음 제안서 원고에도 반영됩니다.</small></details>`; };
function imgViewer(el) {
  const src = el.dataset.src, key = el.dataset.key;
  const p = studio.list?.find(x => activeDetail === 'p:' + x.id), d = p?.data || {}, s = key && d.images?.slots?.[key];
  const box = key && d.build?.boxes?.[key], r = (el.dataset.ratio || '').split(':').map(Number);
  const ar = box ? box.w / box.h : (r.length === 2 && r[0] > 0 && r[1] > 0 ? r[0] / r[1] : 0);
  const canEdit = !!(s && ar && p.status === 'waiting');
  let pos = {...defaultPos(s), ...(s?.pos || {})};
  modal(`<h2>${esc(el.dataset.label || '이미지')}</h2><div class="imgv${ar ? '' : ' one'}"><figure><figcaption>원본 전체</figcaption><img src="${esc(src)}" alt="원본 이미지"></figure>${ar ? `<figure><figcaption>제안서 적용 미리보기${box ? '' : ' (예상)'}</figcaption><div class="imgv-crop${canEdit ? ' drag' : ''}" id="imgv-box" style="aspect-ratio:${ar};width:min(100%,calc(64vh * ${ar}));background-image:url('${esc(src)}')"></div>${canEdit ? `${canEdit && (AI_KINDS.includes(s.kind) || s.widened) ? regenBox(s) : ''}<small>이미지를 드래그해 보일 부분을 조정하고, 아래 막대(PC에서는 마우스 휠도)로 확대·축소하세요. 「맞춤」은 이미지를 자르지 않고 전체를 보여 줍니다.</small><div class="imgv-zoom"><span>확대</span><input type="range" id="imgv-zoom" min="100" max="400" step="5" aria-label="확대"><b id="imgv-zoom-v"></b></div><div class="imgv-tools"><div class="seg-pick"><label><input type="radio" name="imgv-fit" value="cover"> 채우기</label><label><input type="radio" name="imgv-fit" value="contain"> 맞춤</label></div><button class="text-btn" type="button" id="imgv-reset">위치 초기화</button></div>` : ''}</figure>` : ''}</div><div class="modal-actions"><a class="button" href="${esc(src)}" target="_blank" rel="noopener">새 창에서 열기</a>${canEdit && s.widen ? '<span class="imgv-wide-on">좌우 확장 대기 · 견적 승인 시 함께 생성합니다</span>' : ''}${canEdit && !s.widen ? '<button class="button" id="imgv-widen" hidden>힉스필드로 확장해 전체 표시</button>' : ''}${canEdit ? '<button class="button" data-cancel>취소</button><button class="button primary" id="imgv-save">위치 저장</button>' : '<button class="button primary" data-cancel>닫기</button>'}</div>`);
  $('#modal').classList.add('wide'); $('#modal').addEventListener('close', () => $('#modal').classList.remove('wide'), {once: true});
  const bx = $('#imgv-box'); if (!bx) return;
  const nat = new Image(); nat.src = src;
  // 꽉 채운 크기 × 확대 — 판테온 봇이 그릴 때와 같은 계산 (위치 %는 남는 부분 중 어디를 보이게 할지)
  const scale = () => Math.max(bx.clientWidth / nat.naturalWidth, bx.clientHeight / nat.naturalHeight) * (pos.zoom || 1);
  const paint = () => {
    const fit = pos.fit === 'contain';
    bx.style.backgroundSize = fit ? 'contain' : nat.naturalWidth ? `${nat.naturalWidth * scale()}px ${nat.naturalHeight * scale()}px` : 'cover';
    bx.style.backgroundPosition = fit ? 'center' : `${pos.x * 100}% ${pos.y * 100}%`; bx.classList.toggle('fit', fit);
    const z = $('#imgv-zoom'); if (z) { z.value = Math.round((pos.zoom || 1) * 100); z.disabled = fit; $('#imgv-zoom-v').textContent = Math.round((pos.zoom || 1) * 100) + '%'; }
  };
  // 가로 상자에 세로로 긴 이미지면 좌우 넓히기 단추를 보인다 (10-29) — 넓힌 이미지를 줄여 넣으면 잘리지 않는다
  const wideBtn = () => { const b = $('#imgv-widen'); if (b && nat.naturalWidth) b.hidden = !shapeOff(nat.naturalWidth, nat.naturalHeight, ar); };
  paint(); wideBtn(); nat.onload = () => { paint(); wideBtn(); };
  if (!canEdit) return;
  const dirty = () => { $('#modal').dataset.dirty = '1'; };
  $$('input[name=imgv-fit]').forEach(i => { i.checked = i.value === pos.fit; i.onchange = () => { pos.fit = i.value; dirty(); paint(); }; });
  $('#imgv-reset').onclick = () => { pos = defaultPos(s); dirty(); $$('input[name=imgv-fit]').forEach(i => i.checked = i.value === pos.fit); paint(); };
  const setZoom = z => { pos.zoom = Math.min(4, Math.max(1, Math.round(z * 100) / 100)); dirty(); paint(); };
  $('#imgv-zoom').oninput = ev => setZoom(ev.target.value / 100);
  bx.onwheel = ev => { if (pos.fit === 'contain') return; ev.preventDefault(); setZoom((pos.zoom || 1) * (ev.deltaY < 0 ? 1.08 : 1 / 1.08)); };
  let drag = null;
  bx.onpointerdown = ev => {
    if (pos.fit === 'contain' || !nat.naturalWidth) return;
    const W = bx.clientWidth, H = bx.clientHeight, sc = scale();
    drag = {x0: ev.clientX, y0: ev.clientY, px: pos.x, py: pos.y, ex: nat.naturalWidth * sc - W, ey: nat.naturalHeight * sc - H};
    bx.setPointerCapture(ev.pointerId); bx.classList.add('moving');
  };
  bx.onpointermove = ev => {
    if (!drag) return;
    const cl = v => Math.min(1, Math.max(0, v));
    if (drag.ex > 1) pos.x = cl(drag.px - (ev.clientX - drag.x0) / drag.ex);
    if (drag.ey > 1) pos.y = cl(drag.py - (ev.clientY - drag.y0) / drag.ey);
    dirty();
    paint();
  };
  bx.onpointerup = bx.onpointercancel = () => { drag = null; bx.classList.remove('moving'); };
  $('#imgv-widen')?.addEventListener('click', async ev => {
    ev.target.disabled = true;
    const fresh = studio.list?.find(x => x.id === p.id)?.data || d;
    const slots = {...fresh.images.slots, [key]: {...fresh.images.slots[key], widen: true, pos: {}, note: '좌우 배경을 확장해 넣습니다(견적 승인 시 함께 생성)'}};
    const { error } = await SB.from('pt_proposal').update({data: {...fresh, images: {...fresh.images, slots}}, status: 'working'}).eq('id', p.id);
    if (error) { ev.target.disabled = false; return toast('저장하지 못했습니다: ' + error.message); }
    await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'generate', input: {estimate_only: true}});
    await proposalEvent(p.id, `${s.slide}페이지 이미지 좌우 확장을 요청했습니다 · 견적을 받습니다`);
    $('#modal').close(); studio.list = null; await loadStudio(); openProposal(p.id, true);
    toast('좌우 확장 견적을 받습니다. 견적이 나오면 승인해 주세요.');
  });
  $('#rg-go')?.addEventListener('click', async ev => {
    const why = $('#rg-why').value.trim(), txt = $('#rg-prompt').value.trim(), ai = AI_KINDS.includes(s.kind) && !s.widened;
    if (ai && !txt) return toast('프롬프트를 입력해 주세요.');
    ev.target.disabled = true;
    const fresh = studio.list?.find(x => x.id === p.id)?.data || d, cur = fresh.images.slots[key];
    const prev = [...(cur.prev_paths || []), cur.path].filter(Boolean);
    const next = ai ? {...cur, status: 'ai', prompt: txt, prev_paths: prev, pos: {}, note: '재생성 대기'}
                    : {...cur, path: cur.orig_path || cur.path, widen: true, widened: false, widen_extra: txt, prev_paths: prev, pos: {}, note: '좌우 확장 재생성 대기'};
    const log = {at: new Date().toISOString(), key, slide: s.slide, kind: s.kind, what: s.what || '', mode: ai ? 'ai' : 'widen',
                 before: ai ? (cur.prompt || '') : (cur.widen_extra || ''), after: txt, why, by: myName || ''};
    const data = {...fresh, images: {...fresh.images, slots: {...fresh.images.slots, [key]: next}}, prompt_log: [...(fresh.prompt_log || []), log]};
    const { error } = await SB.from('pt_proposal').update({data, status: 'working'}).eq('id', p.id);
    if (error) { ev.target.disabled = false; return toast('저장하지 못했습니다: ' + error.message); }
    await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'generate', input: {estimate_only: true}});
    await proposalEvent(p.id, `${s.slide}페이지 이미지 재생성을 요청했습니다${why ? ' · ' + why : ''}`);
    $('#modal').close(); studio.list = null; await loadStudio(); openProposal(p.id, true);
    toast('견적을 받습니다. 견적이 나오면 승인해 주세요.');
  });
  $('#imgv-save').onclick = async () => {
    $('#imgv-save').disabled = true;
    const fresh = studio.list?.find(x => x.id === p.id)?.data || d;
    const v = {x: Math.round(pos.x * 1000) / 1000, y: Math.round(pos.y * 1000) / 1000, fit: pos.fit, zoom: pos.zoom || 1};
    const slots = {...fresh.images.slots, [key]: {...fresh.images.slots[key], pos: v}};
    const { error } = await SB.from('pt_proposal').update({data: {...fresh, images: {...fresh.images, slots}}}).eq('id', p.id);
    if (error) { $('#imgv-save').disabled = false; return toast('저장하지 못했습니다: ' + error.message); }
    await proposalEvent(p.id, `${s.slide}페이지 이미지 위치를 맞췄습니다`);
    $('#modal').close(); studio.list = null; await loadStudio(); openProposal(p.id, true);
    toast('위치를 저장했습니다. 「변경 사항 반영」을 클릭하면 제안서에 반영됩니다.');
  };
}
document.addEventListener('click', ev => { const el = ev.target.closest('#drawer .ithumb.zoom'); if (el) imgViewer(el); });
document.addEventListener('keydown', ev => { const el = ev.target.closest?.('#drawer .ithumb.zoom'); if (el && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); imgViewer(el); } });

// ── 페이지별 검토 · 자동 검수 표시 (10-29 김현우) — 실제 그려진 페이지(PDF)를 한 페이지씩 보며 그 페이지 이미지 자리를 바로 고친다
const QA_KO = {wrong: '다른 대상', brand_text: '타사 글자·로고 노출', cropped: '잘림', empty: '비어 있음', quality: '품질', mismatch: '페이지 내용과 불일치', duplicate: '같은 이미지 반복'};
let PDFJS = null;
const PATCH_DOCS = {};         // 확정해 갈아 끼운 페이지 PDF (한 장짜리)
async function loadPdfjs() {
  if (PDFJS) return PDFJS;
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  PDFJS = window['pdfjs-dist/build/pdf'];
  PDFJS.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return PDFJS;
}
async function replaceSlotImage(p, key, f) {
  if (f.size > 15e6) return toast('15MB 이하 이미지를 선택해 주세요.');
  const d = studio.list?.find(x => x.id === p.id)?.data || p.data;
  const ext = (f.name.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg');
  const path = `proposals/${p.id}/img/${key}-u${Date.now()}.${ext}`;
  const up = await SB.storage.from('pt-studio').upload(path, f, {contentType: f.type || 'image/jpeg', upsert: false});
  if (up.error) return toast('업로드하지 못했습니다: ' + up.error.message);
  const slots = {...d.images.slots, [key]: {...d.images.slots[key], status: 'uploaded', path, source_page: '', image_url: '', pos: {}}};
  const { error } = await SB.from('pt_proposal').update({data: {...d, images: {...d.images, slots}}}).eq('id', p.id);
  if (error) return toast('저장하지 못했습니다: ' + error.message);
  await proposalEvent(p.id, `이미지 ${key} 을(를) 직접 올린 이미지로 바꿨습니다`);
  const was = d.images.slots[key];
  studio.list = null; await loadStudio(); toast('이미지를 교체했습니다. 「변경 사항 반영」을 누르면 제안서에 들어갑니다.', {fn: async () => {
    const { data: r2 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single(); const d2 = r2.data;
    await SB.from('pt_proposal').update({data: {...d2, images: {...d2.images, slots: {...d2.images.slots, [key]: was}}}}).eq('id', p.id);
    await proposalEvent(p.id, `이미지 ${key} 교체를 되돌렸습니다`); studio.list = null; await loadStudio(); toast('원래 이미지로 되돌렸습니다.'); window.dispatchEvent(new Event('pt-refresh')); }});
  return true;
}
const qaBlock = p => { const d = p.data || {}, qa = qaOf(d), busy = studio.jobs.some(j => j.proposal_id === p.id && j.kind === 'qa' && ['wait', 'work'].includes(j.status));
  if (!qa) return busy ? `<div class="qa-line"><b>자동 검수 중</b>${jobsProg(studio.jobs.filter(j => j.proposal_id === p.id && j.kind === 'qa' && ['wait', 'work'].includes(j.status)))}</div>` : '';
  if (qa.error) return `<p class="qa-line">${esc(qa.error)}</p>`;
  if (!qa.flags.length) return '<p class="qa-line good">자동 검수 · 특이 사항 없음</p>';
  return `<div class="qa-box"><b>자동 검수 · 확인할 곳 ${qa.flags.length}곳</b><small>클릭하면 해당 페이지로 이동해 바로 수정할 수 있습니다</small>${qa.flags.map(f => `<button class="qa-flag" data-review="${f.slide}"><span>${f.slide}페이지</span><b>${esc(QA_KO[f.type] || '확인')}</b> ${esc(f.detail)}</button>`).join('')}</div>`; };
// 검수 표시 중 사람이 「이대로 사용」한 이미지는 뺀다 — 같은 이미지(path)인 동안은 다음 검수에서 다시 걸려도 숨김 (10-30 · 대표님 설계 「그대로 사용」)
const qaOf = d => { if (!(d.qa && d.build && d.qa.version === d.build.version)) return null; const ok = d.qa_ok || {}, S = d.images?.slots || {};
  return {...d.qa, flags: (d.qa.flags || []).filter(f => !(f.key && ok[f.key] && ok[f.key] === S[f.key]?.path) && !(f.key && f.path && S[f.key]?.path && f.path !== S[f.key].path))}; };
// 페이지별 검토에서 바로 만들어 넣기 (10-29 김현우) — 단추에 금액을 보이고 누르면 그 자리 하나만 승인해 힉스필드로 만든다
const needPx = (d, k) => { const b = d.build?.boxes?.[k]; return b ? Math.round(b.w / 914400 * 150) : 0; };
const lowRes = (w, h, need, ar) => need && w && h && (ar && w / h > ar ? h * ar : w) < need * 0.6;
async function asideHires(p, key) {
  const d = studio.list?.find(x => x.id === p.id)?.data || p.data, s = d.images.slots[key];
  const im = (d.build?.deck?.slides || []).flatMap(x => x.images || []).find(x => x.key === key) || {};
  await SB.from('pt_proposal').update({status: 'working'}).eq('id', p.id);
  await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'aside', input: {slots: [{key, kind: s.kind, what: s.what || '', ratio: s.ratio || '', search: im.search || '',
    min_px: needPx(d, key), have_px: s.w || 0}], ips: [p.ip_a_name, p.ip_b_name].filter(Boolean)}});
  await proposalEvent(p.id, `${s.slide}페이지 「${s.what || key}」 고해상도 원본을 Aside 로 다시 찾도록 요청했습니다`);
  studio.list = null; await loadStudio(); toast('Aside에 요청했습니다. 찾지 못하면 힉스필드로 보정할 수 있습니다.');
}
// Aside로 다른 이미지 찾기 (10-30 김현우) — 공식 이미지·로고·참고 사례·캡처를 지금 것과 다른 실제 이미지로
async function asideOther(p, key) {
  const d = studio.list?.find(x => x.id === p.id)?.data || p.data, s = d.images.slots[key];
  const im = (d.build?.deck?.slides || []).flatMap(x => x.images || []).find(x => x.key === key) || {};
  const avoid = [s.source_page, s.image_url].filter(Boolean);
  await SB.from('pt_proposal').update({status: 'working'}).eq('id', p.id);
  const { data: nj } = await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'aside', input: {slots: [{key, kind: s.kind, what: s.what || '', ratio: s.ratio || '', search: im.search || '', avoid}], ips: [p.ip_a_name, p.ip_b_name].filter(Boolean)}}).select('id,proposal_id,ref_id,kind,status,at,error,result,input').single();
  if (nj) studio.jobs = [...studio.jobs, nj];
  await proposalEvent(p.id, `${s.slide}페이지 「${whatText(s.what) || key}」 다른 이미지를 Aside에 요청했습니다`);
  studio.list = null; await loadStudio(); toast('Aside에 요청했습니다. 찾으면 제안서에 자동 반영됩니다.');
}
const shapeOff = (w, h, ar) => ar && w && h && (w / h < ar / 1.3 || w / h > ar * 1.3);
// 메인 이미지 참고 (10-30) — 같은 페이지에 「메인」 이미지가 있거나 제품 페이지의 첫 이미지면, 나머지 컷은 그 이미지를 붙여 같은 인형·캐릭터로 만든다 (봇 hf.ref_of 와 같은 규칙)
const refOf = (d, key) => { const S = d.images?.slots || {};
  for (const sl of d.build?.deck?.slides || []) { const ims = (sl.images || []).filter(i => i.key); if (ims.length < 2 || !ims.some(i => i.key === key)) continue;
    const main = ims.find(i => (i.what || '').includes('메인')) || (sl.layout === 'product' ? ims[0] : null);
    if (main && main.key !== key && S[main.key]?.path) return main.key; }
  return ''; };
// 붙여 만드는 공식 로고·아티스트 사진 (10-30 굿즈 목업에 IP 로고) — 봇 hf.ref_paths 와 같은 규칙
const logoRefs = (d, key) => { const S = d.images?.slots || {}, s = S[key] || {};
  const r = (s.refs || []).filter(k => S[k]?.path).map(k => S[k].what || k);
  if (r.length || s.kind !== 'mockup' || refOf(d, key)) return r;
  const L = Object.values(S).filter(v => v.kind === 'logo' && v.path && !v.ref_only && !/ALMIGHTY|올마이티|[·×,&+/]|나란히|함께|와 |과 |및 /i.test(v.what || ''));
  const P = studio.list?.find(x => x.data === d) || {};
  return [...new Set([P.ip_a_name, P.ip_b_name].filter(Boolean).map(n => L.filter(v => (v.what || '').replace(/ /g, '').includes(n.replace(/ /g, ''))).sort((a, b) => (a.what || '').length - (b.what || '').length)[0]?.what).filter(Boolean))]; };
async function quickMake(p, key, mode, prompt, why) {
  const fresh = studio.list?.find(x => x.id === p.id)?.data || p.data, cur = fresh.images.slots[key];
  const ref = mode === 'ai' && (refOf(fresh, key) || logoRefs(fresh, key).length), usd = mode === 'ai' && !ref ? 0.02 : 0.1;
  const cost = mode === 'ai' && !ref ? '$0.01' : '$0.08';
  const what = mode === 'upscale' ? '이미지를 고해상도로 보정합니다. 사람 얼굴이 아주 조금 달라질 수 있습니다.'
             : mode === 'widen' ? '이미지 바깥을 확장해 잘리지 않고 전체가 보이게 합니다.'
             : mode === 'fit' ? '인물 얼굴과 핵심이 모두 보이게 상자 비율로 다시 잡고, 모자라는 부분은 힉스필드로 자연스럽게 채웁니다. 잘라서 맞으면 비용이 들지 않습니다.'
             : ref ? `메인 이미지(${esc(fresh.images.slots[ref]?.slide)}페이지 「${esc(whatText(fresh.images.slots[ref]?.what).slice(0, 20))}」)를 참고해 같은 모델로 만듭니다.` : 'AI 이미지를 새로 만듭니다.';
  if (!(await confirmBox({title: `${cur.slide}페이지 이미지를 새로 만들까요?`,
      body: `${what}<br>새 이미지는 바로 들어가지 않고 미리보기로 먼저 보여 드립니다. 마음에 들 때만 확정하세요.<br><b>비용 약 ${cost}</b>가 회사 힉스필드 잔액에서 나갑니다.`,
      ok: `${mode === 'upscale' ? '고해상도 보정' : mode === 'widen' ? '확장' : mode === 'fit' ? '상자에 맞춘 이미지 만들기' : '새로 만들기'} · 약 ${cost}`}))) return false;
  const prev = [...(cur.prev_paths || []), cur.path].filter(Boolean);
  const { before: _b, cand: _c, ...was } = cur;          // 새 이미지는 바로 넣지 않고 미리보기 → 사람이 확정 (10-30)
  const next0 = mode === 'upscale' ? {...cur, upscale: true, prev_paths: prev, note: '해상도 보정 중'}
              : mode === 'fit' ? {...cur, path: cur.orig_path || cur.path, widen: true, fit: true, widened: false, prev_paths: prev, pos: {}, note: '상자에 맞춘 이미지 만드는 중'}
              : mode === 'widen' ? {...cur, path: cur.orig_path || cur.path, widen: true, widened: false, widen_extra: prompt || cur.widen_extra || '', prev_paths: prev, pos: {}, note: '확장 중'}
                                : {...cur, status: 'ai', prompt, prev_paths: prev, pos: {}, note: 'AI 이미지 생성 중'};
  const next = {...next0, before: was, cand: undefined};
  const log = mode === 'upscale' || mode === 'fit' || (mode === 'widen' && !prompt && !why) || (mode === 'ai' && prompt === (cur.prompt || '') && !why) ? [] :
    [{at: new Date().toISOString(), key, slide: cur.slide, kind: cur.kind, what: cur.what || '', mode, before: mode === 'widen' ? (cur.widen_extra || '') : (cur.prompt || ''), after: prompt, why, by: myName || ''}];
  const data = {...fresh, images: {...fresh.images, slots: {...fresh.images.slots, [key]: next}}, prompt_log: [...(fresh.prompt_log || []), ...log]};
  const { error } = await SB.from('pt_proposal').update({data, status: 'working'}).eq('id', p.id);
  if (error) { toast('저장하지 못했습니다: ' + error.message); return false; }
  await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'generate', input: {approved_usd: usd, keys: [key], preview: true}});
  await proposalEvent(p.id, `${cur.slide}페이지 ${mode === 'upscale' ? '고해상도 보정' : mode === 'widen' ? '이미지 확장' : mode === 'fit' ? '상자에 맞춘 이미지 생성' : (ref ? 'AI 이미지 생성(메인 이미지 참고)' : 'AI 이미지 생성')}를 승인했습니다 (예상 $${mode === 'ai' && !ref ? '0.01' : '0.08'})${why ? ' · ' + why : ''}`);
  studio.list = null; await loadStudio();
  toast('생성을 시작했습니다. 끝나면 「이 이미지로 미리보기」로 제안서에 들어간 모습을 보고 확정해 주세요.');
  return true;
}
// 새 이미지 미리보기·확정·취소 (10-30 김현우) — 봇이 그 페이지 하나만 새 이미지로 그려 둔 PDF(cand.preview)를 보여 준다
async function candApply(p, key, ok) {
  const { data: row, error: e0 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single();
  if (e0) return toast('불러오지 못했습니다: ' + e0.message);
  const d = row.data, cur = d.images.slots[key]; if (!cur?.cand) return;
  const { cand, before, ...base } = cur;
  const slot = ok ? {...base, ...cand, preview: undefined, prev_paths: [...(base.prev_paths || []), base.path].filter(Boolean), pos: cand.pos || {}, note: ''} : base;
  delete slot.preview;
  // 확정하면 그 페이지만 미리보기로 그려 둔 것으로 갈아 끼우고 그 페이지만 검수 — 전체는 PDF·PPTX 를 받거나 완료할 때 한 번 (10-30 김현우 「그 부분만 다시 그리면 되잖아」)
  const at = d.build?.boxes?.[key]?.at || [], page = +(d.build?.boxes?.[key]?.page || cur.slide), one = ok && cand.preview && at.length <= 1;
  const build = one ? {...d.build, patches: {...(d.build.patches || {}), [page]: cand.preview}} : d.build;
  // 확정하면 옛 이미지에 대한 검수 지적은 지운다 — 새 이미지는 그 페이지 검수가 다시 본다 (10-30 김현우 「확정 후 오류 메시지 남아 있으니 된 건지 모르겠다」)
  const qa = ok && d.qa ? {...d.qa, flags: (d.qa.flags || []).filter(f => f.key !== key)} : d.qa;
  const { error } = await SB.from('pt_proposal').update({data: {...d, build, qa, images: {...d.images, slots: {...d.images.slots, [key]: slot}}}, ...(ok && !one ? {status: 'working'} : {})}).eq('id', p.id);
  if (error) return toast('저장하지 못했습니다: ' + error.message);
  if (one) await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'qa', input: {pdf: cand.preview, version: d.build.version, page}});
  else if (ok) await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'finalize', input: {keys: [key]}});      // 여러 페이지에 쓴 이미지 — 그 페이지들만
  await proposalEvent(p.id, `${page}페이지 새 이미지를 ${ok ? (one ? '확정했습니다 → 그 페이지만 반영' : '확정했습니다 → 이 이미지가 든 페이지들만 다시 그립니다') : '취소했습니다 (원래 이미지 유지)'}`);
  studio.list = null; await loadStudio();
  // 되돌리기 — 확정은 원래 이미지·페이지·검수 결과로, 버리기는 새 이미지를 다시 후보로 (한 페이지 확정·버리기만)
  const undo = (one || !ok) ? {fn: async () => {
    const { data: r2 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single(); const d2 = r2.data;
    const pt = {...(d2.build.patches || {})}; if (one) { if (d.build.patches?.[page]) pt[page] = d.build.patches[page]; else delete pt[page]; }
    await SB.from('pt_proposal').update({data: {...d2, build: {...d2.build, patches: pt}, qa: d.qa, images: {...d2.images, slots: {...d2.images.slots, [key]: cur}}}}).eq('id', p.id);
    await proposalEvent(p.id, `${page}페이지 새 이미지 ${ok ? '확정' : '버리기'}를 되돌렸습니다`);
    studio.list = null; await loadStudio(); toast('되돌렸습니다.'); window.dispatchEvent(new Event('pt-refresh'));
  }} : null;
  toast(ok ? (one ? `확정했습니다. ${page}페이지만 바꿨고, 그 페이지만 다시 검수합니다.` : '확정했습니다. 이 이미지가 든 페이지들만 다시 그립니다.') : '새 이미지를 버렸습니다. 원래 이미지를 그대로 씁니다.', undo);
}
async function candPreview(p, key, after) {
  const d = studio.list?.find(x => x.id === p.id)?.data || p.data, s = d.images.slots[key], c = s?.cand; if (!c) return;
  modal(`<h2>${esc(s.slide)}페이지 미리보기 · 새 이미지</h2><div class="pv-box" id="pv-box"><p class="rv-load"><i class="spin" aria-hidden="true"></i><span>미리보기를 불러오는 중입니다</span></p></div>
    <div class="modal-actions"><button class="button" id="pv-again">다시 만들기</button><button class="button" id="pv-no">새 이미지 버리기</button><button class="button primary" id="pv-ok">이 이미지로 확정</button></div>`);
  $('#modal').classList.add('wide'); $('#modal').addEventListener('close', () => $('#modal').classList.remove('wide'), {once: true});
  const done = async ok => { $('#pv-ok').disabled = $('#pv-no').disabled = true; await candApply(p, key, ok); $('#modal').close(); after?.(); };
  $('#pv-ok').onclick = () => done(true); $('#pv-no').onclick = () => done(false);
  $('#pv-again').onclick = () => { $('#modal').close(); const t = $(`#rv-side [data-mk-prompt="${CSS.escape(key)}"]`); t?.scrollIntoView({block: 'center'}); t?.focus(); };
  try {
    if (c.preview) {
      const { data: su } = await SB.storage.from('pt-studio').createSignedUrl(c.preview, 900);
      const pg = await (await (await loadPdfjs()).getDocument(su.signedUrl).promise).getPage(1);
      const box = $('#pv-box'), cv = document.createElement('canvas'), w = box.clientWidth;
      const vp = pg.getViewport({scale: w / pg.getViewport({scale: 1}).width * (window.devicePixelRatio || 1)});
      cv.width = vp.width; cv.height = vp.height; cv.style.width = '100%';
      await pg.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise; box.innerHTML = ''; box.appendChild(cv);
    } else {
      const { data: su } = await SB.storage.from('pt-studio').createSignedUrl(c.path, 900);
      $('#pv-box').innerHTML = `<img src="${esc(su.signedUrl)}" alt="새 이미지" style="width:100%"><small>페이지 미리보기를 만들지 못해 새 이미지만 보여 드립니다.</small>`;
    }
  } catch (e) { $('#pv-box').innerHTML = `<p>미리보기를 불러오지 못했습니다: ${esc(e?.message || '')}</p>`; }
}
window.addEventListener('pt-refresh', () => { if ($('#review')?.open) window.ptRefresh?.(); else if (String(activeDetail || '').startsWith('p:')) openProposal(activeDetail.slice(2), true); });
async function pageReview(pid, start) {
  let p = studio.list?.find(x => x.id === pid); if (!p?.data?.build?.pdf) return toast('생성된 제안서가 없습니다.');
  let dlg = $('#review');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'review'; dlg.className = 'review'; document.body.appendChild(dlg); }
  const b = p.data.build;
  dlg.innerHTML = `<div class="rv-head"><div><h2>${p.status === 'waiting' ? '이미지 확인·수정' : '페이지별 보기'} · v${b.version}</h2><small id="rv-qa"></small></div><div class="rv-nav"><button class="button" id="rv-prev">◀ 이전 페이지</button><b id="rv-n"></b><button class="button" id="rv-next">다음 페이지 ▶</button><button class="button" id="rv-close">닫기</button></div></div>
  <div class="rv-live" id="rv-live" hidden></div><div class="rv-strip" id="rv-strip"></div><div class="rv-body"><div class="rv-page"><div class="rv-canvas-wrap"><canvas id="rv-canvas"></canvas><div class="rv-hot" id="rv-hot"></div></div><div class="rv-tools" id="rv-tools"></div><p id="rv-load" class="rv-load"><i class="spin" aria-hidden="true"></i><span>제안서를 불러오는 중입니다 <b id="rv-load-pct">0%</b></span></p></div><div class="rv-side" id="rv-side"></div></div>`;
  if (!dlg.open) {           // 새 버전으로 다시 열 때는 이미 떠 있다
    dlg.showModal();
    dlg.addEventListener('close', () => { if (activeDetail === 'p:' + pid) openProposal(pid, true); }, {once: true});
  }
  dlg.dataset.dirty = '';
  dlg.oninput = ev => { if (ev.target.matches('[data-mk-prompt], [data-mk-why]')) dlg.dataset.dirty = '1'; };
  const closeRv = async () => { if (!dlg.dataset.dirty || await askLeave()) { dlg.dataset.dirty = ''; dlg.close(); } };
  $('#rv-close').onclick = closeRv;
  dlg.oncancel = ev => { if ($('#modal').open || $('#ask')?.open) return; if (dlg.dataset.dirty) { ev.preventDefault(); closeRv(); } };
  let doc, cur = 1;
  try {
    const { data: su } = await SB.storage.from('pt-studio').createSignedUrl(b.pdf, 1800);
    const task = (await loadPdfjs()).getDocument(su.signedUrl);
    task.onProgress = ev => { const el = $('#rv-load-pct'); if (el && ev.total) el.textContent = Math.min(100, Math.round(ev.loaded / ev.total * 100)) + '%'; };
    doc = await task.promise;
  } catch (e) { $('#rv-load').textContent = '제안서를 불러오지 못했습니다: ' + (e?.message || ''); return; }
  const N = doc.numPages;
  // 작업 중이면 3초마다 진행률을 다시 읽고, 끝나면(상태가 바뀌면) 새 버전으로 다시 연다 (10-30 김현우 「기다리는 곳은 무조건 동적으로」)
  let seen = '';
  const tick = async () => {
    if (!dlg.open) return;
    const [{ data: row }, { data: js }] = await Promise.all([SB.from('pt_proposal').select('status,data').eq('id', pid).single(),
      SB.from('pt_proposal_job').select('id,proposal_id,ref_id,kind,status,at,error,result,input').eq('proposal_id', pid).order('id', {ascending: false}).limit(6)]);
    if (!dlg.open || !row) return;
    studio.jobs = [...studio.jobs.filter(x => !(js || []).some(g => g.id === x.id)), ...(js || [])];
    const live = (js || []).filter(x => ['wait', 'work'].includes(x.status)).sort((a, b) => a.id - b.id);
    const box = $('#rv-live'); if (box) { box.hidden = !live.length; if (live.length) box.innerHTML = `<b>진행 중</b>${jobsProg(live)}`; }
    $$('#rv-side .rv-busy').forEach(el => { el.innerHTML = jobsProg(live.length ? live : [null]); });
    // 비교는 이 창이 연 버전·상태와 — 뒤의 상세 화면이 먼저 목록을 새로 읽어도 놓치지 않게
    if (row.data?.build?.version !== b.version) { studio.list = null; await loadStudio(); toast(`새 버전 v${row.data.build.version}이 생성되었습니다.`); return pageReview(pid, cur); }
    const snap = row.status + JSON.stringify(row.data?.images?.slots || {}) + JSON.stringify(row.data?.qa || {}) + JSON.stringify(row.data?.qa_ok || {}) + JSON.stringify(row.data?.build?.patches || {});
    if (seen && snap !== seen && !dlg.dataset.dirty) { studio.list = null; await loadStudio(); show(cur); }      // 프롬프트를 고치는 중이면 새로 고침을 미룬다
    if (!dlg.dataset.dirty) seen = snap;
    setTimeout(tick, 3000);
  };
  setTimeout(tick, 1500);
  const show = async n => {
    p = studio.list?.find(x => x.id === pid) || p;
    const d = p.data || {}, S = liveSlots(d), qa = qaOf(d), flags = qa?.flags || [];
    cur = Math.min(Math.max(1, n), N);
    $('#rv-n').textContent = `${cur} / ${N}페이지`; $('#rv-prev').disabled = cur <= 1; $('#rv-next').disabled = cur >= N;
    // 이미지가 몇 페이지 어디에 그려졌는지 — 렌더러가 남긴 위치(boxes)가 있으면 그것, 없으면 원고의 페이지 번호 (10-30)
    const B = d.build?.boxes || {}, pageOf = k => +(B[k]?.page || S[k].slide);
    const spots = k => B[k]?.at || (B[k]?.x !== undefined ? [B[k]] : []), onPage = (k, n) => spots(k).length ? spots(k).some(a => +a.page === n) : pageOf(k) === n;   // 한 이미지를 여러 페이지에 쓰면 그 페이지마다
    const fs = new Set(flags.map(f => +f.slide)), miss = new Set(Object.keys(S).filter(k => ['missing', 'ai'].includes(S[k].status)).flatMap(k => spots(k).length ? spots(k).map(a => +a.page) : [pageOf(k)]));
    $('#rv-qa').textContent = qa ? (flags.length ? `자동 검수 · 확인할 곳 ${flags.length}곳 (빨간 페이지)` : '자동 검수 · 특이 사항 없음') : '자동 검수 전입니다';
    $('#rv-strip').innerHTML = Array.from({length: N}, (_, i) => i + 1).map(n => `<button type="button" class="${n === cur ? 'on ' : ''}${fs.has(n) ? 'flag' : miss.has(n) ? 'miss' : ''}" data-go="${n}" aria-label="${n}페이지">${n}</button>`).join('');
    $$('#rv-strip [data-go]').forEach(x => x.onclick = () => nav(+x.dataset.go));
    $('#rv-strip .on')?.scrollIntoView({block: 'nearest', inline: 'center'});
    // 페이지 그림은 기다리지 않고 그린다 — 그림이 늦어도 오른쪽 이미지 자리는 바로 보이게
    if ($('#rv-load')) { $('#rv-load').hidden = false; $('#rv-load span').textContent = `${cur}페이지를 그리는 중입니다`; }
    const patch = d.build?.patches?.[cur], ppath = typeof patch === 'string' ? patch : patch?.pdf, pn = typeof patch === 'object' && patch ? patch.n || 1 : 1;
    const pageDoc = ppath ? (PATCH_DOCS[ppath] ||= SB.storage.from('pt-studio').createSignedUrl(ppath, 1800).then(r => PDFJS.getDocument(r.data.signedUrl).promise)).then(x => x.getPage(pn)) : doc.getPage(cur);
    pageDoc.then(pg => { const c = $('#rv-canvas'); if (!c) return; const w = c.parentElement.clientWidth - 2;
      const vp = pg.getViewport({scale: w / pg.getViewport({scale: 1}).width * (window.devicePixelRatio || 1)});
      if (c._task) c._task.cancel();      // 앞 페이지를 그리는 중이면 멈춤 — 같이 그리면 페이지가 뒤집혀 섞였다 (10-30)
      c.width = vp.width; c.height = vp.height; c._task = pg.render({canvasContext: c.getContext('2d'), viewport: vp}); return c._task.promise; })
      .then(() => { if ($('#rv-load')) $('#rv-load').hidden = true; }).catch(() => {});
    const fl = flags.filter(f => +f.slide === cur), keys = Object.keys(S).filter(k => onPage(k, cur)).sort();
    const EW = 12192000, EH = 6858000;            // 960×540pt 페이지 (EMU)
    // 페이지 전체를 덮는 배경 이미지는 맨 아래에 깔아, 그 위 사진들을 먼저 누를 수 있게 (10-30)
    const big = b => b.w * b.h / (EW * EH) > 0.8;
    $('#rv-sizebar')?.remove(); $('#rv-txtbar')?.remove(); $('.rv-tlayer')?.remove();
    // 글자 위치 옮기기 (10-30 김현우 「텍스트도 선택해서 드래그로 위치 옮길 수 있게」) — 렌더러가 남긴 글상자 위치(boxes 「t:…」)
    const tOn = id => (B[id]?.at || [B[id]]).some(a => +a?.page === cur);
    const tids = Object.keys(B).filter(id => id.startsWith('t:') && tOn(id));
    $('#rv-tools').innerHTML = tids.length ? '<button class="button small" id="rv-txt">글자 위치 옮기기</button>' : '';
    if ($('#rv-txt')) $('#rv-txt').onclick = () => textMode(tids);
    $('#rv-hot').innerHTML = keys.flatMap(k => spots(k).filter(a => +a.page === cur && a.w).map(b => [k, b])).sort((x, y) => big(y[1]) - big(x[1])).map(([k, b]) => { const bad = fl.some(f => f.key === k);
      return `<button type="button" class="${bad ? 'flag' : ''}${S[k].path ? '' : ' empty'}${big(b) ? ' bg' : ''}" data-hot="${esc(k)}" style="left:${b.x / EW * 100}%;top:${b.y / EH * 100}%;width:${b.w / EW * 100}%;height:${b.h / EH * 100}%" aria-label="${esc(KIND_KO_IMG[S[k].kind] || '')} ${esc(whatText(S[k].what))}"><span>${esc(KIND_KO_IMG[S[k].kind] || '')}</span></button>`; }).join('');
    const okd = k => !!S[k]?.path && (d.qa_ok || {})[k] === S[k].path;          // 사람이 확정한 이미지 (검수 목록에서 빠짐)
    const card = k => { const s = S[k], [cls, label] = SLOT_ST[s.status] || ['', s.status], bad = fl.filter(f => f.key === k);
      return `<div class="rv-slot${bad.length ? ' flag' : ''}"><div class="ithumb" data-thumb="${esc(s.path || '')}" data-rk="${esc(k)}">${s.path ? '' : `<span>${esc(KIND_KO_IMG[s.kind] || s.kind)}</span>`}</div><div class="rv-info"><div class="ihead"><b>${esc(KIND_KO_IMG[s.kind] || s.kind)}</b><span class="pill ${cls}">${label}</span></div><small>${esc(whatText(s.what))}</small>${(s.cand ? [] : bad).map(f => `<small class="warn">${esc(QA_KO[f.type] || '확인')} · ${esc(f.detail)}</small>${[...new Set([...String(f.detail).matchAll(/(\d{1,2})\s*페이지/g)].map(m => +m[1]).filter(n => n !== cur && n >= 1 && n <= N))].map(n => `<button class="text-btn go" data-go-page="${n}">${n}페이지 보기 ▶</button>`).join('')}`).join('')}${s.cand ? `<div class="rv-cand"><div class="ithumb" data-cand-thumb="${esc(s.cand.path)}"></div><div><b>새 이미지</b><small>아직 제안서에 반영되지 않았습니다</small><div class="ibtns"><button class="button small" data-cand-view="${esc(k)}">이 이미지로 미리보기</button><button class="button primary small" data-cand-ok="${esc(k)}">이 이미지로 확정</button><button class="text-btn" data-cand-no="${esc(k)}">새 이미지 버리기</button></div></div></div>` : ''}<div class="ibtns">${s.path && okd(k) ? `<span class="pill good">확정</span><button class="text-btn" data-rv-unok="${esc(k)}">확정 취소</button>` : bad.length && s.path && !s.cand ? `<button class="text-btn ok" data-rv-ok="${esc(k)}">이 이미지로 확정</button>` : ''}${s.path ? `<button class="text-btn" data-rv-open="${esc(k)}">크게 보기·수정</button>` : ''}<button class="text-btn" data-rv-arch="${esc(k)}">아카이브에서 선택</button><label class="text-btn up">내 이미지로 교체<input type="file" accept="image/png,image/jpeg,image/webp" data-rv-up="${esc(k)}" hidden></label></div>${makeBox(k, s)}</div></div>`; };
    const canAi = s => AI_KINDS.includes(s.kind) || (!s.path && !['official', 'logo', 'capture'].includes(s.kind));
    function makeBox(k, s) {
      if (p.status === 'working' && (s.widen || s.upscale || s.status === 'ai')) { const live = liveJobs(p.id); return `<div class="rv-busy">${jobsProg(live.length ? live : [null])}</div>`; }
      // 이 이미지를 Aside 가 찾는 중이면 단추 대신 진행 표시 — 두 번 눌러 같은 요청이 두 번 가는 것 막기 (10-30)
      const hunt = liveJobs(p.id).find(j => j.kind === 'aside' && (j.input?.slots || []).some(x => x.key === k));
      if (hunt) return `<div class="rv-busy">${jobsProg([hunt])}</div>`;
      const ai = canAi(s) && !s.widened;
      // 자동 검수가 고친 프롬프트·고칠 점이 있으면 미리 채운다 (10-30 김현우 「개선할 점에 자동으로 개선 프롬프트」)
      const fx = fl.find(f => f.key === k && f.prompt_fix);
      return `<div class="rv-make">${ai ? `${fx ? '<small class="rv-fix">자동 검수가 고친 프롬프트입니다. 확인 후 다시 생성하세요.</small>' : ''}<textarea data-mk-prompt="${esc(k)}" rows="${fx ? 5 : 3}" placeholder="생성 프롬프트(영문) — 피사체·장면·분위기">${esc(fx ? fx.prompt_fix : s.prompt || '')}</textarea>
        <input data-mk-why="${esc(k)}" maxlength="200" placeholder="개선할 점(재생성 시 반영)" value="${esc(fx ? (fx.why || fx.detail) : '')}">${refOf(d, k) ? `<small class="rv-fix">메인 이미지(「${esc(whatText(S[refOf(d, k)]?.what).slice(0, 20))}」)를 참고해 같은 모델로 만듭니다</small>` : ''}${logoRefs(d, k).length ? `<small class="rv-fix">공식 자료를 붙여 만듭니다: ${esc(logoRefs(d, k).join(' · '))}</small>` : ''}<button class="button primary small" data-mk-ai="${esc(k)}">${s.status === 'generated' ? 'AI로 다시 생성' : 'AI로 생성'} · 약 $${refOf(d, k) || logoRefs(d, k).length ? '0.08' : '0.01'}</button>` : ''}
        ${s.path && !['logo', 'texture'].includes(s.kind) ? `<button class="button small" data-mk-fit="${esc(k)}">힉스필드로 상자에 맞춘 이미지 만들기 · 약 $0.08</button>` : ''}
        ${spots(k).length === 1 && +spots(k)[0].page === cur && !(spots(k)[0].w * spots(k)[0].h / (12192000 * 6858000) > 0.8) ? `<button class="button small" data-rv-size="${esc(k)}">상자 크기 조절</button>` : ''}
        ${['official', 'logo', 'reference', 'capture'].includes(s.kind) ? `<button class="button small" data-mk-other="${esc(k)}">Aside로 다른 이미지 찾기</button>` : ''}
        ${s.path && !AI_KINDS.includes(s.kind) ? `<div class="rv-lowres" data-lr="${esc(k)}" hidden><small class="warn"></small><button class="button small" data-mk-hires="${esc(k)}">Aside로 고해상도 검색</button><button class="button small" data-mk-up="${esc(k)}">힉스필드로 고해상도 보정 · 약 $0.08</button></div>` : ''}</div>`;
    }
    function textMode(tids) {
      if ($('.rv-tlayer')) return;
      const wrap = $('.rv-canvas-wrap'), EW = 12192000, EH = 6858000, tp = d.build?.deck?.text_pos || {};
      $('#rv-hot').style.pointerEvents = 'none'; dlg.dataset.dirty = '1'; $('#rv-txt').disabled = true;
      wrap.insertAdjacentHTML('beforeend', `<div class="rv-tlayer">${tids.map(id => { const a = (B[id].at || [B[id]]).find(z => +z.page === cur);
        return `<div class="tbox${tp[id] ? ' moved' : ''}" data-t="${esc(id)}" title="${esc(B[id].t || '')}" style="left:${a.x / EW * 100}%;top:${a.y / EH * 100}%;width:${a.w / EW * 100}%;height:${a.h / EH * 100}%"></div>`; }).join('')}</div>`);
      const moved = {};
      $$('.rv-tlayer .tbox').forEach(t => {
        t.ontouchstart = ev => ev.stopPropagation();
        t.onpointerdown = ev => { ev.preventDefault(); ev.stopPropagation(); t.setPointerCapture(ev.pointerId);
          $$('.rv-tlayer .tbox.sel').forEach(o => o.classList.remove('sel')); t.classList.add('sel');
          const W = wrap.clientWidth, H = wrap.clientHeight, sx = ev.clientX, sy = ev.clientY, l = parseFloat(t.style.left), tt = parseFloat(t.style.top), w = parseFloat(t.style.width), h = parseFloat(t.style.height);
          t.onpointermove = e => { const L = Math.min(100 - w, Math.max(0, l + (e.clientX - sx) / W * 100)), T = Math.min(100 - h, Math.max(0, tt + (e.clientY - sy) / H * 100));
            t.style.left = L + '%'; t.style.top = T + '%'; if (Math.abs(L - l) + Math.abs(T - tt) > 0.2) { t.classList.add('moved'); moved[t.dataset.t] = [L, T]; } };
          t.onpointerup = () => { t.onpointermove = null; }; };
      });
      const had = tids.some(id => tp[id]);
      wrap.insertAdjacentHTML('afterend', `<div class="rv-sizebar" id="rv-txtbar"><small>점선 상자가 이 페이지의 글입니다. 옮길 글을 끌어 놓으세요. 반영하면 이 페이지만 다시 그립니다.</small><div class="ibtns"><button class="button primary small" id="tx-ok">이 위치로 반영</button>${had ? '<button class="button small" id="tx-reset">글자 원래 위치로</button>' : ''}<button class="text-btn" id="tx-no">옮기기 취소</button></div></div>`);
      $('#tx-no').onclick = () => { dlg.dataset.dirty = ''; show(cur); };
      const save = async reset => {
        const ids = reset ? tids.filter(id => tp[id]) : Object.keys(moved);
        if (!ids.length) return toast('옮긴 글이 없습니다. 점선 상자를 끌어 옮겨 주세요.');
        $('#tx-ok').disabled = true;
        const { data: row, error: e0 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single();
        if (e0) { $('#tx-ok').disabled = false; return toast('불러오지 못했습니다: ' + e0.message); }
        const f = row.data, deck0 = f.build.deck, pos = {...(deck0.text_pos || {})}, orig = {...(deck0.text_orig || {})}, boxes = {...f.build.boxes};
        ids.forEach(id => { const b = boxes[id]; if (!b) return; const a = (b.at || [b])[0];
          if (!orig[id]) orig[id] = {x: a.x, y: a.y};
          const xy = reset ? orig[id] : {x: Math.round(moved[id][0] / 100 * EW), y: Math.round(moved[id][1] / 100 * EH)};
          if (reset) { delete pos[id]; delete orig[id]; } else pos[id] = {x: +(xy.x / 12700).toFixed(1), y: +(xy.y / 12700).toFixed(1)};
          boxes[id] = {...b, ...xy, at: [{...a, ...xy}]}; });
        const { error } = await SB.from('pt_proposal').update({data: {...f, build: {...f.build, boxes, deck: {...deck0, text_pos: pos, text_orig: orig}}}, status: 'working'}).eq('id', p.id);
        if (error) { $('#tx-ok').disabled = false; return toast('저장하지 못했습니다: ' + error.message); }
        await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'finalize', input: {keys: ids}});
        await proposalEvent(p.id, `${cur}페이지 글 ${ids.length}개 위치를 ${reset ? '원래대로 되돌렸습니다' : '옮겼습니다'} → 이 페이지만 다시 그립니다`);
        dlg.dataset.dirty = ''; studio.list = null; await loadStudio(); show(cur);
        toast(reset ? '글을 원래 위치로 되돌립니다. 이 페이지를 다시 그리는 중입니다.' : '글 위치를 반영합니다. 이 페이지를 다시 그리는 중입니다.', {fn: async () => {
          const { data: r2 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single(); const d2 = r2.data;
          await SB.from('pt_proposal').update({data: {...d2, build: {...d2.build, boxes: {...d2.build.boxes, ...Object.fromEntries(ids.map(id => [id, f.build.boxes[id]]))}, deck: {...d2.build.deck, text_pos: deck0.text_pos || {}, text_orig: deck0.text_orig || {}}}}, status: 'working'}).eq('id', p.id);
          await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'finalize', input: {keys: ids}});
          await proposalEvent(p.id, `${cur}페이지 글 위치 변경을 되돌렸습니다`);
          studio.list = null; await loadStudio(); toast('되돌렸습니다. 이 페이지를 다시 그리는 중입니다.'); window.dispatchEvent(new Event('pt-refresh')); }});
      };
      $('#tx-ok').onclick = () => save(false);
      if ($('#tx-reset')) $('#tx-reset').onclick = () => save(true);
    }
    // 상자 크기 조절 — 페이지 위 상자 가장자리·모서리를 끌어 늘리고 줄인다 → 그 페이지만 다시 그림 (10-30 김현우)
    function sizeBox(k) {
      const h = $(`#rv-hot [data-hot="${CSS.escape(k)}"]`), wrap = $('.rv-canvas-wrap'); if (!h) return;
      if (h.classList.contains('edit')) return h.scrollIntoView({block: 'center', behavior: 'smooth'});     // 이미 조절 중이면 끌어 둔 크기 그대로
      $$('#rv-hot [data-hot]').forEach(o => { if (o !== h) o.style.pointerEvents = 'none'; });
      h.classList.add('edit'); h.onclick = null; dlg.dataset.dirty = '1';
      h.insertAdjacentHTML('beforeend', ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => `<i class="hd ${d}" data-hd="${d}"></i>`).join(''));
      // 비교 기준은 저장된 상자 — 화면 상자(끌어 둔 뒤 다시 누르면 이미 바뀐 크기)가 아니라 (10-30 「늘려도 그대로라고 나온다」)
      const a0 = spots(k)[0], r0 = [a0.x / 12192000 * 100, a0.y / 6858000 * 100, a0.w / 12192000 * 100, a0.h / 6858000 * 100];
      h.querySelectorAll('[data-hd]').forEach(hd => {
        hd.ontouchstart = ev => ev.stopPropagation();
        hd.onpointerdown = ev => { ev.preventDefault(); ev.stopPropagation(); hd.setPointerCapture(ev.pointerId);
          const W = wrap.clientWidth, H = wrap.clientHeight, sx = ev.clientX, sy = ev.clientY, d = hd.dataset.hd;
          const [l, t, w, hh] = ['left', 'top', 'width', 'height'].map(z => parseFloat(h.style[z]));
          hd.onpointermove = e => { const dx = (e.clientX - sx) / W * 100, dy = (e.clientY - sy) / H * 100; let L = l, T = t, Wd = w, Ht = hh;
            if (d.includes('e')) Wd = Math.min(100 - l, Math.max(3, w + dx));
            if (d.includes('s')) Ht = Math.min(100 - t, Math.max(3, hh + dy));
            if (d.includes('w')) { L = Math.min(l + w - 3, Math.max(0, l + dx)); Wd = w + l - L; }
            if (d.includes('n')) { T = Math.min(t + hh - 3, Math.max(0, t + dy)); Ht = hh + t - T; }
            Object.assign(h.style, {left: L + '%', top: T + '%', width: Wd + '%', height: Ht + '%'}); };
          hd.onpointerup = () => { hd.onpointermove = null; }; };
      });
      const had = !!S[k].box;
      $('#rv-sizebar')?.remove();
      wrap.insertAdjacentHTML('afterend', `<div class="rv-sizebar" id="rv-sizebar"><small>상자 가장자리나 모서리를 끌어 크기를 조절하세요. 반영하면 이 페이지만 다시 그립니다.</small><div class="ibtns"><button class="button primary small" id="sz-ok">이 크기로 반영</button>${had ? '<button class="button small" id="sz-reset">원래 크기로</button>' : ''}<button class="text-btn" id="sz-no">조절 취소</button></div></div>`);
      $('#sz-no').onclick = () => { dlg.dataset.dirty = ''; show(cur); };
      const save = async reset => {
        const v = ['left', 'top', 'width', 'height'].map(z => parseFloat(h.style[z]));
        if (!reset && v.every((x, i) => Math.abs(x - r0[i]) < 0.2)) return toast('상자 크기가 그대로입니다. 가장자리를 끌어 조절해 주세요.');
        $('#sz-ok').disabled = true;
        const { data: row, error: e0 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single();
        if (e0) { $('#sz-ok').disabled = false; return toast('불러오지 못했습니다: ' + e0.message); }
        const f = row.data, s0 = f.images.slots[k], b0 = f.build.boxes[k], at0 = (b0.at || [b0])[0];
        const orig = s0.box_orig || {x: at0.x, y: at0.y, w: at0.w, h: at0.h};
        const pt = reset ? null : {x: +(v[0] * 9.6).toFixed(1), y: +(v[1] * 5.4).toFixed(1), w: +(v[2] * 9.6).toFixed(1), h: +(v[3] * 5.4).toFixed(1)};
        const emu = reset ? orig : {x: Math.round(pt.x * 12700), y: Math.round(pt.y * 12700), w: Math.round(pt.w * 12700), h: Math.round(pt.h * 12700)};
        const { box: _x, box_orig: _o, ...rest } = s0, slot = reset ? rest : {...s0, box: pt, box_orig: orig};
        const boxes = {...f.build.boxes, [k]: {...b0, ...emu, at: [{...at0, ...emu}]}};
        const { error } = await SB.from('pt_proposal').update({data: {...f, build: {...f.build, boxes}, images: {...f.images, slots: {...f.images.slots, [k]: slot}}}, status: 'working'}).eq('id', p.id);
        if (error) { $('#sz-ok').disabled = false; return toast('저장하지 못했습니다: ' + error.message); }
        await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'finalize', input: {keys: [k]}});
        await proposalEvent(p.id, `${cur}페이지 「${whatText(s0.what) || k}」 이미지 상자를 ${reset ? '원래 크기로 되돌렸습니다' : '조절했습니다'} → 이 페이지만 다시 그립니다`);
        dlg.dataset.dirty = ''; studio.list = null; await loadStudio(); show(cur);
        toast(reset ? '원래 크기로 되돌립니다. 이 페이지를 다시 그리는 중입니다.' : '상자 크기를 반영합니다. 이 페이지를 다시 그리는 중입니다.', {fn: async () => {
          const { data: r2 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single(); const d2 = r2.data;
          await SB.from('pt_proposal').update({data: {...d2, build: {...d2.build, boxes: {...d2.build.boxes, [k]: b0}}, images: {...d2.images, slots: {...d2.images.slots, [k]: s0}}}, status: 'working'}).eq('id', p.id);
          await SB.from('pt_proposal_job').insert({proposal_id: p.id, kind: 'finalize', input: {keys: [k]}});
          await proposalEvent(p.id, `${cur}페이지 이미지 상자 조절을 되돌렸습니다`);
          studio.list = null; await loadStudio(); toast('되돌렸습니다. 이 페이지를 다시 그리는 중입니다.'); window.dispatchEvent(new Event('pt-refresh')); }});
      };
      $('#sz-ok').onclick = () => save(false);
      if ($('#sz-reset')) $('#sz-reset').onclick = () => save(true);
      h.scrollIntoView({block: 'center', behavior: 'smooth'});
    }
    const loose = fl.filter(f => !f.key || !keys.includes(f.key));
    $('#rv-side').innerHTML = `${loose.map(f => `<div class="rv-flag"><b>${esc(QA_KO[f.type] || '확인')}</b> ${esc(f.detail)}</div>`).join('')}${keys.length ? keys.map(card).join('') : '<p class="muted-box">이 페이지에는 이미지가 없습니다.</p>'}`;
    const paths = keys.map(k => S[k].path).filter(Boolean);
    if (paths.length) {
      const { data } = await SB.storage.from('pt-studio').createSignedUrls(paths, 900);
      (data || []).forEach(x => { if (!x.signedUrl) return; $$(`#rv-side [data-thumb="${CSS.escape(x.path)}"]`).forEach(el => { el.style.backgroundImage = `url("${x.signedUrl}")`; el.dataset.src = x.signedUrl; }); });
    }
    const open = k => { const s = S[k], el = $(`#rv-side [data-rk="${CSS.escape(k)}"]`); if (!el?.dataset.src) return;
      imgViewer({dataset: {src: el.dataset.src, key: k, ratio: s.ratio || '', label: `${s.slide}페이지 · ${KIND_KO_IMG[s.kind] || s.kind} · ${s.what || ''}`}}); };
    $$('#rv-side [data-rv-open]').forEach(x => x.onclick = () => open(x.dataset.rvOpen));
    // 이 이미지로 확정 / 확정 취소 (10-30 김현우) — 확정하면 검수 「확인할 곳」에서 빠지고, 같은 이미지인 동안 다음 검수에서도 다시 뜨지 않는다
    const setOk = async (k, on) => {
      const lp = studio.list?.find(z => z.id === p.id) || p, before = {...(lp.data?.qa_ok || {})}, path = S[k].path, page = cur;
      const flip = ok => { if (on) ok[k] = path; else delete ok[k]; return ok; };
      const done = await optimistic(
        () => { lp.data = {...lp.data, qa_ok: flip({...before})}; show(page); toast(on ? '이 이미지로 확정했습니다. 확인할 곳에서 빠집니다.' : '확정을 취소했습니다.'); },
        async () => { const { data: row, error: e0 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single(); if (e0) throw e0;
          return SB.from('pt_proposal').update({data: {...row.data, qa_ok: flip({...(row.data.qa_ok || {})})}}).eq('id', p.id); },
        () => { lp.data = {...lp.data, qa_ok: before}; show(page); }, '확정을 저장하지 못해 되돌렸습니다');
      if (done) proposalEvent(p.id, `${page}페이지 「${whatText(S[k].what) || k}」 이미지를 ${on ? '확정했습니다' : '확정 취소했습니다'}`); };
    $$('#rv-side [data-rv-ok]').forEach(x => x.onclick = () => setOk(x.dataset.rvOk, true));
    $$('#rv-side [data-rv-unok]').forEach(x => x.onclick = () => setOk(x.dataset.rvUnok, false));
    $$('#rv-side .ithumb[data-rk]').forEach(x => x.onclick = () => open(x.dataset.rk));
    const card1 = k => $(`#rv-side [data-rk="${CSS.escape(k)}"]`)?.closest('.rv-slot');
    $$('#rv-hot [data-hot]').forEach(h => { const k = h.dataset.hot;
      h.onmouseenter = () => card1(k)?.classList.add('hl'); h.onmouseleave = () => card1(k)?.classList.remove('hl');
      h.onclick = () => { const c = card1(k); if (S[k].path && c?.querySelector('.ithumb')?.dataset.src) return open(k);
        c?.scrollIntoView({block: 'center', behavior: 'smooth'}); c?.classList.add('hl'); setTimeout(() => c?.classList.remove('hl'), 1600); }; });
    $$('#rv-side [data-rv-arch]').forEach(x => x.onclick = () => arPick(p, x.dataset.rvArch, () => show(cur)));
    $$('#rv-side [data-rv-up]').forEach(inp => inp.onchange = async () => { const f = inp.files[0]; if (f && await replaceSlotImage(p, inp.dataset.rvUp, f)) show(cur); });
    $$('#rv-side [data-mk-ai]').forEach(x => x.onclick = async () => { const k = x.dataset.mkAi, pr = $(`[data-mk-prompt="${CSS.escape(k)}"]`).value.trim();
      if (!pr) return toast('생성 프롬프트를 입력해 주세요.');
      x.disabled = true; if (await quickMake(p, k, 'ai', pr, $(`[data-mk-why="${CSS.escape(k)}"]`).value.trim())) { dlg.dataset.dirty = ''; show(cur); } else x.disabled = false; });
    $$('#rv-side [data-mk-fit]').forEach(x => x.onclick = async () => { x.disabled = true; if (await quickMake(p, x.dataset.mkFit, 'fit', '', '')) show(cur); else x.disabled = false; });
    $$('#rv-side [data-rv-size]').forEach(x => x.onclick = () => sizeBox(x.dataset.rvSize));
    $$('#rv-side [data-lr]').forEach(box => { const k = box.dataset.lr, b = d.build?.boxes?.[k], el = $(`#rv-side [data-rk="${CSS.escape(k)}"]`), need = needPx(d, k);
      if (!b || !el?.dataset.src) return;
      const im = new Image(); im.onload = () => { if (lowRes(im.naturalWidth, im.naturalHeight, need, b.w / b.h) || S[k].lowres) { box.hidden = false;
        box.querySelector('small').textContent = `해상도가 낮아 깨져 보입니다 (지금 ${im.naturalWidth}px · 필요 약 ${need}px)`; } }; im.src = el.dataset.src; });
    $$('#rv-side [data-go-page]').forEach(x => x.onclick = () => nav(+x.dataset.goPage));
    const cps = keys.map(k => S[k].cand?.path).filter(Boolean);
    if (cps.length) SB.storage.from('pt-studio').createSignedUrls(cps, 900).then(({ data }) => (data || []).forEach(x => { if (x.signedUrl) $$(`#rv-side [data-cand-thumb="${CSS.escape(x.path)}"]`).forEach(el => { el.style.backgroundImage = `url("${x.signedUrl}")`; }); }));
    $$('#rv-side [data-cand-view]').forEach(x => x.onclick = () => candPreview(p, x.dataset.candView, () => show(cur)));
    $$('#rv-side [data-cand-ok]').forEach(x => x.onclick = async () => { x.disabled = true; await candApply(p, x.dataset.candOk, true); show(cur); });
    $$('#rv-side [data-cand-no]').forEach(x => x.onclick = async () => { x.disabled = true; await candApply(p, x.dataset.candNo, false); show(cur); });
    $$('#rv-side [data-mk-other]').forEach(x => x.onclick = async () => { x.disabled = true; await asideOther(p, x.dataset.mkOther); show(cur); });
    $$('#rv-side [data-mk-hires]').forEach(x => x.onclick = async () => { x.disabled = true; await asideHires(p, x.dataset.mkHires); show(cur); });
    $$('#rv-side [data-mk-up]').forEach(x => x.onclick = async () => { x.disabled = true; if (await quickMake(p, x.dataset.mkUp, 'upscale', '', '')) show(cur); else x.disabled = false; });
  };
  const nav = async n => { if (n !== cur && dlg.dataset.dirty && !(await askLeave())) return; dlg.dataset.dirty = ''; show(n); };
  window.ptRefresh = () => { dlg.dataset.dirty = ''; studio.list = null; loadStudio().then(() => show(cur)); };
  $('#rv-prev').onclick = () => nav(cur - 1); $('#rv-next').onclick = () => nav(cur + 1);
  dlg.onkeydown = ev => { if ($('#modal').open || $('#ask')?.open || ev.target.matches('input, textarea')) return; if (ev.key === 'ArrowLeft') nav(cur - 1); if (ev.key === 'ArrowRight') nav(cur + 1); };      // 글을 쓰는 중에는 화살표로 넘기지 않음
  // 폰에서는 페이지 그림을 옆으로 밀어 넘긴다 (10-30 모바일)
  const pg = dlg.querySelector('.rv-page'); let sx = null, sy = 0;
  pg.ontouchstart = ev => { sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; };
  pg.ontouchend = ev => { if (sx === null) return; const dx = ev.changedTouches[0].clientX - sx, dy = ev.changedTouches[0].clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) nav(cur + (dx < 0 ? 1 : -1)); };
  await show(start || 1);
}
// 낙관적 업데이트 (10-31 김현우 「누르는 순간 화면부터」) — 화면을 먼저 바꾸고 저장은 뒤에서. 실패하면 저장해 둔 값으로 되돌리고 알린다
async function optimistic(apply, save, revert, failMsg) {
  apply();
  try { const r = await save(); if (r?.error) throw r.error; return true; }
  catch (e) { revert(); toast(`${failMsg || '저장하지 못해 원래대로 되돌렸습니다'}${e?.message ? ' · ' + e.message : ''}`); return false; }
}
async function proposalEvent(id, message) { await SB.from('pt_proposal_event').insert({proposal_id: id, message}); }

async function openProposal(id, keep) {
  const p = studio.list?.find(x => x.id === id); if (!p) return;
  activeDetail = 'p:' + id;
  if (!keep) setRoute(id);
  // 진행 단계는 맨 위 가로 막대로 (10-30 · 대표님 설계) — 사람이 결정하는 단계는 점으로 표시
  const stages = STAGES.map((s, i) => { const n = i + 1, skip = p.mode === 'single' && n === 3, cls = skip ? 'skip' : n < p.stage || p.status === 'done' ? 'done' : n === p.stage ? 'now' : ''; return `<li class="${cls}" title="${esc(s)}${GATES[n] && !skip ? ' · 결정: ' + esc(GATES[n]) : ''}${skip ? ' · 단독 제안은 건너뜀' : ''}"><span>${n}</span><b>${esc(s)}</b>${GATES[n] && !skip ? '<i class="gate" aria-label="결정 단계"></i>' : ''}</li>`; }).join('');
  const job = studio.jobs.find(j => j.proposal_id === id);
  const ref = studio.refs?.find(r => r.id === p.ref_id);
  const ent = (eid, name) => eid && byId(eid) ? `<button class="ref" type="button" data-open="${eid}">${esc(name)}</button>` : esc(name || '—');
  const d = p.data || {};
  let action = '';
  if (p.status === 'waiting' && p.stage === 2) action = `<div class="detail-block"><h3>결정 · 기본 정보 확정</h3><p>아래 내용으로 시작합니다. 확정하면 ${p.mode === 'collab' && !p.ip_b_name ? '판테온 봇이 파트너 IP 후보를 추천합니다.' : '판테온 봇이 IP 리서치를 시작합니다.'}</p><div class="drawer-actions"><button class="button primary" id="intake-ok">인테이크 확정</button><button class="button" id="intake-edit">내용 수정</button></div></div>`;
  else if (p.status === 'working' && p.stage >= 7 && job && !['image_plan', 'finalize', 'generate', 'aside', 'qa'].includes(job.kind)) action = `<div class="detail-block"><h3>진행 중 · ${esc(STAGES[p.stage - 1])}</h3><p>이 단계는 준비 중입니다. 완성되면 여기서 이어서 진행됩니다.</p></div>`;
  else if (p.status === 'working') { const live = liveJobs(id); action = `<div class="detail-block"><h3>진행 중 · ${esc(STAGES[p.stage - 1])}</h3>${jobsProg(live.length ? live : [job])}<p class="muted-box">화면을 나가거나 새로 고침해도 작업은 계속 진행됩니다.</p><div class="drawer-actions"><button class="button danger" id="job-cancel">작업 취소</button></div></div>`; }
  else if (p.status === 'failed') action = `<div class="detail-block"><h3>작업 실패</h3><p>${esc(d.error || '판테온 봇이 작업을 끝내지 못했습니다.')}</p><div class="drawer-actions"><button class="button primary" id="job-retry">다시 시도</button></div></div>`;
  else if (p.status === 'waiting' && p.stage === 3 && d.partners) action = partnersPanel(p);
  else if (p.status === 'waiting' && p.stage === 5 && d.concepts) action = conceptsPanel(p);
  else if (p.status === 'waiting' && p.stage >= 7 && d.images) action = imagesPanel(p);
  else if (p.status === 'waiting') action = `<div class="detail-block"><h3>결정 · ${esc(GATES[p.stage] || '확인')}</h3><p>판테온 봇이 준비한 결과를 확인하고 결정해 주세요.</p></div>`;
  else if (p.status === 'done' && d.build) action = `<div class="detail-block pv-decide"><h3>완료 · v${d.build.version} · 수정 버전 만들기</h3><p>수신사 피드백을 입력하면 원고를 고쳐 다음 버전을 만듭니다. 새로 필요한 이미지만 다시 수급합니다.</p><textarea id="rev-ins" rows="3" maxlength="1500" placeholder="예: Experience 2개 추가, Business 페이지에 금액 삽입, 심화 제안으로 전환"></textarea><div class="drawer-actions"><button class="button primary" id="rev-go">v${d.build.version + 1} 만들기</button></div></div>`;
  const done = [d.build && `<div class="detail-block"><h3>제안서 초안 v${d.build.version}</h3>${Object.keys(d.build.patches || {}).length ? `<p class="muted-box">수정한 페이지 ${Object.keys(d.build.patches).map(Number).sort((a, b) => a - b).join('·')}은 화면에 바로 반영돼 있습니다. PDF·PPTX를 받거나 완료할 때 전체 파일에 한 번 반영합니다.</p>` : ''}<div class="detail-row"><span>분량</span><b>${d.build.slides}페이지 · 이미지 ${d.build.images}개</b></div>${d.images ? '' : '<p>이미지가 들어갈 위치는 회색 상자로 비워 두었습니다. 이미지 수급 단계에서 채웁니다.</p>'}<div class="detail-row"><span>강조색</span><b class="acc-row"><i class="swatch" style="background:${esc(d.build.deck?.theme?.accent || '#285541')}"></i>${esc(d.build.deck?.theme?.accent || '')} ${d.accent ? '(직접 선택)' : '(클로드 추천)'}${p.status === 'waiting' ? ` <input type="color" id="acc-new" value="${esc(d.build.deck?.theme?.accent || '#285541')}" aria-label="강조색 선택"> <button class="text-btn" id="acc-apply">이 색으로 적용</button>` : ''}</b></div><div class="drawer-actions">${d.build.pdf ? `<button class="button primary" data-file="${esc(d.build.pdf)}">PDF 보기</button>` : ''}<button class="button" data-file="${esc(d.build.pptx)}" data-dl="1">PPTX 다운로드</button>${d.build.pdf ? `<button class="button" data-review="1">${p.status === 'waiting' ? '이미지 확인·수정' : '페이지별 보기'}</button>` : ''}${p.status === 'waiting' && !d.build.deck?.redesigned ? '<button class="button" id="redesign">새 디자인 적용</button>' : ''}</div>${p.status === 'waiting' ? `<details class="pv-fold"><summary><b>원고 수정 요청</b> <small>문장·페이지 구성·순서를 고칠 때</small></summary><textarea id="mid-ins" rows="3" maxlength="1500" placeholder="예: 앞쪽 팬 반응 페이지를 빼고 콜라보 명분을 더 강하게, 상품 페이지 2개 추가"></textarea><div class="drawer-actions"><button class="button" id="mid-go">v${d.build.version + 1} 만들기</button></div></details>` : ''}${p.status === 'waiting' && p.stage >= 7 && d.images ? '' : qaBlock(p)}</div>`].filter(Boolean).join('');
  // 컨셉·리서치·팬·SNS 는 접어 둔 「자료」로 (10-30) — 결정할 것이 먼저 보이게
  const fold = (t, sub, body) => `<details class="pv-fold"><summary><b>${t}</b>${sub ? ` <small>${esc(sub)}</small>` : ''}</summary>${body}</details>`;
  const refs = [d.concept_selected && fold('확정한 컨셉', d.concept_selected.name, conceptCard(d.concept_selected)),
    d.research && fold('리서치', (d.research.ips || []).map(x => x.name).join(' · '), researchBlock(d.research)),
    d.social?.ips && fold('팬·SNS', `채널 ${d.social.ips.reduce((a, x) => a + x.channels.length, 0)}개`, socialBlock(d.social))].filter(Boolean).join('');
  showDrawer(`<span class="entity-avatar">${esc(p.ip_a_name.slice(0, 2))}</span><h2>${esc(pTitle(p))}</h2><span class="detail-sub">${p.mode === 'single' ? '단독 제안' : '콜라보 제안'} · ${esc(p.recipient || '수신사 미정')}${propSub(p) ? ' · ' + esc(propSub(p)) : ''}</span>${d.concepts ? `<div class="drawer-actions"><button class="button" id="prop-more">${icon('plus')} 같은 IP로 다른 컨셉 제안서 생성</button></div>` : ''}
  <ol class="pv-steps" aria-label="진행 단계">${stages}</ol>
  <div class="pv-grid"><div class="pv-col">${action}${done}${refs ? `<div class="detail-block pv-refs"><h3>자료</h3>${refs}</div>` : ''}</div>
  <div class="pv-col pv-side"><div class="detail-block"><h3>기본 정보</h3><div class="detail-row"><span>IP</span><b>${ent(p.ip_a_id, p.ip_a_name)}</b></div>${p.mode === 'collab' ? `<div class="detail-row"><span>파트너 IP</span><b>${p.ip_b_name ? ent(p.ip_b_id, p.ip_b_name) : '판테온 봇 추천 후 선택'}</b></div>` : ''}<div class="detail-row"><span>수신사</span><b>${esc(p.recipient || '—')}</b></div><div class="detail-row"><span>레퍼런스 포맷</span><b>${esc(ref?.title || '—')}</b></div><div class="detail-row"><span>현재 상태</span><b>${pPill(p)}</b></div>${p.note ? `<p>${esc(p.note)}</p>` : ''}</div>
  <div class="detail-block"><h3>활동 기록</h3><div id="proposal-events"><p>불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div></div></div></div>`, keep, 'PROPOSAL');
  const go = async (row, nextJob, msg, okMsg) => {
    const lp = studio.list?.find(z => z.id === p.id), before = lp && {...lp}, jobs0 = studio.jobs;
    const done = await optimistic(
      () => { if (!lp) return; Object.assign(lp, row);
        if (nextJob) studio.jobs = [...studio.jobs, {id: -Date.now(), proposal_id: p.id, kind: nextJob.kind, status: 'wait', input: nextJob.input || {}, at: new Date().toISOString()}];
        openProposal(p.id, true); if (okMsg) toast(okMsg); },
      async () => { const r = await SB.from('pt_proposal').update(row).eq('id', p.id); if (r.error) throw r.error;
        if (nextJob) { const j = await SB.from('pt_proposal_job').insert({proposal_id: p.id, ...nextJob}); if (j.error) throw j.error; } },
      () => { if (lp) { Object.keys(lp).forEach(x => delete lp[x]); Object.assign(lp, before); } studio.jobs = jobs0; openProposal(p.id, true); }, '저장하지 못해 원래대로 되돌렸습니다');
    if (!done) return;
    await proposalEvent(p.id, msg);
    studio.list = null; await loadStudio(); if (activeDetail === 'p:' + p.id) openProposal(p.id, true);
  };
  $('#intake-edit')?.addEventListener('click', () => studioProjectModal(p));
  // 작업 취소 (10-30 김현우) — 8초 안에 「되돌리기」를 누르면 취소하지 않는다. 봇은 apply_at(8초 뒤)이 지나야 멈춘다 → 화면을 나가도 그대로 적용
  $('#job-cancel')?.addEventListener('click', async ev => {
    if (!(await confirmBox({title: '정말 취소하시겠어요?', body: '지금 진행 중인 작업을 멈추고 직전 결정 단계로 돌아갑니다. 이미 만든 결과(원고·이미지)는 그대로 남습니다.', ok: '작업 취소', cancel: '계속 진행', danger: true}))) return;
    ev.target.disabled = true;
    const now = new Date(), req = {at: now.toISOString(), apply_at: new Date(now.getTime() + 8000).toISOString(), by: myName || ''};
    const { data: row, error: e0 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single();
    if (e0) { ev.target.disabled = false; return toast('취소하지 못했습니다: ' + e0.message); }
    const { error } = await SB.from('pt_proposal').update({data: {...row.data, cancel_req: req}}).eq('id', p.id);
    if (error) { ev.target.disabled = false; return toast('취소하지 못했습니다: ' + error.message); }
    let undone = false;
    setTimeout(async () => { if (!undone) await proposalEvent(p.id, `진행 중인 작업을 취소했습니다 (${STAGES[p.stage - 1]})`); }, 8200);
    toast('취소되었습니다.', {fn: async () => {
      undone = true;
      const { data: r2 } = await SB.from('pt_proposal').select('data').eq('id', p.id).single();
      const { cancel_req: _c, ...rest } = r2.data || {};
      await SB.from('pt_proposal').update({data: rest}).eq('id', p.id);
      toast('취소를 되돌렸습니다. 작업을 계속 진행합니다.'); studio.list = null; await loadStudio(); openProposal(p.id, true); }});
  });
  // 같은 IP 조합으로 제안서 하나 더 — 리서치·팬·SNS 조사·컨셉 후보를 이어받아 컨셉 고르기부터
  $('#prop-more')?.addEventListener('click', async ev => {
    const no = propNo(p);
    if (!(await confirmBox({title: '같은 IP로 제안서를 하나 더 만들까요?', body: `${esc(pTitle(p))}의 리서치와 컨셉 후보를 그대로 가져와 새 제안서를 만들고, 컨셉 선택부터 시작합니다. 지금 제안서는 그대로 남습니다.`, ok: '새 제안서 만들기'}))) return;
    ev.target.disabled = true;
    const keep = Object.fromEntries(['research', 'social', 'concepts', 'accent', 'partners', 'partner_selected'].filter(k => d[k] !== undefined).map(k => [k, d[k]]));
    const row = {mode: p.mode, ip_a_name: p.ip_a_name, ip_a_id: p.ip_a_id, ip_b_name: p.ip_b_name, ip_b_id: p.ip_b_id, recipient: p.recipient, ref_id: p.ref_id,
                 note: p.note, data: {...keep, from_proposal: p.id}, stage: 5, status: 'waiting'};
    const { data: nw, error } = await SB.from('pt_proposal').insert(row).select().single();
    if (error) { ev.target.disabled = false; return toast('생성하지 못했습니다: ' + error.message); }
    await proposalEvent(nw.id, `제안서 ${no ? no.of + 1 : 2}을(를) 만들었습니다 · 리서치·컨셉 후보를 이어받았습니다`);
    studio.list = null; await loadStudio(); openProposal(nw.id); toast('새 제안서를 생성했습니다. 컨셉을 선택해 주세요.');
  });
  $('#intake-ok')?.addEventListener('click', () => {
    $('#intake-ok').disabled = true;
    const next = p.mode === 'collab' && !p.ip_b_name ? 3 : 4;
    go({stage: next, status: 'working'}, {kind: JOB_OF[next], input: {}}, `기본 정보를 확정했습니다 → ${STAGES[next - 1]} 시작`, '기본 정보를 확정했습니다.');
  });
  $('#job-retry')?.addEventListener('click', () => {
    $('#job-retry').disabled = true;
    const kind = d.failed_kind || JOB_OF[p.stage] || 'research';
    go({status: 'working', data: {...d, error: null}}, {kind, input: kind === 'generate' ? {estimate_only: true} : {retry: true}}, `${STAGES[p.stage - 1]} 작업을 다시 요청했습니다`);
  });
  const patched = Object.keys(d.build?.patches || {}).length;
  $$('#drawer [data-file]').forEach(b => b.onclick = async () => {
    if (patched) {          // 페이지만 갈아 끼운 상태 — 파일을 받을 때 전체에 한 번 반영
      b.disabled = true;
      return go({status: 'working'}, {kind: 'finalize', input: {}}, `수정한 ${patched}개 페이지를 전체 파일에 반영합니다`, `수정한 ${patched}개 페이지를 전체 파일에 반영하는 중입니다. 끝나면 다시 눌러 받으세요.`);
    }
    const { data: u, error } = await SB.storage.from('pt-studio').createSignedUrl(b.dataset.file, 600, b.dataset.dl ? {download: `${pTitle(p)}_v${d.build.version}.pptx`} : undefined);
    if (error) return toast('파일을 열지 못했습니다.');
    window.open(u.signedUrl, '_blank', 'noopener');
  });
  $('#acc-apply')?.addEventListener('click', ev => {
    ev.target.disabled = true; const c = $('#acc-new').value.toUpperCase();
    go({status: 'working', data: {...d, accent: c}}, {kind: 'finalize', input: {accent: c}}, `강조색 ${c} 적용을 요청했습니다`);
  });
  // 7 이미지 — 내 이미지로 교체 · 다시 그리기 · 완료
  $$('#drawer [data-upimg]').forEach(inp => inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (await replaceSlotImage(p, inp.dataset.upimg, f)) openProposal(p.id, true);
  });
  $$('#drawer [data-review]').forEach(x => x.onclick = () => pageReview(p.id, +x.dataset.review || 1));
  $('#redesign')?.addEventListener('click', async ev => {
    if (!(await confirmBox({title: '새 디자인을 적용할까요?', body: '원고를 원본 제안서 디자인 레이아웃으로 다시 씁니다. 이미지는 그대로 쓰지만 페이지 구성과 문장 배치가 바뀔 수 있습니다. 지금 버전은 기록에 남습니다.', ok: '새 디자인 적용'}))) return;
    ev.target.disabled = true; go({status: 'working'}, {kind: 'finalize', input: {redesign: true}}, '원본 제안서 디자인 적용을 요청했습니다(이미지는 유지)', '새 디자인을 적용합니다. 진행률은 화면에서 볼 수 있습니다.'); });
  $('#ai-est')?.addEventListener('click', ev => { ev.target.disabled = true; go({status: 'working'}, {kind: 'generate', input: {estimate_only: true}}, 'AI 이미지 견적을 요청했습니다'); });
  $('#ai-go')?.addEventListener('click', async ev => {
    const usd = +ev.target.dataset.usd, n = d.images.ai_estimate.count;
    if (!(await confirmBox({title: `이미지 ${n}장을 만들까요?`, body: `<b>예상 비용 약 $${usd}</b>가 회사 힉스필드 잔액에서 나갑니다. 실패하거나 부적절 판정된 이미지는 청구되지 않습니다. 만든 이미지는 들어갈 페이지만 다시 그립니다.`, ok: `${n}장 만들기 · 약 $${usd}`}))) return;
    ev.target.disabled = true;
    go({status: 'working'}, {kind: 'generate', input: {approved_usd: usd}}, `AI 이미지 ${n}장 생성을 승인했습니다 (예상 $${usd})`, '승인했습니다. 판테온 봇이 생성을 시작합니다.');
  });
  $$('#drawer [data-aside]').forEach(b => b.onclick = () => {
    const k = b.dataset.aside, sl = d.images.slots[k];
    const im = (d.build?.deck?.slides || []).flatMap(x => x.images || []).find(x => x.key === k) || {};
    b.disabled = true;
    go({status: 'working'}, {kind: 'aside', input: {slots: [{key: k, kind: sl.kind, what: sl.what || '', ratio: sl.ratio || '', search: im.search || ''}], ips: [p.ip_a_name, p.ip_b_name].filter(Boolean)}},
       `${sl.slide}페이지 「${sl.what || k}」 이미지를 Aside 로 다시 찾도록 요청했습니다`, 'Aside에 요청했습니다. 진행률은 화면에서 볼 수 있습니다.');
  });
  $('#rev-go')?.addEventListener('click', ev => {
    const t = $('#rev-ins').value.trim(); if (!t) { $('#rev-ins').focus(); return toast('수정할 내용을 입력해 주세요.'); }
    ev.target.disabled = true;
    const log = [...(d.revise_log || []), {at: new Date().toISOString(), stage: 'draft', instruction: t, version: d.build?.version, by: myName || ''}];
    go({status: 'working', data: {...d, revise_log: log}}, {kind: 'finalize', input: {instruction: t}}, `수정 버전을 요청했습니다 · ${t.slice(0, 120)}`, '수정 버전을 만듭니다. 진행률은 화면에서 볼 수 있습니다.');
  });
  // 중간 과정에서도 원고 수정 요청 (10-30 대표님 「완성 혹은 중간 과정에 프롬프트로 넣으면 변경」)
  $('#mid-go')?.addEventListener('click', async ev => {
    const t = $('#mid-ins').value.trim(); if (!t) { $('#mid-ins').focus(); return toast('수정할 내용을 입력해 주세요.'); }
    if (!(await confirmBox({title: `원고를 고쳐 v${d.build.version + 1}을 만들까요?`,
        body: '요청한 부분만 고치고 나머지 페이지와 이미지는 그대로 둡니다. 새로 필요한 이미지 위치만 다시 수급합니다. 요청 내용은 다음 제안서 원고에도 반영되도록 쌓입니다.', ok: `v${d.build.version + 1} 만들기`}))) return;
    ev.target.disabled = true;
    const log = [...(d.revise_log || []), {at: new Date().toISOString(), stage: 'draft', instruction: t, version: d.build?.version, by: myName || ''}];
    $('#mid-ins').value = '';
    go({status: 'working', data: {...d, revise_log: log}}, {kind: 'finalize', input: {instruction: t}}, `원고 수정을 요청했습니다 · ${t.slice(0, 120)}`, '원고를 고쳐 다음 버전을 만듭니다. 진행률은 화면에서 볼 수 있습니다.');
  });
  $('#img-rerender')?.addEventListener('click', async ev => {
    if (!(await confirmBox({title: '변경 사항을 제안서 전체에 반영할까요?', body: '교체한 이미지와 위치 조정을 넣어 제안서 전체를 다시 그리고, 자동 검수도 처음부터 다시 합니다. 그동안은 수정할 수 없습니다.', ok: '전체에 반영'}))) return;
    ev.target.disabled = true; go({status: 'working'}, {kind: 'finalize', input: {}}, '변경 사항 반영을 요청했습니다'); });
  $('#img-done')?.addEventListener('click', async ev => {
    if (!(await confirmBox({title: `v${d.build.version}으로 제안서를 완료할까요?`,
        body: `완료하면 상태가 「완료」로 바뀌고 이미지 수정 단계가 닫힙니다.${patched ? ` 수정한 ${patched}개 페이지를 전체 파일에 반영한 뒤 완료합니다.` : ''} 이후 고칠 일이 생기면 「수정 버전 만들기」로 다음 버전을 만듭니다.`,
        ok: `v${d.build.version}으로 완료`}))) return;
    ev.target.disabled = true;
    // 완료한 버전에 남은 AI 이미지·좌우 넓힌 이미지 = 사람이 통과시킨 것 → good_images (10-29 · 다음 원고가 이 수준을 따르게)
    const S = d.images?.slots || {}, at = new Date().toISOString();
    const good = Object.entries(S).filter(([, s]) => s.path && (s.status === 'generated' || s.widened))
      .map(([k, s]) => ({key: k, slide: s.slide, kind: s.kind, what: s.what || '', prompt: s.prompt || '', widen_extra: s.widen_extra || '', widened: !!s.widened,
                         retried: (s.prev_paths || []).length, path: s.path, version: d.build.version, at, by: myName || ''}));
    const keep = new Set(good.map(g => g.key));
    const log = (d.prompt_log || []).map(x => keep.has(x.key) ? {...x, kept: true} : x);
    if (patched) return go({status: 'working', data: {...d, good_images: good, prompt_log: log}}, {kind: 'finalize', input: {then_done: true}}, `수정한 ${patched}개 페이지를 전체에 반영한 뒤 완료합니다 (통과한 AI 이미지 ${good.length}장 기록)`, '수정한 페이지를 전체에 반영한 뒤 완료합니다.');
    go({status: 'done', data: {...d, good_images: good, prompt_log: log}}, null, `v${d.build.version} 으로 제안서를 완료했습니다 (통과한 AI 이미지 ${good.length}장 기록)`).then(() =>
      toast('제안서를 완료했습니다.', {fn: async () => { await SB.from('pt_proposal').update({status: 'waiting'}).eq('id', p.id); await proposalEvent(p.id, '완료를 되돌렸습니다'); studio.list = null; await loadStudio(); openProposal(p.id, true); toast('완료를 되돌렸습니다.'); }}));
  });
  if (d.images && $('#img-board')) loadImgThumbs(d.images.slots);
  if (d.social?.captures?.length) loadImgThumbs(Object.fromEntries(d.social.captures.map((c, i) => [i, c])));
  // 3 파트너 카드 고르기 · 다른 후보 · 카테고리 바꾸기
  $$('#drawer [data-pick]').forEach(b => b.onclick = () => {
    const c = d.partners.candidates[+b.dataset.pick], e = entityByName(c.ip);
    $$('#drawer [data-pick]').forEach(x => x.disabled = true);
    go({ip_b_name: e?.name || c.ip, ip_b_id: e?.id || null, stage: 4, status: 'working', data: {...d, partner_selected: c}}, {kind: 'research', input: {}}, `파트너 IP 「${c.ip}」를 골랐습니다 → 리서치 시작`, `${c.ip}을(를) 파트너로 골랐습니다.`);
  });
  // 추천 밖 IP 직접 입력 (10-28 홍석진 대표님)
  const own = $('#pb-own');
  if (own) {
    own.oninput = () => { const v = own.value.trim(), e = entityByName(v); $('#pb-own-note').innerHTML = v ? (e ? `<b>등록된 연락처 있음</b> · 판테온 엔티티 「${esc(e.name)}」(${esc(e.type)})와 연결됩니다${contactsOf(e).length ? ` · 등록된 담당자 ${contactsOf(e).length}명` : ''}` : '<span class="err">등록된 연락처 없음</span> · 판테온 엔티티에 등록되지 않은 IP입니다. 이름 그대로 진행합니다.') : ''; };
    $('#pb-own-go').onclick = () => {
      const v = own.value.trim(); if (!v) { own.focus(); return; }
      const e = entityByName(v), name = e?.name || v, { partner_selected, ...rest } = d;
      $$('#drawer [data-pick], #pb-own-go').forEach(x => x.disabled = true);
      go({ip_b_name: name, ip_b_id: e?.id || null, stage: 4, status: 'working', data: rest}, {kind: 'research', input: {}}, `파트너 IP 「${name}」를 직접 넣었습니다 → 리서치 시작`, `${name}을(를) 파트너로 골랐습니다.`);
    };
  }
  $$('#drawer [data-reroll]').forEach(b => b.onclick = () => {
    b.disabled = true;
    go({status: 'working'}, {kind: 'partners', input: {mode: 'reroll', category: b.dataset.reroll, exclude: d.partners.shown || []}}, `「${b.dataset.reroll}」 카테고리 후보를 다시 요청했습니다`);
  });
  $('#recategorize')?.addEventListener('click', ev => {
    ev.target.disabled = true;
    go({status: 'working'}, {kind: 'partners', input: {mode: 'recategorize', exclude: [...(d.partners.shown || []), ...(d.partners.categories || []).map(c => c.name)]}}, '카테고리를 변경해 재추천을 요청했습니다');
  });
  // 5 컨셉 확정
  $$('#drawer [data-concept]').forEach(b => b.onclick = () => {
    const c = d.concepts.candidates[+b.dataset.concept];
    $$('#drawer [data-concept]').forEach(x => x.disabled = true);
    const ds = readDeckStyle();
    if (!ds.parts.length) { $$('#drawer [data-concept]').forEach(x => x.disabled = false); return toast('실행 파트를 하나 이상 선택해 주세요.'); }
    const pn = ds.parts.map(k => DECK_PARTS.find(x => x[0] === k)[1]).join('·');
    go({stage: 6, status: 'working', data: {...d, concept_selected: c, deck_style: ds}}, {kind: 'build', input: {}}, `컨셉 「${c.name}」을(를) 확정했습니다 → 제안서 생성 (${pn} · ${ds.length === 'short' ? '요약' : '전체'})`, '컨셉을 확정했습니다.');
  });
  $('#cc-go')?.addEventListener('click', async ev => {
    const t = $('#cc-ins').value.trim(); if (!t) { $('#cc-ins').focus(); return toast('수정 요청을 입력해 주세요.'); }
    if (!(await confirmBox({title: '이 요청으로 컨셉 후보를 다시 받을까요?', body: '지금 후보 대신 요청을 반영한 새 후보로 바뀝니다. 요청 내용은 다음 제안서 컨셉에도 반영되도록 쌓입니다.', ok: '컨셉 다시 받기'}))) return;
    ev.target.disabled = true;
    const log = [...(d.revise_log || []), {at: new Date().toISOString(), stage: 'concept', instruction: t, by: myName || ''}];
    go({status: 'working', data: {...d, deck_style: readDeckStyle(), revise_log: log}}, {kind: 'concepts', input: {instruction: t}}, `컨셉 수정을 요청했습니다 · ${t.slice(0, 120)}`, '컨셉을 다시 설계합니다. 진행률은 화면에서 볼 수 있습니다.');
  });
  clearTimeout(propPoll);
  if (p.status === 'working') propPoll = setTimeout(() => pollProposal(p.id), 3000);      // 작업 중이면 단계와 상관없이 항상
  const { data } = await SB.from('pt_proposal_event').select('at,actor_name,message').eq('proposal_id', id).order('at', {ascending: false}).limit(50);
  const box = $('#proposal-events'); if (!box || activeDetail !== 'p:' + id) return;
  const li = e => `<li><time>${esc(kst(e.at))}</time><span>${esc(e.message)}<br><small>${esc(e.actor_name || '판테온 봇')}</small></span></li>`;
  box.innerHTML = data?.length ? `<ol class="owner-hist">${data.slice(0, 6).map(li).join('')}</ol>${data.length > 6 ? `<details class="pv-more"><summary>이전 기록 ${data.length - 6}개</summary><ol class="owner-hist">${data.slice(6).map(li).join('')}</ol></details>` : ''}` : '<p>기록이 없습니다.</p>';
}

function studioProjectModal(p) {
  const refs = studio.refs || [], def = p?.ref_id || refs.find(r => r.is_default)?.id || refs[0]?.id || '';
  const names = entities().filter(e => !e.hidden).map(e => `<option value="${esc(e.name)}">`).join('');
  modal(`<form id="sp-form"><h2>${p ? '기본 정보 수정' : '새 제안서 프로젝트'}</h2><p>IP 하나로 시작합니다. 판테온에 등록된 엔티티를 선택하면 담당자·연락처도 함께 연결됩니다.</p><datalist id="sp-ents">${names}</datalist>
  <label>IP *<input id="sp-a" list="sp-ents" required maxlength="80" value="${esc(p?.ip_a_name || '')}" placeholder="예: 에스파"></label><small class="atnote" id="sp-a-note"></small>
  <div class="field"><span class="flabel">제안 방식</span><div class="seg-pick"><label><input type="radio" name="sp-mode" value="collab" ${p?.mode !== 'single' ? 'checked' : ''}> 콜라보 제안 <small>IP A × IP B</small></label><label><input type="radio" name="sp-mode" value="single" ${p?.mode === 'single' ? 'checked' : ''}> 단독 제안 <small>IP 하나</small></label></div></div>
  <div id="sp-b-field"><label>파트너 IP<input id="sp-b" list="sp-ents" maxlength="80" value="${esc(p?.ip_b_name || '')}" placeholder="비워 두면 판테온 봇이 후보를 추천합니다"></label><small class="atnote" id="sp-b-note"></small></div>
  <label>수신사<input id="sp-to" list="sp-ents" maxlength="80" value="${esc(p?.recipient || '')}" placeholder="예: SM엔터테인먼트"></label>
  <label>레퍼런스 포맷<select id="sp-ref">${refs.length ? refs.map(r => `<option value="${r.id}" ${r.id === def ? 'selected' : ''}>${esc(r.title)}${r.is_default ? ' (기본)' : ''}</option>`).join('') : '<option value="">등록된 레퍼런스 없음</option>'}</select></label>
  <div class="field"><span class="flabel">강조색</span><div class="accent-pick"><label><input type="radio" name="sp-acc" value="" ${p?.data?.accent ? '' : 'checked'}> 클로드 추천</label><label><input type="radio" name="sp-acc" value="pick" ${p?.data?.accent ? 'checked' : ''}> 직접 선택 <input type="color" id="sp-color" value="${esc(p?.data?.accent || '#E0245E')}"></label></div><small class="atnote">클로드 추천을 선택하면 컨셉과 두 IP의 분위기에 맞춰 판테온 봇이 정합니다. 초안 생성 후에도 변경할 수 있습니다.</small></div>
  <label>메모<input id="sp-note" maxlength="300" value="${esc(p?.note || '')}" placeholder="예: 최초 제안 · 팝업 중심"></label>
  <div id="sp-error" style="color:#ba775e;margin-top:14px;font-size:12px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">${p ? '변경 저장' : '프로젝트 생성'}</button></div></form>`);
  const sync = () => { const collab = $('input[name=sp-mode]:checked').value === 'collab'; $('#sp-b-field').hidden = !collab; };
  $$('input[name=sp-mode]').forEach(r => r.onchange = sync); sync();
  $('#sp-color').oninput = () => { $('input[name=sp-acc][value=pick]').checked = true; };
  const note = (inp, out) => { const e = entityByName($(inp).value); $(out).innerHTML = $(inp).value.trim() ? (e ? `<b>등록된 연락처 있음</b> · 판테온 엔티티 「${esc(e.name)}」(${esc(e.type)})와 연결됩니다${contactsOf(e).length ? ` · 등록된 담당자 ${contactsOf(e).length}명` : ''}` : '<span class="err">등록된 연락처 없음</span> · 판테온 엔티티에 등록되지 않은 IP입니다. 이름 그대로 진행합니다.') : ''; };
  ['#sp-a', '#sp-b'].forEach((s, i) => { $(s).oninput = () => note(s, i ? '#sp-b-note' : '#sp-a-note'); note(s, i ? '#sp-b-note' : '#sp-a-note'); });
  $('#sp-form').onsubmit = async ev => {
    ev.preventDefault();
    const a = $('#sp-a').value.trim(), mode = $('input[name=sp-mode]:checked').value, b = mode === 'collab' ? $('#sp-b').value.trim() : '';
    if (!a) { $('#sp-error').textContent = 'IP를 입력해 주세요.'; return; }
    const ea = entityByName(a), eb = b ? entityByName(b) : null;
    const row = {mode, ip_a_name: ea?.name || a, ip_a_id: ea?.id || null, ip_b_name: eb?.name || b, ip_b_id: eb?.id || null, recipient: $('#sp-to').value.trim(), ref_id: $('#sp-ref').value || null, note: $('#sp-note').value.trim(), data: {...(p?.data || {}), accent: $('input[name=sp-acc]:checked').value === 'pick' ? $('#sp-color').value.toUpperCase() : ''}};
    const btn = $('#sp-form [type=submit]'); btn.disabled = true;
    const q = p ? SB.from('pt_proposal').update(row).eq('id', p.id).select().single() : SB.from('pt_proposal').insert({...row, stage: 2, status: 'waiting'}).select().single();
    const { data, error } = await q;
    if (error) { btn.disabled = false; $('#sp-error').textContent = '저장하지 못했습니다: ' + error.message; return; }
    await proposalEvent(data.id, p ? '기본 정보를 수정했습니다' : `프로젝트를 만들었습니다 (${mode === 'single' ? '단독' : '콜라보'} 제안)`);
    $('#modal').close(); studio.list = null; await loadStudio(); openProposal(data.id); toast(p ? '기본 정보를 수정했습니다.' : '프로젝트를 만들었습니다.');
  };
}

function studioRefModal() {
  modal(`<form id="sr-form"><h2>레퍼런스 등록</h2><p>팀이 작성한 완성 제안서(PDF·PPTX)를 업로드합니다. 판테온 봇이 페이지 구성과 이미지 배치를 분석해 새 제안서 포맷으로 사용합니다.</p>
  <label>파일 * (PDF·PPTX, 100MB 이하)<input id="sr-file" type="file" accept=".pdf,.pptx,application/pdf" required></label>
  <label>제안서 이름 *<input id="sr-title" required maxlength="120" placeholder="예: 바비 × 장원영 IP 콜라보레이션 제안서"></label>
  <datalist id="sr-ents">${entities().filter(e => !e.hidden).map(e => `<option value="${esc(e.name)}">`).join('')}</datalist>
  <div class="field"><span class="flabel">IP</span><div id="sr-ip"></div></div>
  <label>수신사<input id="sr-to" list="sr-ents" maxlength="80"></label>
  <div class="field"><span class="flabel">작성자</span><div id="sr-author"></div></div>
  <div id="sr-error" style="color:#ba775e;margin-top:14px;font-size:12px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">레퍼런스 등록</button></div></form>`);
  const ips = ipChips($('#sr-ip'), [], 'sr-ents');
  const authors = memberChips($('#sr-author'), [], {note: '<span class="err">빨간 이름</span>은 헤임달에 등록되지 않은 사람입니다.'});
  $('#sr-file').onchange = () => { const f = $('#sr-file').files[0]; if (f && !$('#sr-title').value) $('#sr-title').value = f.name.replace(/\.(pdf|pptx)$/i, ''); };
  $('#sr-form').onsubmit = async ev => {
    ev.preventDefault();
    const f = $('#sr-file').files[0]; if (!f) return;
    if (f.size > 100e6) { $('#sr-error').textContent = '100MB 이하 파일을 선택해 주세요.'; return; }
    const btn = $('#sr-form [type=submit]'); btn.disabled = true; btn.textContent = '업로드 중…';
    const ext = (f.name.match(/\.(pdf|pptx)$/i)?.[1] || 'pdf').toLowerCase(), path = `refs/${today()}/${uid()}.${ext}`;
    const up = await SB.storage.from('pt-studio').upload(path, f, {contentType: f.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'), upsert: false});
    if (up.error) { btn.disabled = false; btn.textContent = '등록'; $('#sr-error').textContent = '파일을 업로드하지 못했습니다: ' + up.error.message; return; }
    const { data, error } = await SB.from('pt_proposal_ref').insert({title: $('#sr-title').value.trim(), ip_names: ips.value().join(', '), recipient: $('#sr-to').value.trim(), author: authors.value().join(', '), file_path: path, file_size: f.size, is_default: !(studio.refs || []).length}).select().single();
    if (error) { btn.disabled = false; btn.textContent = '등록'; $('#sr-error').textContent = '등록하지 못했습니다: ' + error.message; return; }
    await SB.from('pt_proposal_job').insert({ref_id: data.id, kind: 'analyze_reference', input: {file_path: path}});
    $('#modal').close(); studio.refs = null; studio.list = null; await loadStudio(); toast('레퍼런스를 등록했습니다.');
  };
}

/* ---------- 내보내기 · 이동 ---------- */
function download(name, rows) {
  const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/^[=+@-]/, "'").replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿', csv], {type: 'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(name + ' 파일을 내보냈습니다.');
}
function exportCSV() {
  const arr = page === 'contacts' ? contacts() : entities().filter(match);
  download(page === 'contacts' ? 'pantheon-contacts.csv' : 'pantheon-entities.csv', [['이름', '영문 이름', '유형', '소속 / 회사 연결', '직함', '관계 근거', '등록된 담당자', '내부 담당자', '연락처(업무)'], ...arr.map(e => [e.name, e.en, e.type, agencyOf(e), e.role, e.rel, contactsOf(e).map(c => c.name).join(' / '), e.owners.join(' / '), e.points.join(' / ')])]);
}
function go(p) { page = p; filter = '전체'; entState = '전체'; query = ''; $('#global-search').value = ''; try { history.replaceState(null, '', '#' + p); } catch {} render(); window.scrollTo(0, 0); }
/* ---------- IP 차트 (10-31) — 요즘 뜨는 신규 IP · 전체 IP 순위 (sql/012 · 봇 ipchart.py 가 하루 4번 갱신) ---------- */
const IPK = {kpop: 'K-POP', character: '캐릭터', animation: '애니메이션', movie: '영화', ott: 'OTT', influencer: '인플루언서', other: '기타'};
const IPP = [['rt', '실시간', '전일 대비'], ['day', '일간', '전일 대비'], ['week', '주간', '전주 대비'], ['month', '월간', '전월 대비'], ['year', '연간', '전년 대비'], ['range', '기간 설정', '직전 같은 기간 대비']];
const ipc = {chart: 'new', period: 'rt', kind: 'all', from: '', to: '', rows: null, ips: {}, run: null, err: '', key: '', poll: null, open: null, openChart: ''};
const ipKst = iso => { try { const d = new Date(new Date(iso).getTime() + 9 * 3600e3); return `${d.getUTCMonth() + 1}.${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; } catch { return ''; } };
function ipRange() {
  const now = Date.now(), day = 864e5, len = {day: 1, week: 7, month: 30, year: 365}[ipc.period];
  if (len) return {p_from: new Date(now - len * day).toISOString(), p_to: new Date(now).toISOString()};
  if (ipc.period === 'range' && ipc.from && ipc.to) return {p_from: new Date(ipc.from + 'T00:00:00+09:00').toISOString(), p_to: new Date(new Date(ipc.to + 'T00:00:00+09:00').getTime() + day).toISOString()};
  return {};
}
const IP_RUN = 'id,at,status,progress,step,done_at';
// 순위 기준 — 봇 ipchart.py 의 score()·SEGS·POOL_HOURS·DECAY 와 같은 내용 (바꾸면 둘 다)
const IP_HOW = `<details class="ipc-how"><summary>순위 기준 — 어떻게 매기나요?</summary><div class="ipc-how-body">
  <h4>무엇을 모으나</h4><p>하루 4번(오전 2·8시, 오후 2·8시) 웹에서 최근 7일 안팎의 기사·음원 차트·OTT 순위·SNS 화제·조회수를 찾아, 11갈래(K-POP 신인 보이그룹·걸그룹 · K-POP · 국내 캐릭터 · 해외·게임 캐릭터 · 애니메이션 · 영화 · 드라마 · 예능 · 유튜버 · SNS 크리에이터)에서 IP 330여 개를 모읍니다. 지난 3일 사이 나온 IP도 후보로 남겨 두고, 이번에 다시 나오지 않으면 갱신마다 점수가 15%씩 줄어듭니다.</p>
  <h4>점수 (100점 만점)</h4><table class="ipc-how-t"><thead><tr><th>항목</th><th>뜻</th><th>신규 IP</th><th>전체 IP</th></tr></thead><tbody>
  <tr><td>상승 속도</td><td>최근 7일 사이 얼마나 빨리 떴는지 (갑자기 뜰수록 높음)</td><td>40%</td><td>25%</td></tr>
  <tr><td>화제 크기</td><td>지금 기사·차트·SNS 에서 다루는 규모</td><td>25%</td><td>50%</td></tr>
  <tr><td>네이버 검색 추이</td><td>네이버 데이터랩 최근 7일 평균 ÷ 그 앞 7일 평균 (같으면 50점, 4배면 100점)</td><td>20%</td><td>15%</td></tr>
  <tr><td>유튜브 구독자 증가</td><td>공식 채널 하루 구독자 증가율 (하루 +5%면 100점)</td><td>15%</td><td>10%</td></tr></tbody></table>
  <p>상승 속도와 화제 크기는 검색한 근거를 보고 0~100점으로 매기고, 네이버·유튜브는 실제 수치로 계산합니다. 수치를 아직 확인하지 못한 항목은 빼고 나머지 비중으로 나눠 계산합니다. 네이버 검색 추이는 순위를 매긴 뒤 위쪽 IP부터 확인해 점수에 다시 반영합니다.</p>
  <h4>두 차트</h4><p><b>신규 IP</b>는 최근 2년 안에 데뷔·공개했거나 최근 갑자기 뜬 IP만 모아 상승 속도에 무게를 둡니다. <b>전체 IP</b>는 신규·기존을 모두 넣고 지금 화제 크기에 무게를 둡니다. 차트마다 1~200위까지 보여 줍니다.</p>
  <h4>기간과 변동</h4><p>실시간은 마지막 갱신 순위이고, 하루 전 갱신과 비교해 ▲▼를 표시합니다. 일간(24시간)·주간(7일)·월간(30일)·연간(365일)·기간 설정은 그 기간 갱신들의 평균 점수로 다시 매기며, 이번에 나오지 않은 갱신은 0점으로 셉니다. 변동은 바로 앞 같은 길이 기간과 비교합니다. NEW는 비교 기간에 순위에 없던 IP입니다.</p>
</div></details>`;
async function loadChart() {
  const key = [ipc.chart, ipc.period, ipc.from, ipc.to].join('|'); ipc.key = key;
  if (ipc.period === 'range' && !(ipc.from && ipc.to)) { ipc.rows = []; if (page === 'chart') render(); return; }
  const [ch, run] = await Promise.all([SB.rpc('pt_ip_chart', {p_chart: ipc.chart, ...ipRange()}), SB.from('pt_ip_run').select(IP_RUN).order('at', {ascending: false}).limit(1)]);
  if (key !== ipc.key) return;
  if (ch.error) { ipc.err = '차트를 불러오지 못했습니다: ' + ch.error.message; ipc.rows = []; if (page === 'chart') render(); return; }
  const ids = ch.data.map(r => r.ip).filter(id => !ipc.ips[id]);
  for (let i = 0; i < ids.length; i += 100) { const { data } = await SB.from('pt_ip').select('*').in('id', ids.slice(i, i + 100)); (data || []).forEach(x => ipc.ips[x.id] = x); }
  if (key !== ipc.key) return;
  ipc.rows = ch.data; ipc.run = run.data?.[0] || null; ipc.err = '';
  if (page === 'chart') render();
  ipPoll();
}
// 갱신 중이면 3초마다 진행 상황, 아니면 1분마다 새 갱신이 끝났는지 — 끝나면 차트와 열린 상세를 다시 읽는다
function ipPoll() {
  clearTimeout(ipc.poll);
  const busy = ['wait', 'work'].includes(ipc.run?.status);
  ipc.poll = setTimeout(async () => {
    if (page !== 'chart') return;
    const { data } = await SB.from('pt_ip_run').select(IP_RUN).order('at', {ascending: false}).limit(1);
    const r = data?.[0], o = ipc.run;
    ipc.run = r || null;
    if (r && r.status === 'done' && (!o || r.id !== o.id || o.status !== 'done')) { ipc.ips = {}; await loadChart(); if (ipc.open && !$('#drawer').hidden) openIp(ipc.open, true); return; }
    const el = $('#ipc-prog'), rb = $('#ipc-refresh');
    if (el) el.outerHTML = ipProg();
    if (rb) rb.disabled = ['wait', 'work'].includes(r?.status);
    ipPoll();
  }, busy ? 3000 : 60000);
}
function ipProg() {
  const r = ipc.run;
  if (!r || !['wait', 'work'].includes(r.status)) return '<div id="ipc-prog" hidden></div>';
  if (r.status === 'wait' || !r.progress) return `<div id="ipc-prog" class="ipc-prog"><span class="bar indet"><i></i></span><small>순위를 새로 매길 준비를 하는 중<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></small></div>`;
  return `<div id="ipc-prog" class="ipc-prog"><span class="row"><span class="bar"><i style="width:${r.progress}%"></i></span><b>${r.progress}%</b></span><small>순위 갱신 중 · ${esc(r.step || '')}<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></small></div>`;
}
const ipArt = (ip, cls = '') => { const s = imgSrc(ip.img_path); return `<span class="ipc-art ${cls}">${s ? `<img src="${s}" alt="" loading="lazy">` : `<b>${esc((ip.name_en || ip.name).slice(0, 2).toUpperCase())}</b>`}</span>`; };
function ipChg(r) {
  if (r.prev_pos == null) return r.has_prev ? '<span class="ipc-chg new">NEW</span>' : '<span class="ipc-chg">–</span>';
  const d = r.prev_pos - r.pos;
  return d > 0 ? `<span class="ipc-chg up" aria-label="${d}단계 상승">▲${d}</span>` : d < 0 ? `<span class="ipc-chg down" aria-label="${-d}단계 하락">▼${-d}</span>` : '<span class="ipc-chg">–</span>';
}
function chartView() {
  if (!ipc.rows) { setTimeout(loadChart); return '<div class="empty"><p>불러오는 중입니다<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>'; }
  const per = IPP.find(p => p[0] === ipc.period);
  const rows = ipc.rows.filter(r => ipc.ips[r.ip] && !ipc.ips[r.ip].hidden && (ipc.kind === 'all' || ipc.ips[r.ip].kind === ipc.kind));
  const kinds = ['all', ...Object.keys(IPK).filter(k => k !== 'other' && ipc.rows.some(r => ipc.ips[r.ip]?.kind === k))];
  const basis = ipc.rows[0]?.basis, busy = ['wait', 'work'].includes(ipc.run?.status);
  const head = `<div class="ipc-head"><div class="tabs">${[['new', '신규 IP'], ['all', '전체 IP']].map(([k, t]) => `<button class="tab ${ipc.chart === k ? 'active' : ''}" data-ipc-chart="${k}">${t}</button>`).join('')}</div><button class="button" id="ipc-refresh" ${busy ? 'disabled' : ''}>${icon('clock')} 지금 갱신</button></div>
    <div class="ipc-periods">${IPP.map(([k, t]) => `<button class="ar-chip ${ipc.period === k ? 'on' : ''}" data-ipc-period="${k}">${t}</button>`).join('')}</div>${ipc.period === 'range' ? `<div class="ipc-range"><input type="date" id="ipc-from" value="${esc(ipc.from)}" aria-label="시작일"><span>~</span><input type="date" id="ipc-to" value="${esc(ipc.to)}" aria-label="종료일"><button class="button primary" id="ipc-range-go">보기</button></div>` : ''}
    <div class="ar-kinds ipc-kinds">${kinds.map(k => `<button class="ar-chip ${ipc.kind === k ? 'on' : ''}" data-ipc-kind="${k}">${k === 'all' ? '전체' : IPK[k]}</button>`).join('')}</div>`;
  const list = rows.length ? `<ol class="ipc-list">${rows.map(r => { const ip = ipc.ips[r.ip]; return `<li class="ipc-row" data-ip="${ip.id}" tabindex="0" role="button" aria-label="${esc(ip.name)} 상세보기"><div class="ipc-rank"><b>${r.pos}</b>${ipChg(r)}</div>${ipArt(ip)}<div class="ipc-main"><div class="ipc-name"><b>${esc(ip.name)}</b><span class="pill">${esc(IPK[ip.kind] || '기타')}</span></div><p>${esc(ip.summary)}</p><small>${esc([ip.owner, ip.since].filter(Boolean).join(' · '))}</small></div><span class="button ipc-more">상세보기</span></li>`; }).join('')}</ol>`
    : `<div class="empty"><p>${ipc.period === 'range' && !(ipc.from && ipc.to) ? '시작일과 종료일을 고른 뒤 「보기」를 눌러 주세요.' : ipc.rows.length ? '이 종류의 IP가 아직 없습니다.' : busy ? '첫 순위를 매기고 있습니다. 끝나면 자동으로 나타납니다.' : '이 기간에 쌓인 순위가 없습니다. 순위는 하루 4번 새로 매기며, 기록이 쌓일수록 긴 기간 순위를 볼 수 있습니다.'}</p></div>`;
  return `${ipc.err ? `<div class="notice">${esc(ipc.err)}</div>` : ''}${ipProg()}${IP_HOW}<section class="panel"><div class="panel-head"><div class="panel-title">${ipc.chart === 'new' ? '신규 IP 차트' : '전체 IP 차트'} <small>${esc(per[1])}${basis ? ' · ' + ipKst(basis) + ' 기준' : ''}</small></div><span class="ipc-note">순위 변동 · ${esc(per[2])}</span></div>${head}${list}</section>`;
}
function bindChart() {
  $$('[data-ipc-chart]').forEach(b => b.onclick = () => { ipc.chart = b.dataset.ipcChart; ipc.rows = null; render(); });
  $$('[data-ipc-period]').forEach(b => b.onclick = () => { ipc.period = b.dataset.ipcPeriod; if (ipc.period === 'range' && !ipc.to) { ipc.to = today(); ipc.from = new Date(Date.now() + 9 * 3600e3 - 6 * 864e5).toISOString().slice(0, 10); } ipc.rows = null; render(); });
  $('#ipc-range-go')?.addEventListener('click', () => { const f = $('#ipc-from').value, t = $('#ipc-to').value; if (!f || !t || f > t) return toast('시작일이 종료일보다 늦지 않게 골라 주세요.'); ipc.from = f; ipc.to = t; ipc.rows = null; render(); });
  $$('[data-ipc-kind]').forEach(b => b.onclick = () => { ipc.kind = b.dataset.ipcKind; render(); });
  $$('[data-ip]').forEach(b => { b.onclick = () => openIp(b.dataset.ip); b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIp(b.dataset.ip); } }; });
  $('#ipc-refresh')?.addEventListener('click', async () => {
    const prev = ipc.run; ipc.run = {status: 'wait'}; render();
    const { error } = await SB.from('pt_ip_run').insert({status: 'wait'});
    if (error) { ipc.run = prev; render(); return toast('갱신을 요청하지 못했습니다: ' + error.message); }
    const { data } = await SB.from('pt_ip_run').select(IP_RUN).order('at', {ascending: false}).limit(1); ipc.run = data?.[0] || ipc.run;
    toast('순위 갱신을 요청했습니다. 판테온 봇이 바로 시작합니다.'); ipPoll();
  });
}
// 순위 기록 그래프 — 1위가 위 · 점에 마우스를 올리면 그때 순위
function ipRankSvg(log) {
  if (log.length < 2) return '<p class="ipc-muted">기록이 두 번 이상 쌓이면 순위 그래프가 나옵니다.</p>';
  const W = 640, H = 180, L = 40, R = 14, T = 14, B = 26, t0 = new Date(log[0].at).getTime(), t1 = new Date(log.at(-1).at).getTime();
  const maxR = Math.max(10, ...log.map(x => x.rank)), x = t => L + (W - L - R) * ((new Date(t).getTime() - t0) / Math.max(t1 - t0, 1)), y = r => T + (H - T - B) * ((r - 1) / (maxR - 1));
  const ticks = [1, Math.ceil(maxR / 2), maxR];
  const pts = log.map(p => `${x(p.at).toFixed(1)},${y(p.rank).toFixed(1)}`).join(' ');
  return `<svg class="ipc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="순위 기록 그래프">${ticks.map(r => `<line x1="${L}" x2="${W - R}" y1="${y(r)}" y2="${y(r)}" class="g"/><text x="${L - 8}" y="${y(r) + 4}" text-anchor="end">${r}위</text>`).join('')}<text x="${L}" y="${H - 6}">${ipKst(log[0].at)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${ipKst(log.at(-1).at)}</text><polyline points="${pts}" class="l"/>${log.map(p => `<g class="pt"><circle cx="${x(p.at)}" cy="${y(p.rank)}" r="11" class="hit"/><circle cx="${x(p.at)}" cy="${y(p.rank)}" r="4" class="d"/><title>${ipKst(p.at)} · ${p.rank}위</title></g>`).join('')}</svg>`;
}
const ipNorm = s => String(s || '').toLowerCase().replace(/\(주\)|주식회사|㈜|inc\.?|co\.?,?\s*ltd\.?|corp\.?|entertainment|엔터테인먼트|[\s\W_]+/g, '');
function ipEntities(ip) {
  const hay = [ip.owner, ip.manager].map(ipNorm).filter(x => x.length >= 2);
  if (!hay.length) return [];
  return entities().filter(e => !e.hidden && [e.name, e.en, ...e.aliases].map(ipNorm).some(n => n.length >= 2 && hay.some(h => h.includes(n) || n.includes(h)))).slice(0, 4);
}
async function openIp(id, keep) {
  ipc.open = id;
  if (!keep) setRoute(id);
  const ip = ipc.ips[id] || (await SB.from('pt_ip').select('*').eq('id', id).maybeSingle()).data;
  if (!ip) return toast('IP 정보를 찾지 못했습니다.');
  ipc.ips[id] = ip;
  const { data: log } = await SB.from('pt_ip_rank').select('at,rank,chart').eq('ip_id', id).gte('at', new Date(Date.now() - 30 * 864e5).toISOString()).order('at');
  if (ipc.open !== id) return;
  const by = k => (log || []).filter(x => x.chart === k), cur = k => by(k).at(-1);
  const tabC = [ipc.openChart, ipc.chart, 'new', 'all'].find(k => k && by(k).length) || 'new';
  const c = ip.contact || {}, L = ip.links || {}, s = ip.signals || {};
  const ents = ipEntities(ip), people = ents.flatMap(e => contactsOf(e).map(p => ({p, e})));
  const url = (u, base, at) => !u ? '' : /^https?:/.test(u) ? u : base ? base + (at ? '@' : '') + String(u).replace(/^@/, '') : 'https://' + u;
  const linkA = (u, t) => u ? `<a class="ar-chip" href="${esc(u)}" target="_blank" rel="noopener">${t}</a>` : '';
  const nv = Array.isArray(s.naver) ? s.naver : null;
  const lg = by(tabC), table = lg.slice().reverse().slice(0, 12).map((p, i, a) => { const o = a[i + 1], d = o ? o.rank - p.rank : 0; return `<tr><td>${ipKst(p.at)}</td><td><b>${p.rank}위</b></td><td>${!o || !d ? '–' : d > 0 ? `<span class="ipc-chg up">▲${d}</span>` : `<span class="ipc-chg down">▼${-d}</span>`}</td></tr>`; }).join('');
  const html = `<div class="ipc-detail">
    <div class="ipc-top">${ipArt(ip, 'big')}<div><span class="pill">${esc(IPK[ip.kind] || '기타')}</span>${ip.is_new ? ' <span class="pill good">신규</span>' : ''}<h2>${esc(ip.name)}</h2><small>${esc([ip.name_en, ip.since && ip.since + ' 데뷔·공개'].filter(Boolean).join(' · '))}</small>
      <div class="ipc-now">${[['new', '신규 IP'], ['all', '전체 IP']].map(([k, t]) => { const x = cur(k); return x ? `<span><small>${t}</small><b>${x.rank}위</b></span>` : ''; }).join('')}</div></div></div>
    <section><h3>왜 뜨고 있나</h3><p class="ipc-why">${esc(ip.summary || '—')}</p></section>
    <section><h3>지금 트렌드</h3><p>${esc(ip.trend || '—')}</p>${ip.updated_at ? `<small class="ipc-muted">${ipKst(ip.updated_at)} 갱신</small>` : ''}</section>
    <section><div class="ipc-sec-head"><h3>순위 기록 <small>최근 30일</small></h3><div class="tabs">${[['new', '신규'], ['all', '전체']].filter(([k]) => by(k).length).map(([k, t]) => `<button class="tab ${tabC === k ? 'active' : ''}" data-ipo-chart="${k}">${t}</button>`).join('')}</div></div>${ipRankSvg(lg)}${table ? `<div class="table-wrap"><table class="ipc-log"><thead><tr><th>갱신</th><th>순위</th><th>변동</th></tr></thead><tbody>${table}</tbody></table></div>` : ''}</section>
    ${(ip.issues || []).length ? `<section><h3>최근 이슈</h3><ul class="ipc-issues">${ip.issues.map(x => `<li><small>${esc(x.date || '')}</small> ${/^https?:/.test(x.url || '') ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || x.url)}</a>` : esc(x.title || '')}</li>`).join('')}</ul></section>` : ''}
    <section><h3>수치</h3><div class="ipc-stats">${s.buzz != null ? `<span><small>화제 크기</small><b>${s.buzz}</b></span>` : ''}${s.momentum != null ? `<span><small>상승 속도</small><b>${s.momentum}</b></span>` : ''}${s.yt_subs ? `<span><small>유튜브 구독자</small><b>${Number(s.yt_subs).toLocaleString('ko-KR')}</b></span>` : ''}${s.naver_x ? `<span><small>네이버 검색 (지난주 대비)</small><b>${s.naver_x}배</b></span>` : ''}</div>${nv ? `<div class="ipc-spark" role="img" aria-label="최근 14일 네이버 검색 추이">${nv.map(v => `<i style="height:${Math.max(3, v)}%" title="${v}"></i>`).join('')}</div><small class="ipc-muted">최근 14일 네이버 검색 추이</small>` : ''}</section>
    <section><h3>소유사·관리사</h3><dl class="ipc-dl"><dt>소유사</dt><dd>${esc(ip.owner || '—')}</dd>${ip.manager ? `<dt>관리사</dt><dd>${esc(ip.manager)}</dd>` : ''}</dl>
      <h4>공식 문의처</h4>${c.email || c.phone || c.url ? `<dl class="ipc-dl">${c.email ? `<dt>이메일</dt><dd><span id="ipc-mail">${esc(c.email)}</span> <a class="point-go" href="mailto:${esc(c.email)}">메일</a> <button class="point-go" data-copy="ipc-mail" type="button">복사</button></dd>` : ''}${c.phone ? `<dt>전화</dt><dd>${esc(c.phone)} <a class="point-go" href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ''))}">전화</a></dd>` : ''}${/^https?:/.test(c.url || '') ? `<dt>문의 페이지</dt><dd><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url)}</a></dd>` : ''}${c.note ? `<dt>비고</dt><dd>${esc(c.note)}</dd>` : ''}</dl>${/^https?:/.test(c.source || '') ? `<small class="ipc-muted">출처 <a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.source)}</a></small>` : ''}` : '<p class="ipc-muted">공개된 문의처를 아직 찾지 못했습니다.</p>'}
      <h4>등록된 담당자</h4>${people.length ? linkList(people.map(x => ({id: x.p.id, name: x.p.name, role: [x.e.name, x.p.role, x.p.points[0]].filter(Boolean).join(' · ')}))) : ents.length ? `${linkList(ents)}<p class="ipc-muted">이 회사에 등록된 담당자가 없습니다.</p>` : '<p class="ipc-muted">판테온에 등록된 담당자가 없습니다.</p>'}</section>
    ${[L.site, L.youtube, L.instagram, L.x, L.tiktok].some(Boolean) ? `<section><h3>공식 채널</h3><div class="ar-kinds">${linkA(url(L.site), '공식 사이트')}${linkA(url(L.youtube, 'https://www.youtube.com/', 1), '유튜브')}${linkA(url(L.instagram, 'https://www.instagram.com/'), '인스타그램')}${linkA(url(L.x, 'https://x.com/'), 'X')}${linkA(url(L.tiktok, 'https://www.tiktok.com/', 1), '틱톡')}</div></section>` : ''}
  </div>`;
  showDrawer(html, keep, 'IP CHART');
  $$('#drawer [data-ipo-chart]').forEach(b => b.onclick = () => { ipc.openChart = b.dataset.ipoChart; openIp(id, true); });
  if (ip.img_path && !imgSrc(ip.img_path)) setTimeout(() => ipc.open === id && !$('#drawer').hidden && openIp(id, true), 900);
}

function bindContent() {
  $$('[data-page]').forEach(b => b.onclick = ev => { ev.preventDefault(); go(b.dataset.page); });
  $$('[data-state]').forEach(b => b.onclick = () => { entState = b.dataset.state; render(); });
  $$('[data-state-go]').forEach(b => b.onclick = () => { go('entities'); entState = b.dataset.stateGo; render(); });
  $$('[data-view]').forEach(b => b.onclick = () => { entView = b.dataset.view; try { localStorage.setItem('pt-ent-view', entView); } catch {} render(); });
  $$('[data-sort]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const k = b.dataset.sort; entSort = entSort.k === k ? {k, d: -entSort.d} : {k, d: ['contacts', 'updated'].includes(k) ? -1 : 1}; render(); });
  $$('[data-add]').forEach(b => b.onclick = () => $('#add-btn').click());
  $$('[data-open-ent]').forEach(b => b.onclick = ev => { ev.stopPropagation(); openDetail(b.dataset.openEnt); });
  $$('#content .point-go').forEach(a => a.addEventListener('click', ev => ev.stopPropagation()));
  { const lq = $('#local-q'); if (lq) { let comp = false, t;        // 입력하면 0.2초 뒤 바로 거름 · 한글 조합 중에는 기다림
    const run = () => { clearTimeout(t); t = setTimeout(() => { query = lq.value; $('#global-search').value = ''; render(); const n = $('#local-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 200); };
    lq.addEventListener('compositionstart', () => { comp = true; clearTimeout(t); }); lq.addEventListener('compositionend', () => { comp = false; run(); });
    lq.addEventListener('input', e => { if (!comp && !e.isComposing) run(); }); } }
  $$('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; render(); });
  // 목록 안 검색 (엔티티 DB·연락처) — 키워드만, 지금 보는 목록에서 거름
  $('#local-form')?.addEventListener('submit', ev => { ev.preventDefault(); query = $('#local-q').value.trim(); render(); $('#local-q')?.focus(); });
  $$('.q-clear').forEach(b => b.onclick = () => { query = ''; $('#global-search').value = ''; render(); $('#local-q')?.focus(); });
  $$('[data-filter-go]').forEach(b => b.onclick = () => { go('entities'); filter = b.dataset.filterGo; render(); });
  $$('[data-stat]').forEach(b => { const open = () => { const v = b.dataset.stat; if (v === 'contacts') return go('contacts'); go('entities'); if (v === LINKED) entState = '담당자 있음'; else filter = v; render(); }; b.onclick = open; b.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } }; });
  $$('[data-detail]').forEach(b => { b.onclick = () => openDetail(b.dataset.detail); b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(b.dataset.detail); } }; });
  $('#admin-export')?.addEventListener('click', exportCSV);
  bindAsk(); if (page === 'admin') bindAdmin(); if (page === 'studio') bindStudio(); if (page === 'chart') bindChart();
}

/* ---------- 로그인 ---------- */
function loginScreen(msg) {
  $('#login').hidden = false;
  $('#login').innerHTML = `<form class="login-box" id="login-form"><div class="brand"><span class="brand-mark">Π</span>PANTHEON<span class="brand-dot">®</span></div><p>헤임달 계정으로 로그인합니다.<br>헤임달에 가입 완료된 더올마이티 임직원만 로그인이 가능합니다.</p><label>이메일<input id="lg-email" type="email" autocomplete="username" required></label><label>비밀번호<input id="lg-pw" type="password" autocomplete="current-password" required></label><div id="lg-err" role="alert" style="color:#ba775e;font-size:12px;margin-top:10px">${esc(msg || '')}</div><button class="button primary" type="submit" style="width:100%;justify-content:center;margin-top:16px">로그인</button><button class="text-btn" type="button" id="lg-reset" style="margin-top:14px;font-size:12px">비밀번호를 잊으셨나요? 비밀번호 찾기</button></form>`;
  $('#login-form').onsubmit = async ev => {
    ev.preventDefault(); $('#lg-err').textContent = ''; $('#lg-err').style.color = '#ba775e';
    const { error } = await SB.auth.signInWithPassword({email: $('#lg-email').value.trim(), password: $('#lg-pw').value});
    if (error) { $('#lg-err').textContent = '이메일 또는 비밀번호가 맞지 않습니다.'; return; }
    start();
  };
  $('#lg-reset').onclick = async () => {
    const email = $('#lg-email').value.trim(), out = $('#lg-err');
    if (!email) { out.textContent = '이메일을 먼저 입력해 주세요. 입력한 주소로 비밀번호 재설정 메일을 발송합니다.'; $('#lg-email').focus(); return; }
    $('#lg-reset').disabled = true;
    const { error } = await SB.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname});
    $('#lg-reset').disabled = false;
    out.style.color = error ? '#ba775e' : '#38674d';
    out.textContent = error ? '메일을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.' : `${email}(으)로 비밀번호 재설정 메일을 발송했습니다. 메일의 링크를 클릭하면 새 비밀번호를 설정할 수 있습니다.`;
  };
}
// 메일 링크로 들어온 분 — 새 비밀번호. 헤임달과 같은 계정이라 헤임달 비밀번호도 이것으로 바뀐다
function recoveryScreen(msg) {
  $('#login').hidden = false;
  $('#login').innerHTML = `<form class="login-box" id="np-form"><div class="brand"><span class="brand-mark">Π</span>PANTHEON<span class="brand-dot">®</span></div><p><b>새 비밀번호를 설정해 주세요.</b><br>헤임달과 같은 계정이므로, 여기서 변경하면 헤임달 비밀번호도 함께 변경됩니다.</p><label>새 비밀번호 (8자 이상)<input id="np1" type="password" autocomplete="new-password" required minlength="8"></label><label>새 비밀번호 다시 한 번<input id="np2" type="password" autocomplete="new-password" required minlength="8"></label><div id="np-err" role="alert" style="color:#ba775e;font-size:12px;margin-top:10px">${esc(msg || '')}</div><button class="button primary" type="submit" style="width:100%;justify-content:center;margin-top:16px">비밀번호 변경</button></form>`;
  $('#np1').focus();
  $('#np-form').onsubmit = async ev => {
    ev.preventDefault(); const a = $('#np1').value, b = $('#np2').value;
    if (a.length < 8) return recoveryScreen('비밀번호는 8자 이상으로 설정해 주세요.');
    if (a !== b) return recoveryScreen('입력한 두 비밀번호가 일치하지 않습니다.');
    const btn = $('#np-form [type=submit]'); btn.disabled = true; btn.textContent = '변경하는 중…';
    const { error } = await SB.auth.updateUser({password: a});
    if (error) return recoveryScreen(/same|different/i.test(error.message) ? '현재 비밀번호와 다른 비밀번호를 입력해 주세요.' : '비밀번호를 변경하지 못했습니다. 메일 링크가 만료되었을 수 있으니 비밀번호 찾기를 다시 진행해 주세요.');
    RECOVERY = false; try { history.replaceState(null, '', location.pathname); } catch {}
    toast('비밀번호를 변경했습니다. 헤임달에서도 새 비밀번호로 로그인하세요.'); start();
  };
}
async function start() {
  const { data: { session } } = await SB.auth.getSession();
  if (!session) return loginScreen();
  if (RECOVERY) return recoveryScreen();
  me = session.user;
  const [can, adm, mem, sc, ic] = await Promise.all([SB.rpc('pt_can_use'), SB.rpc('pt_is_admin'), SB.from('hd_member').select('name,role').eq('id', me.id).maybeSingle(), SB.rpc('pt_studio_can'), SB.rpc('pt_ipchart_can')]);
  studioCan = !sc.error && !!sc.data; ipcCan = !ic.error && !!ic.data;            // 제안서 스튜디오 — 시험 기간 3명만 (함수가 없거나 거절이면 숨김)
  if (!can.data) { await SB.auth.signOut(); return loginScreen('헤임달에서 아직 승인되지 않은 계정입니다. 승인 후 다시 로그인해 주세요.'); }
  isAdmin = !!adm.data; myName = mem.data?.name || me.email;
  $('#login').hidden = true;
  $('#profile').innerHTML = `<span class="avatar">${esc(myName.slice(0, 1))}</span><span>${esc(myName)}<small>${isAdmin ? 'DB 관리자' : '구성원'}</small></span>${isAdmin ? '<span class="admin">ADMIN</span>' : ''}`;
  $('.top-avatar').textContent = myName.slice(0, 1);
  SB.from('pt_profile').select('slack_image').eq('member_id', me.id).maybeSingle().then(({data}) => {   // 판테온 봇이 채운 슬랙 프로필 사진
    const u = data?.slack_image; if (!u) return;
    const img = `<img src="${esc(u)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    $('.top-avatar').innerHTML = img; const a = $('#profile .avatar'); if (a) { a.innerHTML = img; a.style.overflow = 'hidden'; }
  });
  try { await load(); } catch (e) { $('#content').innerHTML = `<div class="notice">판테온 DB를 불러오지 못했습니다: ${esc(e?.message || '')}</div>`; return; }
  const [h, id] = location.hash.slice(1).split('/'); page = h && !h.includes('=') ? h : 'home'; render();
  if (id) openRoute(page, id);
}

$('#search-icon').innerHTML = icon('search'); $('#bell-icon').innerHTML = icon('bell');
$('#global-search').oninput = e => {
  query = e.target.value;
  if (!query.trim()) { if (page === 'search') page = backPage; query = ''; return render(); }       // 지우면 원래 화면으로
  if (page !== 'search') { backPage = page; page = 'search'; }
  render();
};
function searchGo() {          // Enter — 결과가 하나(또는 이름이 정확히 같은 것이 하나)면 바로 상세, 없으면 안내
  const q = $('#global-search').value.trim(); if (!q) return;
  query = q; if (page !== 'search') { backPage = page; page = 'search'; } render();
  const hits = searchHits(q), exact = hits.filter(e => [e.name, e.en, ...e.aliases].some(x => x && normCo(x) === normCo(q)));
  const one = exact.length === 1 ? exact[0] : hits.length === 1 ? hits[0] : null;
  if (one) openDetail(one.id); else if (!hits.length) toast(NOT_FOUND);
}
{ let composing = false, want = false; const s = $('#global-search');      // 한글 조합 중 Enter 는 조합이 끝난 뒤에
  s.addEventListener('compositionstart', () => { composing = true; });
  s.addEventListener('compositionend', () => { composing = false; if (want) { want = false; searchGo(); } });
  s.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); if (composing || e.isComposing || e.keyCode === 229) { want = true; return; } searchGo(); }); }
$('#add-btn').onclick = () => page === 'contacts' ? contactModal() : page === 'studio' ? (studio.tab === 'refs' ? studioRefModal() : studioProjectModal()) : entityModal();
$('#export-btn').onclick = exportCSV;
$('#notification').onclick = () => go('home');
$('.top-avatar').onclick = () => $('#profile').click();      // 폰에서는 왼쪽 메뉴가 아래 막대가 되어 프로필이 위 오른쪽 사진으로
$('#profile').onclick = async () => { if (!me) return; modal(`<h2>내 계정</h2><p><b>${esc(myName)}</b> · ${isAdmin ? 'DB 관리자' : '구성원'}<br>${esc(me.email || '')}</p><p>로그아웃하면 헤임달에서도 함께 로그아웃됩니다.</p><div class="modal-actions"><button class="button" type="button" data-cancel>닫기</button><button class="button" type="button" id="logout-go">로그아웃</button></div>`); $('#logout-go').onclick = async () => { await SB.auth.signOut(); location.reload(); }; };
$('#overlay').onclick = closeDrawer;
SB.auth.onAuthStateChange(e => { if (e === 'PASSWORD_RECOVERY') { RECOVERY = true; recoveryScreen(); } });
window.addEventListener('hashchange', () => {
  if (ignoreHash) { ignoreHash = false; return; }
  const [h, id] = location.hash.slice(1).split('/');
  if (!me || !h || h.includes('=')) return;
  if (!id && !$('#drawer').hidden) { routed = false; hideDrawer(); }
  if (h !== page) { page = h; filter = '전체'; render(); }
  if (id) openRoute(h, id);
});
// 창(이미지 크게 보기 등)이 떠 있으면 Esc 는 그 창만 닫고 상세로 돌아간다 (10-29)
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) closeDrawer(); if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); $('#global-search').focus(); } });
start();
