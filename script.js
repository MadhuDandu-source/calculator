/* ============================================
   SMARTCALC HUB — script.js
   ============================================ */
'use strict';

// ============ STATE ============
let emiChartInstance = null;
let exchangeRates = {};
let ratesLastUpdated = '';
let currentPctTab = 'whatpercent';
let bmiUnit = 'metric';
const results = { age:'', percentage:'', bmi:'', emi:'', unit:'', currency:'' };

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHamburger();
  initSearch();
  initFavorites();
  setDefaultDates();
  initSliders();
  updateUnitOptions();
  loadExchangeRates();
  renderHistory();
});

// ============ NAVIGATION ============
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(id);
  if (sec) { sec.classList.add('active'); window.scrollTo({top:0,behavior:'smooth'}); }
  document.getElementById('mainNav').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('hamburger').setAttribute('aria-expanded','false');
  if (id === 'history') renderHistory();
  return false;
}

// ============ THEME ============
function initTheme() {
  const saved = localStorage.getItem('sch_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}
function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sch_theme', next);
  updateThemeIcon(next);
  // Rebuild EMI chart so colours match new theme
  if (emiChartInstance && document.getElementById('emiResult').style.display !== 'none') {
    calculateEMI();
  }
}
function updateThemeIcon(t) {
  document.getElementById ('themeIcon').textContent = t === 'dark' ? '🌙' : '☀️';
}

// ============ HAMBURGER ============
function initHamburger() {
  const btn = document.getElementById('hamburger');
  btn.addEventListener('click', () => {
    const nav = document.getElementById('mainNav');
    const open = nav.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
}

// ============ SEARCH ============
function initSearch() {
  const input = document.getElementById('searchInput');
  const clear = document.getElementById('searchClear');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    clear.classList.toggle('visible', q.length > 0);
    let anyVisible = false;
    document.querySelectorAll('.calc-card').forEach(card => {
      const match = !q || card.dataset.name.toLowerCase().includes(q) || card.dataset.tags.toLowerCase().includes(q);
      card.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });
    const msg = document.getElementById('noResultsMsg');
    if (msg) {
      msg.style.display = (!anyVisible && q) ? '' : 'none';
      const qs = document.getElementById('noResultsQuery');
      if (qs) qs.textContent = input.value.trim();
    }
  });
  clear.addEventListener('click', () => {
    input.value = ''; clear.classList.remove('visible');
    document.querySelectorAll('.calc-card').forEach(c => c.style.display = '');
    const msg = document.getElementById('noResultsMsg');
    if (msg) msg.style.display = 'none';
  });
}

// ============ FAVORITES ============
function initFavorites() {
  const favs = JSON.parse(localStorage.getItem('sch_favs') || '[]');
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const c = btn.dataset.calc;
    if (favs.includes(c)) { btn.textContent = '♥'; btn.classList.add('active'); }
    btn.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(btn, c); });
  });
}
function toggleFavorite(btn, id) {
  let favs = JSON.parse(localStorage.getItem('sch_favs') || '[]');
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
    btn.textContent = '♡'; btn.classList.remove('active');
    showToast('Removed from favorites', 'info');
  } else {
    favs.push(id);
    btn.textContent = '♥'; btn.classList.add('active');
    showToast('Added to favorites ❤️', 'success');
  }
  localStorage.setItem('sch_favs', JSON.stringify(favs));
}

// ============ DATE DEFAULTS ============
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const dob = document.getElementById('dob');
  const calc = document.getElementById('calcDate');
  if (dob) dob.max = today;
  if (calc) { calc.value = today; }
}

