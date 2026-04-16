
let DATA = {points:[], boxes:[], stats:{}};

function byId(id){ return document.getElementById(id); }
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav').forEach(v=>v.classList.remove('active'));
  byId('view-' + name).classList.add('active');
  document.querySelector(`.nav[data-view="${name}"]`)?.classList.add('active');
}
document.querySelectorAll('.nav').forEach(btn => btn.addEventListener('click', ()=>showView(btn.dataset.view)));

function gasBadges(gases){
  const keys = Array.isArray(gases) ? gases : Object.keys(gases||{});
  return keys.map(g=>`<span class="chip">${g}</span>`).join('');
}

function renderStats(){
  byId('stat-points').textContent = DATA.stats.punktyPomieszczenia ?? DATA.points.length;
  byId('stat-boxes').textContent = DATA.stats.skrzynki ?? DATA.boxes.length;
  byId('stat-gases').innerHTML = (DATA.stats.gazy||[]).map(g=>`<span class="chip">${g}</span>`).join('');
}

function renderBoxes(filter=''){
  const q = filter.toLowerCase();
  const rows = DATA.boxes.filter(b => JSON.stringify(b).toLowerCase().includes(q))
    .map(b => `<tr>
      <td><strong>${b.numer||''}</strong></td>
      <td>${b.budynek||''}</td>
      <td>${b.oddzial||''}</td>
      <td>${(b.gazy||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>`<span class="chip">${x}</span>`).join(' ')}</td>
      <td>${b.wynik||''}</td>
    </tr>`).join('');
  byId('boxesTable').innerHTML = rows || '<tr><td colspan="5">Brak wyników.</td></tr>';
}

function renderPoints(filter=''){
  const q = filter.toLowerCase();
  const rows = DATA.points.filter(p => JSON.stringify(p).toLowerCase().includes(q))
    .map(p => `<tr>
      <td><strong>${p.nr_pom||''}</strong></td>
      <td>${p.nazwa_pom||''}</td>
      <td>${p.section||''}</td>
      <td>${gasBadges(p.gases)}</td>
      <td>${p.producent||''}</td>
    </tr>`).join('');
  byId('pointsTable').innerHTML = rows || '<tr><td colspan="5">Brak wyników.</td></tr>';
}

function renderSearch(filter=''){
  const q = filter.toLowerCase().trim();
  if(!q){ byId('searchResults').innerHTML=''; return; }
  const pointHits = DATA.points.filter(p => JSON.stringify(p).toLowerCase().includes(q)).slice(0,4);
  const boxHits = DATA.boxes.filter(b => JSON.stringify(b).toLowerCase().includes(q)).slice(0,4);
  const items = [
    ...boxHits.map(b => `<div class="resultItem"><b>Skrzynka: ${b.numer||''}</b><div>${b.budynek||''} • ${b.oddzial||''}</div><div>${b.gazy||''}</div></div>`),
    ...pointHits.map(p => `<div class="resultItem"><b>Punkt / sala: ${p.nr_pom||''}</b><div>${p.nazwa_pom||''}</div><div>${Object.keys(p.gases||{}).join(', ')}</div></div>`)
  ];
  byId('searchResults').innerHTML = items.join('') || '<div class="resultItem">Brak wyników.</div>';
}

fetch('data.json')
  .then(r => r.json())
  .then(data => {
    DATA = data;
    renderStats();
    renderBoxes();
    renderPoints();
  });

byId('boxSearch').addEventListener('input', e => renderBoxes(e.target.value));
byId('pointSearch').addEventListener('input', e => renderPoints(e.target.value));
byId('globalSearch').addEventListener('input', e => renderSearch(e.target.value));
