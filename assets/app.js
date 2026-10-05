/* AI 变现嗅探雷达 · 渲染逻辑（零依赖） */
var STATE = { news: [], sources: [], filter: "all", query: "", digest: "", aiOnly: true };
var FAV = [];
try { FAV = JSON.parse(localStorage.getItem("radar_fav") || "[]"); } catch (e) { FAV = []; }
function isFav(t){ return FAV.indexOf(t) >= 0; }
function saveFav(){ try { localStorage.setItem("radar_fav", JSON.stringify(FAV)); } catch (e) {} }
function toggleFav(t){
  var i = FAV.indexOf(t);
  if (i >= 0) FAV.splice(i, 1); else FAV.push(t);
  saveFav(); renderFilters(); renderNews();
}

var el = {
  updated: document.getElementById("updated"),
  badge: document.getElementById("sourcesBadge"),
  filters: document.getElementById("filters"),
  newsList: document.getElementById("newsList"),
  search: document.getElementById("search"),
  statCards: document.getElementById("statCards"),
  ghTable: document.getElementById("ghTable"),
  hfTable: document.getElementById("hfTable"),
  probeBars: document.getElementById("probeBars"),
  signals: document.getElementById("signals"),
  refresh: document.getElementById("refresh"),
  digest: document.getElementById("digest"),
  oppList: document.getElementById("oppList"),
  ideaList: document.getElementById("ideaList"),
  sourceList: document.getElementById("sourceList"),
  projList: document.getElementById("projList"),
  projFilters: document.getElementById("projFilters"),
  planList: document.getElementById("planList"),
  promptList: document.getElementById("promptList"),
  gigPlatforms: document.getElementById("gigPlatforms"),
  gigServices: document.getElementById("gigServices"),
  gigScripts: document.getElementById("gigScripts"),
  gigPitfalls: document.getElementById("gigPitfalls"),
  resTools: document.getElementById("resTools"),
  resLearning: document.getElementById("resLearning"),
  resTemplates: document.getElementById("resTemplates"),
  share: document.getElementById("share"),
  toTop: document.getElementById("toTop"),
  introStats: document.getElementById("introStats"),
  guideFirst: document.getElementById("guideFirst"),
  guidePricing: document.getElementById("guidePricing"),
  guidePitfalls: document.getElementById("guidePitfalls"),
  guideRules: document.getElementById("guideRules"),
  guideFaq: document.getElementById("guideFaq")
};

function toast(msg){
  var t = document.querySelector(".toast");
  if (!t){ t = make("div","toast"); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove("show"); }, 2200);
}

function shareSite(){
  var url = "https://ibsibxi.github.io/ai-radar/";
  var text = "AI 资讯 · 副业项目 · 接单渠道 · 工具资源，一站式 AI 变现导航，推荐给你";
  if (navigator.share) {
    navigator.share({ title: "AI 变现资源中心", text: text, url: url })
      .catch(function(){ copyText(url, null, ""); toast("链接已复制，去粘贴给朋友吧"); });
  } else {
    copyText(url, null, "");
    toast("链接已复制，去粘贴给朋友吧");
  }
}

function renderIntro(d){
  var s = d.stats || {};
  var projs = (window.__RADAR_PROJECTS__ || []).length;
  var svcs = ((window.__RADAR_GIGS__ || {}).services || []).length;
  var stats = [
    { v: num(s.articleCount), k: "实时资讯" },
    { v: projs, k: "副业项目" },
    { v: svcs, k: "接单服务" },
    { v: (s.sourcesOk||0) + "/" + (s.sourcesTotal||0), k: "数据源" }
  ];
  clear(el.introStats);
  for (var i=0;i<stats.length;i++){
    var box = make("div","intro-stat");
    box.appendChild(make("div","v", stats[i].v));
    box.appendChild(make("div","k", stats[i].k));
    el.introStats.appendChild(box);
  }
}

function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }
function make(tag, cls, text){
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}
function timeAgo(iso){
  if (!iso) return "时间未知";
  var d = (Date.now() - Date.parse(iso)) / 1000;
  if (isNaN(d)) return "时间未知";
  if (d < 60) return "刚刚";
  if (d < 3600) return Math.floor(d/60) + " 分钟前";
  if (d < 86400) return Math.floor(d/3600) + " 小时前";
  if (d < 86400*7) return Math.floor(d/86400) + " 天前";
  return new Date(iso).toLocaleDateString();
}
function num(n){ return (n||0).toLocaleString("en-US"); }