// ============ AGE CALCULATOR ============
function calculateAge() {
  const dob = document.getElementById('dob').value;
  const calcDate = document.getElementById('calcDate').value || new Date().toISOString().split('T')[0];
  const futureDate = document.getElementById('futureDate').value;

  if (!dob) { showToast('Please enter your date of birth', 'error'); return; }

  const birth = new Date(dob);
  const target = new Date(calcDate);
  if (birth > target) { showToast('Date of birth cannot be after the target date', 'error'); return; }

  const age = ageDiff(birth, target);
  const totalDays = Math.floor((target - birth) / 86400000);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = age.y * 12 + age.m;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Next birthday
  let nextBday = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBday <= target) nextBday.setFullYear(nextBday.getFullYear() + 1);
  const daysToNext = Math.ceil((nextBday - target) / 86400000);

  document.getElementById('ageDisplay').innerHTML =
    `<div class="age-unit"><span class="age-unit-val">${age.y}</span><span class="age-unit-lbl">Years</span></div>
     <div class="age-unit"><span class="age-unit-val">${age.m}</span><span class="age-unit-lbl">Months</span></div>
     <div class="age-unit"><span class="age-unit-val">${age.d}</span><span class="age-unit-lbl">Days</span></div>`;

  document.getElementById('ageDetails').innerHTML = [
    ['Total Days',    totalDays.toLocaleString()],
    ['Total Weeks',   totalWeeks.toLocaleString()],
    ['Total Months',  totalMonths.toLocaleString()],
    ['Total Hours',   (totalDays * 24).toLocaleString()],
    ['Day of Birth',  days[birth.getDay()]],
    ['Next Birthday', `in ${daysToNext} day${daysToNext !== 1 ? 's' : ''}`],
  ].map(([l,v]) => `<div class="age-row"><span>${l}</span><span>${v}</span></div>`).join('');

  const futEl = document.getElementById('futureAgeDisplay');
  if (futureDate) {
    const fd = new Date(futureDate);
    if (fd > birth) {
      const fa = ageDiff(birth, fd);
      futEl.innerHTML = `🔮 On <strong>${fd.toLocaleDateString()}</strong> you'll be <strong>${fa.y} years, ${fa.m} months &amp; ${fa.d} days</strong> old.`;
      futEl.style.display = '';
    } else { futEl.style.display = 'none'; }
  } else { futEl.style.display = 'none'; }

  results.age = `Age: ${age.y} yrs ${age.m} mo ${age.d} days | Total: ${totalDays.toLocaleString()} days`;
  document.getElementById('ageResult').style.display = 'block';
}
function ageDiff(birth, target) {
  let y = target.getFullYear() - birth.getFullYear();
  let m = target.getMonth() - birth.getMonth();
  let d = target.getDate() - birth.getDate();
  if (d < 0) { m--; d += new Date(target.getFullYear(), target.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}

// ============ PERCENTAGE CALCULATOR ============
function switchTab(calc, tabId) {
  if (calc !== 'percentage') return;
  currentPctTab = tabId;
  document.querySelectorAll('#percentageTabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
    b.setAttribute('aria-selected', String(b.dataset.tab === tabId));
  });
  document.querySelectorAll('[id^="tab-"]').forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
  document.getElementById('percentageResult').style.display = 'none';
}
function calculatePercentage() {
  let val, formula;
  try {
    switch (currentPctTab) {
      case 'whatpercent': {
        const x = n('pct-x'), y = n('pct-y');
        val = (x / 100) * y;
        formula = `${x}% of ${y} = ${fmtN(val)}`;
        break;
      }
      case 'increase': {
        const o = n('inc-orig'), nv = n('inc-new');
        if (o === 0) throw Error('Original value cannot be zero');
        val = ((nv - o) / Math.abs(o)) * 100;
        formula = `((${nv} − ${o}) / ${o}) × 100 = ${fmtN(val)}%`;
        break;
      }
      case 'decrease': {
        const o = n('dec-orig'), nv = n('dec-new');
        if (o === 0) throw Error('Original value cannot be zero');
        val = ((o - nv) / Math.abs(o)) * 100;
        formula = `((${o} − ${nv}) / ${o}) × 100 = ${fmtN(val)}%`;
        break;
      }
      case 'difference': {
        const v1 = n('diff-v1'), v2 = n('diff-v2');
        const avg = (Math.abs(v1) + Math.abs(v2)) / 2;
        if (avg === 0) throw Error('Both values cannot be zero');
        val = (Math.abs(v1 - v2) / avg) * 100;
        formula = `|${v1} − ${v2}| / avg(${v1},${v2}) × 100 = ${fmtN(val)}%`;
        break;
      }
    }
  } catch(e) { showToast(e.message || 'Please enter valid numbers', 'error'); return; }

  const display = currentPctTab === 'whatpercent' ? fmtN(val) : `${fmtN(val)}%`;
  document.getElementById('pctResultValue').textContent = display;
  document.getElementById('pctFormula').textContent = formula;
  results.percentage = formula;
  document.getElementById('percentageResult').style.display = 'block';
}
function n(id) {
  const v = parseFloat(document.getElementById(id).value);
  if (isNaN(v)) throw Error('Please fill all fields with valid numbers');
  return v;
}

// ============ BMI CALCULATOR ============
function switchBMIUnit(unit) {
  bmiUnit = unit;
  document.getElementById('bmiMetricInputs').style.display = unit === 'metric' ? '' : 'none';
  document.getElementById('bmiImperialInputs').style.display = unit === 'imperial' ? '' : 'none';
  document.getElementById('bmiMetricBtn').classList.toggle('active', unit === 'metric');
  document.getElementById('bmiImperialBtn').classList.toggle('active', unit === 'imperial');
  document.getElementById('bmiResult').style.display = 'none';
}
function calculateBMI() {
  let hm, wkg;
  try {
    if (bmiUnit === 'metric') {
      const hcm = parseFloat(document.getElementById('heightCm').value);
      wkg = parseFloat(document.getElementById('weightKg').value);
      if (isNaN(hcm) || isNaN(wkg)) throw Error('Enter valid height and weight');
      if (hcm < 50 || hcm > 280) throw Error('Height must be 50–280 cm');
      if (wkg < 1 || wkg > 600) throw Error('Weight must be 1–600 kg');
      hm = hcm / 100;
    } else {
      const ft = parseFloat(document.getElementById('heightFt').value) || 0;
      const ins = parseFloat(document.getElementById('heightIn').value) || 0;
      const lb = parseFloat(document.getElementById('weightLb').value);
      if (!ft || isNaN(lb)) throw Error('Enter valid height and weight');
      hm = ((ft * 12) + ins) * 0.0254;
      wkg = lb * 0.453592;
    }
  } catch(e) { showToast(e.message, 'error'); return; }

  const bmi = wkg / (hm * hm);
  const br = Math.round(bmi * 10) / 10;
  let cat, cls, tip;
  if (bmi < 18.5) { cat='Underweight'; cls='cat-under'; tip='Consider a nutritious diet & consult a healthcare provider.'; }
  else if (bmi < 25) { cat='Normal Weight'; cls='cat-normal'; tip='Great! Maintain a balanced diet & regular exercise.'; }
  else if (bmi < 30) { cat='Overweight'; cls='cat-over'; tip='Consider a balanced diet & increase physical activity.'; }
  else { cat='Obese'; cls='cat-obese'; tip='Please consult a healthcare professional for guidance.'; }

  document.getElementById('bmiScore').textContent = br;
  const catEl = document.getElementById('bmiCategory');
  catEl.textContent = `${cat} — ${tip}`;
  catEl.className = `bmi-category ${cls}`;

  // Meter pointer: BMI 10→40 maps to 0%→100%
  const pct = Math.min(Math.max(((bmi - 10) / 30) * 100, 1), 99);
  document.getElementById('bmiPointer').style.left = `${pct}%`;

  const rows = [
    ['< 18.5','Underweight','cat-under'],
    ['18.5 – 24.9','Normal Weight','cat-normal'],
    ['25.0 – 29.9','Overweight','cat-over'],
    ['≥ 30.0','Obese','cat-obese'],
  ];
  document.getElementById('bmiTable').innerHTML = rows.map(([r,c,cl]) =>
    `<div class="bmi-tr ${cl === cls ? 'highlight' : ''}">
       <span>BMI ${r}</span>
       <span class="${cl}">${c}</span>
     </div>`).join('');

  results.bmi = `BMI: ${br} — ${cat}`;
  document.getElementById('bmiResult').style.display = 'block';
}

// ============ EMI CALCULATOR ============
function initSliders() {
  const defs = [
    { s:'loanSlider',    i:'loanAmount',   d:'loanSliderVal',   fmt: v => `₹${indNum(+v)}` },
    { s:'rateSlider',    i:'interestRate', d:'rateSliderVal',   fmt: v => `${v}%` },
    { s:'tenureSlider',  i:'loanTenure',   d:'tenureSliderVal', fmt: v => `${v} yr${v>1?'s':''}` },
  ];
  defs.forEach(({ s, i, d, fmt }) => {
    const sl = document.getElementById(s);
    const ip = document.getElementById(i);
    const dp = document.getElementById(d);
    if (!sl || !ip) return;
    ip.value = sl.value;
    if (dp) dp.textContent = fmt(sl.value);
    sliderFill(sl);
    sl.addEventListener('input', () => { ip.value = sl.value; if(dp) dp.textContent=fmt(sl.value); sliderFill(sl); });
    ip.addEventListener('input', () => {
      const v = parseFloat(ip.value);
      if (!isNaN(v)) { sl.value = Math.min(Math.max(v, +sl.min), +sl.max); if(dp) dp.textContent=fmt(sl.value); sliderFill(sl); }
    });
  });
}
function sliderFill(el) {
  const pct = ((+el.value - +el.min) / (+el.max - +el.min)) * 100;
  el.style.background = `linear-gradient(to right,var(--blue) ${pct}%,var(--border) ${pct}%)`;
}
function calculateEMI() {
  const P = parseFloat(document.getElementById('loanAmount').value);
  const r = parseFloat(document.getElementById('interestRate').value);
  const t = parseFloat(document.getElementById('loanTenure').value);
  if ([P,r,t].some(v => isNaN(v) || v <= 0)) { showToast('Please enter valid positive values', 'error'); return; }
  const rm = r / 1200, N = t * 12;
  const emi = P * rm * Math.pow(1+rm, N) / (Math.pow(1+rm, N) - 1);
  const total = emi * N, interest = total - P;
  document.getElementById('emiMonthly').textContent  = `₹${indNum(Math.round(emi))}`;
  document.getElementById('emiInterest').textContent = `₹${indNum(Math.round(interest))}`;
  document.getElementById('emiTotal').textContent    = `₹${indNum(Math.round(total))}`;
  results.emi = `EMI: ₹${indNum(Math.round(emi))} | Interest: ₹${indNum(Math.round(interest))} | Total: ₹${indNum(Math.round(total))}`;
  renderEMIChart(P, interest);
  document.getElementById('emiResult').style.display = 'block';
}
function renderEMIChart(principal, interest) {
  if (emiChartInstance) { emiChartInstance.destroy(); emiChartInstance = null; }
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const tc = dark ? '#8899bb' : '#4a5580';
  const bg = dark ? '#0f1520' : '#e2e8ff';
  emiChartInstance = new Chart(document.getElementById('emiChart').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Principal', 'Total Interest'],
      datasets: [{ data: [Math.round(principal), Math.round(interest)], backgroundColor: ['#5b8fff','#00d9b4'], borderColor: bg, borderWidth: 3, hoverOffset: 10 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: tc, padding: 16, font: { family: 'Nunito', size: 12, weight: '700' } } },
        tooltip: { callbacks: { label: ctx => ` ₹${indNum(ctx.raw)}` } }
      },
      cutout: '68%',
    }
  });
}

