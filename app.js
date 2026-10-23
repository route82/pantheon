/* PANTHEON 웹앱 — 홍석진 대표님 PANTHEON v0.1 화면 구조 그대로 + 판테온 DB(Supabase pt_ 표)
   2026-10-22 AX팀 김현우
   · 로그인 = 헤임달 계정 (같은 Supabase · 같은 주소라 헤임달에 로그인돼 있으면 그대로 들어옴)
   · 쓰는 사람 = 헤임달 승인 구성원 (DB 가 막음 — pt_can_use)
   · 누가·언제·무엇을 = DB 트리거가 pt_change 에 남김 (화면은 그 기록을 보여 주기만)
   · 질문·명함 읽기 = pt_ask 에 넣으면 사무실 PC 판테온 봇이 Claude 로 처리해 답을 씀 (키는 PC 에만)
   · 이번 범위 = 10/21 회의 지시(엔티티 DB·등록·명함·회사 연결·연락) — 모니터링·딜은 숨김 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB = createClient('https://dwoiobqucmikbtikfjwk.supabase.co', 'sb_publishable_K6BW26u2jRkTBDwuMqaaFA_3HkfnOc9');
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const icons = {home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',entities:'<path d="M12 3 3 8l9 5 9-5-9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5"/>',contacts:'<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8 17c0-4 8-4 8 0 M2 7h3 M2 12h3 M2 17h3"/>',admin:'<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 3 3-1 2 3 4-1 1-3 3-1 1-4-3-2 1-3-3-3-3 1Z"/><circle cx="12" cy="12" r="3"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',bell:'<path d="M5 16h14l-2-3V8a5 5 0 0 0-10 0v5l-2 3Z M10 20h4"/>',plus:'<path d="M12 5v14 M5 12h14"/>',download:'<path d="M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5"/>',arrow:'<path d="M4 12h16 m-5-5 5 5-5 5"/>',up:'<path d="m3 16 7-7 4 4 7-9 M15 4h6v6"/>',warning:'<path d="M12 3 2 21h20L12 3Z M12 9v5 M12 17v.2"/>',close:'<path d="m6 6 12 12 M6 18 18 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',link:'<path d="m9 15 6-6 M7 14l-2 2a3 3 0 0 0 4 4l4-4 M11 8l4-4a3 3 0 0 1 4 4l-2 2"/>'};
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
const menus = [['home','오버뷰'],['entities','엔티티 DB'],['contacts','연락처'],['admin','DB 관리']];
const navMenus = () => menus.filter(m => m[0] !== 'admin' || isAdmin);
const byId = id => all.find(e => e.id === id);
const isContact = e => e.type === '거래처 담당자';
const entities = () => all.filter(e => !isContact(e)), contacts = () => all.filter(isContact);
const contactsOf = e => all.filter(x => isContact(x) && x.parentId === e.id);

function fromRow(r) {
  const en = r.en || '';
  const w = en.split(/[\s\-:&]+/).filter(Boolean);
  return {id:r.id, type:r.kind, name:r.name, en, aliases:r.aliases||[], parentId:r.parent_id, agencyText:r.agency||'',
    role:r.role||'', rel:r.rel||'', points:r.points||[], facts:r.facts||[], note:r.note, sides:r.sides||[], owners:r.owners||[],
    img:r.img||'', cardImg:r.card_img||'', first:r.first_seen||'', last:r.last_seen||'', hidden:!!r.hidden,
    color:COLOR[r.kind]||'', initial: en ? (w.length === 1 ? w[0].slice(0,3) : w.slice(0,3).map(x => x[0]).join('')).toUpperCase() : r.name.slice(0,2)};
}
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
  const { data, error } = await SB.from('pt_entity').select('*').order('name').limit(5000);
  if (error) throw error;
  all = data.map(fromRow);
}

/* ---------- 화면 조각 ---------- */
const avatar = e => { const s = imgSrc(e.img); return `<span class="entity-avatar ${s ? 'has-img' : e.color || ''}">${s ? `<img src="${s}" alt="">` : esc(e.initial)}</span>`; };
function entityCard(e) { const c = contactsOf(e).length; return `<article class="entity-card" data-detail="${e.id}" tabindex="0" role="button" aria-label="${esc(e.name)} 상세 보기"><div class="entity-top">${avatar(e)}<div><b>${esc(e.name)}</b><small>${esc(e.en || agencyOf(e))}</small></div></div><span class="entity-category">${esc(e.type)}</span>${e.hidden ? ' <span class="entity-category">숨김</span>' : ''}<p class="entity-rel ${e.rel ? '' : 'none'}">${esc(e.rel || '관계 근거 미기재 — 우리 쪽 담당에게 확인이 필요합니다.')}</p><div class="card-bottom"><span>${c ? '보유 컨택 ' + c + '명' : '컨택 경로 미확보'}</span><span>상세 보기 ↗</span></div></article>`; }
function stats() { const es = entities(), cs = contacts(); return `<div class="stats"><div class="stat"><div class="stat-label">${icon('entities')} 등록 엔티티</div><div class="stat-value">${es.length}<small>개</small></div><div class="stat-bottom"><span class="positive">판테온 DB</span> · 모두가 같이 보는 자료</div></div><div class="stat"><div class="stat-label">${icon('contacts')} 보유 컨택</div><div class="stat-value">${cs.length}<small>명</small></div><div class="stat-bottom">거래처 담당자 · 회사와 연결</div></div><div class="stat"><div class="stat-label">${icon('up')} IP·유명인</div><div class="stat-value">${es.filter(e => e.type === 'IP·유명인').length}<small>명</small></div><div class="stat-bottom">우리가 계약·활용하는 인물</div></div><div class="stat highlight"><div class="stat-label">${icon('link')} 담당자 연결 회사</div><div class="stat-value">${es.filter(e => contactsOf(e).length).length}<small>곳</small></div><div class="stat-bottom">같은 회사 담당자는 한 회사로 묶입니다</div></div></div>`; }
const EXAMPLES = ['골포스트가 협업한 리그·매체는?', '사운드스루 제작지원 브랜드 목록', '브이티코스메틱 담당자 누구야?', '포켓몬이랑 지금 뭐 하고 있어?'];
function askPanel() { return `<section class="panel ask-panel"><div class="panel-head"><div><div class="panel-title">무엇이든 물어보세요 <small>ASK PANTHEON</small></div><p class="panel-caption">판테온 DB에서 찾아 Claude가 답합니다. 슬랙 「Pantheon」 봇에 물어도 같은 답이 나옵니다.</p></div></div><div class="ask-body"><div class="ask-row"><input id="ask-input" type="search" autocomplete="off" placeholder="예: 게티이미지 담당자 누구야?"><button class="button primary" id="ask-btn" type="button">질문하기</button></div><div class="ask-examples">${EXAMPLES.map(x => `<button type="button" data-ask="${esc(x)}">${esc(x)}</button>`).join('')}</div><div class="ask-answer" id="ask-answer" ${lastAnswer ? '' : 'hidden'}>${lastAnswer}</div></div></section>`; }
function alerts() { const es = entities(); const noC = es.filter(e => !contactsOf(e).length && !['기관','IP·유명인'].includes(e.type)).length, noRel = es.filter(e => !e.rel).length, ip = es.filter(e => e.type === 'IP·유명인').length; return `<section class="panel"><div class="panel-head"><div class="panel-title">오늘의 체크포인트</div><span class="alert-count">3건</span></div><div class="alert-list"><button class="alert-row" data-page="contacts"><span class="alert-symbol green">${icon('link')}</span><span class="alert-text">컨택 경로가 아직 연결되지 않았어요<small>엔티티 ${noC}개 · 명함을 등록하면 연결됩니다</small></span></button><button class="alert-row" data-filter-go="전체"><span class="alert-symbol red">${icon('warning')}</span><span class="alert-text">관계 근거가 비어 있는 엔티티<small>${noRel}개 · 우리 쪽 담당 확인 필요</small></span></button><button class="alert-row" data-filter-go="IP·유명인"><span class="alert-symbol">${icon('up')}</span><span class="alert-text">활용할 수 있는 IP·유명인<small>${ip}명 · 엔티티 DB에서 보기</small></span></button></div></section>`; }
function filters() { const types = TYPES.filter(t => entities().some(e => e.type === t)); return `<div class="tabs">${['전체', ...types].map(t => `<button class="tab ${filter === t ? 'active' : ''}" data-filter="${t}">${t}</button>`).join('')}</div>`; }
const hay = e => [e.name, e.en, agencyOf(e), e.role, e.rel, e.note, ...e.aliases, ...e.sides, ...e.owners, ...e.facts, ...e.points].join(' ').toLowerCase();
const match = e => (filter === '전체' || e.type === filter) && hay(e).includes(query.toLowerCase());
function contactTable(arr) { return `<div class="table-wrap"><table class="ct"><thead><tr><th>이름</th><th>회사 연결</th><th>직함</th><th>연락처(업무)</th><th>명함</th></tr></thead><tbody>${arr.map(c => `<tr class="clickable" data-detail="${c.id}" tabindex="0"><td data-label="이름">${esc(c.name)}</td><td data-label="회사">${c.parentId ? `<span class="pill good">${esc(agencyOf(c))}</span>` : esc(c.agencyText || '회사 미연결')}</td><td data-label="직함">${esc(c.role || '—')}</td><td data-label="연락처">${esc(c.points[0] || '—')}</td><td data-label="명함">${c.cardImg ? '<span class="pill good">있음</span>' : '—'}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">검색 결과가 없습니다.</div></td></tr>'}</tbody></table></div>`; }

function render() {
  if (!navMenus().some(m => m[0] === page)) page = 'home';
  $('#nav').innerHTML = navMenus().map(([key, title]) => `<button class="nav-item ${page === key ? 'active' : ''}" data-page="${key}">${icon(key)}<span>${title}</span>${key === 'contacts' ? `<span class="nav-count">${contacts().length}</span>` : ''}</button>`).join('');
  const title = {home:['워크스페이스 오버뷰','가능성을 발견하고, 관계를 연결하고, 다음 기회를 준비하세요.'], entities:['엔티티 DB','더올마이티·골포스트·사운드스루가 만나 온 연결을 한곳에.'], contacts:['연락처','사람과 조직을 연결하고, 다음 대화를 준비하세요.'], admin:['DB 관리','누가 언제 무엇을 바꿨는지 확인하고, 필요하면 되돌리세요.']}[page];
  $('#crumb').textContent = menus.find(m => m[0] === page)?.[1];
  $('#page-title').innerHTML = title[0] + '<span class="title-dot">.</span>';
  $('#page-subtitle').textContent = title[1];
  $('#export-btn').innerHTML = icon('download') + '내보내기';
  $('#add-btn').innerHTML = icon('plus') + (page === 'contacts' ? '연락처 등록' : '엔티티 등록');
  let html = '';
  if (page === 'home') html = stats() + `<div class="main-grid">${askPanel()}${alerts()}</div>`;
  if (page === 'entities') { const arr = entities().filter(match); html = `<div class="notice">판테온 DB 엔티티 ${entities().length}개. 등록·수정하면 모두에게 보이고, 누가 언제 무엇을 바꿨는지 기록이 남습니다.</div><section class="panel"><div class="panel-head"><div class="panel-title">엔티티 목록 <small>${arr.length} ENTITIES</small></div></div><div class="watch-toolbar">${filters()}<span class="text-btn">이름·영문명·별칭·관계 검색 지원</span></div><div class="entity-grid">${arr.map(entityCard).join('') || '<div class="empty">검색 결과가 없습니다.</div>'}</div></section>`; }
  if (page === 'contacts') { const arr = contacts().filter(c => hay(c).includes(query.toLowerCase())); html = `<div class="notice">「연락처 등록」에서 명함 사진을 올리면 판테온 봇이 읽어 칸을 채우고, 명함 이미지도 함께 남깁니다. 거래처 담당자는 회사와 연결되어 회사 상세의 「보유 컨택」에도 나옵니다.</div><section class="panel"><div class="panel-head"><div class="panel-title">연락처 <small>CONTACTS</small></div><span class="nav-count">${contacts().length}</span></div>${contactTable(arr)}</section>`; }
  if (page === 'admin') html = adminView();
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
const pointsBlock = e => e.points.map((p, i) => `<div class="point"><code id="pt-${e.id}-${i}">${esc(p)}</code><button type="button" data-copy="pt-${e.id}-${i}">복사</button></div>`).join('');
const noteOf = e => e.note ?? e.facts.join('\n');
const noteBlock = e => `<div class="detail-block"><h3>리서치 노트</h3><textarea id="research-note" placeholder="확인한 내용과 출처를 기록하세요." aria-label="리서치 노트">${esc(noteOf(e))}</textarea><button class="button primary" id="save-note">노트 저장</button><p>업무 기록에서 옮긴 내용으로 시작합니다. 저장한 노트는 모두에게 보이고 변경 기록이 남습니다.</p></div>`;
function bindNote(e) { $('#save-note').onclick = async () => { const b = $('#save-note'); b.disabled = true; const ok = await save(e.id, {note: $('#research-note').value}); b.disabled = false; if (ok) toast('리서치 노트를 저장했습니다.'); }; }
const adminTools = e => isAdmin ? `<button class="button" id="hide-entity">${e.hidden ? '되살리기' : '숨기기'}</button>` : '';
function bindAdminTools(e) { $('#hide-entity')?.addEventListener('click', async () => { const { error } = await SB.rpc('pt_set_hidden', {entity: e.id, value: !e.hidden}); if (error) return toast('바꾸지 못했습니다: ' + error.message); await load(); render(); openDetail(e.id); toast(e.hidden ? '되살렸습니다.' : '숨겼습니다. DB 관리자만 볼 수 있습니다.'); }); }

function openDetail(id, keep) {
  const e = byId(id); if (!e) return; activeDetail = id;
  if (isContact(e)) return openContact(e, keep);
  const cs = contactsOf(e), parent = e.parentId && byId(e.parentId);
  showDrawer(`${avatar(e)}<h2>${esc(e.name)}</h2><span class="detail-sub">${esc(e.en ? e.en + ' · ' : '')}${esc(e.type)}</span><div class="drawer-actions"><button class="button" id="edit-entity">정보 수정</button>${adminTools(e)}</div><div class="detail-block"><h3>기본 정보 및 관계</h3><div class="detail-row"><span>소속 / 권리 관계</span><b>${parent ? `<button class="ref" type="button" data-open="${parent.id}">${esc(parent.name)}</button>` : esc(e.agencyText || '—')}</b></div><div class="detail-row"><span>관계 근거</span><b>${esc(e.rel || '추가 확인 필요')}</b></div><div class="detail-row"><span>우리 쪽 담당</span><b>${ownersLine(e.owners)}</b></div><div class="detail-row"><span>보유 컨택</span><b>${cs.length}명</b></div>${cs.length ? linkList(cs) : ''}${pointsBlock(e)}<p>실제 권리 검증 및 담당자 확인 전에는 G1 통과로 처리하지 않습니다.</p></div><div class="detail-block"><h3>별칭</h3>${[e.name, ...e.aliases].map(a => `<span class="tag">${esc(a)}</span>`).join('')}</div>${noteBlock(e)}`, keep);
  $('#edit-entity').onclick = () => entityModal(e); bindNote(e); bindAdminTools(e);
}
function openContact(c, keep) {
  const org = c.parentId && byId(c.parentId), card = imgSrc(c.cardImg);
  showDrawer(`<span class="entity-avatar">${esc(c.name.slice(0, 2))}</span><h2>${esc(c.name)}</h2><span class="detail-sub">${esc(c.role ? c.role + ' · ' : '')}거래처 담당자</span><div class="drawer-actions"><button class="button" id="edit-contact">정보 수정</button>${adminTools(c)}</div><div class="detail-block"><h3>기본 정보 및 관계</h3><div class="detail-row"><span>회사 연결</span><b>${org ? `<button class="ref" type="button" data-open="${org.id}">${esc(org.name)}</button> <button class="text-btn" type="button" id="link-company">변경</button>` : `<button class="button" type="button" id="link-company">${icon('link')} 회사 미연결 · 연결하기</button>`}</b></div><div class="detail-row"><span>관계 근거</span><b>${esc(c.rel || '추가 확인 필요')}</b></div><div class="detail-row"><span>우리 쪽 담당</span><b>${ownersLine(c.owners)}</b></div>${pointsBlock(c) || '<p>기록된 업무 연락처가 없습니다.</p>'}</div><div class="detail-block"><h3>명함</h3>${c.cardImg ? (card ? `<button type="button" id="card-view" style="border:0;padding:0;background:none;width:100%"><img src="${card}" alt="${esc(c.name)} 명함" style="width:100%;border:1px solid #e4eae4;border-radius:7px;display:block"></button><p>누르면 크게 봅니다.</p>` : '<p>명함을 불러오는 중입니다…</p>') : '<p>올린 명함이 없습니다.</p>'}<label class="button" style="display:inline-flex;margin-top:6px;cursor:pointer">${c.cardImg ? '명함 바꾸기' : '명함 이미지 올리기'}<input id="card-replace" type="file" accept="image/*" hidden></label></div>${noteBlock(c)}`, keep);
  bindNote(c); bindAdminTools(c);
  $('#link-company').onclick = () => linkModal(c);
  $('#edit-contact').onclick = () => contactEditModal(c);
  $('#card-view')?.addEventListener('click', () => modal(`<h2>${esc(c.name)} 명함</h2><img src="${card}" alt="${esc(c.name)} 명함" style="width:100%;border-radius:7px;margin-top:10px"><div class="modal-actions"><button class="button primary" data-cancel>닫기</button></div>`));
  $('#card-replace').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; try { const r = await resize(f, 1600, .82); const path = await upload(r.blob, 'cards'); if (await save(c.id, {cardImg: path})) { openDetail(c.id); toast('명함 이미지를 저장했습니다.'); } } catch { toast('이미지를 올리지 못했습니다.'); } };
}

/* ---------- 우리 쪽 담당 입력 (헤임달 참석자 입력과 같은 방식) ----------
   이름을 적고 Enter · 헤임달 승인 직원이면 정식 이름으로 맞추고 소속을 보여 줌 · 없는 이름은 빨갛게 · 맨 앞 = 주 담당 */
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
function ownersInput(host, initial) {
  host.innerHTML = `<div class="atin"><input type="text" list="pt-mnames" placeholder="이름을 적고 Enter"></div><small class="atnote">맨 앞 사람이 <b>주 담당</b>입니다. 이름을 누르면 주 담당으로 바뀝니다. <span class="err">빨간 이름</span>은 등록되지 않은 사람입니다.</small>`;
  const box = host.querySelector('.atin'), inp = host.querySelector('input');
  let vals = (initial || []).map(x => (x || '').trim()).filter(Boolean);
  const draw = () => {
    [...box.querySelectorAll('.atc')].forEach(x => x.remove());
    vals.forEach((v, i) => {
      const hit = findMember(v), c = document.createElement('span');
      c.className = 'atc' + (hit ? '' : ' out') + (i === 0 ? ' main' : '');
      c.title = hit ? [...new Set([hit.name, hit.company, hit.dept].filter(Boolean))].join(' · ') : '등록되지 않은 사람입니다';
      c.innerHTML = `${i === 0 ? '<em>주 담당</em>' : ''}<span>${esc(v)}</span>${hit && (hit.company || hit.dept) ? `<small>${esc([...new Set([hit.company, hit.dept].filter(Boolean))].join(' · '))}</small>` : ''}<button type="button" aria-label="${esc(v)} 지우기">×</button>`;
      c.querySelector('button').onclick = ev => { ev.stopPropagation(); vals.splice(i, 1); draw(); };
      c.onclick = () => { if (i) { vals.unshift(vals.splice(i, 1)[0]); draw(); } };
      box.insertBefore(c, inp);
    });
  };
  const add = t => {
    t = (t || '').replace(/,+$/, '').trim(); if (!t) return;
    const hit = findMember(t); if (hit) t = hit.name;          // 정식 이름으로 맞춤 (「김성효 팀장」 → 「김성효」)
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
  draw(); loadMembers().then(draw).catch(() => {});
  return { value() { add(inp.value); return vals.slice(); } };
}
const ownersLine = owners => owners.length ? owners.map((o, i) => `${i === 0 ? '<span class="main-badge">주 담당</span> ' : ''}${esc(o)}`).join(' · ') : '—';

/* ---------- 창 ---------- */
function modal(content) { $('#modal').innerHTML = content; $('#modal').showModal(); $('#modal').querySelector('[data-cancel]')?.addEventListener('click', () => $('#modal').close()); }
function companyOptions(selected) { const es = entities().filter(e => e.type !== 'IP·유명인').sort((a, b) => a.name.localeCompare(b.name, 'ko')); return es.map(e => `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${esc(e.name)}${e.en ? ' · ' + esc(e.en) : ''} (${esc(e.type)})</option>`).join(''); }
function linkModal(c) {
  modal(`<form id="link-form"><h2>회사 연결</h2><p>${esc(c.name)} 님이 속한 회사를 고르세요. 연결하면 그 회사 상세의 「보유 컨택」에도 나옵니다.</p><label>회사 찾기<input id="link-find" type="search" autocomplete="off" placeholder="이름·영문명·별칭"></label><label>회사<select id="link-select" size="8" required>${companyOptions(c.parentId)}</select></label><div id="link-error" style="color:#ba775e;margin-top:12px;font-size:11px" role="alert"></div><p style="font-size:10px">목록에 없으면 「엔티티 등록」으로 회사를 먼저 등록한 뒤 연결하세요.</p><div class="modal-actions">${c.parentId ? '<button class="button" type="button" id="link-clear">연결 해제</button>' : ''}<button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">이 회사로 연결</button></div></form>`);
  $('#link-find').oninput = ev => { const q = ev.target.value.toLowerCase(); [...$('#link-select').options].forEach(o => { const e = byId(o.value); o.hidden = !!q && ![e.name, e.en, ...e.aliases].filter(Boolean).join(' ').toLowerCase().includes(q); }); $('#link-error').textContent = [...$('#link-select').options].some(o => !o.hidden) ? '' : '찾는 회사가 없습니다. 「엔티티 등록」으로 먼저 등록해 주세요.'; };
  const go = async org => { if (!await save(c.id, {parentId: org ? org.id : null, agencyText: org ? org.name : ''})) return; $('#modal').close(); render(); openDetail(c.id); toast(org ? `${c.name} 님을 ${org.name}에 연결했습니다.` : `${c.name} 님의 회사 연결을 해제했습니다.`); };
  $('#link-clear')?.addEventListener('click', () => go(null));
  $('#link-form').onsubmit = ev => { ev.preventDefault(); const org = byId($('#link-select').value); if (!org) { $('#link-error').textContent = '연결할 회사를 골라 주세요.'; return; } go(org); };
}
function contactEditModal(c) {
  modal(`<form id="ce-form"><h2>연락처 수정</h2><p>저장하면 모두에게 보이고, 누가 언제 무엇을 바꿨는지 기록이 남습니다.</p><label>이름 *<input id="ce-name" required maxlength="50" value="${esc(c.name)}"></label><label>직함 · 부서<input id="ce-role" maxlength="100" value="${esc(c.role)}"></label><label>연락처 (한 줄에 하나)<textarea id="ce-points" rows="5" style="display:block;width:100%;border:1px solid #dde4d9;border-radius:5px;padding:10px;margin-top:8px;font:inherit">${esc(c.points.join('\n'))}</textarea></label><label>관계 근거<input id="ce-rel" maxlength="200" value="${esc(c.rel)}"></label><div class="field"><span class="flabel">우리 쪽 담당</span><div id="ce-owners"></div></div><div id="ce-error" style="color:#ba775e;margin-top:14px;font-size:11px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">변경 저장</button></div></form>`);
  const owners = ownersInput($('#ce-owners'), c.owners);
  $('#ce-form').onsubmit = async ev => { ev.preventDefault(); const name = $('#ce-name').value.trim(); if (!name) { $('#ce-error').textContent = '이름을 적어 주세요.'; return; } if (!await save(c.id, {name, role: $('#ce-role').value.trim(), points: $('#ce-points').value.split('\n').map(s => s.trim()).filter(Boolean), rel: $('#ce-rel').value.trim(), owners: owners.value()})) return; $('#modal').close(); render(); openDetail(c.id); toast('연락처를 수정했습니다.'); };
}
function entityModal(e) {
  modal(`<form id="entity-form"><h2>${e ? '엔티티 수정' : '새 엔티티 등록'}</h2><p>저장하면 모두에게 보이고, 누가 언제 무엇을 바꿨는지 기록이 남습니다.</p><div class="img-field"><span id="img-preview">${avatar(e || {initial: '+', color: 'gray'})}</span><div><label for="entity-img" style="margin-top:0">프로필 이미지</label><input id="entity-img" type="file" accept="image/png,image/jpeg,image/webp"><button class="text-btn" type="button" id="img-clear" ${e?.img ? '' : 'hidden'}>이미지 지우기</button><small><b>권장 크기: 정사각형 500×500px 이상</b> (PNG·JPG, 15MB 이하)<br>로고나 얼굴 사진. 정사각형이 아니면 가운데를 잘라 쓰고, 240×240px로 줄여 저장합니다.</small></div></div><label>한글 이름 *<input id="entity-name" required maxlength="50" value="${esc(e?.name || '')}" placeholder="예: 분데스리가"></label><label>영문 이름<input id="entity-en" maxlength="80" value="${esc(e?.en || '')}" placeholder="예: BUNDESLIGA"></label><label>타입<select id="entity-type">${TYPES.map(t => `<option ${e?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>별칭 <input id="entity-alias" maxlength="200" value="${esc(e?.aliases.join(', ') || '')}" placeholder="쉼표로 구분해 주세요"></label><label>관계 근거 <input id="entity-rel" maxlength="200" value="${esc(e?.rel || '')}" placeholder="예: 골포스트 공식 미디어 파트너"></label><div class="field"><span class="flabel">우리 쪽 담당</span><div id="entity-owners"></div></div><div id="form-error" style="color:#ba775e;margin-top:15px;font-size:11px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit">${e ? '변경 저장' : '엔티티 등록'}</button></div></form>`);
  let pending; // undefined = 그대로 · null = 지움 · Blob = 새 이미지
  const owners = ownersInput($('#entity-owners'), e?.owners || []);
  const show = src => { $('#img-preview').innerHTML = avatar({...(e || {initial: '+', color: 'gray'}), img: src || ''}); $('#img-clear').hidden = !src; };
  $('#entity-img').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; if (f.size > 15e6) { $('#form-error').textContent = '15MB보다 작은 이미지를 골라 주세요.'; return; } try { const r = await resize(f, 240, .85, true); pending = r.blob; show(r.url); $('#form-error').textContent = ''; } catch { $('#form-error').textContent = '이미지를 읽지 못했습니다. PNG·JPG 파일을 골라 주세요.'; } };
  $('#img-clear').onclick = () => { pending = null; $('#entity-img').value = ''; show(''); };
  $('#entity-form').onsubmit = async ev => {
    ev.preventDefault();
    const name = $('#entity-name').value.trim(), en = $('#entity-en').value.trim(), aliases = $('#entity-alias').value.split(',').map(s => s.trim()).filter(Boolean), rel = $('#entity-rel').value.trim(), type = $('#entity-type').value;
    if (!name) { $('#form-error').textContent = '한글 이름을 입력해 주세요.'; return; }
    const terms = [name, en, ...aliases].filter(Boolean).map(s => s.toLowerCase());
    if (all.some(x => x.id !== e?.id && [x.name, x.en, ...x.aliases].filter(Boolean).some(s => terms.includes(s.toLowerCase())))) { $('#form-error').textContent = '이름 또는 별칭이 겹치는 엔티티가 있습니다. 기존 엔티티를 확인해 주세요.'; return; }
    const btn = $('#entity-form [type=submit]'); btn.disabled = true;
    try {
      const patch = {name, en: en.toUpperCase(), type, aliases, rel, owners: owners.value()};
      if (pending === null) patch.img = '';
      else if (pending) patch.img = await upload(pending, 'profiles');
      const id = e ? e.id : 'e-' + uid().slice(0, 12);
      const done = await save(id, e ? patch : {...patch, first: today(), last: today()}, !e);
      if (!done) return;
      $('#modal').close(); render(); openDetail(id); toast(e ? '엔티티 정보를 수정했습니다.' : '엔티티를 등록했습니다.');
    } catch { $('#form-error').textContent = '이미지를 올리지 못했습니다. 다시 해 주세요.'; }
    finally { btn.disabled = false; }
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
  modal(`<form id="contact-form"><h2>연락처 등록</h2><p>명함 사진을 올리면 판테온 봇이 읽어 칸을 채웁니다(보통 20~40초). 저장하기 전에 맞는지 확인해 주세요. 명함 이미지도 함께 남깁니다.</p><label>명함 이미지<input id="c-card" type="file" accept="image/*" capture="environment"></label><div id="c-preview" hidden><img id="c-img" alt="올린 명함" style="width:100%;max-height:220px;object-fit:contain;border:1px solid #e4eae4;border-radius:7px;margin-top:10px;background:#fafbfa"></div><p id="c-status" class="ask-note" role="status" style="margin-top:8px"></p>${F.map(([id, l, ph]) => `<label>${l}<input id="${id}" maxlength="200" ${id === 'c-name' ? 'required' : ''} placeholder="${ph}"></label>`).join('')}<label>회사 연결<select id="c-org"><option value="">연결 안 함</option><option value="__new">새 엔티티로 등록 (회사명 칸 이름으로)</option>${companyOptions('')}</select></label><label>메모<input id="c-memo" maxlength="300" placeholder="예: 10/22 KREAM 미팅에서 받음"></label><div id="c-error" style="color:#ba775e;margin-top:14px;font-size:11px" role="alert"></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="submit" id="c-save">연락처 등록</button></div></form>`);
  let cardPath = '';
  const setStatus = s => $('#c-status').textContent = s;
  const autoLink = (email, ...n) => { const m = matchCompany(...n) || matchByDomain(email); if (m) { $('#c-org').value = m.id; return m; } if (n.some(x => x && x.trim())) $('#c-org').value = '__new'; return null; };
  $('#c-company').onchange = () => autoLink($('#c-email').value, $('#c-company').value);
  $('#c-card').onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return; $('#c-error').textContent = '';
    let r; try { r = await resize(f, 1600, .82); } catch { $('#c-error').textContent = '이미지를 읽지 못했습니다. JPG·PNG 사진을 골라 주세요.'; return; }
    $('#c-img').src = r.url; $('#c-preview').hidden = false; $('#c-save').disabled = true;
    try {
      setStatus('명함 이미지를 올리는 중입니다…');
      cardPath = await upload(r.blob, 'cards');
      const { data, error } = await SB.from('pt_ask').insert({kind: 'ocr', image_path: cardPath}).select('id').single();
      if (error) throw error;
      const res = await waitAsk(data.id, s => setStatus(`판테온 봇이 명함을 읽는 중입니다… ${s}초`));
      if (!res) { setStatus(''); $('#c-error').textContent = '판테온 봇(사무실 PC)이 2분 안에 답하지 않았습니다. 명함을 보고 직접 적어 주세요. 이미지는 그대로 남깁니다.'; return; }
      if (res.status !== 'done' || !res.result) { setStatus(''); $('#c-error').textContent = '명함을 읽지 못했습니다. 직접 적어 주세요. 이미지는 그대로 남깁니다.'; return; }
      const v = k => String(res.result[k] || '').trim();
      [['c-name', v('name') || v('name_en')], ['c-title', v('title')], ['c-company', v('company') || v('company_en')], ['c-email', v('email')], ['c-phone', v('phone')], ['c-mobile', v('mobile')], ['c-address', v('address')], ['c-web', v('website')]].forEach(([id, val]) => { if (val && !$('#' + id).value) $('#' + id).value = val; });
      if (v('name_en') && v('name') && !$('#c-memo').value) $('#c-memo').value = '영문 이름: ' + v('name_en');
      const m = autoLink(v('email'), v('company'), v('company_en'));
      setStatus(`명함을 읽었습니다. 칸을 확인해 주세요.${m ? ` 회사는 「${m.name}」로 자동 연결했습니다.` : v('company') ? ' 기존 엔티티에 없는 회사라 새 엔티티로 등록하도록 골라 두었습니다.' : ''}`);
    } catch (e) { setStatus(''); $('#c-error').textContent = '명함을 올리거나 읽지 못했습니다: ' + (e?.message || '') + ' — 직접 적어 주세요.'; }
    finally { $('#c-save').disabled = false; }
  };
  $('#contact-form').onsubmit = async ev => {
    ev.preventDefault(); const g = id => $('#' + id).value.trim(); const name = g('c-name'), email = g('c-email');
    if (!name) { $('#c-error').textContent = '이름을 적어 주세요.'; return; }
    let orgId = $('#c-org').value, org = orgId && orgId !== '__new' ? byId(orgId) : null;
    const dup = contacts().find(x => (email && x.points.some(p => p.toLowerCase() === email.toLowerCase())) || (x.name === name && (!org || x.parentId === org.id)));
    if (dup && !$('#contact-form').dataset.dupOk) { $('#c-error').innerHTML = `같은 사람으로 보이는 연락처가 이미 있습니다: <b>${esc(dup.name)}</b>${agencyOf(dup) ? ' (' + esc(agencyOf(dup)) + ')' : ''}. 그래도 등록하려면 「연락처 등록」을 한 번 더 누르세요.`; $('#contact-form').dataset.dupOk = '1'; return; }
    $('#c-save').disabled = true;
    try {
      if (orgId === '__new') {
        const co = g('c-company'); if (!co) { $('#c-error').textContent = '새 엔티티로 등록하려면 회사명을 적어 주세요.'; return; }
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
  out.hidden = false; out.innerHTML = head + '<p class="muted">판테온 봇이 DB에서 찾아 답을 쓰는 중입니다…</p>'; $('#ask-btn').disabled = true;
  try {
    const { data, error } = await SB.from('pt_ask').insert({kind: 'ask', question: q}).select('id').single();
    if (error) throw error;
    const res = await waitAsk(data.id, s => { const p = out.querySelector('.muted:last-child'); if (p) p.textContent = `판테온 봇이 DB에서 찾아 답을 쓰는 중입니다… ${s}초`; }, 150);
    out.innerHTML = head + (!res ? '<div class="warn">판테온 봇(사무실 PC)이 답하지 않았습니다. 잠시 뒤 다시 물어봐 주세요. 계속되면 AX팀에 알려 주세요.</div>'
      : res.status === 'done' ? renderAnswer(res.answer) : '<div class="warn">답을 만들지 못했습니다. 잠시 뒤 다시 물어봐 주세요.</div>');
  } catch (e) { out.innerHTML = head + `<div class="warn">질문을 보내지 못했습니다: ${esc(e?.message || '')}</div>`; }
  finally { lastAnswer = out.innerHTML; $('#ask-btn').disabled = false; bindAsk(); }
}

/* ---------- DB 관리 (관리자) — 변경 기록 · 질문 기록 ---------- */
const FIELD_KO = {name:'이름', en:'영문 이름', kind:'타입', aliases:'별칭', parent_id:'회사 연결', agency:'소속 / 회사', role:'직함', rel:'관계 근거', points:'연락처', facts:'기록', note:'리서치 노트', sides:'우리 쪽 회사', owners:'우리 쪽 담당', img:'프로필 이미지', card_img:'명함 이미지', first_seen:'처음 기록', last_seen:'마지막 기록', hidden:'숨김', id:'아이디'};
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
  <section class="panel"><div class="panel-head"><div class="panel-title">변경 기록 <small>AUDIT LOG</small> <span class="nav-count">${admin.changes.length}</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button" type="button" id="log-reload">${icon('clock')} 새로 불러오기</button><button class="button" type="button" id="log-export">${icon('download')} 기록 CSV</button></div></div>
  <div class="watch-toolbar"><div style="display:flex;gap:8px;flex-wrap:wrap"><select class="table-select" id="log-who" aria-label="사람으로 거르기"><option value="">모든 사람</option>${people.map(p => `<option value="${esc(p)}" ${admin.who === p ? 'selected' : ''}>${esc(p === '(화면 밖)' ? '시스템 입력' : whoName(p))}</option>`).join('')}</select><input class="table-select" id="log-q" type="search" placeholder="엔티티 이름" value="${esc(admin.q)}" aria-label="엔티티 이름으로 거르기"></div></div>
  <div class="table-wrap"><table><thead><tr><th>언제</th><th>누가</th><th>엔티티</th><th>무엇을</th><th>어떻게 바꿨나 (전 → 후)</th><th>조치</th></tr></thead><tbody>${list.map(x => `<tr><td style="white-space:nowrap">${esc(kst(x.at))}</td><td>${x.actor ? esc(whoName(x.actor, x.actor_name)) : `<span class="pill">${esc(VIA_KO[x.via] || x.via)}</span>`}${x.reason ? `<small style="display:block;color:#9aa29d">${esc(x.reason)}</small>` : ''}</td><td><button class="text-btn" data-detail="${esc(x.entity_id)}">${esc(x.entity_name)}</button></td><td><span class="pill">${esc(OP_KO[x.op] || x.op)}</span></td><td style="font-size:10px;line-height:1.6">${x.op === 'insert' ? '<span style="color:#285541">새로 등록</span>' : (x.fields || []).map(k => `<div><b>${esc(FIELD_KO[k] || k)}</b>: <span style="color:#a0563a;text-decoration:line-through">${esc(showVal(k, x.before?.[k]))}</span> → <span style="color:#285541">${esc(showVal(k, x.after?.[k]))}</span></div>`).join('')}</td><td>${x.op === 'update' ? `<button class="text-btn" type="button" data-restore="${x.id}">바꾸기 전으로 되돌리기</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">기록이 없습니다.</div></td></tr>'}</tbody></table></div></section>`;
}
function asksPanel() {
  const list = admin.asks.slice(0, 300);
  return `<section class="panel"><div class="panel-head"><div class="panel-title">질문 기록 <small>웹·슬랙</small> <span class="nav-count">${admin.asks.length}</span></div></div><div class="table-wrap"><table><thead><tr><th>언제</th><th>누가</th><th>어디서</th><th>무엇</th><th>상태</th></tr></thead><tbody>${list.map(a => `<tr><td style="white-space:nowrap">${esc(kst(a.at))}</td><td>${esc(whoName(a.asker) || '—')}</td><td>${a.via === 'slack' ? '슬랙' : '웹'}</td><td>${a.kind === 'ocr' ? '<span class="pill">명함 읽기</span>' : a.kind === 'restart' ? '<span class="pill">봇 다시 시작</span>' : esc(a.question)}</td><td>${{done: '답함', fail: '실패', wait: '대기', work: '처리 중'}[a.status] || a.status}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">아직 질문이 없습니다.</div></td></tr>'}</tbody></table></div></section>`;
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
  return `<div class="quality-grid"><div class="stat ${alive && b.connected ? 'highlight' : ''}"><div class="stat-label">상태</div><div class="stat-value">${stateText}</div><div class="stat-bottom">${age === null ? '—' : '마지막 신호 ' + agoText(age)}</div></div><div class="stat"><div class="stat-label">켜진 시각</div><div class="stat-value" style="font-size:17px">${b.started_at ? esc(kst(b.started_at)) : '—'}</div><div class="stat-bottom">${b.model ? '답변 모델 ' + esc(b.model) : ''}</div></div><div class="stat"><div class="stat-label">처리한 웹 요청</div><div class="stat-value">${Number(b.handled || 0)}<small>건</small></div><div class="stat-bottom">켜진 뒤부터</div></div></div>
  <section class="panel"><div class="panel-head"><div><div class="panel-title">판테온 봇 <small>슬랙 질문 · 웹 질문 · 명함 읽기</small></div><p class="panel-caption">답이 오지 않거나 상태가 「응답 없음」이면 다시 시작해 보세요. 다시 시작하는 20초쯤 동안은 답하지 않습니다.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button" id="bot-reload">${icon('clock')} 새로 고침</button><button class="button primary" id="bot-restart">다시 시작</button></div></div>
  <div id="bot-msg" class="panel-caption" style="padding:0 23px 18px" role="status">${b.last_error ? '최근 오류: ' + esc(b.last_error) : ''}</div></section>`;
}
async function restartBot() {
  const msg = t => { const el = $('#bot-msg'); if (el) el.textContent = t; };
  const before = admin.bot?.started_at || '';
  $('#bot-restart').disabled = true;
  const { data, error } = await SB.from('pt_ask').insert({kind: 'restart', question: '판테온 봇 다시 시작'}).select('id').single();
  if (error) { $('#bot-restart').disabled = false; return msg('다시 시작하지 못했습니다: ' + error.message); }
  const res = await waitAsk(data.id, s => msg(`판테온 봇에 요청을 보냈습니다… ${s}초`), 60);
  if (!res) { $('#bot-restart').disabled = false; return msg('판테온 봇이 요청을 받지 않습니다. 서버 PC가 켜져 있는지 확인해 주세요. 꺼져 있던 봇은 5분 안에 저절로 다시 올라옵니다.'); }
  if (res.status === 'fail') { $('#bot-restart').disabled = false; return msg(res.answer || '다시 시작하지 못했습니다.'); }
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    await new Promise(r => setTimeout(r, 3000));
    msg(`판테온 봇이 다시 켜지는 중입니다… ${Math.round((Date.now() - t0) / 1000)}초`);
    const b = await SB.from('pt_bot').select('*').maybeSingle();
    if (b.data?.started_at && b.data.started_at !== before) { admin.bot = b.data; render(); toast('판테온 봇이 다시 켜졌습니다.'); return; }
  }
  admin.bot = null; render(); toast('판테온 봇이 아직 돌아오지 않았습니다. 잠시 뒤 새로 고침해 주세요.');
}
function qualityPanel() {
  const es = entities(), hidden = all.filter(e => e.hidden);
  return `<div class="quality-grid"><div class="stat"><div class="stat-label">컨택 미확보</div><div class="stat-value">${es.filter(e => !contactsOf(e).length).length}<small>개</small></div><div class="stat-bottom">담당자·연락 경로 확인 필요</div></div><div class="stat"><div class="stat-label">관계 확인 필요</div><div class="stat-value">${es.filter(e => !e.rel).length}<small>개</small></div><div class="stat-bottom">관계 근거 미기재</div></div><div class="stat"><div class="stat-label">숨긴 항목</div><div class="stat-value">${hidden.length}<small>개</small></div><div class="stat-bottom">상세에서 되살리기</div></div></div><section class="panel"><div class="panel-head"><div class="panel-title">데이터 점검</div><button class="button" id="admin-export">${icon('download')} 엔티티 CSV</button></div><div class="table-wrap"><table><thead><tr><th>엔티티</th><th>유형</th><th>관계 상태</th><th>컨택 경로</th><th>조치</th></tr></thead><tbody>${[...es, ...hidden.filter(isContact)].map(e => `<tr><td>${esc(e.name)}${e.hidden ? ' <span class="pill">숨김</span>' : ''}</td><td>${esc(e.type)}</td><td><span class="pill ${e.rel ? 'good' : ''}">${e.rel ? '기록에 기재' : '확인 필요'}</span></td><td>${contactsOf(e).length ? contactsOf(e).length + '명' : '미확보'}</td><td><button class="text-btn" data-detail="${e.id}">상세 확인 ↗</button></td></tr>`).join('')}</tbody></table></div></section>`;
}
function bindAdmin() {
  $$('[data-admin-tab]').forEach(b => b.onclick = () => { admin.tab = b.dataset.adminTab; render(); });
  $('#log-reload')?.addEventListener('click', () => { admin.changes = null; loadAdmin(); });
  $('#bot-reload')?.addEventListener('click', () => { admin.bot = null; render(); });
  $('#bot-restart')?.addEventListener('click', () => {
    modal(`<h2>판테온 봇 다시 시작</h2><p>판테온 봇을 껐다가 다시 켭니다. 20초쯤 동안 슬랙·웹 질문에 답하지 않습니다.</p><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="button" id="restart-go">다시 시작</button></div>`);
    $('#restart-go').onclick = () => { $('#modal').close(); restartBot(); };
  });
  $('#log-who')?.addEventListener('change', e => { admin.who = e.target.value; render(); });
  const q = $('#log-q'); if (q) q.onchange = e => { admin.q = e.target.value; render(); };
  $('#log-export')?.addEventListener('click', () => { const rows = [['언제(KST)', '누가', '어디서', '엔티티', '무엇을', '바뀐 칸', '전', '후', '메모'], ...admin.changes.flatMap(x => (x.op === 'insert' ? ['(새로 등록)'] : x.fields || []).map(k => [kst(x.at), whoName(x.actor, x.actor_name), VIA_KO[x.via] || x.via, x.entity_name, OP_KO[x.op] || x.op, FIELD_KO[k] || k, x.op === 'insert' ? '' : showVal(k, x.before?.[k]), x.op === 'insert' ? '' : showVal(k, x.after?.[k]), x.reason]))]; download('pantheon-change-log.csv', rows); });
  $$('[data-restore]').forEach(b => b.onclick = () => {
    const x = admin.changes.find(c => String(c.id) === b.dataset.restore); if (!x) return;
    modal(`<h2>되돌리기 확인</h2><p><b>${esc(x.entity_name)}</b>을(를) ${esc(kst(x.at))}에 바뀌기 <b>전</b> 값으로 되돌립니다. 되돌린 것도 변경 기록에 남고, 필요하면 다시 되돌릴 수 있습니다.</p><div class="table-wrap" style="max-height:260px;overflow:auto"><table><thead><tr><th>칸</th><th>지금</th><th>되돌린 뒤</th></tr></thead><tbody>${(x.fields || []).map(k => { const cur = byId(x.entity_id); return `<tr><td>${esc(FIELD_KO[k] || k)}</td><td>${esc(showVal(k, cur ? toRow(cur)[k] ?? cur[k] : null))}</td><td>${esc(showVal(k, x.before?.[k]))}</td></tr>`; }).join('')}</tbody></table></div><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="button" id="restore-go">${esc(x.entity_name)} 되돌리기</button></div>`);
    $('#restore-go').onclick = async () => { $('#restore-go').disabled = true; const { error } = await SB.rpc('pt_restore', {change_id: x.id, side: 'before'}); $('#modal').close(); if (error) return toast('되돌리지 못했습니다: ' + error.message); await load(); admin.changes = null; loadAdmin(); toast(`${x.entity_name}을(를) 되돌렸습니다.`); };
  });
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
  download(page === 'contacts' ? 'pantheon-contacts.csv' : 'pantheon-entities.csv', [['이름', '영문 이름', '타입', '소속 / 회사 연결', '직함', '관계 근거', '보유 컨택', '우리 쪽 담당', '연락처(업무)'], ...arr.map(e => [e.name, e.en, e.type, agencyOf(e), e.role, e.rel, contactsOf(e).map(c => c.name).join(' / '), e.owners.join(' / '), e.points.join(' / ')])]);
}
function go(p) { page = p; filter = '전체'; query = ''; $('#global-search').value = ''; try { history.replaceState(null, '', '#' + p); } catch {} render(); window.scrollTo(0, 0); }
function bindContent() {
  $$('[data-page]').forEach(b => b.onclick = () => go(b.dataset.page));
  $$('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; render(); });
  $$('[data-filter-go]').forEach(b => b.onclick = () => { go('entities'); filter = b.dataset.filterGo; render(); });
  $$('[data-detail]').forEach(b => { b.onclick = () => openDetail(b.dataset.detail); b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(b.dataset.detail); } }; });
  $('#admin-export')?.addEventListener('click', exportCSV);
  bindAsk(); if (page === 'admin') bindAdmin();
}

/* ---------- 로그인 ---------- */
function loginScreen(msg) {
  $('#login').hidden = false;
  $('#login').innerHTML = `<form class="login-box" id="login-form"><div class="brand"><span class="brand-mark">Π</span>PANTHEON<span class="brand-dot">®</span></div><p>헤임달 계정으로 로그인합니다.<br>헤임달에서 승인된 직원만 쓸 수 있습니다.</p><label>이메일<input id="lg-email" type="email" autocomplete="username" required></label><label>비밀번호<input id="lg-pw" type="password" autocomplete="current-password" required></label><div id="lg-err" role="alert" style="color:#ba775e;font-size:11px;margin-top:10px">${esc(msg || '')}</div><button class="button primary" type="submit" style="width:100%;justify-content:center;margin-top:16px">로그인</button><p style="font-size:10px;margin-top:14px">비밀번호를 잊으셨으면 헤임달 로그인 화면의 「비밀번호 찾기」를 써 주세요.</p></form>`;
  $('#login-form').onsubmit = async ev => {
    ev.preventDefault(); $('#lg-err').textContent = '';
    const { error } = await SB.auth.signInWithPassword({email: $('#lg-email').value.trim(), password: $('#lg-pw').value});
    if (error) { $('#lg-err').textContent = '이메일 또는 비밀번호가 맞지 않습니다.'; return; }
    start();
  };
}
async function start() {
  const { data: { session } } = await SB.auth.getSession();
  if (!session) return loginScreen();
  me = session.user;
  const [can, adm, mem] = await Promise.all([SB.rpc('pt_can_use'), SB.rpc('pt_is_admin'), SB.from('hd_member').select('name,role').eq('id', me.id).maybeSingle()]);
  if (!can.data) { await SB.auth.signOut(); return loginScreen('헤임달에서 아직 승인되지 않은 계정입니다. 승인 뒤 다시 로그인해 주세요.'); }
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
  page = location.hash.slice(1) || 'home'; render();
}

$('#search-icon').innerHTML = icon('search'); $('#bell-icon').innerHTML = icon('bell');
$('#global-search').oninput = e => { query = e.target.value; if (!['entities', 'contacts'].includes(page)) { page = 'entities'; filter = '전체'; } render(); };
$('#add-btn').onclick = () => page === 'contacts' ? contactModal() : entityModal();
$('#export-btn').onclick = exportCSV;
$('#notification').onclick = () => go('home');
$('.top-avatar').onclick = () => $('#profile').click();      // 폰에서는 왼쪽 메뉴가 아래 막대가 되어 프로필이 위 오른쪽 사진으로
$('#profile').onclick = async () => { if (!me) return; modal(`<h2>로그아웃</h2><p>${esc(myName)} 님, 판테온에서 로그아웃합니다. 같은 주소의 헤임달도 함께 로그아웃됩니다.</p><div class="modal-actions"><button class="button" type="button" data-cancel>취소</button><button class="button primary" type="button" id="logout-go">로그아웃</button></div>`); $('#logout-go').onclick = async () => { await SB.auth.signOut(); location.reload(); }; };
$('#overlay').onclick = closeDrawer;
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (me && h && h !== page) { page = h; filter = '전체'; render(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); $('#global-search').focus(); } });
start();