function renderTabs(){
  var tabs = document.querySelectorAll(".tab");
  for (var i=0;i<tabs.length;i++){
    (function(t){
      t.addEventListener("click", function(){
        var all = document.querySelectorAll(".tab");
        for (var j=0;j<all.length;j++) all[j].classList.remove("active");
        var panes = document.querySelectorAll(".tabpane");
        for (var k=0;k<panes.length;k++) panes[k].classList.remove("active");
        t.classList.add("active");
        document.getElementById("tab-" + t.getAttribute("data-tab")).classList.add("active");
      });
    })(tabs[i]);
  }
}

function renderFilters(){
  clear(el.filters);
  var counts = {};
  for (var i=0;i<STATE.news.length;i++){
    var s = STATE.news[i].source;
    counts[s] = (counts[s]||0) + 1;
  }
  var aiChip = make("span", "chip" + (STATE.aiOnly ? " active" : ""), "🤖 只看 AI");
  aiChip.addEventListener("click", function(){ STATE.aiOnly = !STATE.aiOnly; renderFilters(); renderNews(); });
  el.filters.appendChild(aiChip);
  var all = make("span", "chip active", "全部 (" + STATE.news.length + ")");
  all.addEventListener("click", function(){ setFilter("all"); });
  el.filters.appendChild(all);
  if (FAV.length > 0) {
    var favChip = make("span", "chip", "★ 收藏 (" + FAV.length + ")");
    favChip.addEventListener("click", function(){ setFilter("__fav__"); });
    el.filters.appendChild(favChip);
  }
  var names = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; });
  for (var n=0;n<names.length;n++){
    (function(name){
      var c = make("span", "chip", name + " (" + counts[name] + ")");
      c.addEventListener("click", function(){ setFilter(name); });
      el.filters.appendChild(c);
    })(names[n]);
  }
}
function setFilter(name){
  STATE.filter = name;
  var chips = el.filters.querySelectorAll(".chip");
  for (var i=0;i<chips.length;i++){
    var t = chips[i].textContent || "";
    if (t.indexOf("🤖") === 0) { if (STATE.aiOnly) chips[i].classList.add("active"); else chips[i].classList.remove("active"); continue; }
    var isAll = (name === "all" && t.indexOf("全部") === 0);
    var isFavChip = (name === "__fav__" && t.indexOf("★") === 0);
    var isMe = (t.indexOf(name + " (") === 0);
    if (isAll || isFavChip || isMe) chips[i].classList.add("active"); else chips[i].classList.remove("active");
  }
  renderNews();
}
function renderNews(){
  clear(el.newsList);
  var q = STATE.query.toLowerCase();
  var out = [];
  for (var i=0;i<STATE.news.length;i++){
    var it = STATE.news[i];
    if (STATE.aiOnly && it.ai === false) continue;
    if (STATE.filter === "__fav__") { if (!isFav(it.title)) continue; }
    else if (STATE.filter !== "all" && it.source !== STATE.filter) continue;
    if (q) {
      var hay = ((it.titleZh || "") + " " + (it.title || "")).toLowerCase();
      if (hay.indexOf(q) < 0) continue;
    }
    out.push(it);
  }
  if (out.length === 0){ el.newsList.appendChild(make("div","empty","没有匹配的资讯")); return; }
  for (var j=0;j<out.length;j++){
    var it = out[j];
    var a = make("a","news-item");
    a.href = it.url || "#"; a.target = "_blank"; a.rel = "noopener";
    if (it.lang === "en") a.title = it.title;
    a.appendChild(make("span","src", it.source));
    var body = make("div","news-body");
    body.appendChild(make("div","news-title", it.titleZh || it.title));
    var langTag = it.lang === "en" ? (it.titleZh ? " · 译自英文" : " · 英文原文") : " · 中文";
    body.appendChild(make("div","news-meta", timeAgo(it.publishedAt) + langTag));
    a.appendChild(body);
    var on = isFav(it.title);
    var star = make("span", "star" + (on ? " on" : ""), on ? "★" : "☆");
    star.title = "收藏到选题库";
    (function(title){ star.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); toggleFav(title); }); })(it.title);
    a.appendChild(star);
    el.newsList.appendChild(a);
  }
}