// ============ UNIT CONVERTER ============
const UNITS = {
  length: {
    list: ['Meter','Kilometer','Centimeter','Millimeter','Mile','Yard','Foot','Inch','Nautical Mile'],
    base: { Meter:1, Kilometer:1000, Centimeter:.01, Millimeter:.001, Mile:1609.344, Yard:.9144, Foot:.3048, Inch:.0254, 'Nautical Mile':1852 }
  },
  weight: {
    list: ['Kilogram','Gram','Milligram','Pound','Ounce','Ton','Stone'],
    base: { Kilogram:1, Gram:.001, Milligram:1e-6, Pound:.453592, Ounce:.0283495, Ton:1000, Stone:6.35029 }
  },
  temperature: { list: ['Celsius','Fahrenheit','Kelvin'], base: null },
  area: {
    list: ['Square Meter','Square Kilometer','Square Foot','Square Inch','Square Mile','Hectare','Acre'],
    base: { 'Square Meter':1, 'Square Kilometer':1e6, 'Square Foot':.0929, 'Square Inch':6.452e-4, 'Square Mile':2.59e6, Hectare:1e4, Acre:4046.86 }
  },
  volume: {
    list: ['Liter','Milliliter','Cubic Meter','Gallon (US)','Gallon (UK)','Fluid Ounce (US)','Cup','Pint','Quart'],
    base: { Liter:1, Milliliter:.001, 'Cubic Meter':1000, 'Gallon (US)':3.78541, 'Gallon (UK)':4.54609, 'Fluid Ounce (US)':.0295735, Cup:.236588, Pint:.473176, Quart:.946353 }
  },
  speed: {
    list: ['m/s','km/h','mph','Knot','ft/s','Mach'],
    base: { 'm/s':1, 'km/h':1/3.6, 'mph':.44704, 'Knot':.514444, 'ft/s':.3048, 'Mach':340.29 }
  },
  time: {
    list: ['Second','Minute','Hour','Day','Week','Month','Year'],
    base: { Second:1, Minute:60, Hour:3600, Day:86400, Week:604800, Month:2629746, Year:31556952 }
  },
  data: {
    list: ['Bit','Byte','Kilobyte','Megabyte','Gigabyte','Terabyte','Petabyte'],
    base: { Bit:.125, Byte:1, Kilobyte:1024, Megabyte:1048576, Gigabyte:1073741824, Terabyte:1.0995e12, Petabyte:1.1259e15 }
  }
};
function updateUnitOptions() {
  const cat = document.getElementById('unitCategory').value;
  const opts = UNITS[cat].list.map(u => `<option value="${u}">${u}</option>`).join('');
  document.getElementById('unitFrom').innerHTML = opts;
  document.getElementById('unitTo').innerHTML = opts;
  document.getElementById('unitTo').selectedIndex = 1;
  document.getElementById('unitResult').style.display = 'none';
}
function tempConvert(v, from, to) {
  let c = from==='Celsius' ? v : from==='Fahrenheit' ? (v-32)*5/9 : v-273.15;
  return to==='Celsius' ? c : to==='Fahrenheit' ? c*9/5+32 : c+273.15;
}
function calculateUnit() {
  const cat  = document.getElementById('unitCategory').value;
  const from = document.getElementById('unitFrom').value;
  const to   = document.getElementById('unitTo').value;
  const val  = parseFloat(document.getElementById('unitValue').value);
  if (isNaN(val)) { if (document.getElementById('unitValue').value !== '') showToast('Enter a valid number','error'); return; }

  const res = cat === 'temperature' ? tempConvert(val, from, to)
    : (val * UNITS[cat].base[from]) / UNITS[cat].base[to];

  document.getElementById('unitResultValue').textContent = `${fmtN(val)} ${from} = ${fmtN(res,6)} ${to}`;
  document.getElementById('unitFormula').textContent = `${val} ${from} → ${fmtN(res,6)} ${to}`;

//All conversions panel 
let html = ''; 
if (cat !== 'temperature') {
 const bv = val * UNITS[cat].base[from];
  html = `<h4>All ${cat.charAt(0).toUpperCase()+cat.slice(1)} conversions for ${fmtN(val)} ${from}</h4>` + 
  UNITS[cat].list.map(u => { 
  const cv = bv / UNITS[cat].base[u]; return `<div class="conv-row" onclick="copyText('${fmtN(cv,6)} ${u}')"><span class="conv-unit">${u}</span><span class="conv-val">${fmtN(cv,6)}</span></div>`;
   }).join('');
    } document.getElementById('allConversions').innerHTML = html; 
    results.unit = `${fmtN(val)} ${from} = ${fmtN(res,6)} ${to}`; 
    document.getElementById('unitResult').style.display = 'block';
     }
      function swapUnits() {
       const f = document.getElementById('unitFrom'); 
       const t = document.getElementById('unitTo');  
       [f.value, t.value] = [t.value, f.value];
        if (document.getElementById('unitValue').value) calculateUnit(); 
        } 
