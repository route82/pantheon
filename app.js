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
const icons = {studio:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>',home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',entities:'<path d="M12 3 3 8l9 5 9-5-9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5"/>',contacts:'<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8 17c0-4 8-4 8 0 M2 7h3 M2 12h3 M2 17h3"/>',admin:'<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 3 3-1 2 3 4-1 1-3 3-1 1-4-3-2 1-3-3-3-3 1Z"/><circle cx="12" cy="12" r="3"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',bell:'<path d="M5 16h14l-2-3V8a5 5 0 0 0-10 0v5l-2 3Z M10 20h4"/>',plus:'<path d="M12 5v14 M5 12h14"/>',download:'<path d="M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5"/>',arrow:'<path d="M4 12h16 m-5-5 5 5-5 5"/>',up:'<path d="m3 16 7-7 4 4 7-9 M15 4h6v6"/>',warning:'<path d="M12 3 2 21h20L12 3Z M12 9v5 M12 17v.2"/>',close:'<path d="m6 6 12 12 M6 18 18 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',link:'<path d="m9 15 6-6 M7 14l-2 2a3 3 0 0 0 4 4l4-4 M11 8l4-4a3 3 0 0 1 4 4l-2 2"/>'};
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
const menus = [['home','대시보드'],['entities','엔티티 DB'],['contacts','연락처'],['studio','제안서 스튜디오'],['admin','DB 관리']];
const navMenus = () => menus.filter(m => (m[0] !== 'admin' || isAdmin) && (m[0] !== 'studio' || studioCan));
const byId = id => all.find(e => e.id === id);
const isContact = e => e.type === '거래처 담당자';
const entities = () => all.filter(e => !isContact(e)), contacts = () => all.filter(isContact);
const contactsOf = e => all.filter(x => isContact(x) && x.parentId === e.id);
// 운영 브랜드 · 소속 IP·매체 (2026-10-26) — 브랜드·IP·매체의 소속 회사 = parent_id (거래처 담당자와 같은 연결)
const kidsOf = e => all.filter(x => !isContact(x) && x.parentId === e.id);
const HOLDERS = ['회사', '기관'];
const KID_TYPES = ['브랜드', 'IP·유명인', '미디어·매체', '미디어·OTT', '판매 채널'];
const kidsText = ks => !ks.length ? '' : ks.every(k => k.type === '브랜드') ? `브랜드 ${ks.length}개` : `연결 엔티티 ${ks.length}개`;

function fromRow(r) {
  const en = r.en || '';
  const w = en.split(/[\s\-:&]+/).filter(Boolean);
  return {id:r.id, type:r.kind, name:r.name, en, aliases:r.aliases||[], parentId:r.parent_id, agencyText:r.agency||'',
    role:r.role||'', rel:r.rel||'', points:r.points||[], facts:r.facts||[], note:r.note, sides:r.sides||[], owners:r.owners||[],
    img:r.img||'', cardImg:r.card_img||'', createdBy:r.created_by||'', first:r.first_seen||'', last:r.last_seen||'', hidden:!!r.hidden,
    color:COLOR[r.kind]||'', initial: en ? (w.length === 1 ? w[0].slice(0,3) : w.slice(0,3).map(x => x[0]).join('')).toUpperCase() : r.name.slice(0,2)};
}
// 등록한 직원 (10-28 홍석진 대표님 요청) — 누가 연락처·관계를 갖고 있는지. 웹·슬랙으로 등록한 사람
const registrar = e => (e.createdBy && (MEMBERS || []).find(m => m.id === e.createdBy)?.name) || '';
const agencyOf = e => (e.parentId && byId(e.parentId)?.name) || e.agencyText || '';
const toRow = p => {           // 화면 칸 → DB 칸 (보낸 것만)
  const m = {name:'name', en:'en', type:'kind', aliases:'aliases', parentId:'parent_id', agencyText:'agency', role:'role', rel:'rel',
             points:'points', facts:'facts', note:'note', sides:'sides', owners:'owners', img:'img', cardImg:'card_img', first:'first_seen', last:'last_seen'};
  const o = {}; for (const [k, v] of Object.entries(p)) if (m[k]) o[m[k]] = v; return o;
};

function toast(s) { $('#toast').textContent = s; $('#toast').classList.add('visible'); clearTimeout(window.tt); window.tt = setTimeout(() => $('#toast').classList.remove('visible'), 2800); }

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
function entityCard(e) { const c = contactsOf(e).length; return `<article class="entity-card" data-detail="${e.id}" tabindex="0" role="button" aria-label="${esc(e.name)} 상세 보기"><div class="entity-top">${avatar(e)}<div><b>${esc(e.name)}</b><small>${esc(e.en || agencyOf(e))}</small></div></div><span class="entity-category">${esc(e.type)}</span>${e.parentId && byId(e.parentId) ? ` <span class="entity-category">${esc(byId(e.parentId).name)}</span>` : ''}${e.hidden ? ' <span class="entity-category">숨김</span>' : ''}<p class="entity-rel ${e.rel ? '' : 'none'}">${esc(e.rel || '관계 근거 미입력 — 내부 담당자 확인이 필요합니다.')}</p><div class="card-bottom"><span>${[c ? '담당자 ' + c + '명' : '담당자 미등록', kidsText(kidsOf(e)), registrar(e) && '등록 ' + registrar(e)].filter(Boolean).join(' · ')}</span><span>상세 보기 ↗</span></div></article>`; }
function stats() { const es = entities(), cs = contacts(); return `<div class="stats"><div class="stat" data-stat="전체" role="button" tabindex="0" aria-label="엔티티 전체 보기"><div class="stat-label">${icon('entities')} 등록 엔티티</div><div class="stat-value">${es.length}<small>개</small></div><div class="stat-bottom"><span class="positive">판테온 DB</span> · 전 직원 공유</div></div><div class="stat" data-stat="contacts" role="button" tabindex="0" aria-label="연락처 보기"><div class="stat-label">${icon('contacts')} 거래처 담당자</div><div class="stat-value">${cs.length}<small>명</small></div><div class="stat-bottom">회사별로 연결해 관리</div></div><div class="stat" data-stat="IP·유명인" role="button" tabindex="0" aria-label="IP·유명인 보기"><div class="stat-label">${icon('up')} IP·유명인</div><div class="stat-value">${es.filter(e => e.type === 'IP·유명인').length}<small>명</small></div><div class="stat-bottom">계약·협업 중인 인물</div></div><div class="stat highlight" data-stat="담당자 연결" role="button" tabindex="0" aria-label="담당자 연결 회사 보기"><div class="stat-label">${icon('link')} 담당자 연결 회사</div><div class="stat-value">${es.filter(e => contactsOf(e).length).length}<small>곳</small></div><div class="stat-bottom">거래처 담당자가 등록된 회사</div></div></div>`; }
const EXAMPLES = ['골포스트가 협업한 리그·매체는?', '사운드스루 제작지원 브랜드 목록', '브이티코스메틱 담당자 누구야?', '포켓몬이랑 지금 뭐 하고 있어?'];
function askPanel() { return `<section class="panel ask-panel"><div class="panel-head"><div><div class="panel-title">무엇이든 물어보세요 <small>ASK PANTHEON</small></div><p class="panel-caption">판테온 DB를 검색해 Claude가 답변합니다. 슬랙 「Pantheon」 봇에서도 같은 답변을 받을 수 있습니다.</p></div></div><div class="ask-body"><div class="ask-row"><input id="ask-input" type="search" autocomplete="off" placeholder="예: 게티이미지 담당자 누구야?"><button class="button primary" id="ask-btn" type="button">질문하기</button></div><div class="ask-examples">${EXAMPLES.map(x => `<button type="button" data-ask="${esc(x)}">${esc(x)}</button>`).join('')}</div><div class="ask-answer" id="ask-answer" ${lastAnswer ? '' : 'hidden'}>${lastAnswer}</div></div></section>`; }
function alerts() { const es = entities(); const noC = es.filter(e => !contactsOf(e).length && !['기관','IP·유명인'].includes(e.type)).length, noRel = es.filter(e => !e.rel).length, ip = es.filter(e => e.type === 'IP·유명인').length; return `<section class="panel"><div class="panel-head"><div class="panel-title">확인이 필요한 항목</div><span class="alert-count">3건</span></div><div class="alert-list"><button class="alert-row" data-page="contacts"><span class="alert-symbol green">${icon('link')}</span><span class="alert-text">담당자가 등록되지 않은 곳<small>엔티티 ${noC}개 · 명함을 등록하면 연결됩니다</small></span></button><button class="alert-row" data-filter-go="전체"><span class="alert-symbol red">${icon('warning')}</span><span class="alert-text">관계 근거 미입력 엔티티<small>${noRel}개 · 내부 담당자 확인 필요</small></span></button><button class="alert-row" data-filter-go="IP·유명인"><span class="alert-symbol">${icon('up')}</span><span class="alert-text">활용 가능한 IP·유명인<small>${ip}명 · 엔티티 DB에서 보기</small></span></button></div></section>`; }
function filters() { const types = TYPES.filter(t => entities().some(e => e.type === t)); return `<div class="tabs">${['전체', ...types, LINKED].map(t => `<button class="tab ${filter === t ? 'active' : ''}" data-filter="${t}">${t}</button>`).join('')}</div>`; }
const hay = e => [e.name, e.en, registrar(e), agencyOf(e), e.role, e.rel, e.note, ...e.aliases, ...e.sides, ...e.owners, ...e.facts, ...e.points, ...kidsOf(e).flatMap(k => [k.name, k.en, ...k.aliases])].join(' ').toLowerCase();
const LINKED = '담당자 연결';   // 오버뷰 「담당자 연결 회사」 — 거래처 담당자가 연결된 회사만
const match = e => (filter === '전체' || e.type === filter || (filter === LINKED && contactsOf(e).length > 0)) && hay(e).includes(query.toLowerCase());
function contactTable(arr) { return `<div class="table-wrap"><table class="ct"><thead><tr><th>이름</th><th>회사 연결</th><th>직함</th><th>연락처(업무)</th><th>등록한 직원</th><th>명함</th></tr></thead><tbody>${arr.map(c => `<tr class="clickable" data-detail="${c.id}" tabindex="0"><td data-label="이름">${esc(c.name)}</td><td data-label="회사">${c.parentId ? `<span class="pill good">${esc(agencyOf(c))}</span>` : esc(c.agencyText || '회사 미연결')}</td><td data-label="직함">${esc(c.role || '—')}</td><td data-label="연락처">${esc(c.points[0] || '—')}</td><td data-label="등록한 직원">${esc(registrar(c) || '—')}</td><td data-label="명함">${c.cardImg ? '<span class="pill good">있음</span>' : '—'}</td></tr>`).join('') || `<tr><td colspan="6"><div class="empty">${NOT_FOUND}</div></td></tr>`}</tbody></table></div>`; }

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
  $('#nav').innerHTML = navMenus().map(([key, title]) => `<button class="nav-item ${page === key ? 'active' : ''}" data-page="${key}">${icon(key)}<span>${title}</span>${key === 'contacts' ? `<span class="nav-count">${contacts().length}</span>` : ''}</button>`).join('');
  const title = {home:['대시보드','거래처·IP·담당자 정보를 한곳에서 확인하세요.'], entities:['엔티티 DB','더올마이티·골포스트·사운드스루의 거래처·브랜드·기관·IP 목록입니다.'], contacts:['연락처','거래처 담당자의 연락처를 확인하고 바로 연락할 수 있습니다.'], studio:['제안서 스튜디오','IP 하나를 넣으면 사람은 결정 단계에서만 확인하고, 리서치·제안서·이미지는 판테온 봇이 이어서 만듭니다.'], search:['검색 결과', `「${query.trim()}」 검색 결과 ${searchHits(query).length}건입니다. 하나만 나오면 Enter로 바로 상세를 엽니다.`], admin:['DB 관리','누가 언제 무엇을 수정했는지 확인하고, 필요하면 이전 내용으로 복원할 수 있습니다.']}[page];
  $('#crumb').textContent = page === 'search' ? '검색 결과' : menus.find(m => m[0] === page)?.[1];
  $('#page-title').innerHTML = title[0] + '<span class="title-dot">.</span>';
  $('#page-subtitle').textContent = title[1];
  $('#export-btn').innerHTML = icon('download') + '내보내기';
  $('#add-btn').innerHTML = icon('plus') + (page === 'contacts' ? '연락처 등록' : page === 'studio' ? (studio.tab === 'refs' ? '레퍼런스 등록' : '새 프로젝트') : '엔티티 등록');
  $('#export-btn').hidden = page === 'studio';
  let html = '';
  if (page === 'home') html = stats() + `<div class="main-grid">${askPanel()}${alerts()}</div>`;
  if (page === 'entities') { const arr = entities().filter(match); html = `<div class="notice">엔티티 ${entities().length}개가 등록되어 있습니다. 등록·수정한 내용은 전 직원에게 공유되며 변경 이력이 기록됩니다.</div><section class="panel"><div class="panel-head"><div class="panel-title">엔티티 목록 <small>${arr.length} ENTITIES</small></div></div><div class="watch-toolbar">${filters()}</div><form class="table-tools local-form" id="local-form" role="search"><input class="local-search" id="local-q" type="search" placeholder="${page === 'contacts' ? '이름·회사·직함·연락처' : '이름·영문 이름·별칭·브랜드명'} 검색" value="${esc(query)}" aria-label="이 목록에서 검색"><button class="button primary" type="submit">${icon('search')} 검색</button>${query ? '<button class="button" type="button" id="local-clear">초기화</button>' : ''}</form><div class="entity-grid">${arr.map(entityCard).join('') || `<div class="empty">${NOT_FOUND}</div>`}</div></section>`; }
  if (page === 'contacts') { const arr = contacts().filter(c => hay(c).includes(query.toLowerCase())); html = `<div class="notice">「연락처 등록」에서 명함 사진을 업로드하면 판테온 봇이 내용을 자동으로 입력하고, 명함 이미지도 함께 저장합니다. 거래처 담당자는 회사에 연결되어 회사 상세의 「등록된 담당자」에도 표시됩니다.</div><section class="panel"><div class="panel-head"><div class="panel-title">연락처 <small>CONTACTS</small></div><span class="nav-count">${query ? arr.length + ' / ' : ''}${contacts().length}</span></div><form class="table-tools local-form" id="local-form" role="search"><input class="local-search" id="local-q" type="search" placeholder="${page === 'contacts' ? '이름·회사·직함·연락처' : '이름·영문 이름·별칭·브랜드명'} 검색" value="${esc(query)}" aria-label="이 목록에서 검색"><button class="button primary" type="submit">${icon('search')} 검색</button>${query ? '<button class="button" type="button" id="local-clear">초기화</button>' : ''}</form>${contactTable(arr)}</section>`; }
  if (page === 'admin') html = adminView();
  if (page === 'studio') html = studioView();
  if (page === 'search') html = searchView();
  $('#content').innerHTML = html;
  bindContent();
}

