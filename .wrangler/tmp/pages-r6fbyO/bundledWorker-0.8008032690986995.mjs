var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-IlVgAJ/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// _worker.js
var Et = Object.defineProperty;
var Le = /* @__PURE__ */ __name((e) => {
  throw TypeError(e);
}, "Le");
var Rt = /* @__PURE__ */ __name((e, t, r) => t in e ? Et(e, t, { enumerable: true, configurable: true, writable: true, value: r }) : e[t] = r, "Rt");
var p = /* @__PURE__ */ __name((e, t, r) => Rt(e, typeof t != "symbol" ? t + "" : t, r), "p");
var Pe = /* @__PURE__ */ __name((e, t, r) => t.has(e) || Le("Cannot " + r), "Pe");
var o = /* @__PURE__ */ __name((e, t, r) => (Pe(e, t, "read from private field"), r ? r.call(e) : t.get(e)), "o");
var g = /* @__PURE__ */ __name((e, t, r) => t.has(e) ? Le("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), "g");
var d = /* @__PURE__ */ __name((e, t, r, s) => (Pe(e, t, "write to private field"), s ? s.call(e, r) : t.set(e, r), r), "d");
var y = /* @__PURE__ */ __name((e, t, r) => (Pe(e, t, "access private method"), r), "y");
var $e = /* @__PURE__ */ __name((e, t, r, s) => ({ set _(n) {
  d(e, t, n, r);
}, get _() {
  return o(e, t, s);
} }), "$e");
var Me = /* @__PURE__ */ __name((e, t, r) => (s, n) => {
  let i = -1;
  return a(0);
  async function a(l) {
    if (l <= i) throw new Error("next() called multiple times");
    i = l;
    let c, h = false, u;
    if (e[l] ? (u = e[l][0][0], s.req.routeIndex = l) : u = l === e.length && n || void 0, u) try {
      c = await u(s, () => a(l + 1));
    } catch (f) {
      if (f instanceof Error && t) s.error = f, c = await t(f, s), h = true;
      else throw f;
    }
    else s.finalized === false && r && (c = await r(s));
    return c && (s.finalized === false || h) && (s.res = c), s;
  }
  __name(a, "a");
}, "Me");
var bt = Symbol();
var xt = /* @__PURE__ */ __name(async (e, t = /* @__PURE__ */ Object.create(null)) => {
  const { all: r = false, dot: s = false } = t, i = (e instanceof nt ? e.raw.headers : e.headers).get("Content-Type");
  return i != null && i.startsWith("multipart/form-data") || i != null && i.startsWith("application/x-www-form-urlencoded") ? _t(e, { all: r, dot: s }) : {};
}, "xt");
async function _t(e, t) {
  const r = await e.formData();
  return r ? St(r, t) : {};
}
__name(_t, "_t");
function St(e, t) {
  const r = /* @__PURE__ */ Object.create(null);
  return e.forEach((s, n) => {
    t.all || n.endsWith("[]") ? Ot(r, n, s) : r[n] = s;
  }), t.dot && Object.entries(r).forEach(([s, n]) => {
    s.includes(".") && (At(r, s, n), delete r[s]);
  }), r;
}
__name(St, "St");
var Ot = /* @__PURE__ */ __name((e, t, r) => {
  e[t] !== void 0 ? Array.isArray(e[t]) ? e[t].push(r) : e[t] = [e[t], r] : t.endsWith("[]") ? e[t] = [r] : e[t] = r;
}, "Ot");
var At = /* @__PURE__ */ __name((e, t, r) => {
  let s = e;
  const n = t.split(".");
  n.forEach((i, a) => {
    a === n.length - 1 ? s[i] = r : ((!s[i] || typeof s[i] != "object" || Array.isArray(s[i]) || s[i] instanceof File) && (s[i] = /* @__PURE__ */ Object.create(null)), s = s[i]);
  });
}, "At");
var Ze = /* @__PURE__ */ __name((e) => {
  const t = e.split("/");
  return t[0] === "" && t.shift(), t;
}, "Ze");
var jt = /* @__PURE__ */ __name((e) => {
  const { groups: t, path: r } = It(e), s = Ze(r);
  return Pt(s, t);
}, "jt");
var It = /* @__PURE__ */ __name((e) => {
  const t = [];
  return e = e.replace(/\{[^}]+\}/g, (r, s) => {
    const n = `@${s}`;
    return t.push([n, r]), n;
  }), { groups: t, path: e };
}, "It");
var Pt = /* @__PURE__ */ __name((e, t) => {
  for (let r = t.length - 1; r >= 0; r--) {
    const [s] = t[r];
    for (let n = e.length - 1; n >= 0; n--) if (e[n].includes(s)) {
      e[n] = e[n].replace(s, t[r][1]);
      break;
    }
  }
  return e;
}, "Pt");
var be = {};
var Tt = /* @__PURE__ */ __name((e, t) => {
  if (e === "*") return "*";
  const r = e.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (r) {
    const s = `${e}#${t}`;
    return be[s] || (r[2] ? be[s] = t && t[0] !== ":" && t[0] !== "*" ? [s, r[1], new RegExp(`^${r[2]}(?=/${t})`)] : [e, r[1], new RegExp(`^${r[2]}$`)] : be[s] = [e, r[1], true]), be[s];
  }
  return null;
}, "Tt");
var ke = /* @__PURE__ */ __name((e, t) => {
  try {
    return t(e);
  } catch {
    return e.replace(/(?:%[0-9A-Fa-f]{2})+/g, (r) => {
      try {
        return t(r);
      } catch {
        return r;
      }
    });
  }
}, "ke");
var Ct = /* @__PURE__ */ __name((e) => ke(e, decodeURI), "Ct");
var et = /* @__PURE__ */ __name((e) => {
  const t = e.url, r = t.indexOf("/", t.indexOf(":") + 4);
  let s = r;
  for (; s < t.length; s++) {
    const n = t.charCodeAt(s);
    if (n === 37) {
      const i = t.indexOf("?", s), a = t.slice(r, i === -1 ? void 0 : i);
      return Ct(a.includes("%25") ? a.replace(/%25/g, "%2525") : a);
    } else if (n === 63) break;
  }
  return t.slice(r, s);
}, "et");
var Dt = /* @__PURE__ */ __name((e) => {
  const t = et(e);
  return t.length > 1 && t.at(-1) === "/" ? t.slice(0, -1) : t;
}, "Dt");
var re = /* @__PURE__ */ __name((e, t, ...r) => (r.length && (t = re(t, ...r)), `${(e == null ? void 0 : e[0]) === "/" ? "" : "/"}${e}${t === "/" ? "" : `${(e == null ? void 0 : e.at(-1)) === "/" ? "" : "/"}${(t == null ? void 0 : t[0]) === "/" ? t.slice(1) : t}`}`), "re");
var tt = /* @__PURE__ */ __name((e) => {
  if (e.charCodeAt(e.length - 1) !== 63 || !e.includes(":")) return null;
  const t = e.split("/"), r = [];
  let s = "";
  return t.forEach((n) => {
    if (n !== "" && !/\:/.test(n)) s += "/" + n;
    else if (/\:/.test(n)) if (/\?/.test(n)) {
      r.length === 0 && s === "" ? r.push("/") : r.push(s);
      const i = n.replace("?", "");
      s += "/" + i, r.push(s);
    } else s += "/" + n;
  }), r.filter((n, i, a) => a.indexOf(n) === i);
}, "tt");
var Te = /* @__PURE__ */ __name((e) => /[%+]/.test(e) ? (e.indexOf("+") !== -1 && (e = e.replace(/\+/g, " ")), e.indexOf("%") !== -1 ? ke(e, st) : e) : e, "Te");
var rt = /* @__PURE__ */ __name((e, t, r) => {
  let s;
  if (!r && t && !/[%+]/.test(t)) {
    let a = e.indexOf(`?${t}`, 8);
    for (a === -1 && (a = e.indexOf(`&${t}`, 8)); a !== -1; ) {
      const l = e.charCodeAt(a + t.length + 1);
      if (l === 61) {
        const c = a + t.length + 2, h = e.indexOf("&", c);
        return Te(e.slice(c, h === -1 ? void 0 : h));
      } else if (l == 38 || isNaN(l)) return "";
      a = e.indexOf(`&${t}`, a + 1);
    }
    if (s = /[%+]/.test(e), !s) return;
  }
  const n = {};
  s ?? (s = /[%+]/.test(e));
  let i = e.indexOf("?", 8);
  for (; i !== -1; ) {
    const a = e.indexOf("&", i + 1);
    let l = e.indexOf("=", i);
    l > a && a !== -1 && (l = -1);
    let c = e.slice(i + 1, l === -1 ? a === -1 ? void 0 : a : l);
    if (s && (c = Te(c)), i = a, c === "") continue;
    let h;
    l === -1 ? h = "" : (h = e.slice(l + 1, a === -1 ? void 0 : a), s && (h = Te(h))), r ? (n[c] && Array.isArray(n[c]) || (n[c] = []), n[c].push(h)) : n[c] ?? (n[c] = h);
  }
  return t ? n[t] : n;
}, "rt");
var Ht = rt;
var kt = /* @__PURE__ */ __name((e, t) => rt(e, t, true), "kt");
var st = decodeURIComponent;
var qe = /* @__PURE__ */ __name((e) => ke(e, st), "qe");
var ie;
var j;
var M;
var it;
var at;
var De;
var F;
var ze;
var nt = (ze = class {
  static {
    __name(this, "ze");
  }
  constructor(e, t = "/", r = [[]]) {
    g(this, M);
    p(this, "raw");
    g(this, ie);
    g(this, j);
    p(this, "routeIndex", 0);
    p(this, "path");
    p(this, "bodyCache", {});
    g(this, F, (e2) => {
      const { bodyCache: t2, raw: r2 } = this, s = t2[e2];
      if (s) return s;
      const n = Object.keys(t2)[0];
      return n ? t2[n].then((i) => (n === "json" && (i = JSON.stringify(i)), new Response(i)[e2]())) : t2[e2] = r2[e2]();
    });
    this.raw = e, this.path = t, d(this, j, r), d(this, ie, {});
  }
  param(e) {
    return e ? y(this, M, it).call(this, e) : y(this, M, at).call(this);
  }
  query(e) {
    return Ht(this.url, e);
  }
  queries(e) {
    return kt(this.url, e);
  }
  header(e) {
    if (e) return this.raw.headers.get(e) ?? void 0;
    const t = {};
    return this.raw.headers.forEach((r, s) => {
      t[s] = r;
    }), t;
  }
  async parseBody(e) {
    var t;
    return (t = this.bodyCache).parsedBody ?? (t.parsedBody = await xt(this, e));
  }
  json() {
    return o(this, F).call(this, "text").then((e) => JSON.parse(e));
  }
  text() {
    return o(this, F).call(this, "text");
  }
  arrayBuffer() {
    return o(this, F).call(this, "arrayBuffer");
  }
  blob() {
    return o(this, F).call(this, "blob");
  }
  formData() {
    return o(this, F).call(this, "formData");
  }
  addValidatedData(e, t) {
    o(this, ie)[e] = t;
  }
  valid(e) {
    return o(this, ie)[e];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [bt]() {
    return o(this, j);
  }
  get matchedRoutes() {
    return o(this, j)[0].map(([[, e]]) => e);
  }
  get routePath() {
    return o(this, j)[0].map(([[, e]]) => e)[this.routeIndex].path;
  }
}, ie = /* @__PURE__ */ new WeakMap(), j = /* @__PURE__ */ new WeakMap(), M = /* @__PURE__ */ new WeakSet(), it = /* @__PURE__ */ __name(function(e) {
  const t = o(this, j)[0][this.routeIndex][1][e], r = y(this, M, De).call(this, t);
  return r ? /\%/.test(r) ? qe(r) : r : void 0;
}, "it"), at = /* @__PURE__ */ __name(function() {
  const e = {}, t = Object.keys(o(this, j)[0][this.routeIndex][1]);
  for (const r of t) {
    const s = y(this, M, De).call(this, o(this, j)[0][this.routeIndex][1][r]);
    s && typeof s == "string" && (e[r] = /\%/.test(s) ? qe(s) : s);
  }
  return e;
}, "at"), De = /* @__PURE__ */ __name(function(e) {
  return o(this, j)[1] ? o(this, j)[1][e] : e;
}, "De"), F = /* @__PURE__ */ new WeakMap(), ze);
var Nt = { Stringify: 1 };
var ot = /* @__PURE__ */ __name(async (e, t, r, s, n) => {
  typeof e == "object" && !(e instanceof String) && (e instanceof Promise || (e = e.toString()), e instanceof Promise && (e = await e));
  const i = e.callbacks;
  return i != null && i.length ? (n ? n[0] += e : n = [e], Promise.all(i.map((l) => l({ phase: t, buffer: n, context: s }))).then((l) => Promise.all(l.filter(Boolean).map((c) => ot(c, t, false, s, n))).then(() => n[0]))) : Promise.resolve(e);
}, "ot");
var Lt = "text/plain; charset=UTF-8";
var Ce = /* @__PURE__ */ __name((e, t) => ({ "Content-Type": e, ...t }), "Ce");
var me;
var ye;
var k;
var ae;
var N;
var _;
var we;
var oe;
var ce;
var J;
var ve;
var Ee;
var B;
var se;
var We;
var $t = (We = class {
  static {
    __name(this, "We");
  }
  constructor(e, t) {
    g(this, B);
    g(this, me);
    g(this, ye);
    p(this, "env", {});
    g(this, k);
    p(this, "finalized", false);
    p(this, "error");
    g(this, ae);
    g(this, N);
    g(this, _);
    g(this, we);
    g(this, oe);
    g(this, ce);
    g(this, J);
    g(this, ve);
    g(this, Ee);
    p(this, "render", (...e2) => (o(this, oe) ?? d(this, oe, (t2) => this.html(t2)), o(this, oe).call(this, ...e2)));
    p(this, "setLayout", (e2) => d(this, we, e2));
    p(this, "getLayout", () => o(this, we));
    p(this, "setRenderer", (e2) => {
      d(this, oe, e2);
    });
    p(this, "header", (e2, t2, r) => {
      this.finalized && d(this, _, new Response(o(this, _).body, o(this, _)));
      const s = o(this, _) ? o(this, _).headers : o(this, J) ?? d(this, J, new Headers());
      t2 === void 0 ? s.delete(e2) : r != null && r.append ? s.append(e2, t2) : s.set(e2, t2);
    });
    p(this, "status", (e2) => {
      d(this, ae, e2);
    });
    p(this, "set", (e2, t2) => {
      o(this, k) ?? d(this, k, /* @__PURE__ */ new Map()), o(this, k).set(e2, t2);
    });
    p(this, "get", (e2) => o(this, k) ? o(this, k).get(e2) : void 0);
    p(this, "newResponse", (...e2) => y(this, B, se).call(this, ...e2));
    p(this, "body", (e2, t2, r) => y(this, B, se).call(this, e2, t2, r));
    p(this, "text", (e2, t2, r) => !o(this, J) && !o(this, ae) && !t2 && !r && !this.finalized ? new Response(e2) : y(this, B, se).call(this, e2, t2, Ce(Lt, r)));
    p(this, "json", (e2, t2, r) => y(this, B, se).call(this, JSON.stringify(e2), t2, Ce("application/json", r)));
    p(this, "html", (e2, t2, r) => {
      const s = /* @__PURE__ */ __name((n) => y(this, B, se).call(this, n, t2, Ce("text/html; charset=UTF-8", r)), "s");
      return typeof e2 == "object" ? ot(e2, Nt.Stringify, false, {}).then(s) : s(e2);
    });
    p(this, "redirect", (e2, t2) => {
      const r = String(e2);
      return this.header("Location", /[^\x00-\xFF]/.test(r) ? encodeURI(r) : r), this.newResponse(null, t2 ?? 302);
    });
    p(this, "notFound", () => (o(this, ce) ?? d(this, ce, () => new Response()), o(this, ce).call(this, this)));
    d(this, me, e), t && (d(this, N, t.executionCtx), this.env = t.env, d(this, ce, t.notFoundHandler), d(this, Ee, t.path), d(this, ve, t.matchResult));
  }
  get req() {
    return o(this, ye) ?? d(this, ye, new nt(o(this, me), o(this, Ee), o(this, ve))), o(this, ye);
  }
  get event() {
    if (o(this, N) && "respondWith" in o(this, N)) return o(this, N);
    throw Error("This context has no FetchEvent");
  }
  get executionCtx() {
    if (o(this, N)) return o(this, N);
    throw Error("This context has no ExecutionContext");
  }
  get res() {
    return o(this, _) || d(this, _, new Response(null, { headers: o(this, J) ?? d(this, J, new Headers()) }));
  }
  set res(e) {
    if (o(this, _) && e) {
      e = new Response(e.body, e);
      for (const [t, r] of o(this, _).headers.entries()) if (t !== "content-type") if (t === "set-cookie") {
        const s = o(this, _).headers.getSetCookie();
        e.headers.delete("set-cookie");
        for (const n of s) e.headers.append("set-cookie", n);
      } else e.headers.set(t, r);
    }
    d(this, _, e), this.finalized = true;
  }
  get var() {
    return o(this, k) ? Object.fromEntries(o(this, k)) : {};
  }
}, me = /* @__PURE__ */ new WeakMap(), ye = /* @__PURE__ */ new WeakMap(), k = /* @__PURE__ */ new WeakMap(), ae = /* @__PURE__ */ new WeakMap(), N = /* @__PURE__ */ new WeakMap(), _ = /* @__PURE__ */ new WeakMap(), we = /* @__PURE__ */ new WeakMap(), oe = /* @__PURE__ */ new WeakMap(), ce = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakMap(), ve = /* @__PURE__ */ new WeakMap(), Ee = /* @__PURE__ */ new WeakMap(), B = /* @__PURE__ */ new WeakSet(), se = /* @__PURE__ */ __name(function(e, t, r) {
  const s = o(this, _) ? new Headers(o(this, _).headers) : o(this, J) ?? new Headers();
  if (typeof t == "object" && "headers" in t) {
    const i = t.headers instanceof Headers ? t.headers : new Headers(t.headers);
    for (const [a, l] of i) a.toLowerCase() === "set-cookie" ? s.append(a, l) : s.set(a, l);
  }
  if (r) for (const [i, a] of Object.entries(r)) if (typeof a == "string") s.set(i, a);
  else {
    s.delete(i);
    for (const l of a) s.append(i, l);
  }
  const n = typeof t == "number" ? t : (t == null ? void 0 : t.status) ?? o(this, ae);
  return new Response(e, { status: n, headers: s });
}, "se"), We);
var v = "ALL";
var Mt = "all";
var qt = ["get", "post", "put", "delete", "options", "patch"];
var ct = "Can not add a route since the matcher is already built.";
var lt = class extends Error {
  static {
    __name(this, "lt");
  }
};
var Ft = "__COMPOSED_HANDLER";
var Bt = /* @__PURE__ */ __name((e) => e.text("404 Not Found", 404), "Bt");
var Fe = /* @__PURE__ */ __name((e, t) => {
  if ("getResponse" in e) {
    const r = e.getResponse();
    return t.newResponse(r.body, r);
  }
  return console.error(e), t.text("Internal Server Error", 500);
}, "Fe");
var I;
var E;
var ut;
var P;
var K;
var xe;
var _e;
var Ve;
var ht = (Ve = class {
  static {
    __name(this, "Ve");
  }
  constructor(t = {}) {
    g(this, E);
    p(this, "get");
    p(this, "post");
    p(this, "put");
    p(this, "delete");
    p(this, "options");
    p(this, "patch");
    p(this, "all");
    p(this, "on");
    p(this, "use");
    p(this, "router");
    p(this, "getPath");
    p(this, "_basePath", "/");
    g(this, I, "/");
    p(this, "routes", []);
    g(this, P, Bt);
    p(this, "errorHandler", Fe);
    p(this, "onError", (t2) => (this.errorHandler = t2, this));
    p(this, "notFound", (t2) => (d(this, P, t2), this));
    p(this, "fetch", (t2, ...r) => y(this, E, _e).call(this, t2, r[1], r[0], t2.method));
    p(this, "request", (t2, r, s2, n2) => t2 instanceof Request ? this.fetch(r ? new Request(t2, r) : t2, s2, n2) : (t2 = t2.toString(), this.fetch(new Request(/^https?:\/\//.test(t2) ? t2 : `http://localhost${re("/", t2)}`, r), s2, n2)));
    p(this, "fire", () => {
      addEventListener("fetch", (t2) => {
        t2.respondWith(y(this, E, _e).call(this, t2.request, t2, void 0, t2.request.method));
      });
    });
    [...qt, Mt].forEach((i) => {
      this[i] = (a, ...l) => (typeof a == "string" ? d(this, I, a) : y(this, E, K).call(this, i, o(this, I), a), l.forEach((c) => {
        y(this, E, K).call(this, i, o(this, I), c);
      }), this);
    }), this.on = (i, a, ...l) => {
      for (const c of [a].flat()) {
        d(this, I, c);
        for (const h of [i].flat()) l.map((u) => {
          y(this, E, K).call(this, h.toUpperCase(), o(this, I), u);
        });
      }
      return this;
    }, this.use = (i, ...a) => (typeof i == "string" ? d(this, I, i) : (d(this, I, "*"), a.unshift(i)), a.forEach((l) => {
      y(this, E, K).call(this, v, o(this, I), l);
    }), this);
    const { strict: s, ...n } = t;
    Object.assign(this, n), this.getPath = s ?? true ? t.getPath ?? et : Dt;
  }
  route(t, r) {
    const s = this.basePath(t);
    return r.routes.map((n) => {
      var a;
      let i;
      r.errorHandler === Fe ? i = n.handler : (i = /* @__PURE__ */ __name(async (l, c) => (await Me([], r.errorHandler)(l, () => n.handler(l, c))).res, "i"), i[Ft] = n.handler), y(a = s, E, K).call(a, n.method, n.path, i);
    }), this;
  }
  basePath(t) {
    const r = y(this, E, ut).call(this);
    return r._basePath = re(this._basePath, t), r;
  }
  mount(t, r, s) {
    let n, i;
    s && (typeof s == "function" ? i = s : (i = s.optionHandler, s.replaceRequest === false ? n = /* @__PURE__ */ __name((c) => c, "n") : n = s.replaceRequest));
    const a = i ? (c) => {
      const h = i(c);
      return Array.isArray(h) ? h : [h];
    } : (c) => {
      let h;
      try {
        h = c.executionCtx;
      } catch {
      }
      return [c.env, h];
    };
    n || (n = (() => {
      const c = re(this._basePath, t), h = c === "/" ? 0 : c.length;
      return (u) => {
        const f = new URL(u.url);
        return f.pathname = f.pathname.slice(h) || "/", new Request(f, u);
      };
    })());
    const l = /* @__PURE__ */ __name(async (c, h) => {
      const u = await r(n(c.req.raw), ...a(c));
      if (u) return u;
      await h();
    }, "l");
    return y(this, E, K).call(this, v, re(t, "*"), l), this;
  }
}, I = /* @__PURE__ */ new WeakMap(), E = /* @__PURE__ */ new WeakSet(), ut = /* @__PURE__ */ __name(function() {
  const t = new ht({ router: this.router, getPath: this.getPath });
  return t.errorHandler = this.errorHandler, d(t, P, o(this, P)), t.routes = this.routes, t;
}, "ut"), P = /* @__PURE__ */ new WeakMap(), K = /* @__PURE__ */ __name(function(t, r, s) {
  t = t.toUpperCase(), r = re(this._basePath, r);
  const n = { basePath: this._basePath, path: r, method: t, handler: s };
  this.router.add(t, r, [s, n]), this.routes.push(n);
}, "K"), xe = /* @__PURE__ */ __name(function(t, r) {
  if (t instanceof Error) return this.errorHandler(t, r);
  throw t;
}, "xe"), _e = /* @__PURE__ */ __name(function(t, r, s, n) {
  if (n === "HEAD") return (async () => new Response(null, await y(this, E, _e).call(this, t, r, s, "GET")))();
  const i = this.getPath(t, { env: s }), a = this.router.match(n, i), l = new $t(t, { path: i, matchResult: a, env: s, executionCtx: r, notFoundHandler: o(this, P) });
  if (a[0].length === 1) {
    let h;
    try {
      h = a[0][0][0][0](l, async () => {
        l.res = await o(this, P).call(this, l);
      });
    } catch (u) {
      return y(this, E, xe).call(this, u, l);
    }
    return h instanceof Promise ? h.then((u) => u || (l.finalized ? l.res : o(this, P).call(this, l))).catch((u) => y(this, E, xe).call(this, u, l)) : h ?? o(this, P).call(this, l);
  }
  const c = Me(a[0], this.errorHandler, o(this, P));
  return (async () => {
    try {
      const h = await c(l);
      if (!h.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
      return h.res;
    } catch (h) {
      return y(this, E, xe).call(this, h, l);
    }
  })();
}, "_e"), Ve);
var Oe = "[^/]+";
var pe = ".*";
var ge = "(?:|/.*)";
var ne = Symbol();
var Ut = new Set(".\\+*[^]$()");
function zt(e, t) {
  return e.length === 1 ? t.length === 1 ? e < t ? -1 : 1 : -1 : t.length === 1 || e === pe || e === ge ? 1 : t === pe || t === ge ? -1 : e === Oe ? 1 : t === Oe ? -1 : e.length === t.length ? e < t ? -1 : 1 : t.length - e.length;
}
__name(zt, "zt");
var Y;
var X;
var T;
var Ke;
var He = (Ke = class {
  static {
    __name(this, "Ke");
  }
  constructor() {
    g(this, Y);
    g(this, X);
    g(this, T, /* @__PURE__ */ Object.create(null));
  }
  insert(t, r, s, n, i) {
    if (t.length === 0) {
      if (o(this, Y) !== void 0) throw ne;
      if (i) return;
      d(this, Y, r);
      return;
    }
    const [a, ...l] = t, c = a === "*" ? l.length === 0 ? ["", "", pe] : ["", "", Oe] : a === "/*" ? ["", "", ge] : a.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let h;
    if (c) {
      const u = c[1];
      let f = c[2] || Oe;
      if (u && c[2] && (f === ".*" || (f = f.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(f)))) throw ne;
      if (h = o(this, T)[f], !h) {
        if (Object.keys(o(this, T)).some((m) => m !== pe && m !== ge)) throw ne;
        if (i) return;
        h = o(this, T)[f] = new He(), u !== "" && d(h, X, n.varIndex++);
      }
      !i && u !== "" && s.push([u, o(h, X)]);
    } else if (h = o(this, T)[a], !h) {
      if (Object.keys(o(this, T)).some((u) => u.length > 1 && u !== pe && u !== ge)) throw ne;
      if (i) return;
      h = o(this, T)[a] = new He();
    }
    h.insert(l, r, s, n, i);
  }
  buildRegExpStr() {
    const r = Object.keys(o(this, T)).sort(zt).map((s) => {
      const n = o(this, T)[s];
      return (typeof o(n, X) == "number" ? `(${s})@${o(n, X)}` : Ut.has(s) ? `\\${s}` : s) + n.buildRegExpStr();
    });
    return typeof o(this, Y) == "number" && r.unshift(`#${o(this, Y)}`), r.length === 0 ? "" : r.length === 1 ? r[0] : "(?:" + r.join("|") + ")";
  }
}, Y = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakMap(), Ke);
var Ae;
var Re;
var Ge;
var Wt = (Ge = class {
  static {
    __name(this, "Ge");
  }
  constructor() {
    g(this, Ae, { varIndex: 0 });
    g(this, Re, new He());
  }
  insert(e, t, r) {
    const s = [], n = [];
    for (let a = 0; ; ) {
      let l = false;
      if (e = e.replace(/\{[^}]+\}/g, (c) => {
        const h = `@\\${a}`;
        return n[a] = [h, c], a++, l = true, h;
      }), !l) break;
    }
    const i = e.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let a = n.length - 1; a >= 0; a--) {
      const [l] = n[a];
      for (let c = i.length - 1; c >= 0; c--) if (i[c].indexOf(l) !== -1) {
        i[c] = i[c].replace(l, n[a][1]);
        break;
      }
    }
    return o(this, Re).insert(i, t, s, o(this, Ae), r), s;
  }
  buildRegExp() {
    let e = o(this, Re).buildRegExpStr();
    if (e === "") return [/^$/, [], []];
    let t = 0;
    const r = [], s = [];
    return e = e.replace(/#(\d+)|@(\d+)|\.\*\$/g, (n, i, a) => i !== void 0 ? (r[++t] = Number(i), "$()") : (a !== void 0 && (s[Number(a)] = ++t), "")), [new RegExp(`^${e}`), r, s];
  }
}, Ae = /* @__PURE__ */ new WeakMap(), Re = /* @__PURE__ */ new WeakMap(), Ge);
var dt = [];
var Vt = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var Se = /* @__PURE__ */ Object.create(null);
function ft(e) {
  return Se[e] ?? (Se[e] = new RegExp(e === "*" ? "" : `^${e.replace(/\/\*$|([.\\+*[^\]$()])/g, (t, r) => r ? `\\${r}` : "(?:|/.*)")}$`));
}
__name(ft, "ft");
function Kt() {
  Se = /* @__PURE__ */ Object.create(null);
}
__name(Kt, "Kt");
function Gt(e) {
  var h;
  const t = new Wt(), r = [];
  if (e.length === 0) return Vt;
  const s = e.map((u) => [!/\*|\/:/.test(u[0]), ...u]).sort(([u, f], [m, b]) => u ? 1 : m ? -1 : f.length - b.length), n = /* @__PURE__ */ Object.create(null);
  for (let u = 0, f = -1, m = s.length; u < m; u++) {
    const [b, C, w] = s[u];
    b ? n[C] = [w.map(([A]) => [A, /* @__PURE__ */ Object.create(null)]), dt] : f++;
    let O;
    try {
      O = t.insert(C, f, b);
    } catch (A) {
      throw A === ne ? new lt(C) : A;
    }
    b || (r[f] = w.map(([A, ee]) => {
      const ue = /* @__PURE__ */ Object.create(null);
      for (ee -= 1; ee >= 0; ee--) {
        const [D, je] = O[ee];
        ue[D] = je;
      }
      return [A, ue];
    }));
  }
  const [i, a, l] = t.buildRegExp();
  for (let u = 0, f = r.length; u < f; u++) for (let m = 0, b = r[u].length; m < b; m++) {
    const C = (h = r[u][m]) == null ? void 0 : h[1];
    if (!C) continue;
    const w = Object.keys(C);
    for (let O = 0, A = w.length; O < A; O++) C[w[O]] = l[C[w[O]]];
  }
  const c = [];
  for (const u in a) c[u] = r[a[u]];
  return [i, c, n];
}
__name(Gt, "Gt");
function te(e, t) {
  if (e) {
    for (const r of Object.keys(e).sort((s, n) => n.length - s.length)) if (ft(r).test(t)) return [...e[r]];
  }
}
__name(te, "te");
var U;
var z;
var he;
var pt;
var gt;
var Je;
var Jt = (Je = class {
  static {
    __name(this, "Je");
  }
  constructor() {
    g(this, he);
    p(this, "name", "RegExpRouter");
    g(this, U);
    g(this, z);
    d(this, U, { [v]: /* @__PURE__ */ Object.create(null) }), d(this, z, { [v]: /* @__PURE__ */ Object.create(null) });
  }
  add(e, t, r) {
    var l;
    const s = o(this, U), n = o(this, z);
    if (!s || !n) throw new Error(ct);
    s[e] || [s, n].forEach((c) => {
      c[e] = /* @__PURE__ */ Object.create(null), Object.keys(c[v]).forEach((h) => {
        c[e][h] = [...c[v][h]];
      });
    }), t === "/*" && (t = "*");
    const i = (t.match(/\/:/g) || []).length;
    if (/\*$/.test(t)) {
      const c = ft(t);
      e === v ? Object.keys(s).forEach((h) => {
        var u;
        (u = s[h])[t] || (u[t] = te(s[h], t) || te(s[v], t) || []);
      }) : (l = s[e])[t] || (l[t] = te(s[e], t) || te(s[v], t) || []), Object.keys(s).forEach((h) => {
        (e === v || e === h) && Object.keys(s[h]).forEach((u) => {
          c.test(u) && s[h][u].push([r, i]);
        });
      }), Object.keys(n).forEach((h) => {
        (e === v || e === h) && Object.keys(n[h]).forEach((u) => c.test(u) && n[h][u].push([r, i]));
      });
      return;
    }
    const a = tt(t) || [t];
    for (let c = 0, h = a.length; c < h; c++) {
      const u = a[c];
      Object.keys(n).forEach((f) => {
        var m;
        (e === v || e === f) && ((m = n[f])[u] || (m[u] = [...te(s[f], u) || te(s[v], u) || []]), n[f][u].push([r, i - h + c + 1]));
      });
    }
  }
  match(e, t) {
    Kt();
    const r = y(this, he, pt).call(this);
    return this.match = (s, n) => {
      const i = r[s] || r[v], a = i[2][n];
      if (a) return a;
      const l = n.match(i[0]);
      if (!l) return [[], dt];
      const c = l.indexOf("", 1);
      return [i[1][c], l];
    }, this.match(e, t);
  }
}, U = /* @__PURE__ */ new WeakMap(), z = /* @__PURE__ */ new WeakMap(), he = /* @__PURE__ */ new WeakSet(), pt = /* @__PURE__ */ __name(function() {
  const e = /* @__PURE__ */ Object.create(null);
  return Object.keys(o(this, z)).concat(Object.keys(o(this, U))).forEach((t) => {
    e[t] || (e[t] = y(this, he, gt).call(this, t));
  }), d(this, U, d(this, z, void 0)), e;
}, "pt"), gt = /* @__PURE__ */ __name(function(e) {
  const t = [];
  let r = e === v;
  return [o(this, U), o(this, z)].forEach((s) => {
    const n = s[e] ? Object.keys(s[e]).map((i) => [i, s[e][i]]) : [];
    n.length !== 0 ? (r || (r = true), t.push(...n)) : e !== v && t.push(...Object.keys(s[v]).map((i) => [i, s[v][i]]));
  }), r ? Gt(t) : null;
}, "gt"), Je);
var W;
var L;
var Ye;
var Yt = (Ye = class {
  static {
    __name(this, "Ye");
  }
  constructor(e) {
    p(this, "name", "SmartRouter");
    g(this, W, []);
    g(this, L, []);
    d(this, W, e.routers);
  }
  add(e, t, r) {
    if (!o(this, L)) throw new Error(ct);
    o(this, L).push([e, t, r]);
  }
  match(e, t) {
    if (!o(this, L)) throw new Error("Fatal error");
    const r = o(this, W), s = o(this, L), n = r.length;
    let i = 0, a;
    for (; i < n; i++) {
      const l = r[i];
      try {
        for (let c = 0, h = s.length; c < h; c++) l.add(...s[c]);
        a = l.match(e, t);
      } catch (c) {
        if (c instanceof lt) continue;
        throw c;
      }
      this.match = l.match.bind(l), d(this, W, [l]), d(this, L, void 0);
      break;
    }
    if (i === n) throw new Error("Fatal error");
    return this.name = `SmartRouter + ${this.activeRouter.name}`, a;
  }
  get activeRouter() {
    if (o(this, L) || o(this, W).length !== 1) throw new Error("No active router has been determined yet.");
    return o(this, W)[0];
  }
}, W = /* @__PURE__ */ new WeakMap(), L = /* @__PURE__ */ new WeakMap(), Ye);
var fe = /* @__PURE__ */ Object.create(null);
var V;
var x;
var Q;
var le;
var R;
var $;
var G;
var Xe;
var mt = (Xe = class {
  static {
    __name(this, "Xe");
  }
  constructor(e, t, r) {
    g(this, $);
    g(this, V);
    g(this, x);
    g(this, Q);
    g(this, le, 0);
    g(this, R, fe);
    if (d(this, x, r || /* @__PURE__ */ Object.create(null)), d(this, V, []), e && t) {
      const s = /* @__PURE__ */ Object.create(null);
      s[e] = { handler: t, possibleKeys: [], score: 0 }, d(this, V, [s]);
    }
    d(this, Q, []);
  }
  insert(e, t, r) {
    d(this, le, ++$e(this, le)._);
    let s = this;
    const n = jt(t), i = [];
    for (let a = 0, l = n.length; a < l; a++) {
      const c = n[a], h = n[a + 1], u = Tt(c, h), f = Array.isArray(u) ? u[0] : c;
      if (f in o(s, x)) {
        s = o(s, x)[f], u && i.push(u[1]);
        continue;
      }
      o(s, x)[f] = new mt(), u && (o(s, Q).push(u), i.push(u[1])), s = o(s, x)[f];
    }
    return o(s, V).push({ [e]: { handler: r, possibleKeys: i.filter((a, l, c) => c.indexOf(a) === l), score: o(this, le) } }), s;
  }
  search(e, t) {
    var l;
    const r = [];
    d(this, R, fe);
    let n = [this];
    const i = Ze(t), a = [];
    for (let c = 0, h = i.length; c < h; c++) {
      const u = i[c], f = c === h - 1, m = [];
      for (let b = 0, C = n.length; b < C; b++) {
        const w = n[b], O = o(w, x)[u];
        O && (d(O, R, o(w, R)), f ? (o(O, x)["*"] && r.push(...y(this, $, G).call(this, o(O, x)["*"], e, o(w, R))), r.push(...y(this, $, G).call(this, O, e, o(w, R)))) : m.push(O));
        for (let A = 0, ee = o(w, Q).length; A < ee; A++) {
          const ue = o(w, Q)[A], D = o(w, R) === fe ? {} : { ...o(w, R) };
          if (ue === "*") {
            const q = o(w, x)["*"];
            q && (r.push(...y(this, $, G).call(this, q, e, o(w, R))), d(q, R, D), m.push(q));
            continue;
          }
          const [je, Ne, de] = ue;
          if (!u && !(de instanceof RegExp)) continue;
          const H = o(w, x)[je], vt = i.slice(c).join("/");
          if (de instanceof RegExp) {
            const q = de.exec(vt);
            if (q) {
              if (D[Ne] = q[0], r.push(...y(this, $, G).call(this, H, e, o(w, R), D)), Object.keys(o(H, x)).length) {
                d(H, R, D);
                const Ie = ((l = q[0].match(/\//)) == null ? void 0 : l.length) ?? 0;
                (a[Ie] || (a[Ie] = [])).push(H);
              }
              continue;
            }
          }
          (de === true || de.test(u)) && (D[Ne] = u, f ? (r.push(...y(this, $, G).call(this, H, e, D, o(w, R))), o(H, x)["*"] && r.push(...y(this, $, G).call(this, o(H, x)["*"], e, D, o(w, R)))) : (d(H, R, D), m.push(H)));
        }
      }
      n = m.concat(a.shift() ?? []);
    }
    return r.length > 1 && r.sort((c, h) => c.score - h.score), [r.map(({ handler: c, params: h }) => [c, h])];
  }
}, V = /* @__PURE__ */ new WeakMap(), x = /* @__PURE__ */ new WeakMap(), Q = /* @__PURE__ */ new WeakMap(), le = /* @__PURE__ */ new WeakMap(), R = /* @__PURE__ */ new WeakMap(), $ = /* @__PURE__ */ new WeakSet(), G = /* @__PURE__ */ __name(function(e, t, r, s) {
  const n = [];
  for (let i = 0, a = o(e, V).length; i < a; i++) {
    const l = o(e, V)[i], c = l[t] || l[v], h = {};
    if (c !== void 0 && (c.params = /* @__PURE__ */ Object.create(null), n.push(c), r !== fe || s && s !== fe)) for (let u = 0, f = c.possibleKeys.length; u < f; u++) {
      const m = c.possibleKeys[u], b = h[c.score];
      c.params[m] = s != null && s[m] && !b ? s[m] : r[m] ?? (s == null ? void 0 : s[m]), h[c.score] = true;
    }
  }
  return n;
}, "G"), Xe);
var Z;
var Qe;
var Xt = (Qe = class {
  static {
    __name(this, "Qe");
  }
  constructor() {
    p(this, "name", "TrieRouter");
    g(this, Z);
    d(this, Z, new mt());
  }
  add(e, t, r) {
    const s = tt(t);
    if (s) {
      for (let n = 0, i = s.length; n < i; n++) o(this, Z).insert(e, s[n], r);
      return;
    }
    o(this, Z).insert(e, t, r);
  }
  match(e, t) {
    return o(this, Z).search(e, t);
  }
}, Z = /* @__PURE__ */ new WeakMap(), Qe);
var yt = class extends ht {
  static {
    __name(this, "yt");
  }
  constructor(e = {}) {
    super(e), this.router = e.router ?? new Yt({ routers: [new Jt(), new Xt()] });
  }
};
var Qt = /* @__PURE__ */ __name((e) => {
  const r = { ...{ origin: "*", allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"], allowHeaders: [], exposeHeaders: [] }, ...e }, s = /* @__PURE__ */ ((i) => typeof i == "string" ? i === "*" ? () => i : (a) => i === a ? a : null : typeof i == "function" ? i : (a) => i.includes(a) ? a : null)(r.origin), n = ((i) => typeof i == "function" ? i : Array.isArray(i) ? () => i : () => [])(r.allowMethods);
  return async function(a, l) {
    var u;
    function c(f, m) {
      a.res.headers.set(f, m);
    }
    __name(c, "c");
    const h = await s(a.req.header("origin") || "", a);
    if (h && c("Access-Control-Allow-Origin", h), r.origin !== "*") {
      const f = a.req.header("Vary");
      f ? c("Vary", f) : c("Vary", "Origin");
    }
    if (r.credentials && c("Access-Control-Allow-Credentials", "true"), (u = r.exposeHeaders) != null && u.length && c("Access-Control-Expose-Headers", r.exposeHeaders.join(",")), a.req.method === "OPTIONS") {
      r.maxAge != null && c("Access-Control-Max-Age", r.maxAge.toString());
      const f = await n(a.req.header("origin") || "", a);
      f.length && c("Access-Control-Allow-Methods", f.join(","));
      let m = r.allowHeaders;
      if (!(m != null && m.length)) {
        const b = a.req.header("Access-Control-Request-Headers");
        b && (m = b.split(/\s*,\s*/));
      }
      return m != null && m.length && (c("Access-Control-Allow-Headers", m.join(",")), a.res.headers.append("Vary", "Access-Control-Request-Headers")), a.res.headers.delete("Content-Length"), a.res.headers.delete("Content-Type"), new Response(null, { headers: a.res.headers, status: 204, statusText: "No Content" });
    }
    await l();
  };
}, "Qt");
var Zt = /* @__PURE__ */ __name(() => async (e) => {
  const r = await e.env.ASSETS.fetch(e.req.raw);
  return r.status === 404 ? e.notFound() : r;
}, "Zt");
var S = new yt();
S.use("/api/*", Qt());
S.use("/static/*", Zt());
S.get("/api/health", (e) => e.json({ status: "healthy", service: "SafeAging Home API" }));
S.post("/api/analyze-room", async (e) => {
  const { env: t } = e, r = await e.req.formData(), s = r.get("image"), n = r.get("roomType"), i = r.get("userId") || "1";
  if (!s) return e.json({ error: "No image provided" }, 400);
  try {
    const a = `assessments/${i}/${Date.now()}-${n}.jpg`, l = er(n), c = tr(l), h = await t.DB.prepare(`
      INSERT INTO assessments (user_id, room_type, image_url, hazards_detected, risk_score, ai_analysis, status)
      VALUES (?, ?, ?, ?, ?, ?, 'analyzed')
    `).bind(i, n, a, JSON.stringify(l), c, JSON.stringify({ hazards: l, recommendations: Be(l) })).run();
    return e.json({ assessmentId: h.meta.last_row_id, roomType: n, hazards: l, riskScore: c, recommendations: Be(l), imageUrl: a });
  } catch (a) {
    return console.error("Analysis error:", a), e.json({ error: "Failed to analyze image" }, 500);
  }
});
S.get("/api/assessments/:userId", async (e) => {
  const { env: t } = e, r = e.req.param("userId"), s = await t.DB.prepare(`
    SELECT * FROM assessments 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).bind(r).all();
  return e.json({ assessments: s.results });
});
S.post("/api/generate-plan", async (e) => {
  const { env: t } = e, { userId: r, assessmentIds: s } = await e.req.json(), n = await t.DB.prepare(`
    SELECT * FROM assessments 
    WHERE user_id = ? AND id IN (${s.join(",")})
  `).bind(r).all(), i = rr(n.results);
  for (const a of i) await t.DB.prepare(`
      INSERT INTO safety_plans (user_id, phase, title, tasks, progress, status)
      VALUES (?, ?, ?, ?, 0, 'active')
    `).bind(r, a.phase, a.title, JSON.stringify(a.tasks)).run();
  return e.json({ plans: i });
});
S.get("/api/plans/:userId", async (e) => {
  const { env: t } = e, r = e.req.param("userId"), s = await t.DB.prepare(`
    SELECT * FROM safety_plans 
    WHERE user_id = ? 
    ORDER BY phase ASC
  `).bind(r).all();
  return e.json({ plans: s.results });
});
S.patch("/api/plans/:planId/progress", async (e) => {
  const { env: t } = e, r = e.req.param("planId"), { progress: s } = await e.req.json();
  return await t.DB.prepare(`
    UPDATE safety_plans 
    SET progress = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(s, r).run(), e.json({ success: true });
});
S.get("/api/equipment/:planId", async (e) => {
  const { env: t } = e;
  e.req.param("planId");
  const r = sr();
  return e.json({ equipment: r });
});
S.post("/api/appointments", async (e) => {
  const { env: t } = e, r = await e.req.json(), s = await t.DB.prepare(`
    INSERT INTO appointments (user_id, assessment_id, scheduled_at, type, status, notes)
    VALUES (?, ?, ?, ?, 'scheduled', ?)
  `).bind(r.userId, r.assessmentId, r.scheduledAt, r.type || "video", r.notes).run();
  return await t.DB.prepare(`
    INSERT INTO alerts (user_id, type, severity, title, message)
    VALUES (?, 'appointment', 'medium', 'PT/OT Assessment Scheduled', ?)
  `).bind(r.userId, `Your ${r.type} assessment is scheduled for ${r.scheduledAt}`).run(), e.json({ appointmentId: s.meta.last_row_id, success: true });
});
S.get("/api/alerts/:userId", async (e) => {
  const { env: t } = e, r = e.req.param("userId"), s = await t.DB.prepare(`
    SELECT * FROM alerts 
    WHERE user_id = ? AND is_read = FALSE 
    ORDER BY created_at DESC 
    LIMIT 10
  `).bind(r).all();
  return e.json({ alerts: s.results });
});
S.patch("/api/alerts/:alertId/read", async (e) => {
  const { env: t } = e, r = e.req.param("alertId");
  return await t.DB.prepare(`
    UPDATE alerts SET is_read = TRUE WHERE id = ?
  `).bind(r).run(), e.json({ success: true });
});
S.post("/api/caregivers", async (e) => {
  const { env: t } = e, { seniorId: r, caregiverEmail: s, relationship: n, alertPreferences: i } = await e.req.json();
  let a = await t.DB.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(s).first();
  return a || (a = { id: (await t.DB.prepare(`
      INSERT INTO users (email, name, role) VALUES (?, ?, 'caregiver')
    `).bind(s, s.split("@")[0]).run()).meta.last_row_id }), await t.DB.prepare(`
    INSERT INTO caregivers (senior_id, caregiver_id, relationship, alert_preferences)
    VALUES (?, ?, ?, ?)
  `).bind(r, a.id, n, JSON.stringify(i)).run(), e.json({ success: true, caregiverId: a.id });
});
function er(e) {
  return { bathroom: [{ type: "slippery_surface", location: "floor", severity: "high", confidence: 0.85 }, { type: "missing_grab_bar", location: "shower", severity: "high", confidence: 0.92 }, { type: "poor_lighting", location: "overall", severity: "medium", confidence: 0.78 }], bedroom: [{ type: "cluttered_pathway", location: "floor", severity: "medium", confidence: 0.81 }, { type: "loose_rug", location: "bedside", severity: "high", confidence: 0.88 }, { type: "inadequate_lighting", location: "nightstand", severity: "medium", confidence: 0.75 }], stairs: [{ type: "missing_handrail", location: "left_side", severity: "critical", confidence: 0.95 }, { type: "uneven_steps", location: "middle", severity: "high", confidence: 0.83 }, { type: "poor_visibility", location: "bottom", severity: "high", confidence: 0.87 }], kitchen: [{ type: "items_out_of_reach", location: "upper_cabinets", severity: "medium", confidence: 0.79 }, { type: "slippery_floor", location: "sink_area", severity: "medium", confidence: 0.76 }, { type: "sharp_corners", location: "counter", severity: "low", confidence: 0.72 }], living_room: [{ type: "trip_hazard", location: "cables", severity: "medium", confidence: 0.84 }, { type: "unstable_furniture", location: "coffee_table", severity: "low", confidence: 0.71 }, { type: "poor_lighting", location: "reading_area", severity: "low", confidence: 0.73 }] }[e] || [];
}
__name(er, "er");
function tr(e) {
  const t = { critical: 10, high: 7, medium: 4, low: 2 };
  if (e.length === 0) return 1;
  const r = e.reduce((s, n) => s + (t[n.severity] || 0) * n.confidence, 0);
  return Math.min(10, Math.round(r / e.length));
}
__name(tr, "tr");
function Be(e) {
  const t = { slippery_surface: "Install non-slip mats or apply anti-slip coating", missing_grab_bar: "Install grab bars for support", poor_lighting: "Add brighter LED lights or motion-activated lighting", cluttered_pathway: "Clear walkways and organize items", loose_rug: "Secure rug with non-slip backing or remove", inadequate_lighting: "Add nightlights or bedside lamps", missing_handrail: "Install sturdy handrails on both sides", uneven_steps: "Mark step edges with high-contrast tape", items_out_of_reach: "Reorganize frequently used items to lower shelves", trip_hazard: "Secure cables with cord covers or reroute", unstable_furniture: "Secure or replace unstable furniture", sharp_corners: "Add corner guards or padding" };
  return e.map((r) => ({ hazard: r.type, recommendation: t[r.type] || "Consult with PT/OT for specific recommendations", priority: r.severity }));
}
__name(Be, "Be");
function rr(e) {
  return e.flatMap((t) => JSON.parse(t.hazards_detected || "[]")), [{ phase: 1, title: "Essential Safety Modifications", tasks: [{ task: "Install grab bars in bathroom", completed: false, priority: "high" }, { task: "Add non-slip mats in wet areas", completed: false, priority: "high" }, { task: "Clear walkways of clutter", completed: false, priority: "medium" }, { task: "Improve lighting in dark areas", completed: false, priority: "medium" }, { task: "Secure loose rugs", completed: false, priority: "high" }] }, { phase: 2, title: "Smart Technology & Monitoring", tasks: [{ task: "Install motion-activated lighting", completed: false, priority: "medium" }, { task: "Set up medical alert system", completed: false, priority: "high" }, { task: "Add smart door sensors", completed: false, priority: "low" }, { task: "Install fall detection devices", completed: false, priority: "high" }] }, { phase: 3, title: "Ongoing Support & Optimization", tasks: [{ task: "Set up regular PT/OT check-ins", completed: false, priority: "medium" }, { task: "Join local senior exercise program", completed: false, priority: "low" }, { task: "Establish caregiver communication system", completed: false, priority: "medium" }, { task: "Review and update safety plan quarterly", completed: false, priority: "medium" }] }];
}
__name(rr, "rr");
function sr(e) {
  return [{ name: "Adjustable Grab Bar Set", category: "grab_bar", description: "Suction-cup grab bars for bathroom safety", price: 49.99, link: "https://example.com/grab-bars", priority: "essential" }, { name: "Motion Sensor Night Lights (4-pack)", category: "lighting", description: "Automatic LED lights for hallways and bathrooms", price: 29.99, link: "https://example.com/night-lights", priority: "recommended" }, { name: "Medical Alert System with Fall Detection", category: "medical_alert", description: "24/7 monitoring with automatic fall detection", price: 39.99, link: "https://example.com/medical-alert", priority: "essential" }, { name: "Non-Slip Bath Mat", category: "bathroom", description: "Extra-long anti-slip mat with suction cups", price: 24.99, link: "https://example.com/bath-mat", priority: "essential" }];
}
__name(sr, "sr");
S.get("/", (e) => e.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SafeAging Home - AI-Powered Home Safety Assessment</title>
        <script src="https://cdn.tailwindcss.com"><\/script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"><\/script>
        <script src="/static/app.js"><\/script>
    </body>
    </html>
  `));
var Ue = new yt();
var nr = Object.assign({ "/src/index.tsx": S });
var wt = false;
for (const [, e] of Object.entries(nr)) e && (Ue.all("*", (t) => {
  let r;
  try {
    r = t.executionCtx;
  } catch {
  }
  return e.fetch(t.req.raw, t.env, r);
}), Ue.notFound((t) => {
  let r;
  try {
    r = t.executionCtx;
  } catch {
  }
  return e.fetch(t.req.raw, t.env, r);
}), wt = true);
if (!wt) throw new Error("Can't import modules from ['/src/index.ts','/src/index.tsx','/app/server.ts']");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-IlVgAJ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = Ue;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-IlVgAJ/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=bundledWorker-0.8008032690986995.mjs.map