function renderData(d){
  clear(el.statCards);
  var s = d.stats || {};
  var cards = [
    { k:"资讯总数", v: num(s.articleCount) },
    { k:"近 48 小时", v: num(s.recent48h) },
    { k:"数据源在线", v: (s.sourcesOk||0) + "/" + (s.sourcesTotal||0) },
    { k:"GitHub 新星", v: num(s.githubCount) },
    { k:"AI 相关资讯", v: num(s.aiCount) }
  ];
  for (var i=0;i<cards.length;i++){
    var c = make("div","stat");
    c.appendChild(make("div","k", cards[i].k));
    c.appendChild(make("div","v", cards[i].v));
    el.statCards.appendChild(c);
  }

  clear(el.ghTable);
  var gh = (d.data && d.data.github) || [];
  if (gh.length === 0){ el.ghTable.appendChild(make("div","empty","本地网络拦截了 GitHub 接口。线上版本数据正常：https://ibsibxi.github.io/ai-radar/")); }
  else {
    var t = make("table");
    var thead = make("thead"); var tr = make("tr");
    tr.appendChild(make("th","","项目")); tr.appendChild(make("th","","★"));
    thead.appendChild(tr); t.appendChild(thead);
    var tb = make("tbody");
    for (var g=0; g<gh.length; g++){
      var row = make("tr");
      var td = make("td","name");
      var a2 = make("a"); a2.href = gh[g].url; a2.target="_blank"; a2.rel="noopener";
      a2.textContent = gh[g].name; td.appendChild(a2);
      if (gh[g].desc) td.appendChild(make("div","desc", gh[g].desc));
      row.appendChild(td); row.appendChild(make("td","num", num(gh[g].stars))); tb.appendChild(row);
    }
    t.appendChild(tb); el.ghTable.appendChild(t);
  }

  clear(el.hfTable);
  var hf = (d.data && d.data.huggingface) || [];
  if (hf.length === 0){ el.hfTable.appendChild(make("div","empty","本地网络拦截了 HuggingFace。线上版本数据正常：https://ibsibxi.github.io/ai-radar/")); }
  else {
    var t2 = make("table");
    var th2 = make("thead"); var tr2 = make("tr");
    tr2.appendChild(make("th","","模型")); tr2.appendChild(make("th","","♥"));
    th2.appendChild(tr2); t2.appendChild(th2);
    var tb2 = make("tbody");
    for (var h=0; h<hf.length; h++){
      var row2 = make("tr");
      var d2 = make("td","name");
      var a3 = make("a"); a3.href = hf[h].url; a3.target="_blank"; a3.rel="noopener";
      a3.textContent = hf[h].id; d2.appendChild(a3);
      if (hf[h].task) d2.appendChild(make("div","desc", hf[h].task));
      row2.appendChild(d2); row2.appendChild(make("td","num", num(hf[h].likes))); tb2.appendChild(row2);
    }
    t2.appendChild(tb2); el.hfTable.appendChild(t2);
  }
}

function renderProbe(d){
  clear(el.probeBars);
  var kws = (d.probe && d.probe.keywords) || [];
  if (kws.length === 0){ el.probeBars.appendChild(make("div","empty","暂无热度数据")); }
  else {
    var max = 1;
    for (var i=0;i<kws.length;i++) if (kws[i].count > max) max = kws[i].count;
    for (var j=0;j<kws.length;j++){
      var k = kws[j];
      var row = make("div","bar-row");
      row.appendChild(make("div","bar-label", k.word));
      var track = make("div","bar-track");
      var fill = make("div","bar-fill");
      fill.style.width = Math.max(4, Math.round(k.count / max * 100)) + "%";
      track.appendChild(fill); row.appendChild(track);
      var sign = k.delta > 0 ? "up" : (k.delta < 0 ? "down" : "flat");
      var arrow = k.delta > 0 ? "▲ +" + k.delta : (k.delta < 0 ? "▼ " + k.delta : "— 0");
      var val = make("div","bar-val");
      val.appendChild(document.createTextNode(k.count + " 次 "));
      val.appendChild(make("span","delta " + sign, arrow));
      row.appendChild(val);
      el.probeBars.appendChild(row);
    }
  }

  clear(el.signals);
  var sig = (d.probe && d.probe.signals) || [];
  for (var m=0;m<sig.length;m++){
    el.signals.appendChild(make("div","signal " + (sig[m].type||"info"), sig[m].text));
  }
}

