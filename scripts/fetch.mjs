#!/usr/bin/env node
// AI Radar 数据抓取器 —— 零依赖，Node 18+。由 GitHub Actions 每 3 小时执行一次。
// 输出：data/data.json（资讯流 + 真实数据 + 风口探针）
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = resolve(ROOT, "data", "data.json");
const TIMEOUT = 20000;

const FEEDS = [
  { id: "qbitai",     name: "量子位",          lang: "zh", url: "https://www.qbitai.com/feed" },
  { id: "ithome",     name: "IT之家",          lang: "zh", url: "https://www.ithome.com/rss/" },
  { id: "sspai",      name: "少数派",          lang: "zh", url: "https://sspai.com/feed" },
  { id: "ifanr",      name: "爱范儿",          lang: "zh", url: "https://www.ifanr.com/feed" },
  { id: "leiphone",   name: "雷锋网",          lang: "zh", url: "https://www.leiphone.com/feed" },
  { id: "geekpark",   name: "极客公园",        lang: "zh", url: "https://www.geekpark.net/rss" },
  { id: "36kr",       name: "36氪",            lang: "zh", url: "https://rsshub.rssforever.com/36kr/newsflashes" },
  { id: "hn",         name: "Hacker News",    lang: "en", url: "https://hnrss.org/frontpage" },
  { id: "techcrunch", name: "TechCrunch AI",  lang: "en", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { id: "openai",     name: "OpenAI",         lang: "en", url: "https://openai.com/blog/rss.xml" },
  { id: "hf",         name: "HuggingFace",    lang: "en", url: "https://huggingface.co/blog/feed.xml" },
  { id: "googleai",   name: "Google AI",      lang: "en", url: "https://blog.google/technology/ai/rss/" }
];

const KEYWORDS = [
  "GPT","Claude","Gemini","Llama","DeepSeek","Qwen","Grok","OpenAI","Anthropic","英伟达","NVIDIA",
  "Agent","智能体","多模态","大模型","开源","融资","投资","芯片","算力","GPU","推理","训练",
  "微调","RAG","视频生成","图像生成","语音","机器人","具身智能","AI编程","Copilot","自动驾驶",
  "医疗","教育","Agentic","API","创业","商业化","降本","产品","发布"
];

const FUNDING_WORDS = ["融资","投资","领投","估值","funding","raises","raised","series","valuation","ipo"];

function decode(s) {
  if (!s) return "";
  let t = String(s);
  t = t.split("<![CDATA[").join("").split("]]>").join("");
  let out = "", i = 0;
  while (i < t.length) {
    const lt = t.indexOf("<", i);
    if (lt < 0) { out += t.slice(i); break; }
    out += t.slice(i, lt);
    const gt = t.indexOf(">", lt);
    if (gt < 0) break;
    i = gt + 1;
  }
  t = out;
  t = t.split("&lt;").join("<").split("&gt;").join(">")
       .split("&quot;").join('"').split("&#39;").join("'")
       .split("&apos;").join("'").split("&nbsp;").join(" ")
       .split("&amp;").join("&");
  t = t.split("\n").join(" ").split("\r").join(" ").split("\t").join(" ");
  while (t.indexOf("  ") >= 0) t = t.split("  ").join(" ");
  return t.trim();
}

function extractAll(xml, tagName) {
  const open = "<" + tagName;
  const close = "</" + tagName + ">";
  const out = [];
  let i = 0;
  while (true) {
    const s = xml.indexOf(open, i);
    if (s < 0) break;
    const gt = xml.indexOf(">", s);
    if (gt < 0) break;
    const e = xml.indexOf(close, gt);
    if (e < 0) break;
    out.push(xml.slice(gt + 1, e));
    i = e + close.length;
  }
  return out;
}

function child(block, name) {
  const open = "<" + name;
  const close = "</" + name + ">";
  const s = block.indexOf(open);
  if (s < 0) return "";
  const gt = block.indexOf(">", s);
  if (gt < 0) return "";
  const e = block.indexOf(close, gt);
  if (e < 0) return "";
  return block.slice(gt + 1, e);
}

function linkOf(block) {
  const s = block.indexOf("<link");
  if (s >= 0) {
    const gt = block.indexOf(">", s);
    if (gt >= 0) {
      const seg = block.slice(s, gt + 1);
      const h = seg.indexOf("href=");
      if (h >= 0) {
        const q1 = seg.indexOf('"', h);
        const q2 = seg.indexOf('"', q1 + 1);
        if (q1 >= 0 && q2 > q1) return seg.slice(q1 + 1, q2);
      }
    }
  }
  const l = child(block, "link");
  if (l) return decode(l);
  const g = child(block, "guid");
  return g ? decode(g) : "";
}

function parseFeed(xml, feed) {
  const blocks = extractAll(xml, "item").concat(extractAll(xml, "entry"));
  const items = [];
  for (const b of blocks) {
    const title = decode(child(b, "title"));
    if (!title) continue;
    const url = linkOf(b);
    const raw = decode(child(b, "pubDate")) || decode(child(b, "published")) ||
                decode(child(b, "updated")) || decode(child(b, "dc:date"));
    const ts = raw ? Date.parse(raw) : NaN;
    items.push({
      title: title.slice(0, 220),
      url: url,
      source: feed.name,
      sourceId: feed.id,
      lang: feed.lang,
      publishedAt: isNaN(ts) ? null : new Date(ts).toISOString()
    });
  }
  return items;
}

async function get(url, headers) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { headers: headers || { "user-agent": "Mozilla/5.0 (ai-radar)" }, signal: ctrl.signal });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text: text };
  } catch (e) {
    return { ok: false, status: 0, text: "", error: String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

function countKeywords(titles) {
  const map = {};
  for (const kw of KEYWORDS) {
    let c = 0;
    const low = kw.toLowerCase();
    for (const t of titles) {
      const tl = t.toLowerCase();
      let idx = 0;
      while (true) {
        const p = tl.indexOf(low, idx);
        if (p < 0) break;
        c++;
        idx = p + low.length;
      }
    }
    if (c > 0) map[kw] = c;
  }
  return map;
}

const OPP_RULES = [
  { type: "新工具上线", icon: "🛠", words: ["发布","上线","推出","launch","launches","released","release","introducing","now available","rolls out"], action: "第一时间做图文教程 / 录屏测评，抢首发流量（这类人少、涨粉快）" },
  { type: "开源项目",   icon: "🐙", words: ["开源","open source","open-source","github"], action: "做上手教程、代部署，或二次封装成小工具卖给不会折腾的人" },
  { type: "资本动向",   icon: "💰", words: ["融资","投资","领投","估值","funding","raises","raised","series","valuation","ipo"], action: "判断风口方向，写「这笔钱为什么投这里」的解读，建立专业感" },
  { type: "新模型",     icon: "🧠", words: ["gpt-","claude","gemini","llama","deepseek","qwen","grok","模型","model"], action: "做横向对比测评、使用技巧、避坑指南，最适合学生视角" },
  { type: "成本下降",   icon: "🆓", words: ["免费","降价","免费开放","free ","pricing","cheaper","price cut","降价"], action: "做「薅羊毛攻略 / 白嫖指南」，这类内容收藏率极高、极易传播" },
  { type: "商业落地",   icon: "🏢", words: ["商业化","落地","企业","客户","营收","采用","adoption","enterprise","customer"], action: "写行业应用拆解，对口 B 端人群，适合接高价代做" },
  { type: "政策监管",   icon: "⚖️", words: ["监管","政策","合规","法案","regulation","policy","lawsuit","诉讼","版权"], action: "蹭热点做解读，但观点要稳，不要碰灰色地带" }
];

function detectOpp(title) {
  const t = (title || "").toLowerCase();
  for (const r of OPP_RULES) {
    for (const w of r.words) {
      if (t.indexOf(w.toLowerCase()) >= 0) return r;
    }
  }
  return null;
}

const AI_SOURCES = ["量子位", "雷锋网", "TechCrunch AI", "OpenAI", "Google AI", "HuggingFace"];
const AI_HINTS = ["人工智能","大模型","gpt","claude","gemini","llama","deepseek","qwen","grok","agent","智能体","机器学习","神经网络","生成式","aigc","openai","anthropic","copilot","多模态","算力","gpu","英伟达","nvidia","模型","芯片"];

function isAIRelated(it) {
  if (AI_SOURCES.indexOf(it.source) >= 0) return true;
  const t = (it.title || "").toLowerCase();
  const parts = t.split(/[^a-z0-9]+/);
  for (const p of parts) { if (p === "ai") return true; }
  for (const h of AI_HINTS) { if (t.indexOf(h.toLowerCase()) >= 0) return true; }
  return false;
}

function buildOpportunities(items) {
  const out = [];
  const perType = {};
  const DIGEST_WORDS = ["早报", "日报", "晚报", "周报", "盘点", "汇总", "速览", "一览", "briefing"];
  const OPP_SKIP_SOURCES = ["arXiv cs.AI"];
  for (const it of items) {
    if (OPP_SKIP_SOURCES.indexOf(it.source) >= 0) continue;
    if (!isAIRelated(it)) continue;
    const tl = (it.title || "").toLowerCase();
    let isDigest = false;
    for (const d of DIGEST_WORDS) { if (tl.indexOf(d) >= 0) { isDigest = true; break; } }
    if (isDigest) continue;
    const r = detectOpp(it.title);
    if (!r) continue;
    perType[r.type] = (perType[r.type] || 0) + 1;
    if (perType[r.type] > 3) continue;
    out.push({ type: r.type, icon: r.icon, action: r.action, title: it.title, url: it.url, source: it.source, publishedAt: it.publishedAt });
    if (out.length >= 15) break;
  }
  return out;
}

const TOOL_WORDS = ["gpt","claude","gemini","llama","deepseek","qwen","grok","agent","agentic","rag","copilot","多模态","视频生成","图像生成","ai编程","智能体","开源","sora","midjourney"];
const TOOL_TPL = [
  "用 AI 10 分钟搞定（X），大学生亲测",
  "（X）值不值得用？我替你先试了",
  "手把手教你用（X），零基础也能上手",
  "（X）怎么免费用？这份攻略请收好",
  "大学生必看：（X）的 5 个隐藏用法"
];
const TREND_TPL = [
  "（X）最新动向，对大学生意味着什么？",
  "（X）这波热度，普通人能怎么蹭？",
  "我研究了（X），总结了 3 个能用上的点",
  "（X）火了，现在入场还来得及吗？"
];
const SKIP_WORDS = ["api","发布","产品","训练","推理","投资","创业","商业化","教育","医疗","降本","芯片","英伟达"];

function buildIdeas(keywords) {
  const ideas = [];
  let ti = 0, ri = 0;
  for (const k of keywords.slice(0, 18)) {
    const w = k.word;
    if (!w || w.length < 2) continue;
    if (SKIP_WORDS.indexOf(w.toLowerCase()) >= 0) continue;
    let tpl;
    if (TOOL_WORDS.indexOf(w.toLowerCase()) >= 0) { tpl = TOOL_TPL[ti % TOOL_TPL.length]; ti++; }
    else { tpl = TREND_TPL[ri % TREND_TPL.length]; ri++; }
    ideas.push({ kw: w, title: tpl.split("（X）").join(w) });
    if (ideas.length >= 8) break;
  }
  return ideas;
}

function buildDigest(news, keywords, signals, opps, dateStr) {
  const lines = [];
  lines.push("# AI 变现雷达简报 · " + dateStr);
  lines.push("");
  lines.push("## 一、今日信号");
  for (const s of signals) lines.push("- " + s.text);
  lines.push("");
  lines.push("## 二、变现机会（可直接行动）");
  for (const o of opps.slice(0, 8)) lines.push("- [" + o.type + "] " + o.title + "\n  👉 " + o.action + "\n  出处：" + o.source);
  lines.push("");
  lines.push("## 三、热度关键词");
  lines.push(keywords.slice(0, 12).map(function (k) { return k.word + " (" + k.count + ")"; }).join(" · "));
  lines.push("");
  lines.push("## 四、头条速览");
  for (const n of news.slice(0, 10)) lines.push("- " + n.title + "（" + n.source + "）");
  return lines.join("\n");
}

async function translate(text) {
  const u = "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(text) + "&langpair=en|zh-CN";
  const r = await get(u, { "user-agent": "Mozilla/5.0 (ai-radar)" });
  if (!r.ok || !r.text) return null;
  try {
    const j = JSON.parse(r.text);
    const t = j && j.responseData && j.responseData.translatedText;
    if (!t) return null;
    if (t.toLowerCase() === text.toLowerCase()) return null;
    if (t.indexOf("QUERY LENGTH") >= 0 || t.indexOf("MYMEMORY WARNING") >= 0) return null;
    return t;
  } catch (e) { return null; }
}

async function main() {
  const now = Date.now();

  let prevData = null;
  try { prevData = JSON.parse(await readFile(OUT, "utf8")); } catch (e) {}

  const sourceStatus = [];
  const news = [];
  for (const feed of FEEDS) {
    let r = await get(feed.url);
    let n = 0;
    if (r.ok && r.text) {
      const items = parseFeed(r.text, feed);
      n = items.length;
      for (const it of items) news.push(it);
    }
    if (n === 0) {
      await new Promise(function (res) { setTimeout(res, 900); });
      const r2 = await get(feed.url);
      if (r2.ok && r2.text) {
        const items2 = parseFeed(r2.text, feed);
        if (items2.length > 0) {
          n = items2.length;
          for (const it of items2) news.push(it);
          r = r2;
        }
      }
    }
    sourceStatus.push({ id: feed.id, name: feed.name, ok: r.ok && n > 0, count: n, error: r.error || null });
  }

  const seen = {};
  const dedup = [];
  for (const it of news) {
    const key = (it.title || "").toLowerCase();
    if (!key || seen[key]) continue;
    seen[key] = 1;
    dedup.push(it);
  }
  dedup.sort(function (a, b) {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  const finalNews = dedup.slice(0, 200);
  for (const it of finalNews) { it.ai = isAIRelated(it); }

  // 英文标题自动翻译为中文（带缓存 + 限流，避免超出免费额度）
  const trCache = {};
  if (prevData && prevData.news) {
    for (const n of prevData.news) { if (n.titleZh) trCache[n.title] = n.titleZh; }
  }
  let trBudget = 55;
  for (const it of finalNews) {
    if (it.lang !== "en" || !it.title) continue;
    if (trCache[it.title]) { it.titleZh = trCache[it.title]; continue; }
    if (trBudget <= 0) continue;
    const zh = await translate(it.title);
    trBudget--;
    if (zh) it.titleZh = zh;
    await new Promise(function (r) { setTimeout(r, 120); });
  }

  const since = new Date(now - 14 * 86400000).toISOString().slice(0, 10);
  const ghUrl = "https://api.github.com/search/repositories?q=" +
    encodeURIComponent("topic:artificial-intelligence created:>" + since) +
    "&sort=stars&order=desc&per_page=12";
  const gh = await get(ghUrl, { "user-agent": "ai-radar", "accept": "application/vnd.github+json" });
  let github = [];
  try {
    const j = JSON.parse(gh.text);
    if (j && j.items) {
      github = j.items.map(function (x) {
        return {
          name: x.full_name,
          url: x.html_url,
          stars: x.stargazers_count,
          desc: (x.description || "").slice(0, 160),
          lang: x.language || "",
          createdAt: x.created_at
        };
      });
    }
  } catch (e) {}

  const hf = await get("https://huggingface.co/api/models?sort=trendingScore&limit=12", { "user-agent": "ai-radar" });
  let hfModels = [];
  try {
    const j = JSON.parse(hf.text);
    if (Array.isArray(j)) {
      hfModels = j.map(function (m) {
        return {
          id: m.id || m.modelId,
          url: "https://huggingface.co/" + (m.id || m.modelId),
          likes: m.likes || 0,
          downloads: m.downloads || 0,
          task: m.pipeline_tag || ""
        };
      });
    }
  } catch (e) {}

  const recent = finalNews.filter(function (x) {
    return x.publishedAt && (now - Date.parse(x.publishedAt)) < 48 * 3600000;
  });
  const base = recent.length > 0 ? recent : finalNews.slice(0, 60);
  const counts = countKeywords(base.map(function (x) { return x.title; }));

  let prevCounts = {};
  let prevAt = null;
  if (prevData) {
    if (prevData.probe && prevData.probe.keywords) {
      for (const k of prevData.probe.keywords) prevCounts[k.word] = k.count;
    }
    prevAt = prevData.generatedAt || null;
  }

  const keywords = Object.keys(counts).map(function (w) {
    const c = counts[w];
    const p = prevCounts[w] || 0;
    return { word: w, count: c, delta: c - p };
  }).sort(function (a, b) { return b.count - a.count; }).slice(0, 22);

  const signals = [];
  const rising = keywords.filter(function (k) { return k.delta > 0; })
    .sort(function (a, b) { return b.delta - a.delta; }).slice(0, 3);
  for (const r of rising) signals.push({ type: "up", text: "「" + r.word + "」热度上升 +" + r.delta + "（当前 " + r.count + " 次提及）" });
  const fundCount = finalNews.filter(function (x) {
    const t = x.title.toLowerCase();
    for (const w of FUNDING_WORDS) { if (t.indexOf(w.toLowerCase()) >= 0) return true; }
    return false;
  }).length;
  if (fundCount > 0) signals.push({ type: "money", text: "检测到 " + fundCount + " 条融资 / 资本相关资讯，注意风口与钱的方向" });
  if (github.length > 0) signals.push({ type: "code", text: "GitHub 近 14 天新增 " + github.length + " 个高星 AI 项目，可从中找工具与选题" });
  if (signals.length === 0) signals.push({ type: "info", text: "本期无明显异动，维持既定路线即可" });

  const opportunities = buildOpportunities(finalNews);
  const ideas = buildIdeas(keywords);
  const digest = buildDigest(finalNews, keywords, signals, opportunities, new Date(now).toISOString().slice(0, 10));

  const okCount = sourceStatus.filter(function (s) { return s.ok; }).length;

  const out = {
    generatedAt: new Date(now).toISOString(),
    previousAt: prevAt,
    stats: {
      sourcesTotal: FEEDS.length,
      sourcesOk: okCount,
      articleCount: finalNews.length,
      recent48h: recent.length,
      githubCount: github.length,
      hfCount: hfModels.length,
      aiCount: finalNews.filter(function (x) { return x.ai; }).length
    },
    sources: sourceStatus,
    news: finalNews,
    data: { github: github, huggingface: hfModels },
    probe: { windowHours: 48, keywords: keywords, signals: signals, fundingCount: fundCount },
    opportunities: opportunities,
    ideas: ideas,
    digest: digest
  };

  await mkdir(resolve(ROOT, "data"), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2), "utf8");
  await writeFile(resolve(ROOT, "data", "data.js"),
    "window.__RADAR_DATA__ = " + JSON.stringify(out) + ";\n", "utf8");
  console.log("sources ok: " + okCount + "/" + FEEDS.length +
    " | news: " + finalNews.length +
    " | github: " + github.length +
    " | hf: " + hfModels.length);
  for (const s of sourceStatus) {
    console.log((s.ok ? "  OK  " : " FAIL ") + s.name + " (" + s.count + ")" + (s.error ? " " + s.error : ""));
  }
}

main().catch(function (e) { console.error("FATAL", e); process.exit(1); });