// ============ CURRENCY CONVERTER ============ 
const CURRENCIES = { USD:{name:'US Dollar',country:'us'}, EUR:{name:'Euro',country:'eu'}, GBP:{name:'British Pound',country:'gb'}, JPY:{name:'Japanese Yen',country:'jp'}, AUD:{name:'Australian Dollar',country:'au'}, CAD:{name:'Canadian Dollar',country:'ca'}, CHF:{name:'Swiss Franc',country:'ch'}, CNY:{name:'Chinese Yuan',country:'cn'}, INR:{name:'Indian Rupee',country:'in'}, MXN:{name:'Mexican Peso',country:'mx'}, BRL:{name:'Brazilian Real',country:'br'}, KRW:{name:'South Korean Won',country:'kr'}, SGD:{name:'Singapore Dollar',country:'sg'}, HKD:{name:'Hong Kong Dollar',country:'hk'}, NOK:{name:'Norwegian Krone',country:'no'}, SEK:{name:'Swedish Krona',country:'se'}, DKK:{name:'Danish Krone',country:'dk'}, NZD:{name:'New Zealand Dollar',country:'nz'}, ZAR:{name:'South African Rand',country:'za'}, AED:{name:'UAE Dirham',country:'ae'}, SAR:{name:'Saudi Riyal',country:'sa'}, MYR:{name:'Malaysian Ringgit',country:'my'}, THB:{name:'Thai Baht',country:'th'}, IDR:{name:'Indonesian Rupiah',country:'id'}, PKR:{name:'Pakistani Rupee',country:'pk'}, BDT:{name:'Bangladeshi Taka',country:'bd'}, EGP:{name:'Egyptian Pound',country:'eg'}, TRY:{name:'Turkish Lira',country:'tr'}, NGN:{name:'Nigerian Naira',country:'ng'}, RUB:{name:'Russian Ruble',country:'ru'}, }; const FALLBACK_RATES = { USD:1, EUR:.92, GBP:.79, JPY:149.5, AUD:1.53, CAD:1.36, CHF:.89, CNY:7.24, INR:83.1, MXN:17.1, BRL:4.97, KRW:1325, SGD:1.34, HKD:7.82, NOK:10.6, SEK:10.4, DKK:6.88, NZD:1.62, ZAR:18.6, AED:3.67, SAR:3.75, MYR:4.68, THB:35.5, IDR:15700, PKR:280, BDT:110, EGP:30.9, TRY:30.5, NGN:780, RUB:92.5, }; async function loadExchangeRates() { const st = document.getElementById('rateStatus'); try { const cached = localStorage.getItem('sch_rates'); const time = parseInt(localStorage.getItem('sch_rates_time') || '0'); if (cached && Date.now() - time < 3_600_000) { exchangeRates = JSON.parse(cached); ratesLastUpdated = localStorage.getItem('sch_rates_date') || ''; if (st) st.textContent = `✅ Rates loaded (cached ${ratesLastUpdated})`; populateCurrencySelects(); return; } if (st) st.textContent = '⌛ Fetching live rates…'; 
const res = await fetch ('https:// api.frankfurter.app/latest?from=USD');
 if (!res.ok) throw Error('API error'); const data = await res.json(); exchangeRates = { ...data.rates, USD: 1 }; ratesLastUpdated = data.date; localStorage.setItem('sch_rates', JSON.stringify(exchangeRates)); localStorage.setItem('sch_rates_time', Date.now().toString()); localStorage.setItem('sch_rates_date', data.date); if (st) st.textContent = `✅ Live rates updated: ${data.date}`; } catch { exchangeRates = { ...FALLBACK_RATES }; if (st) st.textContent = '⚠️ Using offline rates (network unavailable)'; } populateCurrencySelects(); } function populateCurrencySelects() { const list = Object.keys(CURRENCIES).filter(c => exchangeRates[c]).sort(); const makeOpts = sel => list.map(c => `<option value="${c}" ${c===sel?'selected':''}>${c} — ${CURRENCIES[c].name}</option>`).join(''); document.getElementById('currencyFrom').innerHTML = makeOpts('USD'); document.getElementById('currencyTo').innerHTML = makeOpts('INR'); 
 // Search
  const addSearch = (searchId, selectId) => { document.getElementById(searchId).addEventListener('input', e => { const q = e.target.value.toLowerCase(); Array.from(document.getElementById(selectId).options).forEach(o => { o.style.display = (o.value.toLowerCase().includes(q) || o.text.toLowerCase().includes(q)) ? '' : 'none'; }); }); }; addSearch('currencySearch1','currencyFrom'); addSearch('currencySearch2','currencyTo'); } function convertCurrency() { const amt = parseFloat(document.getElementById('currencyAmount').value); const from = document.getElementById('currencyFrom').value; const to = document.getElementById('currencyTo').value; if (isNaN(amt) || amt <= 0) { showToast('Enter a valid positive amount','error'); return; } if (!exchangeRates[from] || !exchangeRates[to]) { showToast('Currency rates not available','error'); return; } const result = (amt / exchangeRates[from]) * exchangeRates[to]; const rate = exchangeRates[to] / exchangeRates[from]; const fi = CURRENCIES[from] || { country:'us', name:from }; const ti = CURRENCIES[to] || { country:'us', name:to }; document.getElementById('currencyResultDisplay').innerHTML = ` <div class="row"> <img src="https://flagcdn.com/w40/${fi.country}.png" alt="${from}" onerror="this.style.display='none'"> <span>${fmtN(amt)} <strong>${from}</strong></span> </div> <div class="row"><span class="equals">equals</span></div> <div class="row"> <img src="https://flagcdn.com/w40/${ti.country}.png" alt="${to}" onerror="this.style.display='none'"> <span class="gradient-text">${fmtN(result,4)} <strong>${to}</strong></span> </div>`; document.getElementById('exchangeRateInfo').innerHTML = `1 ${from} = ${fmtN(rate,4)} ${to} &nbsp;|&nbsp; 1 ${to} = ${fmtN(1/rate,4)} ${from} ${ratesLastUpdated ? `<br><small style="color:var(--muted)">Rates as of ${ratesLastUpdated}</small>` : ''}`; const pops = ['USD','EUR','GBP','JPY','INR','AUD','CAD','CHF'].filter(c => c !== from && exchangeRates[c]).slice(0,6); document.getElementById('popularRates').innerHTML = `<h4>Quick comparison · ${fmtN(amt)} ${from}</h4>` + pops.map(c => { const cv = (amt / exchangeRates[from]) * exchangeRates[c]; const ci = CURRENCIES[c] || { country:'us', name:c }; return `<div class="pop-row"> <img src="https://flagcdn.com/w20/${ci.country}.png" alt="${c}" onerror="this.style.display='none'"> <span class="pop-name">${c} — ${ci.name}</span> <span class="pop-val">${fmtN(cv,4)}</span> </div>`; }).join(''); results.currency = `${fmtN(amt)} ${from} = ${fmtN(result,4)} ${to} (rate: ${fmtN(rate,4)})`; document.getElementById('currencyResult').style.display = 'block'; } function swapCurrencies() { const f = document.getElementById('currencyFrom'); const t = document.getElementById('currencyTo'); [f.value, t.value] = [t.value, f.value]; } async function refreshRates() { localStorage.removeItem('sch_rates'); localStorage.removeItem('sch_rates_time'); showToast('Refreshing rates…','info'); await loadExchangeRates(); showToast('Exchange rates refreshed! ✅','success'); }
  // ============ RESULT ACTIONS ============
  function copyResult(type) { const txt = results[type]; if (!txt) { showToast('No result to copy yet','error'); return; } copyText(txt); } function copyText(txt) { if (navigator.clipboard) { navigator.clipboard.writeText(txt).then(() => showToast('Copied to clipboard! 📋','success')).catch(() => legacyCopy(txt)); } else legacyCopy(txt); } function legacyCopy(txt) { const ta = Object.assign(document.createElement('textarea'), { value: txt, style:'position:fixed;opacity:0' }); document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('Copied! 📋','success'); } function shareResult(type) { const txt = results[type]; if (!txt) { showToast('No result to share yet','error'); return; } if (navigator.share) { navigator.share({ title:'SmartCalc Hub', text:`SmartCalc Hub: ${txt}`, url: location.href }).catch(() => copyText(txt)); } else { copyText(txt); showToast('Link copied for sharing! 🔗','success'); } } function downloadPDF(type) { const txt = results[type]; if (!txt) { showToast('No result to download','error'); return; } const icons = { age:'🎂', percentage:'📊', bmi:'⚖️', emi:'🏦', unit:'📐', currency:'💱' }; try { const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(91,143,255); doc.text('SmartCalc Hub', 20, 28); doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(130,130,160); doc.text(`Calculator: ${type.charAt(0).toUpperCase()+type.slice(1)}`, 20, 42); doc.text(`Date: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}`, 20, 52); doc.setDrawColor(91,143,255); doc.setLineWidth(.5); doc.line(20,58,190,58); doc.setFontSize(13); doc.setTextColor(40,40,70); doc.text('Result:', 20, 70); doc.setFontSize(11); doc.setTextColor(20,20,40); doc.text(doc.splitTextToSize(txt, 170), 20, 82); doc.setFontSize(8); doc.setTextColor(170,170,190); doc.text('Generated by SmartCalc Hub — Your All-in-One Calculator', 20, 285); doc.save(`SmartCalc-${type}-${Date.now()}.pdf`); showToast('PDF downloaded! ⬇️','success'); } catch { const blob = new Blob([`SmartCalc Hub — ${type.toUpperCase()}\n${'─'.repeat(40)}\n${txt}\n\nGenerated: ${new Date().toLocaleString()}`], { type:'text/plain' }); const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:`SmartCalc-${type}.txt` }); a.click(); URL.revokeObjectURL(a.href); showToast('Downloaded as text file ⬇️','success'); } } function saveHistory(type) { const txt = results[type]; if (!txt) { showToast('No result to save','error'); return; } const icons = { age:'🎂', percentage:'📊', bmi:'⚖️', emi:'🏦', unit:'📐', currency:'💱' }; const hist = JSON.parse(localStorage.getItem('sch_hist') || '[]'); hist.unshift({ id:Date.now(), type, icon:icons[type]||'🔢', result:txt, date:new Date().toLocaleDateString() }); if (hist.length > 50) hist.length = 50; localStorage.setItem('sch_hist', JSON.stringify(hist)); showToast('Saved to history! 💾','success'); }
   // ============ RESET ============ 
   function resetCalc(type) { const fields = { age: ['dob','calcDate','futureDate'], percentage: ['pct-x','pct-y','inc-orig','inc-new','dec-orig','dec-new','diff-v1','diff-v2'], bmi: ['heightCm','weightKg','heightFt','heightIn','weightLb','bmiAge'], emi: ['loanAmount','interestRate','loanTenure'], unit: ['unitValue'], currency: ['currencyAmount'], }; const resultIds = { age:'ageResult', percentage:'percentageResult', bmi:'bmiResult', emi:'emiResult', unit:'unitResult', currency:'currencyResult', }; (fields[type]||[]).forEach(id => { const el=document.getElementById(id); if(el) el.value=''; }); const r = document.getElementById(resultIds[type]); if (r) r.style.display = 'none'; if (type === 'emi') { document.getElementById('loanSlider').value = 500000; document.getElementById('rateSlider').value = 8.5; document.getElementById('tenureSlider').value = 5; document.getElementById('loanAmount').value = 500000; document.getElementById('interestRate').value = 8.5; document.getElementById('loanTenure').value = 5; document.getElementById('loanSliderVal').textContent = '₹5,00,000'; document.getElementById('rateSliderVal').textContent = '8.5%'; document.getElementById('tenureSliderVal').textContent = '5 yrs'; ['loanSlider','rateSlider','tenureSlider'].forEach(id => sliderFill(document.getElementById(id))); if (emiChartInstance) { emiChartInstance.destroy(); emiChartInstance = null; } } if (type === 'age') setDefaultDates(); results[type] = ''; showToast('Reset ✓','info'); } 
   // ============ HISTORY ============
    function renderHistory() { const hist = JSON.parse(localStorage.getItem('sch_hist') || '[]'); const list = document.getElementById('historyList'); const cnt = document.getElementById('historyCount'); if (!list) return; if (cnt) cnt.textContent = `${hist.length} saved calculation${hist.length !== 1 ? 's' : ''}`; if (!hist.length) { list.innerHTML = `<div class="history-empty"><span class="ei">📜</span><p>No saved calculations yet.</p><p style="margin-top:6px;font-size:.78rem;">Use the 💾 Save button in any calculator!</p></div>`; return; } list.innerHTML = hist.map(item => ` <div class="h-item" role="listitem"> <span class="h-icon">${item.icon}</span> <div class="h-body"> <span class="h-type">${item.type} calculator</span> <span class="h-result">${item.result}</span> <span class="h-date">${item.date}</span> </div> <button class="h-del" onclick="deleteHistItem(${item.id})" aria-label="Delete this entry">✕</button> </div>`).join(''); } function deleteHistItem(id) { let h = JSON.parse(localStorage.getItem('sch_hist') || '[]'); h = h.filter(x => x.id !== id); localStorage.setItem('sch_hist', JSON.stringify(h)); renderHistory(); showToast('Entry deleted','info'); } function clearHistory() { if (!confirm('Clear all calculation history?')) return; localStorage.removeItem('sch_hist'); renderHistory(); showToast('History cleared','info'); } 
    // ============ MODAL ============ 
    const MODALS = { about: { title: '👋 About SmartCalc Hub', body: `<p>SmartCalc Hub is a free, modern all-in-one calculator designed for everyone — students, children, adults, and professionals.</p> <p>We offer six powerful calculators including Age, Percentage, BMI, EMI (with interactive charts), Unit Converter (8 categories), and a Live Currency Converter with 30+ world currencies.</p> <p>All calculations run entirely in your browser — fast, private, and free.</p>` }, privacy: { title: '🔒 Privacy Policy', body: `<p>Your privacy matters. SmartCalc Hub does <strong>not</strong> collect, store, or transmit any personal data.</p> <p>All calculations happen locally in your browser. History and preferences are stored only in your device's localStorage and never sent to any server.</p> <p>Exchange rate data is fetched from a public API (frankfurter.app). No tracking, no ads, no cookies.</p>` }, contact: { title: '📬 Contact Us', body: `<p>Have feedback, a bug report, or a feature request? We'd love to hear from you!</p> <p><strong>Email:</strong> hello@smartcalchub.com</p> <p><strong>Website:</strong> www.smartcalchub.com</p> <p>We typically respond within 24–48 hours.</p>` }, disclaimer: { title: '⚠️ Disclaimer', body: `<p>SmartCalc Hub is provided for informational and educational purposes only. Results should not substitute professional medical, financial, or legal advice.</p> <p>BMI values are general guides and vary by age, gender, and ethnicity — always consult a healthcare professional.</p> <p>EMI figures are estimates; actual loan terms may vary by lender. Currency rates are approximate and may differ from live transaction rates.</p>` } }; function showModal(type) { const m = MODALS[type]; if (!m) return false; document.getElementById('modalTitle').textContent = m.title; document.getElementById('modalBody').innerHTML = m.body; document.getElementById('modalOverlay').classList.add('open'); return false; } function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); } 
    // Close modal on Escape key
     document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); }); 
    // ============ TOAST ============ 
    let toastTimer; function showToast(msg, type = 'info') { const t = document.getElementById('toast'); t.textContent = msg; t.className = `toast show ${type}`; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800); } 
    // ============ UTILITIES ============ 
    function fmtN(num, dec = 2) { if (isNaN(num) || num === null) return '—'; if (Math.abs(num) >= 1e12) return (num/1e12).toFixed(dec) + 'T'; if (Math.abs(num) >= 1e9) return (num/1e9).toFixed(dec) + 'B'; if (Math.abs(num) >= 1e6) return (num/1e6).toFixed(dec) + 'M'; if (Math.abs(num) !== 0 && Math.abs(num) < 1e-4) return num.toExponential(4); const r = parseFloat(num.toFixed(dec)); return r.toLocaleString('en', { maximumFractionDigits: dec }); } function indNum(n) { return n.toLocaleString('en-IN'); }