function renderOpp(d){
  clear(el.oppList);
  var opps = d.opportunities || [];
  if (opps.length === 0) el.oppList.appendChild(make("div","empty","暂无可提取的变现机会"));
  for (var i=0;i<opps.length;i++){
    var o = opps[i];
    var card = make("div","opp");
    var head = make("div","opp-head");
    head.appendChild(make("span","opp-type", (o.icon||"") + " " + o.type));
    head.appendChild(make("span","opp-src", o.source));
    card.appendChild(head);
    card.appendChild(make("div","opp-title", o.title));
    card.appendChild(make("div","opp-action", "👉 " + o.action));
    el.oppList.appendChild(card);
  }

  clear(el.ideaList);
  var ideas = d.ideas || [];
  if (ideas.length === 0) el.ideaList.appendChild(make("div","empty","暂无选题灵感"));
  for (var j=0;j<ideas.length;j++){
    var row = make("div","idea");
    row.appendChild(make("span","idea-kw", ideas[j].kw));
    row.appendChild(make("span","idea-title", ideas[j].title));
    el.ideaList.appendChild(row);
  }

  clear(el.sourceList);
  var src = d.sources || [];
  for (var k=0;k<src.length;k++){
    var s = src[k];
    var r = make("div","source-row " + (s.ok ? "ok" : "bad"));
    r.appendChild(make("span","dot","●"));
    r.appendChild(make("span","sname", s.name));
    r.appendChild(make("span","scount", (s.ok ? s.count + " 条" : "不可用")));
    el.sourceList.appendChild(r);
  }
}

var PROJ_TAG = "全部";
function renderProjects(){
  var all = window.__RADAR_PROJECTS__ || [];
  clear(el.projFilters); clear(el.projList);
  var tags = ["全部"];
  for (var i=0;i<all.length;i++){ if (tags.indexOf(all[i].tag) < 0) tags.push(all[i].tag); }
  for (var t=0;t<tags.length;t++){
    (function(tag){
      var c = make("span","chip" + (tag === PROJ_TAG ? " active" : ""), tag);
      c.addEventListener("click", function(){ PROJ_TAG = tag; renderProjects(); });
      el.projFilters.appendChild(c);
    })(tags[t]);
  }
  for (var j=0;j<all.length;j++){
    var p = all[j];
    if (PROJ_TAG !== "全部" && p.tag !== PROJ_TAG) continue;
    var card = make("div","proj");
    var head = make("div","proj-head");
    head.appendChild(make("span","proj-emoji", p.emoji || "🚀"));
    head.appendChild(make("span","proj-name", p.name));
    card.appendChild(head);
    var meta = make("div","proj-meta");
    meta.appendChild(make("span","tag", p.tag));
    meta.appendChild(make("span","tag", "难度 " + "★★★".slice(0, p.difficulty || 1)));
    meta.appendChild(make("span","tag", p.time));
    meta.appendChild(make("span","tag", "成本 " + p.capital));
    meta.appendChild(make("span","tag money", "收益 " + p.income));
    card.appendChild(meta);
    card.appendChild(make("div","proj-desc", p.desc));
    var ol = make("ol","proj-steps");
    for (var s=0;s<(p.steps||[]).length;s++) ol.appendChild(make("li","", p.steps[s]));
    card.appendChild(ol);
    if (p.tools && p.tools.length) card.appendChild(make("div","proj-tools","🧰 " + p.tools.join(" · ")));
    if (p.monetize) card.appendChild(make("div","proj-money","💰 " + p.monetize));
    el.projList.appendChild(card);
  }
}

function renderToolbox(){
  var tb = window.__RADAR_TOOLBOX__ || { prompts: [], plan: [] };
  clear(el.planList);
  var plan = tb.plan || [];
  for (var i=0;i<plan.length;i++){
    (function(text, idx){
      var row = make("label","plan-item");
      var cb = document.createElement("input"); cb.type = "checkbox";
      var key = "radar_plan_" + idx;
      try { cb.checked = localStorage.getItem(key) === "1"; } catch (e) {}
      cb.addEventListener("change", function(){ try { localStorage.setItem(key, cb.checked ? "1" : "0"); } catch (e) {} });
      row.appendChild(cb);
      row.appendChild(make("span","plan-text", text));
      el.planList.appendChild(row);
    })(plan[i], i);
  }
  clear(el.promptList);
  var ps = tb.prompts || [];
  for (var j=0;j<ps.length;j++){
    (function(p){
      var card = make("div","prompt");
      card.appendChild(make("div","prompt-title", p.title));
      card.appendChild(make("div","prompt-scene", p.scene));
      card.appendChild(make("pre","prompt-body", p.prompt));
      var btn = make("button","btn small", "📋 复制");
      btn.addEventListener("click", function(){ copyText(p.prompt, btn, "📋 复制"); });
      card.appendChild(btn);
      el.promptList.appendChild(card);
    })(ps[j]);
  }
}