/* ---------- 상세 ---------- */
function closeDrawer() { $('#drawer').hidden = true; $('#overlay').hidden = true; activeDetail = null; document.body.style.overflow = ''; }
function showDrawer(content, keepScroll) {
  const top = keepScroll ? $('#drawer').scrollTop : 0;
  $('#drawer').innerHTML = `<div class="drawer-header"><span>PANTHEON / ENTITY INTELLIGENCE</span><button class="icon-btn" id="close-drawer" aria-label="닫기">${icon('close')}</button></div>${content}`;
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
function bindAdminTools(e) { $('#hide-entity')?.addEventListener('click', async () => { const { error } = await SB.rpc('pt_set_hidden', {entity: e.id, value: !e.hidden}); if (error) return toast('변경하지 못했습니다: ' + error.message); await load(); render(); openDetail(e.id); toast(e.hidden ? '숨김을 해제했습니다.' : '숨김 처리했습니다. DB 관리자만 볼 수 있습니다.'); }); }

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
  if (isContact(e)) return openContact(e, keep);
  const cs = contactsOf(e), parent = e.parentId && byId(e.parentId);
  showDrawer(`${avatar(e)}<h2>${esc(e.name)}</h2><span class="detail-sub">${esc(e.en ? e.en + ' · ' : '')}${esc(e.type)}</span><div class="drawer-actions"><button class="button" id="edit-entity">정보 수정</button>${adminTools(e)}</div><div class="detail-block"><h3>기본 정보 및 관계</h3><div class="detail-row"><span>소속 / 권리 관계</span><b>${parent ? `<button class="ref" type="button" data-open="${parent.id}">${esc(parent.name)}</button>` : esc(e.agencyText || '—')}</b></div><div class="detail-row"><span>관계 근거</span><b>${esc(e.rel || '추가 확인 필요')}</b></div><div class="detail-row"><span>내부 담당자</span><b>${ownersLine(e.owners)}</b></div><div class="detail-row"><span>등록한 직원</span><b>${esc(registrar(e) || '—')}</b></div>${kidsOf(e).length ? `<div class="detail-row"><span>운영 브랜드 · 연결 엔티티</span><b>${kidsOf(e).length}개</b></div>${linkList(kidsOf(e))}` : ''}<div class="detail-row"><span>등록된 담당자</span><b>${cs.length}명</b></div>${cs.length ? linkList(cs) : ''}${pointsBlock(e)}</div><div class="detail-block"><h3>별칭</h3>${[e.name, ...e.aliases].map(a => `<span class="tag">${esc(a)}</span>`).join('')}</div><div class="detail-block"><h3>내부 담당자 이력</h3><div id="owner-hist"><p>이력을 불러오는 중입니다…</p></div></div>${noteBlock(e)}`, keep);
  $('#edit-entity').onclick = () => entityModal(e); bindNote(e); bindAdminTools(e); loadOwnerHistory(e.id);
}
function openContact(c, keep) {
  const org = c.parentId && byId(c.parentId), card = imgSrc(c.cardImg);
  showDrawer(`<span class="entity-avatar">${esc(c.name.slice(0, 2))}</span><h2>${esc(c.name)}</h2><span class="detail-sub">${esc(c.role ? c.role + ' · ' : '')}거래처 담당자</span><div class="drawer-actions"><button class="button" id="edit-contact">정보 수정</button>${adminTools(c)}</div><div class="detail-block"><h3>기본 정보 및 관계</h3><div class="detail-row"><span>회사 연결</span><b>${org ? `<button class="ref" type="button" data-open="${org.id}">${esc(org.name)}</button> <button class="text-btn" type="button" id="link-company">변경</button>` : `<button class="button" type="button" id="link-company">${icon('link')} 회사 미연결 · 연결하기</button>`}</b></div><div class="detail-row"><span>관계 근거</span><b>${esc(c.rel || '추가 확인 필요')}</b></div><div class="detail-row"><span>내부 담당자</span><b>${ownersLine(c.owners)}</b></div><div class="detail-row"><span>등록한 직원</span><b>${esc(registrar(c) || '—')}</b></div>${pointsBlock(c) || '<p>기록된 업무 연락처가 없습니다.</p>'}</div><div class="detail-block"><h3>명함</h3>${c.cardImg ? (card ? `<button type="button" id="card-view" style="border:0;padding:0;background:none;width:100%"><img src="${card}" alt="${esc(c.name)} 명함" style="width:100%;border:1px solid #e4eae4;border-radius:7px;display:block"></button><p>클릭하면 크게 볼 수 있습니다.</p>` : '<p>명함을 불러오는 중입니다…</p>') : '<p>등록된 명함이 없습니다.</p>'}<label class="button" style="display:inline-flex;margin-top:6px;cursor:pointer">${c.cardImg ? '명함 변경' : '명함 이미지 업로드'}<input id="card-replace" type="file" accept="image/*" hidden></label></div><div class="detail-block"><h3>내부 담당자 이력</h3><div id="owner-hist"><p>이력을 불러오는 중입니다…</p></div></div>${noteBlock(c)}`, keep);
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
function modal(content) { $('#modal').innerHTML = content; $('#modal').showModal(); $('#modal').querySelector('[data-cancel]')?.addEventListener('click', () => $('#modal').close()); }
function companyOptions(selected) { const es = entities().filter(e => e.type !== 'IP·유명인').sort((a, b) => a.name.localeCompare(b.name, 'ko')); return es.map(e => `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${esc(e.name)}${e.en ? ' · ' + esc(e.en) : ''} (${esc(e.type)})</option>`).join(''); }
function linkModal(c) {
  modal(`<form id="link-form"><h2>회사 연결</h2><p>${esc(c.name)} 님의 소속 회사를 선택하세요. 연결하면 회사 상세의 「등록된 담당자」에도 표시됩니다.</p><label>회사 찾기<input id="link-find" type="search" autocomplete="off" placeholder="이름·영문명·별칭"></label><label>회사<select id="link-select" size="8" required>${companyOptions(c.parentId)}</select></label><div id="link-error" style="color:#ba775e;margin-top:12px;font-size:11px" role="alert"></div><p style="font-size:10px">목록에 없으면 「엔티티 등록」으로 회사를 먼저 등록한 뒤 연결하세요.</p><div class="modal-actions">${c.parentId ? '<button class="button" type="button" id="link-clear">연결 해제</button>' : ''}<button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">이 회사로 연결</button></div></form>`);
  $('#link-find').oninput = ev => { const q = ev.target.value.toLowerCase(); [...$('#link-select').options].forEach(o => { const e = byId(o.value); o.hidden = !!q && ![e.name, e.en, ...e.aliases].filter(Boolean).join(' ').toLowerCase().includes(q); }); $('#link-error').textContent = [...$('#link-select').options].some(o => !o.hidden) ? '' : '찾는 회사가 없습니다. 「엔티티 등록」으로 먼저 등록해 주세요.'; };
  const go = async org => { if (!await save(c.id, {parentId: org ? org.id : null, agencyText: org ? org.name : ''})) return; $('#modal').close(); render(); openDetail(c.id); toast(org ? `${c.name} 님을 ${org.name}에 연결했습니다.` : `${c.name} 님의 회사 연결을 해제했습니다.`); };
  $('#link-clear')?.addEventListener('click', () => go(null));
  $('#link-form').onsubmit = ev => { ev.preventDefault(); const org = byId($('#link-select').value); if (!org) { $('#link-error').textContent = '연결할 회사를 선택해 주세요.'; return; } go(org); };
}
function contactEditModal(c) {
  modal(`<form id="ce-form"><h2>연락처 수정</h2><p>저장한 내용은 전 직원에게 공유되며, 변경 이력이 기록됩니다.</p><label>이름 *<input id="ce-name" required maxlength="50" value="${esc(c.name)}"></label><label>직함 · 부서<input id="ce-role" maxlength="100" value="${esc(c.role)}"></label><label>연락처 (한 줄에 하나씩 입력)<textarea id="ce-points" rows="5" style="display:block;width:100%;border:1px solid #dde4d9;border-radius:5px;padding:10px;margin-top:8px;font:inherit">${esc(c.points.join('\n'))}</textarea></label><label>관계 근거<input id="ce-rel" maxlength="200" value="${esc(c.rel)}"></label><div class="field"><span class="flabel">내부 담당자</span><div id="ce-owners"></div></div><div id="ce-error" style="color:#ba775e;margin-top:14px;font-size:11px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">변경 저장</button></div></form>`);
  const owners = ownersInput($('#ce-owners'), c.owners);
  $('#ce-form').onsubmit = async ev => { ev.preventDefault(); const name = $('#ce-name').value.trim(); if (!name) { $('#ce-error').textContent = '이름을 입력해 주세요.'; return; } if (!await save(c.id, {name, role: $('#ce-role').value.trim(), points: $('#ce-points').value.split('\n').map(s => s.trim()).filter(Boolean), rel: $('#ce-rel').value.trim(), owners: owners.value()})) return; $('#modal').close(); render(); openDetail(c.id); toast('연락처를 수정했습니다.'); };
}
function entityModal(e) {
  modal(`<form id="entity-form"><h2>${e ? '엔티티 수정' : '새 엔티티 등록'}</h2><p>저장한 내용은 전 직원에게 공유되며, 변경 이력이 기록됩니다.</p><div class="img-field"><span id="img-preview">${avatar(e || {initial: '+', color: 'gray'})}</span><div><label for="entity-img" style="margin-top:0">프로필 이미지</label><input id="entity-img" type="file" accept="image/png,image/jpeg,image/webp"><button class="text-btn" type="button" id="img-clear" ${e?.img ? '' : 'hidden'}>이미지 삭제</button><small><b>권장 크기: 정사각형 500×500px 이상</b> (PNG·JPG, 15MB 이하)<br>로고 또는 인물 사진을 사용해 주세요. 정사각형이 아니면 가운데 부분을 잘라 240×240px로 저장합니다.</small></div></div><label>한글 이름 *<input id="entity-name" required maxlength="50" value="${esc(e?.name || '')}" placeholder="예: 분데스리가"></label><label>영문 이름<input id="entity-en" maxlength="80" value="${esc(e?.en || '')}" placeholder="예: BUNDESLIGA"></label><label>유형<select id="entity-type">${TYPES.map(t => `<option ${e?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>별칭 <input id="entity-alias" maxlength="200" value="${esc(e?.aliases.join(', ') || '')}" placeholder="쉼표로 구분해 주세요"></label><label>관계 근거 <input id="entity-rel" maxlength="200" value="${esc(e?.rel || '')}" placeholder="예: 골포스트 공식 미디어 파트너"></label><div class="field"><span class="flabel">내부 담당자</span><div id="entity-owners"></div></div><label id="parent-field">소속 회사<select id="entity-parent"><option value="">(없음)</option>${all.filter(x => HOLDERS.includes(x.type) && !x.hidden && x.id !== e?.id).sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(x => `<option value="${x.id}" ${x.id === e?.parentId ? 'selected' : ''}>${esc(x.name)}${x.en ? ' · ' + esc(x.en) : ''}</option>`).join('')}</select></label><div class="field" id="kids-field"><span class="flabel">운영 브랜드 · 연결 엔티티</span><div id="entity-kids"></div></div><div id="form-error" style="color:#ba775e;margin-top:15px;font-size:11px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">${e ? '변경 저장' : '엔티티 등록'}</button></div></form>`);
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
  modal(`<form id="contact-form"><h2>연락처 등록</h2><p>명함 사진을 업로드하면 판테온 봇이 내용을 자동으로 입력합니다(약 20~40초). 저장 전에 내용을 확인해 주세요. 명함 이미지도 함께 저장됩니다.</p><label>명함 이미지<input id="c-card" type="file" accept="image/*" capture="environment"></label><div id="c-preview" hidden><img id="c-img" alt="업로드한 명함" style="width:100%;max-height:220px;object-fit:contain;border:1px solid #e4eae4;border-radius:7px;margin-top:10px;background:#fafbfa"></div><p id="c-status" class="ask-note" role="status" style="margin-top:8px"></p>${F.map(([id, l, ph]) => `<label>${l}<input id="${id}" maxlength="200" ${id === 'c-name' ? 'required' : ''} placeholder="${ph}"></label>`).join('')}<label>회사 연결<select id="c-org"><option value="">연결 안 함</option><option value="__new">새 회사로 등록 (입력한 회사명으로)</option>${companyOptions('')}</select></label><label>메모<input id="c-memo" maxlength="300" placeholder="예: 10/22 KREAM 미팅에서 받음"></label><div id="c-error" style="color:#ba775e;margin-top:14px;font-size:11px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit" id="c-save">연락처 등록</button></div></form>`);
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
  if (!admin.changes) return tabs + '<div class="empty"><p>기록을 불러오는 중입니다…</p></div>';
  if (admin.tab === 'asks') return tabs + asksPanel();
  if (admin.tab === 'quality') return tabs + qualityPanel();
  if (admin.tab === 'bot') return tabs + botPanel();
  const people = [...new Set(admin.changes.map(x => x.actor || '(화면 밖)'))];
  const list = admin.changes.filter(x => (!admin.who || (x.actor || '(화면 밖)') === admin.who) && (!admin.q || String(x.entity_name).toLowerCase().includes(admin.q.toLowerCase()))).slice(0, 300);
  return tabs + `
  <section class="panel"><div class="panel-head"><div class="panel-title">변경 기록 <small>AUDIT LOG</small> <span class="nav-count">${admin.changes.length}</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button" type="button" id="log-reload">${icon('clock')} 새로고침</button><button class="button" type="button" id="log-export">${icon('download')} 기록 CSV</button></div></div>
  <div class="watch-toolbar"><div style="display:flex;gap:8px;flex-wrap:wrap"><select class="table-select" id="log-who" aria-label="사람으로 거르기"><option value="">전체 사용자</option>${people.map(p => `<option value="${esc(p)}" ${admin.who === p ? 'selected' : ''}>${esc(p === '(화면 밖)' ? '시스템 입력' : whoName(p))}</option>`).join('')}</select><input class="table-select" id="log-q" type="search" placeholder="엔티티 이름" value="${esc(admin.q)}" aria-label="엔티티 이름으로 거르기"></div></div>
  <div class="table-wrap"><table><thead><tr><th>언제</th><th>누가</th><th>엔티티</th><th>무엇을</th><th>변경 내용 (이전 → 이후)</th><th>조치</th></tr></thead><tbody>${list.map(x => `<tr><td style="white-space:nowrap">${esc(kst(x.at))}</td><td>${x.actor ? esc(whoName(x.actor, x.actor_name)) : `<span class="pill">${esc(VIA_KO[x.via] || x.via)}</span>`}${x.reason ? `<small style="display:block;color:#9aa29d">${esc(x.reason)}</small>` : ''}</td><td><button class="text-btn" data-detail="${esc(x.entity_id)}">${esc(x.entity_name)}</button></td><td><span class="pill">${esc(OP_KO[x.op] || x.op)}</span></td><td style="font-size:10px;line-height:1.6">${x.op === 'insert' ? '<span style="color:#285541">새로 등록</span>' : (x.fields || []).map(k => `<div><b>${esc(FIELD_KO[k] || k)}</b>: <span style="color:#a0563a;text-decoration:line-through">${esc(showVal(k, x.before?.[k]))}</span> → <span style="color:#285541">${esc(showVal(k, x.after?.[k]))}</span></div>`).join('')}</td><td>${x.op === 'update' ? `<button class="text-btn" type="button" data-restore="${x.id}">이전 내용으로 복원</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">기록이 없습니다.</div></td></tr>'}</tbody></table></div></section>`;
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
  if (!admin.bot) { setTimeout(loadBot); return '<div class="empty"><p>상태를 불러오는 중입니다…</p></div>'; }
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
  return `<div class="quality-grid"><div class="stat"><div class="stat-label">담당자 미등록</div><div class="stat-value">${es.filter(e => !contactsOf(e).length).length}<small>개</small></div><div class="stat-bottom">담당자·연락처 확인 필요</div></div><div class="stat"><div class="stat-label">관계 근거 미입력</div><div class="stat-value">${es.filter(e => !e.rel).length}<small>개</small></div><div class="stat-bottom">내부 담당자 확인 필요</div></div><div class="stat"><div class="stat-label">숨긴 항목</div><div class="stat-value">${hidden.length}<small>개</small></div><div class="stat-bottom">상세 화면에서 숨김 해제</div></div></div><section class="panel"><div class="panel-head"><div class="panel-title">데이터 점검</div><button class="button" id="admin-export">${icon('download')} 엔티티 CSV</button></div><div class="table-wrap"><table><thead><tr><th>엔티티</th><th>유형</th><th>관계 근거</th><th>등록된 담당자</th><th>조치</th></tr></thead><tbody>${[...es, ...hidden.filter(isContact)].map(e => `<tr><td>${esc(e.name)}${e.hidden ? ' <span class="pill">숨김</span>' : ''}</td><td>${esc(e.type)}</td><td><span class="pill ${e.rel ? 'good' : ''}">${e.rel ? '입력됨' : '확인 필요'}</span></td><td>${contactsOf(e).length ? contactsOf(e).length + '명' : '미등록'}</td><td><button class="text-btn" data-detail="${e.id}">상세 확인 ↗</button></td></tr>`).join('')}</tbody></table></div></section>`;
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
let studioCan = false;
const studio = {tab: 'projects', filter: 'all', list: null, refs: null, jobs: [], loading: false, err: ''};
const STAGES = ['IP 입력', '인테이크', '파트너 IP 추천', '리서치', '컨셉 설계', '제안서 생성', '이미지 계획', '생성·삽입·QA'];
const GATES = {2: '인테이크 확정', 3: '파트너 IP 선택', 5: '컨셉 확정', 7: '이미지 수급·크레딧 승인', 8: '반려 이미지 최종 판단'};
const JOB_OF = {3: 'partners', 4: 'research', 5: 'concepts', 6: 'build', 7: 'image_plan', 8: 'generate'};
const pTitle = p => p.mode === 'single' ? `${p.ip_a_name} 단독` : `${p.ip_a_name} × ${p.ip_b_name || '파트너 선택 전'}`;
const pStatus = p => p.status === 'done' ? '완료' : p.status === 'failed' ? '작업 실패' : p.status === 'working' ? `${STAGES[p.stage - 1]} 진행 중` : `${GATES[p.stage] || '확인'} 대기`;
const pPill = p => `<span class="pill ${p.status === 'done' ? 'good' : p.status === 'failed' ? 'bad' : p.status === 'waiting' ? 'wait' : ''}">${esc(pStatus(p))}</span>`;
const contactPoint = e => e ? '컨택포인트 있음' : '컨택포인트 없음';
const ipChips = (host, initial, list) => chipInput(host, initial, {list, find: entityByName, badge: contactPoint,
  sub: e => [e.type, contactsOf(e).length ? `등록된 담당자 ${contactsOf(e).length}명` : ''].filter(Boolean).join(' · '),
  title: e => e ? `판테온 엔티티 「${e.name}」` : '판테온 엔티티에 등록되지 않은 IP입니다',
  note: '판테온 엔티티에 등록된 IP는 <b>컨택포인트 있음</b>, <span class="err">빨간 칩</span>은 등록되지 않은 IP입니다.'});
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
  if (!studio.list && !studio.err) { setTimeout(loadStudio); return '<div class="empty"><p>불러오는 중입니다…</p></div>'; }
  const tabs = `<div class="tabs" style="margin-bottom:16px">${[['projects', '프로젝트', studio.list?.length], ['refs', '레퍼런스 라이브러리', studio.refs?.length]].map(([k, t, n]) => `<button class="tab ${studio.tab === k ? 'active' : ''}" data-studio-tab="${k}">${t}${n ? ` <span class="nav-count">${n}</span>` : ''}</button>`).join('')}</div>`;
  if (studio.err) return tabs + `<div class="notice">${esc(studio.err)}</div>`;
  return tabs + (studio.tab === 'refs' ? studioRefs() : studioProjects());
}

function studioProjects() {
  const all = studio.list, live = all.filter(p => p.status !== 'done'), wait = all.filter(p => p.status === 'waiting'), work = all.filter(p => p.status === 'working'), done = all.filter(p => p.status === 'done');
  // 숫자 카드를 누르면 그 건만 (10-29 김현우) · 다시 누르면 전체
  const F = {live: ['진행 중', live], wait: ['결정 대기', wait], work: ['판테온 봇 처리 중', work], done: ['완료', done]};
  const ps = F[studio.filter]?.[1] || all;
  const stat = (key, n, unit, bottom, hi) => `<div class="stat${hi ? ' highlight' : ''}${studio.filter === key ? ' on' : ''}" data-pfilter="${key}" role="button" tabindex="0" aria-pressed="${studio.filter === key}" aria-label="${F[key][0]} 프로젝트만 보기"><div class="stat-label">${F[key][0]}</div><div class="stat-value">${n}<small>${unit}</small></div><div class="stat-bottom">${bottom}</div></div>`;
  const decide = wait.length ? wait.map(p => `<button class="alert-row" data-proposal="${p.id}"><span class="alert-symbol">${icon('warning')}</span><span class="alert-text">${esc(pTitle(p))}<small>${esc(GATES[p.stage] || '확인')} 대기 · ${esc(kst(p.updated_at))}</small></span></button>`).join('') : '<p class="panel-caption" style="padding:0 0 18px">지금 결정할 프로젝트가 없습니다.</p>';
  const rows = ps.map(p => `<tr class="clickable" data-proposal="${p.id}" tabindex="0"><td>${esc(pTitle(p))}<small class="cell-sub">${esc(p.recipient || '수신사 미정')}</small></td><td>${p.stage}. ${esc(STAGES[p.stage - 1])}</td><td>${pPill(p)}${p.status === 'working' ? `<div data-prow="${p.id}">${rowProg(p)}</div>` : ''}</td><td style="white-space:nowrap">${esc(kst(p.updated_at))}</td></tr>`).join('');
  return `<div class="stats">${stat('live', live.length, '건', `전체 ${all.length}건`)}${stat('wait', wait.length, '건', '게이트에서 사람이 결정할 것')}${stat('work', work.length, '건', '리서치·생성 등 자동 단계')}${stat('done', done.length, '건', '제안서 전달 완료', true)}</div>
  <div class="main-grid"><section class="panel"><div class="panel-head"><div class="panel-title">${F[studio.filter] ? `${F[studio.filter][0]} 프로젝트 <small>${ps.length}건 · 최근 업데이트 순</small>` : '전체 프로젝트 <small>최근 업데이트 순</small>'}</div>${F[studio.filter] ? '<button class="text-btn" data-pfilter="all">전체 보기</button>' : ''}</div>${!ps.length && F[studio.filter] ? `<div class="empty"><p>${F[studio.filter][0]}인 프로젝트가 없습니다.</p></div>` : ps.length ? `<div class="table-wrap"><table><thead><tr><th>프로젝트</th><th>현재 단계</th><th>상태</th><th>업데이트</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty"><p>아직 프로젝트가 없습니다.<br>오른쪽 위 「새 프로젝트」에서 IP 하나로 시작하세요.</p></div>`}</section>
  <section class="panel"><div class="panel-head"><div class="panel-title">지금 결정할 것</div>${wait.length ? `<span class="alert-count">${wait.length}건</span>` : ''}</div><div class="alert-list">${decide}</div></section></div>`;
}

function studioRefs() {
  const rs = studio.refs, st = {uploaded: '분석 대기', analyzing: '분석 중', ready: '분석 완료', failed: '분석 실패'};
  return `<section class="panel"><div class="panel-head"><div><div class="panel-title">레퍼런스 라이브러리 <small>${rs.length}건</small></div><p class="panel-caption">팀이 만든 완성 제안서입니다. 새 제안서는 고른 레퍼런스의 구성과 이미지 배치를 그대로 따릅니다.</p></div></div>
  ${rs.length ? `<div class="table-wrap"><table><thead><tr><th>제안서</th><th>IP</th><th>수신사</th><th>작성</th><th>분석</th><th>기본 포맷</th><th>파일</th></tr></thead><tbody>${rs.map(r => `<tr${r.status === 'ready' ? ` class="clickable" data-ref-view="${r.id}"` : ''}><td class="wrap-cell">${esc(r.title)}</td><td>${esc(r.ip_names || '—')}</td><td>${esc(r.recipient || '—')}</td><td>${esc(r.author || '—')}</td><td>${r.status === 'ready' ? `<button class="text-btn" data-ref-view="${r.id}"><span class="pill good">분석 완료</span> 보기</button>` : r.status === 'failed' ? `<span class="pill bad" title="${esc(r.profile?.error || '')}">분석 실패</span> <button class="text-btn" data-ref-retry="${r.id}">다시 분석</button>` : refProg(r)}</td><td>${r.is_default ? '<span class="pill good">기본</span>' : `<button class="text-btn" data-ref-default="${r.id}">기본으로 지정</button>`}</td><td><button class="text-btn" data-ref-open="${r.id}">열기 ↗</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>등록된 레퍼런스가 없습니다.<br>오른쪽 위 「레퍼런스 등록」에서 완성 제안서 PDF를 올려 주세요.</p></div>'}</section>`;
}

// 레퍼런스 분석 진행률 — 판테온 봇이 pt_proposal_job.result 에 3초마다 적는 값(1~100% · 남은 초)을 읽어 막대로
const refJob = r => studio.jobs.find(j => j.ref_id === r.id && j.kind === 'analyze_reference');
const leftText = t => { const s = Math.round(t); return s >= 60 ? `약 ${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초 남음` : s > 0 ? `약 ${s}초 남음` : '곧 끝납니다'; };
function refProg(r) {
  const j = refJob(r), g = j?.result;
  if (!j || j.status === 'wait' || !g) {
    const long = j && Date.now() - Date.parse(j.at) > 120000;
    return `<span class="ref-prog" data-ref-prog="${r.id}"><span class="pill">분석 대기</span><small>판테온 봇 차례를 기다리는 중<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></small>${long ? '<small class="warn">2분 넘게 대기 중입니다. DB 관리에서 판테온 봇을 재시작해 주세요.</small>' : ''}</span>`;
  }
  const left = Math.max(0, g.eta - (Date.now() - Date.parse(g.at)) / 1000);
  return `<span class="ref-prog" data-ref-prog="${r.id}" data-eta="${g.eta}" data-at="${esc(g.at)}"><span class="row"><span class="bar" role="progressbar" aria-valuenow="${g.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${g.progress}%"></i></span><b>${g.progress}%</b></span><small>${esc(g.step || '분석 중')}</small><small class="eta">${leftText(left)}</small></span>`;
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
  const j = studio.jobs.find(x => x.proposal_id === p.id), g = j?.result;
  if (!j || j.status === 'wait' || !g) return `<small class="row-prog">${j?.kind === 'aside' ? 'Aside 차례를 기다리는 중' : '판테온 봇 차례를 기다리는 중'}<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></small>`;
  const left = Math.max(0, g.eta - (Date.now() - Date.parse(g.at)) / 1000);
  return `<span class="ref-prog row-prog"><span class="row"><span class="bar"><i style="width:${g.progress}%"></i></span><b>${g.progress}%</b></span><small>${esc(g.step || '')} · ${leftText(left)}</small></span>`;
}
let listPoll;
async function pollProjects() {
  if (page !== 'studio' || studio.tab === 'refs') return;
  const ids = (studio.list || []).filter(p => p.status === 'working').map(p => p.id);
  if (!ids.length) return;
  const [ps, js] = await Promise.all([SB.from('pt_proposal').select('id,status,stage').in('id', ids),
    SB.from('pt_proposal_job').select('id,proposal_id,ref_id,kind,status,at,error,result,input').in('proposal_id', ids).in('status', ['wait', 'work'])]);
  if (ps.error || js.error || page !== 'studio') return;
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
    studioTick = setInterval(() => {            // 남은 시간은 1초마다 줄여 보여 준다
      if (page !== 'studio') return clearInterval(studioTick);
      $$('[data-ref-prog][data-eta]').forEach(el => { const left = Math.max(0, +el.dataset.eta - (Date.now() - Date.parse(el.dataset.at)) / 1000); const t = el.querySelector('.eta'); if (t) t.textContent = leftText(left); });
    }, 1000);
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
  $$('[data-studio-tab]').forEach(b => b.onclick = () => { studio.tab = b.dataset.studioTab; render(); });
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
  <div class="detail-block"><h3>구성 요약</h3><p>${esc(f.summary || '')}</p><div class="detail-row"><span>페이지</span><b>${esc(f.page_count || (f.pages || []).length)}쪽</b></div><div class="detail-row"><span>이미지</span><b>${esc(f.image_pattern?.total || 0)}장</b></div>${r.is_default ? '<div class="detail-row"><span>기본 포맷</span><b><span class="pill good">기본</span></b></div>' : ''}</div>
  ${(f.acts || []).length ? `<div class="detail-block"><h3>막 구성</h3><ol class="rule-list">${f.acts.map(a => `<li><b>${esc(a.name || '')}</b> <span class="muted">· ${esc(a.pages || '')}쪽</span><br><small>${esc(a.purpose || '')}</small></li>`).join('')}</ol></div>` : ''}
  ${kinds.length ? `<div class="detail-block"><h3>이미지 사용</h3>${kinds.map(([k, n]) => `<div class="detail-row"><span>${esc(IMG_KIND[k] || k)}</span><b>${n}장</b></div>`).join('')}${f.image_pattern?.note ? `<p>${esc(f.image_pattern.note)}</p>` : ''}</div>` : ''}
  <div class="detail-block"><h3>문체·디자인</h3>${st.tone ? `<div class="detail-row"><span>문체</span><b>${esc(st.tone)}</b></div>` : ''}${st.type ? `<div class="detail-row"><span>글꼴</span><b>${esc(st.type)}</b></div>` : ''}${st.emphasis ? `<div class="detail-row"><span>강조</span><b>${esc(st.emphasis)}</b></div>` : ''}${(st.colors || []).length ? `<div class="detail-row"><span>주요 색</span><b>${st.colors.filter(c => /^#[0-9a-f]{3,8}$/i.test(c)).map(c => `<i class="swatch" style="background:${c}" title="${c}"></i>`).join('')}</b></div>` : ''}</div>
  ${(f.rules || []).length ? `<div class="detail-block"><h3>새 제안서가 따를 규칙</h3><ol class="rule-list">${f.rules.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
  ${pages ? `<div class="detail-block"><h3>페이지별 구성</h3><div class="table-wrap"><table class="ref-pages"><thead><tr><th>쪽</th><th>역할</th><th>배치·이미지</th></tr></thead><tbody>${pages}</tbody></table></div></div>` : ''}`);
}

const SCORE_KO = {fandom: '팬덤', world: '세계관', asset: '자산 결합', business: '사업성', timing: '타이밍', risk: '리스크'};
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return '출처'; } };
const srcLinks = urls => (urls || []).map(u => `<a class="src" href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join('');
// 단계 작업 진행률 — 판테온 봇이 job.result 에 3초마다 적는 값을 막대로 (레퍼런스 분석과 같은 모양)
function jobProg(j) {
  const g = j?.result;
  if (!j || j.status === 'wait' || !g) return `<p class="job-wait">${j?.kind === 'aside' ? 'Aside 차례를 기다리는 중' : '판테온 봇 차례를 기다리는 중'}<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>`;
  const left = Math.max(0, g.eta - (Date.now() - Date.parse(g.at)) / 1000);
  return `<div class="ref-prog wide job-prog" data-eta="${g.eta}" data-at="${esc(g.at)}"><span class="row"><span class="bar" role="progressbar" aria-valuenow="${g.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${g.progress}%"></i></span><b>${g.progress}%</b></span><small>${esc(g.step || '진행 중')}</small><small class="eta">${leftText(left)}</small></div>`;
}
// 한 단계에 작업이 둘일 때(리서치 = 공개 웹 + 팬·SNS) 막대를 이름과 함께 나란히 (10-28)
const JOB_KO = {partners: '파트너 추천', research: '공개 웹 리서치', concepts: '컨셉 설계', build: '제안서 생성', image_plan: '이미지 찾기', finalize: '다시 그리기', generate: 'AI 이미지 만들기'};
const jobName = j => j.kind === 'aside' ? (j.input?.task === 'social' ? '팬·SNS 조사 · Aside' : '이미지 찾기 · Aside') : (JOB_KO[j.kind] || '');
const jobsProg = list => `<div id="job-progs">${list.length > 1 ? list.map(j => `<p class="sub-label">${esc(jobName(j))}</p>${jobProg(j)}`).join('') : jobProg(list[0])}</div>`;
const liveJobs = id => studio.jobs.filter(j => j.proposal_id === id && ['wait', 'work'].includes(j.status)).sort((a, b) => a.id - b.id);
let propPoll;
async function pollProposal(id) {
  if (activeDetail !== 'p:' + id) return;
  const [p, j] = await Promise.all([SB.from('pt_proposal').select('*').eq('id', id).single(), SB.from('pt_proposal_job').select('id,proposal_id,ref_id,kind,status,at,error,result,input').eq('proposal_id', id).order('id', {ascending: false}).limit(4)]);
  if (activeDetail !== 'p:' + id || p.error) return;
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
setInterval(() => $$('.job-prog').forEach(el => { const t = el.querySelector('.eta'); if (t) t.textContent = leftText(Math.max(0, +el.dataset.eta - (Date.now() - Date.parse(el.dataset.at)) / 1000)); }), 1000);
function partnersPanel(p) {
  const P = p.data.partners;
  const cats = (P.categories || []).map(cat => {
    const cards = P.candidates.map((c, i) => [c, i]).filter(([c]) => c.category === cat.name).map(([c, i]) => {
      const e = entityByName(c.ip);
      return `<div class="pcard"><div class="pcard-head"><b>${esc(c.ip)}</b><span class="pill ${e ? 'good' : 'bad'}">${contactPoint(e)}</span></div><p>${esc(c.one_line_concept || '')}</p><div class="scores">${Object.entries(SCORE_KO).map(([k, n]) => `<span class="${k === 'risk' ? 'risk' : ''}" title="${n} ${c.scores?.[k] ?? '-'}/5">${n} <b>${c.scores?.[k] ?? '-'}</b><i style="--v:${(c.scores?.[k] || 0) * 20}%"></i></span>`).join('')}</div><div class="pcard-foot"><span>${srcLinks(c.evidence_urls)}</span><button class="button primary small" data-pick="${i}">이 파트너로 선택</button></div></div>`;
    }).join('');
    return `<div class="pcat"><div class="pcat-head"><div><b>${esc(cat.name)}</b><small>${esc(cat.reason || '')}</small></div><button class="text-btn" data-reroll="${esc(cat.name)}">다른 후보</button></div>${cards}</div>`;
  }).join('');
  return `<div class="detail-block"><h3>결정 · 파트너 IP 선택</h3><p>카드 하나를 고르면 판테온 봇이 두 IP 리서치를 시작합니다. 점수는 1~5이며, 리스크는 높을수록 위험합니다.</p>${P.ip_a_card?.summary ? `<p class="muted-box">${esc(p.ip_a_name)} · ${esc(P.ip_a_card.summary)}</p>` : ''}${cats}<div class="pcat"><div class="pcat-head"><div><b>직접 넣기</b><small>추천 중에 마음에 드는 IP가 없으면 원하는 IP를 직접 넣어 진행합니다.</small></div></div><datalist id="pb-ents">${entities().filter(e => !e.hidden).map(e => `<option value="${esc(e.name)}">`).join('')}</datalist><div class="ask-row"><input id="pb-own" list="pb-ents" maxlength="80" placeholder="예: 산리오" aria-label="파트너 IP"><button class="button primary" id="pb-own-go" type="button">이 IP로 진행</button></div><small class="atnote" id="pb-own-note"></small></div><div class="drawer-actions"><button class="button" id="recategorize">카테고리 바꿔 다시 추천</button></div></div>`;
}
const conceptCard = (c, i) => `<div class="pcard"><div class="pcard-head"><b>${esc(c.name)}</b></div>${c.key_copy ? `<p class="key-copy">“${esc(c.key_copy)}”</p>` : ''}<p>${esc(c.summary || '')}</p>${c.world ? `<details><summary>세계관</summary><p>${esc(c.world)}</p></details>` : ''}${(c.axes || []).length ? `<p class="sub-label">연결 축</p><ul class="axes">${c.axes.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}${(c.formats || []).length ? `<p class="sub-label">실행 포맷</p><ul class="axes">${c.formats.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}${c.why ? `<small class="why">${esc(c.why)}</small>` : ''}${i !== undefined ? `<div class="pcard-foot"><span></span><button class="button primary small" data-concept="${i}">이 컨셉으로 확정</button></div>` : ''}</div>`;
const conceptsPanel = p => `<div class="detail-block"><h3>결정 · 컨셉 확정</h3><p>하나를 확정하면 레퍼런스 포맷에 맞춰 제안서를 만듭니다.</p>${p.data.concepts.candidates.map((c, i) => conceptCard(c, i)).join('')}</div>`;
// 팬·SNS 조사 — Aside 가 인스타그램·틱톡·X·유튜브·팬 커뮤니티에서 읽은 것 (10-28)
const PLAT_KO = {instagram: '인스타그램', tiktok: '틱톡', x: 'X', youtube: '유튜브', naver: '네이버', community: '커뮤니티'};
function socialBlock(S) {
  if (S.failed) return `<div class="detail-block"><h3>팬·SNS</h3><p>${esc(S.error || '이번에는 팬·SNS 조사를 하지 못했습니다.')}</p></div>`;
  if (!S.ips) return '';
  const fact = f => `<li>${esc(f.text)} ${f.url ? `<a class="src" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(host(f.url))}${f.as_of ? ' · ' + esc(f.as_of) : ''}</a>` : ''}</li>`;
  const theme = (v, key, body) => `<li><b>${esc(v[key])}</b> ${esc(v[body] || '')} ${srcLinks(v.urls)}</li>`;
  const list = (title, arr, fn) => (arr || []).length ? `<p><b>${title}</b></p><ul class="facts">${arr.map(fn).join('')}</ul>` : '';
  const ips = S.ips.map(x => `<details class="research"><summary><b>${esc(x.name)}</b> <small>채널 ${x.channels.length}개 · 반응 ${x.loves.length + x.dislikes.length + x.collab_reactions.length}개</small></summary>
    ${list('채널', x.channels, c => `<li>${esc(PLAT_KO[c.platform] || c.platform)} · ${esc(c.name || '')}${c.followers ? ` <b>${esc(c.followers)}</b>` : ''}${c.note ? ` · ${esc(c.note)}` : ''} <a class="src" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(host(c.url))}${c.as_of ? ' · ' + esc(c.as_of) : ''}</a></li>`)}
    ${list('수치', x.metrics, fact)}${list('팬이 쓰는 말', x.fan_terms, t => `<li><b>${esc(t.term)}</b> ${esc(t.meaning || '')} ${t.url ? srcLinks([t.url]) : ''}</li>`)}
    ${list('좋아하는 것', x.loves, v => theme(v, 'theme', 'detail'))}${list('싫어하는 것', x.dislikes, v => theme(v, 'theme', 'detail'))}
    ${list('지난 협업 반응', x.collab_reactions, v => theme(v, 'collab', 'reaction'))}${list('도입에 쓸 장면', x.hooks, fact)}</details>`).join('');
  const caps = (S.captures || []).length ? `<p><b>캡처 ${S.captures.length}장</b></p><div class="iboard">${S.captures.map(c => `<div class="icard"><div class="ithumb" data-thumb="${esc(c.path)}"></div></div>`).join('')}</div>` : '';
  const locked = (S.locked || []).length ? `<p><b>가입이 필요해 못 본 곳</b></p><ul class="facts">${S.locked.map(l => `<li>${esc(l.site)} · ${esc(l.need || '')} ${l.url ? srcLinks([l.url]) : ''}</li>`).join('')}</ul>` : '';
  return `<div class="detail-block"><h3>팬·SNS</h3>${ips}${caps}${locked}</div>`;
}
function researchBlock(R) {
  const fact = f => `<li>${esc(f.text)} ${f.url ? `<a class="src" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(host(f.url))}${f.as_of ? ' · ' + esc(f.as_of) : ''}</a>` : ''}</li>`;
  return `<div class="detail-block"><h3>리서치</h3>${(R.ips || []).map(x => `<details class="research"><summary><b>${esc(x.name)}</b> <small>출처 있는 사실 ${x.facts.length}개</small></summary><p>${esc(x.summary || '')}</p>${x.fandom ? `<p><b>팬덤</b> ${esc(x.fandom)}</p>` : ''}${x.world ? `<p><b>세계관·정서</b> ${esc(x.world)}</p>` : ''}<ul class="facts">${x.facts.map(fact).join('')}</ul>${(x.collabs || []).length ? `<p><b>지난 협업</b></p><ul class="facts">${x.collabs.map(fact).join('')}</ul>` : ''}${(x.hooks || []).length ? `<p><b>도입에 쓸 장면</b></p><ul class="facts">${x.hooks.map(h => fact({...h, text: h.text + (h.note ? ` (${h.note})` : '')})).join('')}</ul>` : ''}${(x.risks || []).length ? `<p><b>유의점</b> ${x.risks.map(esc).join(' · ')}</p>` : ''}</details>`).join('')}${(R.common_ground || []).length ? `<p><b>공통점</b></p><ul class="facts">${R.common_ground.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}</div>`;
}

const SLOT_ST = {found: ['good', '채움'], uploaded: ['good', '직접 올림'], generated: ['good', 'AI 생성'], missing: ['bad', '못 찾음'], ai: ['wait', 'AI 생성 대기']};
function imagesPanel(p) {
  const S = p.data.images.slots, keys = Object.keys(S).sort();
  const n = st => keys.filter(k => S[k].status === st).length;
  const card = k => { const s = S[k], [cls, label] = SLOT_ST[s.status] || ['', s.status];
    return `<div class="icard"><div class="ithumb" data-thumb="${esc(s.path || '')}">${s.path ? '' : `<span>${esc(KIND_KO_IMG[s.kind] || s.kind)}<br>${esc(s.ratio || '')}</span>`}</div><div class="ibody"><div class="ihead"><b>${esc(s.slide)}쪽</b><span class="pill ${cls}">${label}</span></div><small>${esc(KIND_KO_IMG[s.kind] || s.kind)} · ${esc(s.what || '')}</small>${s.source_page ? `<a class="src" href="${esc(s.source_page)}" target="_blank" rel="noopener">${s.via === 'aside' ? 'Aside · ' : ''}${esc(host(s.source_page))}</a>` : ''}${s.note ? `<small class="warn">${esc(s.note)}</small>` : ''}${s.status === 'ai' && s.prompt ? `<details><summary>생성 프롬프트</summary><p class="prompt">${esc(s.prompt)}</p></details>` : ''}<div class="ibtns"><label class="text-btn up">내 이미지로 바꾸기<input type="file" accept="image/png,image/jpeg,image/webp" data-upimg="${esc(k)}" hidden></label>${s.status !== 'ai' ? `<button class="text-btn" data-aside="${esc(k)}">Aside로 다시 찾기</button>` : ''}</div></div></div>`; };
  const E = p.data.images.ai_estimate, nAi = n('ai');
  const ai = nAi ? (E && E.count === nAi ? `<div class="ai-box"><b>AI 이미지 ${nAi}장 · 예상 약 $${E.usd}</b><small>힉스필드 ${esc((E.model || '').replace('higgsfield-ai/', ''))} · 실패하거나 부적절 판정된 이미지는 청구되지 않습니다</small><div class="drawer-actions"><button class="button primary" id="ai-go" data-usd="${E.usd}">승인하고 만들기</button><button class="text-btn" id="ai-est">견적 다시 받기</button></div></div>` : `<div class="ai-box"><b>AI 이미지 ${nAi}장</b><small>만들기 전에 힉스필드 견적을 먼저 받습니다 (비용 없음)</small><div class="drawer-actions"><button class="button" id="ai-est">견적 받기</button></div></div>`) : '';
  return `<div class="detail-block"><h3>결정 · ${p.stage >= 8 ? '최종 확인' : '이미지 수급·AI 이미지 승인'}</h3><p>공식 이미지·로고·참고 사례는 판테온 봇이 찾아 넣었습니다. 잘못 들어갔거나 비어 있으면 「내 이미지로 바꾸기」로 바꾼 뒤 다시 그려 주세요.${nAi ? ' AI 컨셉 이미지·목업·질감은 견적을 보고 승인하면 힉스필드로 만듭니다.' : ''}</p>${ai}
  <div class="detail-row"><span>채움</span><b>${n('found') + n('uploaded') + n('generated')}개</b></div><div class="detail-row"><span>못 찾음</span><b>${n('missing')}개</b></div><div class="detail-row"><span>AI 생성 대기</span><b>${n('ai')}개</b></div>
  <div class="drawer-actions"><button class="button" id="img-rerender">바꾼 이미지로 다시 그리기</button><button class="button primary" id="img-done">이 버전으로 완료</button></div>
  <div class="iboard" id="img-board">${keys.filter(k => S[k].status !== 'ai').map(card).join('')}</div>
  <details class="research"><summary><b>AI 생성 대기 ${n('ai')}개</b> <small>프롬프트 보기</small></summary><div class="iboard">${keys.filter(k => S[k].status === 'ai').map(card).join('')}</div></details></div>`;
}
const KIND_KO_IMG = {official: '공식 이미지', logo: '로고', ai_concept: 'AI 컨셉', mockup: '목업', reference: '참고 사례', capture: '캡처', texture: '배경·질감'};
async function loadImgThumbs(slots) {
  const paths = [...new Set(Object.values(slots).map(s => s.path).filter(Boolean))];
  if (!paths.length) return;
  const { data } = await SB.storage.from('pt-studio').createSignedUrls(paths, 900);
  (data || []).forEach(x => { if (!x.signedUrl) return; $$(`#drawer [data-thumb="${CSS.escape(x.path)}"]`).forEach(el => { el.style.backgroundImage = `url("${x.signedUrl}")`; }); });
}

async function proposalEvent(id, message) { await SB.from('pt_proposal_event').insert({proposal_id: id, message}); }

async function openProposal(id, keep) {
  const p = studio.list?.find(x => x.id === id); if (!p) return;
  activeDetail = 'p:' + id;
  const stages = STAGES.map((s, i) => { const n = i + 1, skip = p.mode === 'single' && n === 3, cls = skip ? 'skip' : n < p.stage || p.status === 'done' ? 'done' : n === p.stage ? 'now' : ''; return `<li class="${cls}"><span>${n}</span>${esc(s)}${GATES[n] && !skip ? ` <small>· 결정 ${esc(GATES[n])}</small>` : ''}${skip ? ' <small>· 단독 제안은 건너뜀</small>' : ''}</li>`; }).join('');
  const job = studio.jobs.find(j => j.proposal_id === id);
  const ref = studio.refs?.find(r => r.id === p.ref_id);
  const ent = (eid, name) => eid && byId(eid) ? `<button class="ref" type="button" data-open="${eid}">${esc(name)}</button>` : esc(name || '—');
  const d = p.data || {};
  let action = '';
  if (p.status === 'waiting' && p.stage === 2) action = `<div class="detail-block"><h3>결정 · 인테이크 확정</h3><p>아래 내용으로 시작합니다. 확정하면 ${p.mode === 'collab' && !p.ip_b_name ? '판테온 봇이 파트너 IP 후보를 추천합니다.' : '판테온 봇이 IP 리서치를 시작합니다.'}</p><div class="drawer-actions"><button class="button primary" id="intake-ok">인테이크 확정</button><button class="button" id="intake-edit">내용 수정</button></div></div>`;
  else if (p.status === 'working' && p.stage >= 7 && job && !['image_plan', 'finalize', 'generate', 'aside'].includes(job.kind)) action = `<div class="detail-block"><h3>진행 중 · ${esc(STAGES[p.stage - 1])}</h3><p>이 단계는 준비 중입니다. 완성되면 여기서 이어서 진행됩니다.</p></div>`;
  else if (p.status === 'working') { const live = liveJobs(id); action = `<div class="detail-block"><h3>진행 중 · ${esc(STAGES[p.stage - 1])}</h3>${jobsProg(live.length ? live : [job])}</div>`; }
  else if (p.status === 'failed') action = `<div class="detail-block"><h3>작업 실패</h3><p>${esc(d.error || '판테온 봇이 작업을 끝내지 못했습니다.')}</p><div class="drawer-actions"><button class="button primary" id="job-retry">다시 시도</button></div></div>`;
  else if (p.status === 'waiting' && p.stage === 3 && d.partners) action = partnersPanel(p);
  else if (p.status === 'waiting' && p.stage === 5 && d.concepts) action = conceptsPanel(p);
  else if (p.status === 'waiting' && p.stage >= 7 && d.images) action = imagesPanel(p);
  else if (p.status === 'waiting') action = `<div class="detail-block"><h3>결정 · ${esc(GATES[p.stage] || '확인')}</h3><p>판테온 봇이 준비한 결과를 확인하고 결정해 주세요.</p></div>`;
  const done = [d.build && `<div class="detail-block"><h3>제안서 초안 v${d.build.version}</h3><div class="detail-row"><span>분량</span><b>${d.build.slides}쪽 · 이미지 자리 ${d.build.images}개</b></div>${d.images ? '' : '<p>이미지 자리는 회색 상자로 비워 두었습니다. 이미지 수급 단계에서 채웁니다.</p>'}<div class="detail-row"><span>강조색</span><b class="acc-row"><i class="swatch" style="background:${esc(d.build.deck?.theme?.accent || '#285541')}"></i>${esc(d.build.deck?.theme?.accent || '')} ${d.accent ? '(직접 고름)' : '(클로드 추천)'}${p.status === 'waiting' ? ` <input type="color" id="acc-new" value="${esc(d.build.deck?.theme?.accent || '#285541')}" aria-label="강조색 고르기"> <button class="text-btn" id="acc-apply">이 색으로 다시 그리기</button>` : ''}</b></div><div class="drawer-actions">${d.build.pdf ? `<button class="button primary" data-file="${esc(d.build.pdf)}">PDF 보기</button>` : ''}<button class="button" data-file="${esc(d.build.pptx)}" data-dl="1">PPTX 받기</button></div></div>`, d.concept_selected && `<div class="detail-block"><h3>확정한 컨셉</h3>${conceptCard(d.concept_selected)}</div>`, d.research && researchBlock(d.research), d.social && socialBlock(d.social)].filter(Boolean).join('');
  showDrawer(`<span class="entity-avatar">${esc(p.ip_a_name.slice(0, 2))}</span><h2>${esc(pTitle(p))}</h2><span class="detail-sub">${p.mode === 'single' ? '단독 제안' : '콜라보 제안'} · ${esc(p.recipient || '수신사 미정')}</span>
  <div class="detail-block"><h3>기본 정보</h3><div class="detail-row"><span>IP</span><b>${ent(p.ip_a_id, p.ip_a_name)}</b></div>${p.mode === 'collab' ? `<div class="detail-row"><span>파트너 IP</span><b>${p.ip_b_name ? ent(p.ip_b_id, p.ip_b_name) : '판테온 봇 추천 후 선택'}</b></div>` : ''}<div class="detail-row"><span>수신사</span><b>${esc(p.recipient || '—')}</b></div><div class="detail-row"><span>레퍼런스 포맷</span><b>${esc(ref?.title || '—')}</b></div><div class="detail-row"><span>현재 상태</span><b>${pPill(p)}</b></div>${p.note ? `<p>${esc(p.note)}</p>` : ''}</div>
  ${action}${done}<div class="detail-block"><h3>진행 단계</h3><ol class="stage-list">${stages}</ol></div><div class="detail-block"><h3>활동 기록</h3><div id="proposal-events"><p>불러오는 중입니다…</p></div></div>`, keep);
  const go = async (row, nextJob, msg, okMsg) => {
    const { error } = await SB.from('pt_proposal').update(row).eq('id', p.id);
    if (error) return toast('저장하지 못했습니다: ' + error.message);
    if (nextJob) await SB.from('pt_proposal_job').insert({proposal_id: p.id, ...nextJob});
    await proposalEvent(p.id, msg);
    studio.list = null; await loadStudio(); openProposal(p.id, true); if (okMsg) toast(okMsg);
  };
  $('#intake-edit')?.addEventListener('click', () => studioProjectModal(p));
  $('#intake-ok')?.addEventListener('click', () => {
    $('#intake-ok').disabled = true;
    const next = p.mode === 'collab' && !p.ip_b_name ? 3 : 4;
    go({stage: next, status: 'working'}, {kind: JOB_OF[next], input: {}}, `인테이크를 확정했습니다 → ${STAGES[next - 1]} 시작`, '인테이크를 확정했습니다.');
  });
  $('#job-retry')?.addEventListener('click', () => {
    $('#job-retry').disabled = true;
    const kind = d.failed_kind || JOB_OF[p.stage] || 'research';
    go({status: 'working', data: {...d, error: null}}, {kind, input: kind === 'generate' ? {estimate_only: true} : {retry: true}}, `${STAGES[p.stage - 1]} 작업을 다시 요청했습니다`);
  });
  $$('#drawer [data-file]').forEach(b => b.onclick = async () => {
    const { data: u, error } = await SB.storage.from('pt-studio').createSignedUrl(b.dataset.file, 600, b.dataset.dl ? {download: `${pTitle(p)}_v${d.build.version}.pptx`} : undefined);
    if (error) return toast('파일을 열지 못했습니다.');
    window.open(u.signedUrl, '_blank', 'noopener');
  });
  $('#acc-apply')?.addEventListener('click', ev => {
    ev.target.disabled = true; const c = $('#acc-new').value.toUpperCase();
    go({status: 'working', data: {...d, accent: c}}, {kind: 'finalize', input: {accent: c}}, `강조색을 ${c}(으)로 바꿔 다시 그리기를 요청했습니다`);
  });
  // 7 이미지 — 내 이미지로 바꾸기 · 다시 그리기 · 완료
  $$('#drawer [data-upimg]').forEach(inp => inp.onchange = async () => {
    const f = inp.files[0], key = inp.dataset.upimg; if (!f) return;
    if (f.size > 15e6) return toast('15MB 이하 이미지를 골라 주세요.');
    const ext = (f.name.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg');
    const path = `proposals/${p.id}/img/${key}-u${Date.now()}.${ext}`;
    const up = await SB.storage.from('pt-studio').upload(path, f, {contentType: f.type || 'image/jpeg', upsert: false});
    if (up.error) return toast('올리지 못했습니다: ' + up.error.message);
    const slots = {...d.images.slots, [key]: {...d.images.slots[key], status: 'uploaded', path, source_page: '', image_url: ''}};
    const { error } = await SB.from('pt_proposal').update({data: {...d, images: {...d.images, slots}}}).eq('id', p.id);
    if (error) return toast('저장하지 못했습니다: ' + error.message);
    await proposalEvent(p.id, `이미지 ${key} 을(를) 직접 올린 이미지로 바꿨습니다`);
    studio.list = null; await loadStudio(); openProposal(p.id, true); toast('이미지를 바꿨습니다. 「바꾼 이미지로 다시 그리기」를 누르면 제안서에 반영됩니다.');
  });
  $('#ai-est')?.addEventListener('click', ev => { ev.target.disabled = true; go({status: 'working'}, {kind: 'generate', input: {estimate_only: true}}, 'AI 이미지 견적을 요청했습니다'); });
  $('#ai-go')?.addEventListener('click', ev => {
    const usd = +ev.target.dataset.usd, n = d.images.ai_estimate.count;
    if (!confirm(`AI 이미지 ${n}장을 힉스필드로 만듭니다. 예상 비용 약 $${usd} 가 회사 힉스필드 API 잔액에서 나갑니다. 진행할까요?`)) return;
    ev.target.disabled = true;
    go({status: 'working'}, {kind: 'generate', input: {approved_usd: usd}}, `AI 이미지 ${n}장 생성을 승인했습니다 (예상 $${usd})`, '승인했습니다. 판테온 봇이 만들기 시작합니다.');
  });
  $$('#drawer [data-aside]').forEach(b => b.onclick = () => {
    const k = b.dataset.aside, sl = d.images.slots[k];
    const im = (d.build?.deck?.slides || []).flatMap(x => x.images || []).find(x => x.key === k) || {};
    b.disabled = true;
    go({status: 'working'}, {kind: 'aside', input: {slots: [{key: k, kind: sl.kind, what: sl.what || '', ratio: sl.ratio || '', search: im.search || ''}], ips: [p.ip_a_name, p.ip_b_name].filter(Boolean)}},
       `${sl.slide}쪽 「${sl.what || k}」 이미지를 Aside 로 다시 찾도록 요청했습니다`, 'Aside 에 맡겼습니다. 한 자리에 몇 분 걸립니다.');
  });
  $('#img-rerender')?.addEventListener('click', ev => { ev.target.disabled = true; go({status: 'working'}, {kind: 'finalize', input: {}}, '바꾼 이미지로 다시 그리기를 요청했습니다'); });
  $('#img-done')?.addEventListener('click', ev => { ev.target.disabled = true; go({status: 'done'}, null, `v${d.build.version} 으로 제안서를 완료했습니다`, '제안서를 완료했습니다.'); });
  if (d.images && $('#img-board')) loadImgThumbs(d.images.slots);
  if (d.social?.captures?.length) loadImgThumbs(Object.fromEntries(d.social.captures.map((c, i) => [i, c])));
  // 3 파트너 카드 고르기 · 다른 후보 · 카테고리 바꾸기
  $$('#drawer [data-pick]').forEach(b => b.onclick = () => {
    const c = d.partners.candidates[+b.dataset.pick], e = entityByName(c.ip);
    $$('#drawer [data-pick]').forEach(x => x.disabled = true);
    go({ip_b_name: e?.name || c.ip, ip_b_id: e?.id || null, stage: 4, status: 'working', data: {...d, partner_selected: c}}, {kind: 'research', input: {}}, `파트너 IP 「${c.ip}」를 골랐습니다 → 리서치 시작`, `${c.ip}을(를) 파트너로 골랐습니다.`);
  });
  // 추천 밖 IP 직접 넣기 (10-28 홍석진 대표님)
  const own = $('#pb-own');
  if (own) {
    own.oninput = () => { const v = own.value.trim(), e = entityByName(v); $('#pb-own-note').innerHTML = v ? (e ? `<b>컨택포인트 있음</b> · 판테온 엔티티 「${esc(e.name)}」(${esc(e.type)})와 연결됩니다${contactsOf(e).length ? ` · 등록된 담당자 ${contactsOf(e).length}명` : ''}` : '<span class="err">컨택포인트 없음</span> · 판테온 엔티티에 등록되지 않은 IP입니다. 이름 그대로 진행합니다.') : ''; };
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
    go({status: 'working'}, {kind: 'partners', input: {mode: 'recategorize', exclude: [...(d.partners.shown || []), ...(d.partners.categories || []).map(c => c.name)]}}, '카테고리를 바꿔 다시 추천을 요청했습니다');
  });
  // 5 컨셉 확정
  $$('#drawer [data-concept]').forEach(b => b.onclick = () => {
    const c = d.concepts.candidates[+b.dataset.concept];
    $$('#drawer [data-concept]').forEach(x => x.disabled = true);
    go({stage: 6, status: 'working', data: {...d, concept_selected: c}}, {kind: 'build', input: {}}, `컨셉 「${c.name}」을(를) 확정했습니다 → 제안서 생성`, '컨셉을 확정했습니다.');
  });
  clearTimeout(propPoll);
  if (p.status === 'working') propPoll = setTimeout(() => pollProposal(p.id), 3000);      // 작업 중이면 단계와 상관없이 항상
  const { data } = await SB.from('pt_proposal_event').select('at,actor_name,message').eq('proposal_id', id).order('at', {ascending: false}).limit(50);
  const box = $('#proposal-events'); if (!box || activeDetail !== 'p:' + id) return;
  box.innerHTML = data?.length ? `<ol class="owner-hist">${data.map(e => `<li><time>${esc(kst(e.at))}</time><span>${esc(e.message)}<br><small>${esc(e.actor_name || '판테온 봇')}</small></span></li>`).join('')}</ol>` : '<p>기록이 없습니다.</p>';
}

function studioProjectModal(p) {
  const refs = studio.refs || [], def = p?.ref_id || refs.find(r => r.is_default)?.id || refs[0]?.id || '';
  const names = entities().filter(e => !e.hidden).map(e => `<option value="${esc(e.name)}">`).join('');
  modal(`<form id="sp-form"><h2>${p ? '인테이크 수정' : '새 제안서 프로젝트'}</h2><p>IP 하나로 시작합니다. 판테온에 등록된 엔티티를 고르면 담당자·연락처가 함께 연결됩니다.</p><datalist id="sp-ents">${names}</datalist>
  <label>IP *<input id="sp-a" list="sp-ents" required maxlength="80" value="${esc(p?.ip_a_name || '')}" placeholder="예: 에스파"></label><small class="atnote" id="sp-a-note"></small>
  <div class="field"><span class="flabel">제안 방식</span><div class="seg-pick"><label><input type="radio" name="sp-mode" value="collab" ${p?.mode !== 'single' ? 'checked' : ''}> 콜라보 제안 <small>IP A × IP B</small></label><label><input type="radio" name="sp-mode" value="single" ${p?.mode === 'single' ? 'checked' : ''}> 단독 제안 <small>IP 하나</small></label></div></div>
  <div id="sp-b-field"><label>파트너 IP<input id="sp-b" list="sp-ents" maxlength="80" value="${esc(p?.ip_b_name || '')}" placeholder="비워 두면 판테온 봇이 후보를 추천합니다"></label><small class="atnote" id="sp-b-note"></small></div>
  <label>수신사<input id="sp-to" list="sp-ents" maxlength="80" value="${esc(p?.recipient || '')}" placeholder="예: SM엔터테인먼트"></label>
  <label>레퍼런스 포맷<select id="sp-ref">${refs.length ? refs.map(r => `<option value="${r.id}" ${r.id === def ? 'selected' : ''}>${esc(r.title)}${r.is_default ? ' (기본)' : ''}</option>`).join('') : '<option value="">등록된 레퍼런스 없음</option>'}</select></label>
  <div class="field"><span class="flabel">강조색</span><div class="accent-pick"><label><input type="radio" name="sp-acc" value="" ${p?.data?.accent ? '' : 'checked'}> 클로드 추천</label><label><input type="radio" name="sp-acc" value="pick" ${p?.data?.accent ? 'checked' : ''}> 직접 고르기 <input type="color" id="sp-color" value="${esc(p?.data?.accent || '#E0245E')}"></label></div><small class="atnote">클로드 추천은 컨셉과 두 IP의 분위기에 맞춰 판테온 봇이 정합니다. 초안을 만든 뒤에도 바꿀 수 있습니다.</small></div>
  <label>메모<input id="sp-note" maxlength="300" value="${esc(p?.note || '')}" placeholder="예: 최초 제안 · 팝업 중심"></label>
  <div id="sp-error" style="color:#ba775e;margin-top:14px;font-size:11px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">${p ? '변경 저장' : '프로젝트 만들기'}</button></div></form>`);
  const sync = () => { const collab = $('input[name=sp-mode]:checked').value === 'collab'; $('#sp-b-field').hidden = !collab; };
  $$('input[name=sp-mode]').forEach(r => r.onchange = sync); sync();
  $('#sp-color').oninput = () => { $('input[name=sp-acc][value=pick]').checked = true; };
  const note = (inp, out) => { const e = entityByName($(inp).value); $(out).innerHTML = $(inp).value.trim() ? (e ? `<b>컨택포인트 있음</b> · 판테온 엔티티 「${esc(e.name)}」(${esc(e.type)})와 연결됩니다${contactsOf(e).length ? ` · 등록된 담당자 ${contactsOf(e).length}명` : ''}` : '<span class="err">컨택포인트 없음</span> · 판테온 엔티티에 등록되지 않은 IP입니다. 이름 그대로 진행합니다.') : ''; };
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
    await proposalEvent(data.id, p ? '인테이크 내용을 수정했습니다' : `프로젝트를 만들었습니다 (${mode === 'single' ? '단독' : '콜라보'} 제안)`);
    $('#modal').close(); studio.list = null; await loadStudio(); openProposal(data.id); toast(p ? '인테이크를 수정했습니다.' : '프로젝트를 만들었습니다.');
  };
}

function studioRefModal() {
  modal(`<form id="sr-form"><h2>레퍼런스 등록</h2><p>팀이 만든 완성 제안서(PDF·PPTX)를 올립니다. 판테온 봇이 페이지 구성과 이미지 배치를 분석해 새 제안서의 포맷으로 씁니다.</p>
  <label>파일 * (PDF·PPTX, 100MB 이하)<input id="sr-file" type="file" accept=".pdf,.pptx,application/pdf" required></label>
  <label>제안서 이름 *<input id="sr-title" required maxlength="120" placeholder="예: 바비 × 장원영 IP 콜라보레이션 제안서"></label>
  <datalist id="sr-ents">${entities().filter(e => !e.hidden).map(e => `<option value="${esc(e.name)}">`).join('')}</datalist>
  <div class="field"><span class="flabel">IP</span><div id="sr-ip"></div></div>
  <label>수신사<input id="sr-to" list="sr-ents" maxlength="80"></label>
  <div class="field"><span class="flabel">작성자</span><div id="sr-author"></div></div>
  <div id="sr-error" style="color:#ba775e;margin-top:14px;font-size:11px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">등록</button></div></form>`);
  const ips = ipChips($('#sr-ip'), [], 'sr-ents');
  const authors = memberChips($('#sr-author'), [], {note: '<span class="err">빨간 이름</span>은 헤임달에 등록되지 않은 사람입니다.'});
  $('#sr-file').onchange = () => { const f = $('#sr-file').files[0]; if (f && !$('#sr-title').value) $('#sr-title').value = f.name.replace(/\.(pdf|pptx)$/i, ''); };
  $('#sr-form').onsubmit = async ev => {
    ev.preventDefault();
    const f = $('#sr-file').files[0]; if (!f) return;
    if (f.size > 100e6) { $('#sr-error').textContent = '100MB 이하 파일을 선택해 주세요.'; return; }
    const btn = $('#sr-form [type=submit]'); btn.disabled = true; btn.textContent = '업로드하는 중…';
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
function go(p) { page = p; filter = '전체'; query = ''; $('#global-search').value = ''; try { history.replaceState(null, '', '#' + p); } catch {} render(); window.scrollTo(0, 0); }
function bindContent() {
  $$('[data-page]').forEach(b => b.onclick = () => go(b.dataset.page));
  $$('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; render(); });
  // 목록 안 검색 (엔티티 DB·연락처) — 키워드만, 지금 보는 목록에서 거름
  $('#local-form')?.addEventListener('submit', ev => { ev.preventDefault(); query = $('#local-q').value.trim(); render(); $('#local-q')?.focus(); });
  $('#local-clear')?.addEventListener('click', () => { query = ''; render(); });
  $$('[data-filter-go]').forEach(b => b.onclick = () => { go('entities'); filter = b.dataset.filterGo; render(); });
  $$('[data-stat]').forEach(b => { const open = () => { const v = b.dataset.stat; if (v === 'contacts') return go('contacts'); go('entities'); filter = v; render(); }; b.onclick = open; b.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } }; });
  $$('[data-detail]').forEach(b => { b.onclick = () => openDetail(b.dataset.detail); b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(b.dataset.detail); } }; });
  $('#admin-export')?.addEventListener('click', exportCSV);
  bindAsk(); if (page === 'admin') bindAdmin(); if (page === 'studio') bindStudio();
}

/* ---------- 로그인 ---------- */
function loginScreen(msg) {
  $('#login').hidden = false;
  $('#login').innerHTML = `<form class="login-box" id="login-form"><div class="brand"><span class="brand-mark">Π</span>PANTHEON<span class="brand-dot">®</span></div><p>헤임달 계정으로 로그인합니다.<br>헤임달에 가입 완료된 더올마이티 임직원만 로그인이 가능합니다.</p><label>이메일<input id="lg-email" type="email" autocomplete="username" required></label><label>비밀번호<input id="lg-pw" type="password" autocomplete="current-password" required></label><div id="lg-err" role="alert" style="color:#ba775e;font-size:11px;margin-top:10px">${esc(msg || '')}</div><button class="button primary" type="submit" style="width:100%;justify-content:center;margin-top:16px">로그인</button><button class="text-btn" type="button" id="lg-reset" style="margin-top:14px;font-size:11px">비밀번호를 잊으셨나요? 비밀번호 찾기</button></form>`;
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
  $('#login').innerHTML = `<form class="login-box" id="np-form"><div class="brand"><span class="brand-mark">Π</span>PANTHEON<span class="brand-dot">®</span></div><p><b>새 비밀번호를 설정해 주세요.</b><br>헤임달과 같은 계정이므로, 여기서 변경하면 헤임달 비밀번호도 함께 변경됩니다.</p><label>새 비밀번호 (8자 이상)<input id="np1" type="password" autocomplete="new-password" required minlength="8"></label><label>새 비밀번호 다시 한 번<input id="np2" type="password" autocomplete="new-password" required minlength="8"></label><div id="np-err" role="alert" style="color:#ba775e;font-size:11px;margin-top:10px">${esc(msg || '')}</div><button class="button primary" type="submit" style="width:100%;justify-content:center;margin-top:16px">비밀번호 변경</button></form>`;
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
  const [can, adm, mem, sc] = await Promise.all([SB.rpc('pt_can_use'), SB.rpc('pt_is_admin'), SB.from('hd_member').select('name,role').eq('id', me.id).maybeSingle(), SB.rpc('pt_studio_can')]);
  studioCan = !sc.error && !!sc.data;            // 제안서 스튜디오 — 시험 기간 3명만 (함수가 없거나 거절이면 숨김)
  if (!can.data) { await SB.auth.signOut(); return loginScreen('헤임달에서 아직 승인되지 않은 계정입니다. 승인 후 다시 로그인해 주세요.'); }
  isAdmin = !!adm.data; myName = mem.data?.name || me.email;
  $('#login').hidden = true;
  $('#profile').innerHTML = `<span class="avatar">${esc(myName.slice(0, 1))}</span><span>${esc(myName)}<small>${isAdmin ? 'DB 관리자' : '구성원'} · 로그아웃</small></span>${isAdmin ? '<span class="admin">ADMIN</span>' : ''}`;
  $('.top-avatar').textContent = myName.slice(0, 1);
  SB.from('pt_profile').select('slack_image').eq('member_id', me.id).maybeSingle().then(({data}) => {   // 판테온 봇이 채운 슬랙 프로필 사진
    const u = data?.slack_image; if (!u) return;
    const img = `<img src="${esc(u)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    $('.top-avatar').innerHTML = img; const a = $('#profile .avatar'); if (a) { a.innerHTML = img; a.style.overflow = 'hidden'; }
  });
  try { await load(); } catch (e) { $('#content').innerHTML = `<div class="notice">판테온 DB를 불러오지 못했습니다: ${esc(e?.message || '')}</div>`; return; }
  const h = location.hash.slice(1); page = h && !h.includes('=') ? h : 'home'; render();
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
$('#profile').onclick = async () => { if (!me) return; modal(`<h2>로그아웃</h2><p>${esc(myName)}님, 판테온에서 로그아웃합니다. 헤임달에서도 함께 로그아웃됩니다.</p><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="button" id="logout-go">로그아웃</button></div>`); $('#logout-go').onclick = async () => { await SB.auth.signOut(); location.reload(); }; };
$('#overlay').onclick = closeDrawer;
SB.auth.onAuthStateChange(e => { if (e === 'PASSWORD_RECOVERY') { RECOVERY = true; recoveryScreen(); } });
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (me && h && !h.includes('=') && h !== page) { page = h; filter = '전체'; render(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); $('#global-search').focus(); } });
start();