function table(headers, rows){
  var t = make("table");
  var th = make("thead"); var tr = make("tr");
  for (var h=0; h<headers.length; h++) tr.appendChild(make("th","",headers[h]));
  th.appendChild(tr); t.appendChild(th);
  var tb = make("tbody");
  for (var i=0;i<rows.length;i++){
    var row = make("tr");
    for (var j=0;j<rows[i].length;j++){
      var cell = rows[i][j];
      var isObj = cell && typeof cell === "object";
      var cls = j === 0 ? "name" : (isObj && cell.cls ? cell.cls : "");
      var txt = isObj ? (cell.text || "") : cell;
      row.appendChild(make("td", cls, txt));
    }
    tb.appendChild(row);
  }
  t.appendChild(tb);
  return t;
}

function renderGigs(){
  var g = window.__RADAR_GIGS__ || {};

  clear(el.gigPlatforms);
  var plats = g.platforms || [];
  if (!plats.length) el.gigPlatforms.appendChild(make("div","empty","暂无数据"));
  else {
    var rows = [];
    for (var i=0;i<plats.length;i++) rows.push([plats[i].name, plats[i].type, plats[i].how, { text: plats[i].note, cls: "desc" }]);
    el.gigPlatforms.appendChild(table(["渠道","类型","怎么用","提醒"], rows));
  }

  clear(el.gigServices);
  var svcs = g.services || [];
  if (!svcs.length) el.gigServices.appendChild(make("div","empty","暂无数据"));
  else {
    var rows2 = [];
    for (var j=0;j<svcs.length;j++){
      var s = svcs[j];
      rows2.push([s.name, { text: s.price, cls: "money-mini" }, s.time, { text: s.note, cls: "desc" }]);
    }
    el.gigServices.appendChild(table(["服务","参考价","交付时间","说明"], rows2));
  }

  clear(el.gigScripts);
  var sc = g.scripts || [];
  for (var k=0;k<sc.length;k++){
    (function(item){
      var card = make("div","prompt");
      card.appendChild(make("div","prompt-title", item.title));
      card.appendChild(make("pre","prompt-body", item.text));
      var btn = make("button","btn small", "📋 复制");
      btn.addEventListener("click", function(){ copyText(item.text, btn, "📋 复制"); });
      card.appendChild(btn);
      el.gigScripts.appendChild(card);
    })(sc[k]);
  }

  clear(el.gigPitfalls);
  var pf = g.pitfalls || [];
  for (var m=0;m<pf.length;m++) el.gigPitfalls.appendChild(make("div","signal warn", "⛔ " + pf[m]));
}

function renderResources(){
  var r = window.__RADAR_RESOURCES__ || {};

  clear(el.resTools);
  var cats = r.tools || [];
  for (var i=0;i<cats.length;i++){
    (function(cat){
      var box = make("div","res-cat");
      box.appendChild(make("div","res-cat-title", cat.cat));
      var list = make("div","res-items");
      for (var j=0;j<(cat.items||[]).length;j++){
        var it = cat.items[j];
        var card = make("div","res-item");
        var head = make("div","res-item-head");
        head.appendChild(make("span","res-name", it.name));
        head.appendChild(make("span","res-cost", it.cost));
        card.appendChild(head);
        card.appendChild(make("div","res-use", it.use));
        list.appendChild(card);
      }
      box.appendChild(list);
      el.resTools.appendChild(box);
    })(cats[i]);
  }

  clear(el.resLearning);
  var le = r.learning || [];
  if (!le.length) el.resLearning.appendChild(make("div","empty","暂无数据"));
  else {
    var rows = [];
    for (var k=0;k<le.length;k++) rows.push([le[k].name, le[k].type, { text: le[k].note, cls: "desc" }]);
    el.resLearning.appendChild(table(["名称","类型","说明"], rows));
  }

  clear(el.resTemplates);
  var tp = r.templates || [];
  if (!tp.length) el.resTemplates.appendChild(make("div","empty","暂无数据"));
  else {
    var rows2 = [];
    for (var n=0;n<tp.length;n++) rows2.push([tp[n].name, { text: tp[n].note, cls: "desc" }]);
    el.resTemplates.appendChild(table(["模板","说明"], rows2));
  }
}

function renderGuide(){
  var g = window.__RADAR_GUIDE__ || {};

  clear(el.guideFirst);
  var st = g.firstOrder || [];
  for (var i=0;i<st.length;i++){
    var row = make("div","step-item");
    row.appendChild(make("div","step-no", st[i].step));
    var b = make("div");
    b.appendChild(make("div","step-t", st[i].t));
    b.appendChild(make("div","step-d", st[i].d));
    row.appendChild(b);
    el.guideFirst.appendChild(row);
  }

  clear(el.guidePricing);
  var pr = g.pricing || [];
  for (var j=0;j<pr.length;j++){
    var m = make("div","mini-item");
    m.appendChild(make("div","mini-t", pr[j].t));
    m.appendChild(make("div","mini-d", pr[j].d));
    el.guidePricing.appendChild(m);
  }

  clear(el.guidePitfalls);
  var pf = g.pitfalls || [];
  for (var k=0;k<pf.length;k++){
    el.guidePitfalls.appendChild(make("div","signal " + (pf[k].lv || "warn"), "⛔ " + pf[k].t + " —— " + pf[k].d));
  }

  clear(el.guideRules);
  var ru = g.rules || [];
  for (var m2=0;m2<ru.length;m2++){
    var card = make("div","rule-card");
    card.appendChild(make("div","rule-p", ru[m2].p));
    var ul = make("ul","rule-pts");
    for (var n=0;n<(ru[m2].pts||[]).length;n++) ul.appendChild(make("li","", ru[m2].pts[n]));
    card.appendChild(ul);
    el.guideRules.appendChild(card);
  }

  clear(el.guideFaq);
  var fq = g.faq || [];
  for (var q=0;q<fq.length;q++){
    var item = make("div","faq-item");
    item.appendChild(make("div","faq-q", "Q：" + fq[q].q));
    item.appendChild(make("div","faq-a", "A：" + fq[q].a));
    el.guideFaq.appendChild(item);
  }
}

function renderAll(d){
  STATE.news = d.news || [];
  STATE.sources = d.sources || [];
  STATE.digest = d.digest || "";
  var when = d.generatedAt ? new Date(d.generatedAt) : null;
  el.updated.textContent = when ? ("更新于 " + when.toLocaleString("zh-CN",{hour12:false})) : "更新时间未知";
  var ok = (d.stats && d.stats.sourcesOk) || 0;
  var total = (d.stats && d.stats.sourcesTotal) || STATE.sources.length || 0;
  el.badge.textContent = "数据源 " + ok + "/" + total;
  el.badge.className = "pill " + (ok === total && total > 0 ? "ok" : "warn");
  renderIntro(d);
  renderFilters();
  renderNews();
  renderData(d);
  renderProbe(d);
  renderOpp(d);
}

function boot(){
  var url = "data/data.json?t=" + Date.now();
  fetch(url).then(function(r){ return r.json(); }).then(function(d){
    renderAll(d);
  }).catch(function(){
    if (window.__RADAR_DATA__ && window.__RADAR_DATA__.news) { renderAll(window.__RADAR_DATA__); return; }
    clear(el.newsList);
    el.newsList.appendChild(make("div","empty","读取数据失败，请确认 data/data.json 是否存在。"));
    el.updated.textContent = "加载失败";
    el.badge.textContent = "—";
    el.badge.className = "pill warn";
  });
}

function copyText(text, btn, restoreLabel){
  if (!text) return;
  var done = function(){ if (btn) { btn.textContent = "✅ 已复制"; setTimeout(function(){ btn.textContent = restoreLabel || "📋 复制"; }, 1500); } };
  var fallback = function(){
    var ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function(){ fallback(); done(); });
  } else { fallback(); done(); }
}

function copyDigest(){
  copyText(STATE.digest || (window.__RADAR_DATA__ && window.__RADAR_DATA__.digest) || "", el.digest, "📋 复制简报");
}

renderProjects();
renderToolbox();
renderGigs();
renderGuide();
renderResources();
renderTabs();
el.search.addEventListener("input", function(e){ STATE.query = e.target.value || ""; renderNews(); });
el.refresh.addEventListener("click", boot);
el.digest.addEventListener("click", copyDigest);
el.share.addEventListener("click", shareSite);
el.toTop.addEventListener("click", function(){ window.scrollTo({ top: 0, behavior: "smooth" }); });
window.addEventListener("scroll", function(){
  if (window.scrollY > 400) el.toTop.classList.add("show"); else el.toTop.classList.remove("show");
});
boot();
