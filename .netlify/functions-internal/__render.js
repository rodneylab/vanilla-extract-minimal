var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __require = typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require3() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/.pnpm/@sveltejs+kit@1.0.0-next.166_svelte@3.42.5/node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* read(parts) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else {
      yield part;
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    if (isBlob(value)) {
      length += value.size;
    } else {
      length += Buffer.byteLength(String(value));
    }
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = body.stream();
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const err = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(err);
        throw err;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    if (error2 instanceof FetchBaseError) {
      throw error2;
    } else {
      throw new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error2.message}`, "system", error2);
    }
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index2, array) => {
    if (index2 % 2 === 0) {
      result.push(array.slice(index2, index2 + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data = dataUriToBuffer$1(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options2.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (err) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, "system", err));
      finalize();
    });
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              try {
                headers.set("Location", locationURL);
              } catch (error2) {
                reject(error2);
              }
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
        }
      }
      response_.once("end", () => {
        if (signal) {
          signal.removeEventListener("abort", abortAndFinalize);
        }
      });
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error2) => {
        reject(error2);
      });
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), (error2) => {
          reject(error2);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error2) => {
          reject(error2);
        });
        raw.once("data", (chunk) => {
          if ((chunk[0] & 15) === 8) {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), (error2) => {
              reject(error2);
            });
          } else {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), (error2) => {
              reject(error2);
            });
          }
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), (error2) => {
          reject(error2);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, src, dataUriToBuffer$1, Readable, wm, Blob, fetchBlob, Blob$1, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/.pnpm/@sveltejs+kit@1.0.0-next.166_svelte@3.42.5/node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    src = dataUriToBuffer;
    dataUriToBuffer$1 = src;
    ({ Readable } = import_stream.default);
    wm = new WeakMap();
    Blob = class {
      constructor(blobParts = [], options2 = {}) {
        let size = 0;
        const parts = blobParts.map((element) => {
          let buffer;
          if (element instanceof Buffer) {
            buffer = element;
          } else if (ArrayBuffer.isView(element)) {
            buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
          } else if (element instanceof ArrayBuffer) {
            buffer = Buffer.from(element);
          } else if (element instanceof Blob) {
            buffer = element;
          } else {
            buffer = Buffer.from(typeof element === "string" ? element : String(element));
          }
          size += buffer.length || buffer.size || 0;
          return buffer;
        });
        const type = options2.type === void 0 ? "" : String(options2.type).toLowerCase();
        wm.set(this, {
          type: /[^\u0020-\u007E]/.test(type) ? "" : type,
          size,
          parts
        });
      }
      get size() {
        return wm.get(this).size;
      }
      get type() {
        return wm.get(this).type;
      }
      async text() {
        return Buffer.from(await this.arrayBuffer()).toString();
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of this.stream()) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        return Readable.from(read(wm.get(this).parts));
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = wm.get(this).parts.values();
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            const chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
            blobParts.push(chunk);
            added += ArrayBuffer.isView(chunk) ? chunk.byteLength : chunk.size;
            relativeStart = 0;
            if (added >= span) {
              break;
            }
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        Object.assign(wm.get(blob), { size: span, parts: blobParts });
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.stream === "function" && object.stream.length === 0 && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    fetchBlob = Blob;
    Blob$1 = fetchBlob;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && object[NAME] === "AbortSignal";
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (err) => {
            const error2 = err instanceof FetchBaseError ? err : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${err.message}`, "system", err);
            this[INTERNALS$2].error = error2;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new Blob$1([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        body.stream().pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const err = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw err;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const err = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_CHAR" });
        throw err;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback) {
        for (const name of this.keys()) {
          callback(this.get(name), name);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status || 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal !== null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/.pnpm/@sveltejs+adapter-netlify@1.0.0-next.30/node_modules/@sveltejs/adapter-netlify/files/shims.js
var init_shims = __esm({
  "node_modules/.pnpm/@sveltejs+adapter-netlify@1.0.0-next.30/node_modules/@sveltejs/adapter-netlify/files/shims.js"() {
    init_install_fetch();
  }
});

// node_modules/.pnpm/dedent@0.7.0/node_modules/dedent/dist/dedent.js
var require_dedent = __commonJS({
  "node_modules/.pnpm/dedent@0.7.0/node_modules/dedent/dist/dedent.js"(exports, module2) {
    init_shims();
    "use strict";
    function dedent(strings) {
      var raw = void 0;
      if (typeof strings === "string") {
        raw = [strings];
      } else {
        raw = strings.raw;
      }
      var result = "";
      for (var i = 0; i < raw.length; i++) {
        result += raw[i].replace(/\\\n[ \t]*/g, "").replace(/\\`/g, "`");
        if (i < (arguments.length <= 1 ? 0 : arguments.length - 1)) {
          result += arguments.length <= i + 1 ? void 0 : arguments[i + 1];
        }
      }
      var lines = result.split("\n");
      var mindent = null;
      lines.forEach(function(l) {
        var m = l.match(/^(\s+)\S+/);
        if (m) {
          var indent = m[1].length;
          if (!mindent) {
            mindent = indent;
          } else {
            mindent = Math.min(mindent, indent);
          }
        }
      });
      if (mindent !== null) {
        result = lines.map(function(l) {
          return l[0] === " " ? l.slice(mindent) : l;
        }).join("\n");
      }
      result = result.trim();
      return result.replace(/\\n/g, "\n");
    }
    if (typeof module2 !== "undefined") {
      module2.exports = dedent;
    }
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/adapter/dist/vanilla-extract-css-adapter.cjs.prod.js
var require_vanilla_extract_css_adapter_cjs_prod = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/adapter/dist/vanilla-extract-css-adapter.cjs.prod.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var mockAdapter = {
      appendCss: () => {
      },
      registerClassName: () => {
      },
      onEndFileScope: () => {
      },
      registerComposition: () => {
      },
      markCompositionUsed: () => {
      },
      getIdentOption: () => "debug"
    };
    var adapterStack = [mockAdapter];
    var currentAdapter = () => {
      if (adapterStack.length < 1) {
        throw new Error("No adapter configured");
      }
      return adapterStack[adapterStack.length - 1];
    };
    var hasConfiguredAdapter = false;
    var setAdapterIfNotSet = (newAdapter) => {
      if (!hasConfiguredAdapter) {
        setAdapter(newAdapter);
      }
    };
    var setAdapter = (newAdapter) => {
      hasConfiguredAdapter = true;
      adapterStack.push(newAdapter);
    };
    var removeAdapter = () => {
      adapterStack.pop();
    };
    var appendCss = (...props) => {
      return currentAdapter().appendCss(...props);
    };
    var registerClassName = (...props) => {
      return currentAdapter().registerClassName(...props);
    };
    var registerComposition = (...props) => {
      return currentAdapter().registerComposition(...props);
    };
    var markCompositionUsed = (...props) => {
      return currentAdapter().markCompositionUsed(...props);
    };
    var onEndFileScope = (...props) => {
      return currentAdapter().onEndFileScope(...props);
    };
    var getIdentOption = (...props) => {
      const adapter = currentAdapter();
      if (!("getIdentOption" in adapter)) {
        return "short";
      }
      return adapter.getIdentOption(...props);
    };
    exports.appendCss = appendCss;
    exports.getIdentOption = getIdentOption;
    exports.markCompositionUsed = markCompositionUsed;
    exports.mockAdapter = mockAdapter;
    exports.onEndFileScope = onEndFileScope;
    exports.registerClassName = registerClassName;
    exports.registerComposition = registerComposition;
    exports.removeAdapter = removeAdapter;
    exports.setAdapter = setAdapter;
    exports.setAdapterIfNotSet = setAdapterIfNotSet;
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/fileScope/dist/vanilla-extract-css-fileScope.cjs.prod.js
var require_vanilla_extract_css_fileScope_cjs_prod = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/fileScope/dist/vanilla-extract-css-fileScope.cjs.prod.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dedent = require_dedent();
    var adapter_dist_vanillaExtractCssAdapter = require_vanilla_extract_css_adapter_cjs_prod();
    function _interopDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    var dedent__default = /* @__PURE__ */ _interopDefault(dedent);
    var refCounter = 0;
    var fileScopes = [];
    function setFileScope2(filePath, packageName) {
      refCounter = 0;
      fileScopes.unshift({
        filePath,
        packageName
      });
    }
    function endFileScope2() {
      adapter_dist_vanillaExtractCssAdapter.onEndFileScope(getFileScope());
      refCounter = 0;
      fileScopes.splice(0, 1);
    }
    function hasFileScope() {
      return fileScopes.length > 0;
    }
    function getFileScope() {
      if (fileScopes.length === 0) {
        throw new Error(dedent__default["default"]`
        Styles were unable to be assigned to a file. This is generally caused by one of the following:

        - You may have created styles outside of a '.css.ts' context
        - You may have incorrect configuration. See https://vanilla-extract.style/documentation/setup
      `);
      }
      return fileScopes[0];
    }
    function getAndIncrementRefCounter() {
      return refCounter++;
    }
    exports.endFileScope = endFileScope2;
    exports.getAndIncrementRefCounter = getAndIncrementRefCounter;
    exports.getFileScope = getFileScope;
    exports.hasFileScope = hasFileScope;
    exports.setFileScope = setFileScope2;
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/adapter/dist/vanilla-extract-css-adapter.cjs.dev.js
var require_vanilla_extract_css_adapter_cjs_dev = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/adapter/dist/vanilla-extract-css-adapter.cjs.dev.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var mockAdapter = {
      appendCss: () => {
      },
      registerClassName: () => {
      },
      onEndFileScope: () => {
      },
      registerComposition: () => {
      },
      markCompositionUsed: () => {
      },
      getIdentOption: () => "debug"
    };
    var adapterStack = [mockAdapter];
    var currentAdapter = () => {
      if (adapterStack.length < 1) {
        throw new Error("No adapter configured");
      }
      return adapterStack[adapterStack.length - 1];
    };
    var hasConfiguredAdapter = false;
    var setAdapterIfNotSet = (newAdapter) => {
      if (!hasConfiguredAdapter) {
        setAdapter(newAdapter);
      }
    };
    var setAdapter = (newAdapter) => {
      hasConfiguredAdapter = true;
      adapterStack.push(newAdapter);
    };
    var removeAdapter = () => {
      adapterStack.pop();
    };
    var appendCss = (...props) => {
      return currentAdapter().appendCss(...props);
    };
    var registerClassName = (...props) => {
      return currentAdapter().registerClassName(...props);
    };
    var registerComposition = (...props) => {
      return currentAdapter().registerComposition(...props);
    };
    var markCompositionUsed = (...props) => {
      return currentAdapter().markCompositionUsed(...props);
    };
    var onEndFileScope = (...props) => {
      return currentAdapter().onEndFileScope(...props);
    };
    var getIdentOption = (...props) => {
      const adapter = currentAdapter();
      if (!("getIdentOption" in adapter)) {
        return process.env.NODE_ENV === "production" ? "short" : "debug";
      }
      return adapter.getIdentOption(...props);
    };
    exports.appendCss = appendCss;
    exports.getIdentOption = getIdentOption;
    exports.markCompositionUsed = markCompositionUsed;
    exports.mockAdapter = mockAdapter;
    exports.onEndFileScope = onEndFileScope;
    exports.registerClassName = registerClassName;
    exports.registerComposition = registerComposition;
    exports.removeAdapter = removeAdapter;
    exports.setAdapter = setAdapter;
    exports.setAdapterIfNotSet = setAdapterIfNotSet;
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/fileScope/dist/vanilla-extract-css-fileScope.cjs.dev.js
var require_vanilla_extract_css_fileScope_cjs_dev = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/fileScope/dist/vanilla-extract-css-fileScope.cjs.dev.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dedent = require_dedent();
    var adapter_dist_vanillaExtractCssAdapter = require_vanilla_extract_css_adapter_cjs_dev();
    function _interopDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    var dedent__default = /* @__PURE__ */ _interopDefault(dedent);
    var refCounter = 0;
    var fileScopes = [];
    function setFileScope2(filePath, packageName) {
      refCounter = 0;
      fileScopes.unshift({
        filePath,
        packageName
      });
    }
    function endFileScope2() {
      adapter_dist_vanillaExtractCssAdapter.onEndFileScope(getFileScope());
      refCounter = 0;
      fileScopes.splice(0, 1);
    }
    function hasFileScope() {
      return fileScopes.length > 0;
    }
    function getFileScope() {
      if (fileScopes.length === 0) {
        throw new Error(dedent__default["default"]`
        Styles were unable to be assigned to a file. This is generally caused by one of the following:

        - You may have created styles outside of a '.css.ts' context
        - You may have incorrect configuration. See https://vanilla-extract.style/documentation/setup
      `);
      }
      return fileScopes[0];
    }
    function getAndIncrementRefCounter() {
      return refCounter++;
    }
    exports.endFileScope = endFileScope2;
    exports.getAndIncrementRefCounter = getAndIncrementRefCounter;
    exports.getFileScope = getFileScope;
    exports.hasFileScope = hasFileScope;
    exports.setFileScope = setFileScope2;
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/fileScope/dist/vanilla-extract-css-fileScope.cjs.js
var require_vanilla_extract_css_fileScope_cjs = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/fileScope/dist/vanilla-extract-css-fileScope.cjs.js"(exports, module2) {
    init_shims();
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_vanilla_extract_css_fileScope_cjs_prod();
    } else {
      module2.exports = require_vanilla_extract_css_fileScope_cjs_dev();
    }
  }
});

// node_modules/.pnpm/@vanilla-extract+private@1.0.1/node_modules/@vanilla-extract/private/dist/vanilla-extract-private.cjs.prod.js
var require_vanilla_extract_private_cjs_prod = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+private@1.0.1/node_modules/@vanilla-extract/private/dist/vanilla-extract-private.cjs.prod.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function getVarName(variable) {
      const matches = variable.match(/^var\((.*)\)$/);
      if (matches) {
        return matches[1];
      }
      return variable;
    }
    function get(obj, path) {
      let result = obj;
      for (const key of path) {
        if (!(key in result)) {
          throw new Error(`Path ${path.join(" -> ")} does not exist in object`);
        }
        result = result[key];
      }
      return result;
    }
    function walkObject(obj, fn, path = []) {
      const clone2 = obj.constructor();
      for (let key in obj) {
        const value = obj[key];
        const currentPath = [...path, key];
        if (typeof value === "string" || typeof value === "number" || value == null) {
          clone2[key] = fn(value, currentPath);
        } else if (typeof value === "object" && !Array.isArray(value)) {
          clone2[key] = walkObject(value, fn, currentPath);
        } else {
          console.warn(`Skipping invalid key "${currentPath.join(".")}". Should be a string, number, null or object. Received: "${Array.isArray(value) ? "Array" : typeof value}"`);
        }
      }
      return clone2;
    }
    exports.get = get;
    exports.getVarName = getVarName;
    exports.walkObject = walkObject;
  }
});

// node_modules/.pnpm/@vanilla-extract+private@1.0.1/node_modules/@vanilla-extract/private/dist/vanilla-extract-private.cjs.dev.js
var require_vanilla_extract_private_cjs_dev = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+private@1.0.1/node_modules/@vanilla-extract/private/dist/vanilla-extract-private.cjs.dev.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function getVarName(variable) {
      const matches = variable.match(/^var\((.*)\)$/);
      if (matches) {
        return matches[1];
      }
      return variable;
    }
    function get(obj, path) {
      let result = obj;
      for (const key of path) {
        if (!(key in result)) {
          throw new Error(`Path ${path.join(" -> ")} does not exist in object`);
        }
        result = result[key];
      }
      return result;
    }
    function walkObject(obj, fn, path = []) {
      const clone2 = obj.constructor();
      for (let key in obj) {
        const value = obj[key];
        const currentPath = [...path, key];
        if (typeof value === "string" || typeof value === "number" || value == null) {
          clone2[key] = fn(value, currentPath);
        } else if (typeof value === "object" && !Array.isArray(value)) {
          clone2[key] = walkObject(value, fn, currentPath);
        } else {
          console.warn(`Skipping invalid key "${currentPath.join(".")}". Should be a string, number, null or object. Received: "${Array.isArray(value) ? "Array" : typeof value}"`);
        }
      }
      return clone2;
    }
    exports.get = get;
    exports.getVarName = getVarName;
    exports.walkObject = walkObject;
  }
});

// node_modules/.pnpm/@vanilla-extract+private@1.0.1/node_modules/@vanilla-extract/private/dist/vanilla-extract-private.cjs.js
var require_vanilla_extract_private_cjs = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+private@1.0.1/node_modules/@vanilla-extract/private/dist/vanilla-extract-private.cjs.js"(exports, module2) {
    init_shims();
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_vanilla_extract_private_cjs_prod();
    } else {
      module2.exports = require_vanilla_extract_private_cjs_dev();
    }
  }
});

// node_modules/.pnpm/cssesc@3.0.0/node_modules/cssesc/cssesc.js
var require_cssesc = __commonJS({
  "node_modules/.pnpm/cssesc@3.0.0/node_modules/cssesc/cssesc.js"(exports, module2) {
    init_shims();
    "use strict";
    var object = {};
    var hasOwnProperty = object.hasOwnProperty;
    var merge = function merge2(options2, defaults) {
      if (!options2) {
        return defaults;
      }
      var result = {};
      for (var key in defaults) {
        result[key] = hasOwnProperty.call(options2, key) ? options2[key] : defaults[key];
      }
      return result;
    };
    var regexAnySingleEscape = /[ -,\.\/:-@\[-\^`\{-~]/;
    var regexSingleEscape = /[ -,\.\/:-@\[\]\^`\{-~]/;
    var regexExcessiveSpaces = /(^|\\+)?(\\[A-F0-9]{1,6})\x20(?![a-fA-F0-9\x20])/g;
    var cssesc = function cssesc2(string, options2) {
      options2 = merge(options2, cssesc2.options);
      if (options2.quotes != "single" && options2.quotes != "double") {
        options2.quotes = "single";
      }
      var quote = options2.quotes == "double" ? '"' : "'";
      var isIdentifier = options2.isIdentifier;
      var firstChar = string.charAt(0);
      var output = "";
      var counter = 0;
      var length = string.length;
      while (counter < length) {
        var character = string.charAt(counter++);
        var codePoint = character.charCodeAt();
        var value = void 0;
        if (codePoint < 32 || codePoint > 126) {
          if (codePoint >= 55296 && codePoint <= 56319 && counter < length) {
            var extra = string.charCodeAt(counter++);
            if ((extra & 64512) == 56320) {
              codePoint = ((codePoint & 1023) << 10) + (extra & 1023) + 65536;
            } else {
              counter--;
            }
          }
          value = "\\" + codePoint.toString(16).toUpperCase() + " ";
        } else {
          if (options2.escapeEverything) {
            if (regexAnySingleEscape.test(character)) {
              value = "\\" + character;
            } else {
              value = "\\" + codePoint.toString(16).toUpperCase() + " ";
            }
          } else if (/[\t\n\f\r\x0B]/.test(character)) {
            value = "\\" + codePoint.toString(16).toUpperCase() + " ";
          } else if (character == "\\" || !isIdentifier && (character == '"' && quote == character || character == "'" && quote == character) || isIdentifier && regexSingleEscape.test(character)) {
            value = "\\" + character;
          } else {
            value = character;
          }
        }
        output += value;
      }
      if (isIdentifier) {
        if (/^-[-\d]/.test(output)) {
          output = "\\-" + output.slice(1);
        } else if (/\d/.test(firstChar)) {
          output = "\\3" + firstChar + " " + output.slice(1);
        }
      }
      output = output.replace(regexExcessiveSpaces, function($0, $1, $2) {
        if ($1 && $1.length % 2) {
          return $0;
        }
        return ($1 || "") + $2;
      });
      if (!isIdentifier && options2.wrap) {
        return quote + output + quote;
      }
      return output;
    };
    cssesc.options = {
      "escapeEverything": false,
      "isIdentifier": false,
      "quotes": "single",
      "wrap": false
    };
    cssesc.version = "3.0.0";
    module2.exports = cssesc;
  }
});

// node_modules/.pnpm/css-what@5.0.1/node_modules/css-what/lib/parse.js
var require_parse = __commonJS({
  "node_modules/.pnpm/css-what@5.0.1/node_modules/css-what/lib/parse.js"(exports) {
    init_shims();
    "use strict";
    var __spreadArray = exports && exports.__spreadArray || function(to, from) {
      for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
      return to;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isTraversal = void 0;
    var reName = /^[^\\#]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\-\u00b0-\uFFFF])+/;
    var reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
    var actionTypes = new Map([
      ["~", "element"],
      ["^", "start"],
      ["$", "end"],
      ["*", "any"],
      ["!", "not"],
      ["|", "hyphen"]
    ]);
    var Traversals = {
      ">": "child",
      "<": "parent",
      "~": "sibling",
      "+": "adjacent"
    };
    var attribSelectors = {
      "#": ["id", "equals"],
      ".": ["class", "element"]
    };
    var unpackPseudos = new Set([
      "has",
      "not",
      "matches",
      "is",
      "host",
      "host-context"
    ]);
    var traversalNames = new Set(__spreadArray([
      "descendant"
    ], Object.keys(Traversals).map(function(k) {
      return Traversals[k];
    })));
    var caseInsensitiveAttributes = new Set([
      "accept",
      "accept-charset",
      "align",
      "alink",
      "axis",
      "bgcolor",
      "charset",
      "checked",
      "clear",
      "codetype",
      "color",
      "compact",
      "declare",
      "defer",
      "dir",
      "direction",
      "disabled",
      "enctype",
      "face",
      "frame",
      "hreflang",
      "http-equiv",
      "lang",
      "language",
      "link",
      "media",
      "method",
      "multiple",
      "nohref",
      "noresize",
      "noshade",
      "nowrap",
      "readonly",
      "rel",
      "rev",
      "rules",
      "scope",
      "scrolling",
      "selected",
      "shape",
      "target",
      "text",
      "type",
      "valign",
      "valuetype",
      "vlink"
    ]);
    function isTraversal(selector) {
      return traversalNames.has(selector.type);
    }
    exports.isTraversal = isTraversal;
    var stripQuotesFromPseudos = new Set(["contains", "icontains"]);
    var quotes = new Set(['"', "'"]);
    function funescape(_, escaped2, escapedWhitespace) {
      var high = parseInt(escaped2, 16) - 65536;
      return high !== high || escapedWhitespace ? escaped2 : high < 0 ? String.fromCharCode(high + 65536) : String.fromCharCode(high >> 10 | 55296, high & 1023 | 56320);
    }
    function unescapeCSS(str) {
      return str.replace(reEscape, funescape);
    }
    function isWhitespace(c) {
      return c === " " || c === "\n" || c === "	" || c === "\f" || c === "\r";
    }
    function parse(selector, options2) {
      var subselects = [];
      var endIndex = parseSelector(subselects, "" + selector, options2, 0);
      if (endIndex < selector.length) {
        throw new Error("Unmatched selector: " + selector.slice(endIndex));
      }
      return subselects;
    }
    exports.default = parse;
    function parseSelector(subselects, selector, options2, selectorIndex) {
      var _a, _b;
      if (options2 === void 0) {
        options2 = {};
      }
      var tokens = [];
      var sawWS = false;
      function getName2(offset) {
        var match = selector.slice(selectorIndex + offset).match(reName);
        if (!match) {
          throw new Error("Expected name, found " + selector.slice(selectorIndex));
        }
        var name = match[0];
        selectorIndex += offset + name.length;
        return unescapeCSS(name);
      }
      function stripWhitespace(offset) {
        while (isWhitespace(selector.charAt(selectorIndex + offset)))
          offset++;
        selectorIndex += offset;
      }
      function isEscaped(pos) {
        var slashCount = 0;
        while (selector.charAt(--pos) === "\\")
          slashCount++;
        return (slashCount & 1) === 1;
      }
      function ensureNotTraversal() {
        if (tokens.length > 0 && isTraversal(tokens[tokens.length - 1])) {
          throw new Error("Did not expect successive traversals.");
        }
      }
      stripWhitespace(0);
      while (selector !== "") {
        var firstChar = selector.charAt(selectorIndex);
        if (isWhitespace(firstChar)) {
          sawWS = true;
          stripWhitespace(1);
        } else if (firstChar in Traversals) {
          ensureNotTraversal();
          tokens.push({ type: Traversals[firstChar] });
          sawWS = false;
          stripWhitespace(1);
        } else if (firstChar === ",") {
          if (tokens.length === 0) {
            throw new Error("Empty sub-selector");
          }
          subselects.push(tokens);
          tokens = [];
          sawWS = false;
          stripWhitespace(1);
        } else if (selector.startsWith("/*", selectorIndex)) {
          var endIndex = selector.indexOf("*/", selectorIndex + 2);
          if (endIndex < 0) {
            throw new Error("Comment was not terminated");
          }
          selectorIndex = endIndex + 2;
        } else {
          if (sawWS) {
            ensureNotTraversal();
            tokens.push({ type: "descendant" });
            sawWS = false;
          }
          if (firstChar in attribSelectors) {
            var _c = attribSelectors[firstChar], name_1 = _c[0], action = _c[1];
            tokens.push({
              type: "attribute",
              name: name_1,
              action,
              value: getName2(1),
              namespace: null,
              ignoreCase: options2.xmlMode ? null : false
            });
          } else if (firstChar === "[") {
            stripWhitespace(1);
            var name_2 = void 0;
            var namespace = null;
            if (selector.charAt(selectorIndex) === "|") {
              namespace = "";
              selectorIndex += 1;
            }
            if (selector.startsWith("*|", selectorIndex)) {
              namespace = "*";
              selectorIndex += 2;
            }
            name_2 = getName2(0);
            if (namespace === null && selector.charAt(selectorIndex) === "|" && selector.charAt(selectorIndex + 1) !== "=") {
              namespace = name_2;
              name_2 = getName2(1);
            }
            if ((_a = options2.lowerCaseAttributeNames) !== null && _a !== void 0 ? _a : !options2.xmlMode) {
              name_2 = name_2.toLowerCase();
            }
            stripWhitespace(0);
            var action = "exists";
            var possibleAction = actionTypes.get(selector.charAt(selectorIndex));
            if (possibleAction) {
              action = possibleAction;
              if (selector.charAt(selectorIndex + 1) !== "=") {
                throw new Error("Expected `=`");
              }
              stripWhitespace(2);
            } else if (selector.charAt(selectorIndex) === "=") {
              action = "equals";
              stripWhitespace(1);
            }
            var value = "";
            var ignoreCase = null;
            if (action !== "exists") {
              if (quotes.has(selector.charAt(selectorIndex))) {
                var quote = selector.charAt(selectorIndex);
                var sectionEnd = selectorIndex + 1;
                while (sectionEnd < selector.length && (selector.charAt(sectionEnd) !== quote || isEscaped(sectionEnd))) {
                  sectionEnd += 1;
                }
                if (selector.charAt(sectionEnd) !== quote) {
                  throw new Error("Attribute value didn't end");
                }
                value = unescapeCSS(selector.slice(selectorIndex + 1, sectionEnd));
                selectorIndex = sectionEnd + 1;
              } else {
                var valueStart = selectorIndex;
                while (selectorIndex < selector.length && (!isWhitespace(selector.charAt(selectorIndex)) && selector.charAt(selectorIndex) !== "]" || isEscaped(selectorIndex))) {
                  selectorIndex += 1;
                }
                value = unescapeCSS(selector.slice(valueStart, selectorIndex));
              }
              stripWhitespace(0);
              var forceIgnore = selector.charAt(selectorIndex);
              if (forceIgnore === "s" || forceIgnore === "S") {
                ignoreCase = false;
                stripWhitespace(1);
              } else if (forceIgnore === "i" || forceIgnore === "I") {
                ignoreCase = true;
                stripWhitespace(1);
              }
            }
            if (!options2.xmlMode) {
              ignoreCase !== null && ignoreCase !== void 0 ? ignoreCase : ignoreCase = caseInsensitiveAttributes.has(name_2);
            }
            if (selector.charAt(selectorIndex) !== "]") {
              throw new Error("Attribute selector didn't terminate");
            }
            selectorIndex += 1;
            var attributeSelector = {
              type: "attribute",
              name: name_2,
              action,
              value,
              namespace,
              ignoreCase
            };
            tokens.push(attributeSelector);
          } else if (firstChar === ":") {
            if (selector.charAt(selectorIndex + 1) === ":") {
              tokens.push({
                type: "pseudo-element",
                name: getName2(2).toLowerCase()
              });
              continue;
            }
            var name_3 = getName2(1).toLowerCase();
            var data = null;
            if (selector.charAt(selectorIndex) === "(") {
              if (unpackPseudos.has(name_3)) {
                if (quotes.has(selector.charAt(selectorIndex + 1))) {
                  throw new Error("Pseudo-selector " + name_3 + " cannot be quoted");
                }
                data = [];
                selectorIndex = parseSelector(data, selector, options2, selectorIndex + 1);
                if (selector.charAt(selectorIndex) !== ")") {
                  throw new Error("Missing closing parenthesis in :" + name_3 + " (" + selector + ")");
                }
                selectorIndex += 1;
              } else {
                selectorIndex += 1;
                var start = selectorIndex;
                var counter = 1;
                for (; counter > 0 && selectorIndex < selector.length; selectorIndex++) {
                  if (selector.charAt(selectorIndex) === "(" && !isEscaped(selectorIndex)) {
                    counter++;
                  } else if (selector.charAt(selectorIndex) === ")" && !isEscaped(selectorIndex)) {
                    counter--;
                  }
                }
                if (counter) {
                  throw new Error("Parenthesis not matched");
                }
                data = selector.slice(start, selectorIndex - 1);
                if (stripQuotesFromPseudos.has(name_3)) {
                  var quot = data.charAt(0);
                  if (quot === data.slice(-1) && quotes.has(quot)) {
                    data = data.slice(1, -1);
                  }
                  data = unescapeCSS(data);
                }
              }
            }
            tokens.push({ type: "pseudo", name: name_3, data });
          } else {
            var namespace = null;
            var name_4 = void 0;
            if (firstChar === "*") {
              selectorIndex += 1;
              name_4 = "*";
            } else if (reName.test(selector.slice(selectorIndex))) {
              if (selector.charAt(selectorIndex) === "|") {
                namespace = "";
                selectorIndex += 1;
              }
              name_4 = getName2(0);
            } else {
              if (tokens.length && tokens[tokens.length - 1].type === "descendant") {
                tokens.pop();
              }
              addToken(subselects, tokens);
              return selectorIndex;
            }
            if (selector.charAt(selectorIndex) === "|") {
              namespace = name_4;
              if (selector.charAt(selectorIndex + 1) === "*") {
                name_4 = "*";
                selectorIndex += 2;
              } else {
                name_4 = getName2(1);
              }
            }
            if (name_4 === "*") {
              tokens.push({ type: "universal", namespace });
            } else {
              if ((_b = options2.lowerCaseTags) !== null && _b !== void 0 ? _b : !options2.xmlMode) {
                name_4 = name_4.toLowerCase();
              }
              tokens.push({ type: "tag", name: name_4, namespace });
            }
          }
        }
      }
      addToken(subselects, tokens);
      return selectorIndex;
    }
    function addToken(subselects, tokens) {
      if (subselects.length > 0 && tokens.length === 0) {
        throw new Error("Empty sub-selector");
      }
      subselects.push(tokens);
    }
  }
});

// node_modules/.pnpm/css-what@5.0.1/node_modules/css-what/lib/stringify.js
var require_stringify = __commonJS({
  "node_modules/.pnpm/css-what@5.0.1/node_modules/css-what/lib/stringify.js"(exports) {
    init_shims();
    "use strict";
    var __spreadArray = exports && exports.__spreadArray || function(to, from) {
      for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
      return to;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var actionTypes = {
      equals: "",
      element: "~",
      start: "^",
      end: "$",
      any: "*",
      not: "!",
      hyphen: "|"
    };
    var charsToEscape = new Set(__spreadArray(__spreadArray([], Object.keys(actionTypes).map(function(typeKey) {
      return actionTypes[typeKey];
    }).filter(Boolean)), [
      ":",
      "[",
      "]",
      " ",
      "\\",
      "(",
      ")",
      "'"
    ]));
    function stringify(selector) {
      return selector.map(stringifySubselector).join(", ");
    }
    exports.default = stringify;
    function stringifySubselector(token) {
      return token.map(stringifyToken).join("");
    }
    function stringifyToken(token) {
      switch (token.type) {
        case "child":
          return " > ";
        case "parent":
          return " < ";
        case "sibling":
          return " ~ ";
        case "adjacent":
          return " + ";
        case "descendant":
          return " ";
        case "universal":
          return getNamespace(token.namespace) + "*";
        case "tag":
          return getNamespacedName(token);
        case "pseudo-element":
          return "::" + escapeName(token.name);
        case "pseudo":
          if (token.data === null)
            return ":" + escapeName(token.name);
          if (typeof token.data === "string") {
            return ":" + escapeName(token.name) + "(" + escapeName(token.data) + ")";
          }
          return ":" + escapeName(token.name) + "(" + stringify(token.data) + ")";
        case "attribute": {
          if (token.name === "id" && token.action === "equals" && !token.ignoreCase && !token.namespace) {
            return "#" + escapeName(token.value);
          }
          if (token.name === "class" && token.action === "element" && !token.ignoreCase && !token.namespace) {
            return "." + escapeName(token.value);
          }
          var name_1 = getNamespacedName(token);
          if (token.action === "exists") {
            return "[" + name_1 + "]";
          }
          return "[" + name_1 + actionTypes[token.action] + "='" + escapeName(token.value) + "'" + (token.ignoreCase ? "i" : token.ignoreCase === false ? "s" : "") + "]";
        }
      }
    }
    function getNamespacedName(token) {
      return "" + getNamespace(token.namespace) + escapeName(token.name);
    }
    function getNamespace(namespace) {
      return namespace !== null ? (namespace === "*" ? "*" : escapeName(namespace)) + "|" : "";
    }
    function escapeName(str) {
      return str.split("").map(function(c) {
        return charsToEscape.has(c) ? "\\" + c : c;
      }).join("");
    }
  }
});

// node_modules/.pnpm/css-what@5.0.1/node_modules/css-what/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/css-what@5.0.1/node_modules/css-what/lib/index.js"(exports) {
    init_shims();
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
          __createBinding(exports2, m, p);
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.stringify = exports.parse = void 0;
    __exportStar(require_parse(), exports);
    var parse_1 = require_parse();
    Object.defineProperty(exports, "parse", { enumerable: true, get: function() {
      return __importDefault(parse_1).default;
    } });
    var stringify_1 = require_stringify();
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return __importDefault(stringify_1).default;
    } });
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/transformCss-c7f35400.cjs.prod.js
var require_transformCss_c7f35400_cjs_prod = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/transformCss-c7f35400.cjs.prod.js"(exports) {
    init_shims();
    "use strict";
    var _private = require_vanilla_extract_private_cjs();
    var cssesc = require_cssesc();
    var adapter_dist_vanillaExtractCssAdapter = require_vanilla_extract_css_adapter_cjs_prod();
    var cssWhat = require_lib();
    var dedent = require_dedent();
    function _interopDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    var cssesc__default = /* @__PURE__ */ _interopDefault(cssesc);
    var dedent__default = /* @__PURE__ */ _interopDefault(dedent);
    function forEach(obj, fn) {
      for (const key in obj) {
        fn(obj[key], key);
      }
    }
    function omit(obj, omitKeys) {
      let result = {};
      for (const key in obj) {
        if (omitKeys.indexOf(key) === -1) {
          result[key] = obj[key];
        }
      }
      return result;
    }
    function mapKeys(obj, fn) {
      let result = {};
      for (const key in obj) {
        result[fn(obj[key], key)] = obj[key];
      }
      return result;
    }
    function composeStylesIntoSet(set, ...classNames) {
      for (const className of classNames) {
        if (className.length === 0) {
          continue;
        }
        if (typeof className === "string") {
          if (className.includes(" ")) {
            composeStylesIntoSet(set, ...className.trim().split(" "));
          } else {
            set.add(className);
          }
        } else if (Array.isArray(className)) {
          composeStylesIntoSet(set, ...className);
        }
      }
    }
    function dudupeAndJoinClassList(classNames) {
      const set = new Set();
      composeStylesIntoSet(set, ...classNames);
      return Array.from(set).join(" ");
    }
    function escapeRegex(string) {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }
    var validateSelector = (selector, targetClassName) => {
      const replaceTarget = () => {
        const targetRegex = new RegExp(`.${escapeRegex(cssesc__default["default"](targetClassName, {
          isIdentifier: true
        }))}`, "g");
        return selector.replace(targetRegex, "&");
      };
      let selectorParts;
      try {
        selectorParts = cssWhat.parse(selector);
      } catch (err) {
        throw new Error(`Invalid selector: ${replaceTarget()}`);
      }
      selectorParts.forEach((tokens) => {
        try {
          for (let i = tokens.length - 1; i >= -1; i--) {
            if (!tokens[i]) {
              throw new Error();
            }
            const token = tokens[i];
            if (token.type === "child" || token.type === "parent" || token.type === "sibling" || token.type === "adjacent" || token.type === "descendant") {
              throw new Error();
            }
            if (token.type === "attribute" && token.name === "class" && token.value === targetClassName) {
              return;
            }
          }
        } catch (err) {
          throw new Error(dedent__default["default"]`
        Invalid selector: ${replaceTarget()}
    
        Style selectors must target the '&' character (along with any modifiers), e.g. ${"`${parent} &`"} or ${"`${parent} &:hover`"}.
        
        This is to ensure that each style block only affects the styling of a single class.
        
        If your selector is targeting another class, you should move it to the style definition for that class, e.g. given we have styles for 'parent' and 'child' elements, instead of adding a selector of ${"`& ${child}`"}) to 'parent', you should add ${"`${parent} &`"} to 'child').
        
        If your selector is targeting something global, use the 'globalStyle' function instead, e.g. if you wanted to write ${"`& h1`"}, you should instead write 'globalStyle(${"`${parent} h1`"}, { ... })'
      `);
        }
      });
    };
    var ConditionalRuleset = class {
      constructor() {
        this.ruleset = [];
        this.precedenceLookup = new Map();
      }
      findOrCreateCondition(conditionQuery) {
        let targetCondition = this.ruleset.find((cond) => cond.query === conditionQuery);
        if (!targetCondition) {
          targetCondition = {
            query: conditionQuery,
            rules: [],
            children: new ConditionalRuleset()
          };
          this.ruleset.push(targetCondition);
        }
        return targetCondition;
      }
      getConditionalRulesetByPath(conditionPath) {
        let currRuleset = this;
        for (const query of conditionPath) {
          const condition = currRuleset.findOrCreateCondition(query);
          currRuleset = condition.children;
        }
        return currRuleset;
      }
      addRule(rule, conditionQuery, conditionPath) {
        const ruleset = this.getConditionalRulesetByPath(conditionPath);
        const targetCondition = ruleset.findOrCreateCondition(conditionQuery);
        if (!targetCondition) {
          throw new Error("Failed to add conditional rule");
        }
        targetCondition.rules.push(rule);
      }
      addConditionPrecedence(conditionPath, conditionOrder) {
        const ruleset = this.getConditionalRulesetByPath(conditionPath);
        for (let i = 0; i < conditionOrder.length; i++) {
          var _ruleset$precedenceLo;
          const condition = conditionOrder[i];
          const conditionPrecedence = (_ruleset$precedenceLo = ruleset.precedenceLookup.get(condition)) !== null && _ruleset$precedenceLo !== void 0 ? _ruleset$precedenceLo : new Set();
          for (const lowerPrecedenceCondition of conditionOrder.slice(i + 1)) {
            conditionPrecedence.add(lowerPrecedenceCondition);
          }
          ruleset.precedenceLookup.set(condition, conditionPrecedence);
        }
      }
      isCompatible(incomingRuleset) {
        for (const [condition, orderPrecedence] of this.precedenceLookup.entries()) {
          for (const lowerPrecedenceCondition of orderPrecedence) {
            var _incomingRuleset$prec;
            if ((_incomingRuleset$prec = incomingRuleset.precedenceLookup.get(lowerPrecedenceCondition)) !== null && _incomingRuleset$prec !== void 0 && _incomingRuleset$prec.has(condition)) {
              return false;
            }
          }
        }
        for (const {
          query,
          children
        } of incomingRuleset.ruleset) {
          const matchingCondition = this.ruleset.find((cond) => cond.query === query);
          if (matchingCondition && !matchingCondition.children.isCompatible(children)) {
            return false;
          }
        }
        return true;
      }
      merge(incomingRuleset) {
        for (const {
          query,
          rules,
          children
        } of incomingRuleset.ruleset) {
          const matchingCondition = this.ruleset.find((cond) => cond.query === query);
          if (matchingCondition) {
            matchingCondition.rules.push(...rules);
            matchingCondition.children.merge(children);
          } else {
            this.ruleset.push({
              query,
              rules,
              children
            });
          }
        }
        for (const [condition, incomingOrderPrecedence] of incomingRuleset.precedenceLookup.entries()) {
          var _this$precedenceLooku;
          const orderPrecedence = (_this$precedenceLooku = this.precedenceLookup.get(condition)) !== null && _this$precedenceLooku !== void 0 ? _this$precedenceLooku : new Set();
          this.precedenceLookup.set(condition, new Set([...orderPrecedence, ...incomingOrderPrecedence]));
        }
      }
      mergeIfCompatible(incomingRuleset) {
        if (!this.isCompatible(incomingRuleset)) {
          return false;
        }
        this.merge(incomingRuleset);
        return true;
      }
      sort() {
        this.ruleset.sort((a, b) => {
          const aWeights = this.precedenceLookup.get(a.query);
          if (aWeights !== null && aWeights !== void 0 && aWeights.has(b.query)) {
            return -1;
          }
          const bWeights = this.precedenceLookup.get(b.query);
          if (bWeights !== null && bWeights !== void 0 && bWeights.has(a.query)) {
            return 1;
          }
          return 0;
        });
      }
      renderToArray() {
        this.sort();
        const arr = [];
        for (const {
          query,
          rules,
          children
        } of this.ruleset) {
          const selectors = {};
          for (const rule of rules) {
            selectors[rule.selector] = rule.rule;
          }
          Object.assign(selectors, ...children.renderToArray());
          arr.push({
            [query]: selectors
          });
        }
        return arr;
      }
    };
    var simplePseudoMap = {
      ":-moz-any-link": true,
      ":-moz-full-screen": true,
      ":-moz-placeholder": true,
      ":-moz-read-only": true,
      ":-moz-read-write": true,
      ":-ms-fullscreen": true,
      ":-ms-input-placeholder": true,
      ":-webkit-any-link": true,
      ":-webkit-full-screen": true,
      "::-moz-placeholder": true,
      "::-moz-progress-bar": true,
      "::-moz-range-progress": true,
      "::-moz-range-thumb": true,
      "::-moz-range-track": true,
      "::-moz-selection": true,
      "::-ms-backdrop": true,
      "::-ms-browse": true,
      "::-ms-check": true,
      "::-ms-clear": true,
      "::-ms-fill": true,
      "::-ms-fill-lower": true,
      "::-ms-fill-upper": true,
      "::-ms-reveal": true,
      "::-ms-thumb": true,
      "::-ms-ticks-after": true,
      "::-ms-ticks-before": true,
      "::-ms-tooltip": true,
      "::-ms-track": true,
      "::-ms-value": true,
      "::-webkit-backdrop": true,
      "::-webkit-input-placeholder": true,
      "::-webkit-progress-bar": true,
      "::-webkit-progress-inner-value": true,
      "::-webkit-progress-value": true,
      "::-webkit-resizer": true,
      "::-webkit-scrollbar-button": true,
      "::-webkit-scrollbar-corner": true,
      "::-webkit-scrollbar-thumb": true,
      "::-webkit-scrollbar-track-piece": true,
      "::-webkit-scrollbar-track": true,
      "::-webkit-scrollbar": true,
      "::-webkit-slider-runnable-track": true,
      "::-webkit-slider-thumb": true,
      "::after": true,
      "::backdrop": true,
      "::before": true,
      "::cue": true,
      "::first-letter": true,
      "::first-line": true,
      "::grammar-error": true,
      "::placeholder": true,
      "::selection": true,
      "::spelling-error": true,
      ":active": true,
      ":after": true,
      ":any-link": true,
      ":before": true,
      ":blank": true,
      ":checked": true,
      ":default": true,
      ":defined": true,
      ":disabled": true,
      ":empty": true,
      ":enabled": true,
      ":first": true,
      ":first-child": true,
      ":first-letter": true,
      ":first-line": true,
      ":first-of-type": true,
      ":focus": true,
      ":focus-visible": true,
      ":focus-within": true,
      ":fullscreen": true,
      ":hover": true,
      ":in-range": true,
      ":indeterminate": true,
      ":invalid": true,
      ":last-child": true,
      ":last-of-type": true,
      ":left": true,
      ":link": true,
      ":only-child": true,
      ":only-of-type": true,
      ":optional": true,
      ":out-of-range": true,
      ":placeholder-shown": true,
      ":read-only": true,
      ":read-write": true,
      ":required": true,
      ":right": true,
      ":root": true,
      ":scope": true,
      ":target": true,
      ":valid": true,
      ":visited": true
    };
    var simplePseudos = Object.keys(simplePseudoMap);
    var simplePseudoLookup = simplePseudoMap;
    var UNITLESS = {
      animationIterationCount: true,
      borderImage: true,
      borderImageOutset: true,
      borderImageSlice: true,
      borderImageWidth: true,
      boxFlex: true,
      boxFlexGroup: true,
      columnCount: true,
      columns: true,
      flex: true,
      flexGrow: true,
      flexShrink: true,
      fontWeight: true,
      gridArea: true,
      gridColumn: true,
      gridColumnEnd: true,
      gridColumnStart: true,
      gridRow: true,
      gridRowEnd: true,
      gridRowStart: true,
      initialLetter: true,
      lineClamp: true,
      lineHeight: true,
      maxLines: true,
      opacity: true,
      order: true,
      orphans: true,
      tabSize: true,
      WebkitLineClamp: true,
      widows: true,
      zIndex: true,
      zoom: true,
      fillOpacity: true,
      floodOpacity: true,
      maskBorder: true,
      maskBorderOutset: true,
      maskBorderSlice: true,
      maskBorderWidth: true,
      shapeImageThreshold: true,
      stopOpacity: true,
      strokeDashoffset: true,
      strokeMiterlimit: true,
      strokeOpacity: true,
      strokeWidth: true
    };
    function dashify(str) {
      return str.replace(/([A-Z])/g, "-$1").replace(/^ms-/, "-ms-").toLowerCase();
    }
    var DOUBLE_SPACE = "  ";
    var specialKeys = [...simplePseudos, "@media", "@supports", "selectors"];
    var Stylesheet = class {
      constructor(localClassNames, composedClassLists) {
        this.rules = [];
        this.conditionalRulesets = [new ConditionalRuleset()];
        this.fontFaceRules = [];
        this.keyframesRules = [];
        this.localClassNameRegex = localClassNames.length > 0 ? RegExp(`(${localClassNames.join("|")})`, "g") : null;
        this.composedClassLists = composedClassLists.map(({
          identifier,
          classList
        }) => ({
          identifier,
          regex: RegExp(`(${classList})`, "g")
        })).reverse();
      }
      processCssObj(root) {
        if (root.type === "fontFace") {
          this.fontFaceRules.push(root.rule);
          return;
        }
        if (root.type === "keyframes") {
          this.keyframesRules.push(root);
          return;
        }
        const mainRule = omit(root.rule, specialKeys);
        this.addRule({
          selector: root.selector,
          rule: mainRule
        });
        this.currConditionalRuleset = new ConditionalRuleset();
        this.transformMedia(root, root.rule["@media"]);
        this.transformSupports(root, root.rule["@supports"]);
        this.transformSimplePseudos(root, root.rule);
        this.transformSelectors(root, root.rule);
        const activeConditionalRuleset = this.conditionalRulesets[this.conditionalRulesets.length - 1];
        if (!activeConditionalRuleset.mergeIfCompatible(this.currConditionalRuleset)) {
          this.conditionalRulesets.push(this.currConditionalRuleset);
        }
      }
      addConditionalRule(cssRule, conditions) {
        const rule = this.transformVars(this.pixelifyProperties(cssRule.rule));
        const selector = this.transformSelector(cssRule.selector);
        if (!this.currConditionalRuleset) {
          throw new Error(`Couldn't add conditional rule`);
        }
        const conditionQuery = conditions[conditions.length - 1];
        const parentConditions = conditions.slice(0, conditions.length - 1);
        this.currConditionalRuleset.addRule({
          selector,
          rule
        }, conditionQuery, parentConditions);
      }
      addRule(cssRule) {
        const rule = this.transformVars(this.pixelifyProperties(cssRule.rule));
        const selector = this.transformSelector(cssRule.selector);
        this.rules.push({
          selector,
          rule
        });
      }
      pixelifyProperties(cssRule) {
        forEach(cssRule, (value, key) => {
          if (typeof value === "number" && value !== 0 && !UNITLESS[key]) {
            cssRule[key] = `${value}px`;
          }
        });
        return cssRule;
      }
      transformVars({
        vars,
        ...rest
      }) {
        if (!vars) {
          return rest;
        }
        return {
          ...mapKeys(vars, (_value, key) => _private.getVarName(key)),
          ...rest
        };
      }
      transformSelector(selector) {
        let transformedSelector = selector;
        for (const {
          identifier,
          regex
        } of this.composedClassLists) {
          transformedSelector = transformedSelector.replace(regex, () => {
            adapter_dist_vanillaExtractCssAdapter.markCompositionUsed(identifier);
            return identifier;
          });
        }
        return this.localClassNameRegex ? transformedSelector.replace(this.localClassNameRegex, (_, className, index2) => {
          if (index2 > 0 && transformedSelector[index2 - 1] === ".") {
            return className;
          }
          return `.${cssesc__default["default"](className, {
            isIdentifier: true
          })}`;
        }) : transformedSelector;
      }
      transformSelectors(root, rule, conditions) {
        forEach(rule.selectors, (selectorRule, selector) => {
          if (root.type !== "local") {
            throw new Error(`Selectors are not allowed within ${root.type === "global" ? '"globalStyle"' : '"selectors"'}`);
          }
          const transformedSelector = this.transformSelector(selector.replace(RegExp("&", "g"), root.selector));
          validateSelector(transformedSelector, root.selector);
          const rule2 = {
            selector: transformedSelector,
            rule: omit(selectorRule, specialKeys)
          };
          if (conditions) {
            this.addConditionalRule(rule2, conditions);
          } else {
            this.addRule(rule2);
          }
          const selectorRoot = {
            type: "selector",
            selector: transformedSelector,
            rule: selectorRule
          };
          this.transformSupports(selectorRoot, selectorRule["@supports"], conditions);
          this.transformMedia(selectorRoot, selectorRule["@media"], conditions);
        });
      }
      transformMedia(root, rules, parentConditions = []) {
        if (rules) {
          var _this$currConditional;
          (_this$currConditional = this.currConditionalRuleset) === null || _this$currConditional === void 0 ? void 0 : _this$currConditional.addConditionPrecedence(parentConditions, Object.keys(rules).map((query) => `@media ${query}`));
          forEach(rules, (mediaRule, query) => {
            const conditions = [...parentConditions, `@media ${query}`];
            this.addConditionalRule({
              selector: root.selector,
              rule: omit(mediaRule, specialKeys)
            }, conditions);
            if (root.type === "local") {
              this.transformSimplePseudos(root, mediaRule, conditions);
              this.transformSelectors(root, mediaRule, conditions);
            }
            this.transformSupports(root, mediaRule["@supports"], conditions);
          });
        }
      }
      transformSupports(root, rules, parentConditions = []) {
        if (rules) {
          var _this$currConditional2;
          (_this$currConditional2 = this.currConditionalRuleset) === null || _this$currConditional2 === void 0 ? void 0 : _this$currConditional2.addConditionPrecedence(parentConditions, Object.keys(rules).map((query) => `@supports ${query}`));
          forEach(rules, (supportsRule, query) => {
            const conditions = [...parentConditions, `@supports ${query}`];
            this.addConditionalRule({
              selector: root.selector,
              rule: omit(supportsRule, specialKeys)
            }, conditions);
            if (root.type === "local") {
              this.transformSimplePseudos(root, supportsRule, conditions);
              this.transformSelectors(root, supportsRule, conditions);
            }
            this.transformMedia(root, supportsRule["@media"], conditions);
          });
        }
      }
      transformSimplePseudos(root, rule, conditions) {
        for (const key of Object.keys(rule)) {
          if (simplePseudoLookup[key]) {
            if (root.type !== "local") {
              throw new Error(`Simple pseudos are not valid in ${root.type === "global" ? '"globalStyle"' : '"selectors"'}`);
            }
            if (conditions) {
              this.addConditionalRule({
                selector: `${root.selector}${key}`,
                rule: rule[key]
              }, conditions);
            } else {
              this.addRule({
                conditions,
                selector: `${root.selector}${key}`,
                rule: rule[key]
              });
            }
          }
        }
      }
      toCss() {
        const css2 = [];
        for (const fontFaceRule of this.fontFaceRules) {
          css2.push(renderCss({
            "@font-face": fontFaceRule
          }));
        }
        for (const keyframe of this.keyframesRules) {
          css2.push(renderCss({
            [`@keyframes ${keyframe.name}`]: keyframe.rule
          }));
        }
        for (const rule of this.rules) {
          css2.push(renderCss({
            [rule.selector]: rule.rule
          }));
        }
        for (const conditionalRuleset of this.conditionalRulesets) {
          for (const conditionalRule of conditionalRuleset.renderToArray()) {
            css2.push(renderCss(conditionalRule));
          }
        }
        return css2.filter(Boolean);
      }
    };
    function renderCss(v, indent = "") {
      const rules = [];
      for (const key of Object.keys(v)) {
        const value = v[key];
        if (value && Array.isArray(value)) {
          rules.push(...value.map((v2) => renderCss({
            [key]: v2
          }, indent)));
        } else if (value && typeof value === "object") {
          const isEmpty = Object.keys(value).length === 0;
          if (!isEmpty) {
            rules.push(`${indent}${key} {
${renderCss(value, indent + DOUBLE_SPACE)}
${indent}}`);
          }
        } else {
          rules.push(`${indent}${key.startsWith("--") ? key : dashify(key)}: ${value};`);
        }
      }
      return rules.join("\n");
    }
    function transformCss({
      localClassNames,
      cssObjs,
      composedClassLists
    }) {
      const stylesheet = new Stylesheet(localClassNames, composedClassLists);
      for (const root of cssObjs) {
        stylesheet.processCssObj(root);
      }
      return stylesheet.toCss();
    }
    exports.dudupeAndJoinClassList = dudupeAndJoinClassList;
    exports.transformCss = transformCss;
  }
});

// node_modules/.pnpm/@emotion+hash@0.8.0/node_modules/@emotion/hash/dist/hash.cjs.prod.js
var require_hash_cjs_prod = __commonJS({
  "node_modules/.pnpm/@emotion+hash@0.8.0/node_modules/@emotion/hash/dist/hash.cjs.prod.js"(exports) {
    init_shims();
    "use strict";
    function murmur2(str) {
      for (var k, h = 0, i = 0, len = str.length; len >= 4; ++i, len -= 4)
        k = 1540483477 * (65535 & (k = 255 & str.charCodeAt(i) | (255 & str.charCodeAt(++i)) << 8 | (255 & str.charCodeAt(++i)) << 16 | (255 & str.charCodeAt(++i)) << 24)) + (59797 * (k >>> 16) << 16), h = 1540483477 * (65535 & (k ^= k >>> 24)) + (59797 * (k >>> 16) << 16) ^ 1540483477 * (65535 & h) + (59797 * (h >>> 16) << 16);
      switch (len) {
        case 3:
          h ^= (255 & str.charCodeAt(i + 2)) << 16;
        case 2:
          h ^= (255 & str.charCodeAt(i + 1)) << 8;
        case 1:
          h = 1540483477 * (65535 & (h ^= 255 & str.charCodeAt(i))) + (59797 * (h >>> 16) << 16);
      }
      return (((h = 1540483477 * (65535 & (h ^= h >>> 13)) + (59797 * (h >>> 16) << 16)) ^ h >>> 15) >>> 0).toString(36);
    }
    Object.defineProperty(exports, "__esModule", {
      value: true
    }), exports.default = murmur2;
  }
});

// node_modules/.pnpm/@emotion+hash@0.8.0/node_modules/@emotion/hash/dist/hash.cjs.dev.js
var require_hash_cjs_dev = __commonJS({
  "node_modules/.pnpm/@emotion+hash@0.8.0/node_modules/@emotion/hash/dist/hash.cjs.dev.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function murmur2(str) {
      var h = 0;
      var k, i = 0, len = str.length;
      for (; len >= 4; ++i, len -= 4) {
        k = str.charCodeAt(i) & 255 | (str.charCodeAt(++i) & 255) << 8 | (str.charCodeAt(++i) & 255) << 16 | (str.charCodeAt(++i) & 255) << 24;
        k = (k & 65535) * 1540483477 + ((k >>> 16) * 59797 << 16);
        k ^= k >>> 24;
        h = (k & 65535) * 1540483477 + ((k >>> 16) * 59797 << 16) ^ (h & 65535) * 1540483477 + ((h >>> 16) * 59797 << 16);
      }
      switch (len) {
        case 3:
          h ^= (str.charCodeAt(i + 2) & 255) << 16;
        case 2:
          h ^= (str.charCodeAt(i + 1) & 255) << 8;
        case 1:
          h ^= str.charCodeAt(i) & 255;
          h = (h & 65535) * 1540483477 + ((h >>> 16) * 59797 << 16);
      }
      h ^= h >>> 13;
      h = (h & 65535) * 1540483477 + ((h >>> 16) * 59797 << 16);
      return ((h ^ h >>> 15) >>> 0).toString(36);
    }
    exports.default = murmur2;
  }
});

// node_modules/.pnpm/@emotion+hash@0.8.0/node_modules/@emotion/hash/dist/hash.cjs.js
var require_hash_cjs = __commonJS({
  "node_modules/.pnpm/@emotion+hash@0.8.0/node_modules/@emotion/hash/dist/hash.cjs.js"(exports, module2) {
    init_shims();
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_hash_cjs_prod();
    } else {
      module2.exports = require_hash_cjs_dev();
    }
  }
});

// node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/utils/index.js
var require_utils = __commonJS({
  "node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/utils/index.js"(exports) {
    init_shims();
    (function(global, factory) {
      if (typeof define === "function" && define.amd) {
        define(["exports"], factory);
      } else if (typeof exports !== "undefined") {
        factory(exports);
      } else {
        var mod = {
          exports: {}
        };
        factory(mod.exports);
        global.index = mod.exports;
      }
    })(exports, function(exports2) {
      "use strict";
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
      var _extends = Object.assign || function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
      var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
        return typeof obj;
      } : function(obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      var isDate = exports2.isDate = function isDate2(d) {
        return d instanceof Date;
      };
      var isEmpty = exports2.isEmpty = function isEmpty2(o) {
        return Object.keys(o).length === 0;
      };
      var isObject = exports2.isObject = function isObject2(o) {
        return o != null && (typeof o === "undefined" ? "undefined" : _typeof(o)) === "object";
      };
      var properObject = exports2.properObject = function properObject2(o) {
        return isObject(o) && !o.hasOwnProperty ? _extends({}, o) : o;
      };
    });
  }
});

// node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/diff/index.js
var require_diff = __commonJS({
  "node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/diff/index.js"(exports, module2) {
    init_shims();
    (function(global, factory) {
      if (typeof define === "function" && define.amd) {
        define(["module", "exports", "../utils"], factory);
      } else if (typeof exports !== "undefined") {
        factory(module2, exports, require_utils());
      } else {
        var mod = {
          exports: {}
        };
        factory(mod, mod.exports, global.utils);
        global.index = mod.exports;
      }
    })(exports, function(module3, exports2, _utils) {
      "use strict";
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
      function _defineProperty(obj, key, value) {
        if (key in obj) {
          Object.defineProperty(obj, key, {
            value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        } else {
          obj[key] = value;
        }
        return obj;
      }
      var _extends = Object.assign || function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
      var diff = function diff2(lhs, rhs) {
        if (lhs === rhs)
          return {};
        if (!(0, _utils.isObject)(lhs) || !(0, _utils.isObject)(rhs))
          return rhs;
        var l = (0, _utils.properObject)(lhs);
        var r = (0, _utils.properObject)(rhs);
        var deletedValues = Object.keys(l).reduce(function(acc, key) {
          return r.hasOwnProperty(key) ? acc : _extends({}, acc, _defineProperty({}, key, void 0));
        }, {});
        if ((0, _utils.isDate)(l) || (0, _utils.isDate)(r)) {
          if (l.valueOf() == r.valueOf())
            return {};
          return r;
        }
        return Object.keys(r).reduce(function(acc, key) {
          if (!l.hasOwnProperty(key))
            return _extends({}, acc, _defineProperty({}, key, r[key]));
          var difference = diff2(l[key], r[key]);
          if ((0, _utils.isObject)(difference) && (0, _utils.isEmpty)(difference) && !(0, _utils.isDate)(difference))
            return acc;
          return _extends({}, acc, _defineProperty({}, key, difference));
        }, deletedValues);
      };
      exports2.default = diff;
      module3.exports = exports2["default"];
    });
  }
});

// node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/added/index.js
var require_added = __commonJS({
  "node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/added/index.js"(exports, module2) {
    init_shims();
    (function(global, factory) {
      if (typeof define === "function" && define.amd) {
        define(["module", "exports", "../utils"], factory);
      } else if (typeof exports !== "undefined") {
        factory(module2, exports, require_utils());
      } else {
        var mod = {
          exports: {}
        };
        factory(mod, mod.exports, global.utils);
        global.index = mod.exports;
      }
    })(exports, function(module3, exports2, _utils) {
      "use strict";
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
      function _defineProperty(obj, key, value) {
        if (key in obj) {
          Object.defineProperty(obj, key, {
            value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        } else {
          obj[key] = value;
        }
        return obj;
      }
      var _extends = Object.assign || function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
      var addedDiff = function addedDiff2(lhs, rhs) {
        if (lhs === rhs || !(0, _utils.isObject)(lhs) || !(0, _utils.isObject)(rhs))
          return {};
        var l = (0, _utils.properObject)(lhs);
        var r = (0, _utils.properObject)(rhs);
        return Object.keys(r).reduce(function(acc, key) {
          if (l.hasOwnProperty(key)) {
            var difference = addedDiff2(l[key], r[key]);
            if ((0, _utils.isObject)(difference) && (0, _utils.isEmpty)(difference))
              return acc;
            return _extends({}, acc, _defineProperty({}, key, difference));
          }
          return _extends({}, acc, _defineProperty({}, key, r[key]));
        }, {});
      };
      exports2.default = addedDiff;
      module3.exports = exports2["default"];
    });
  }
});

// node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/deleted/index.js
var require_deleted = __commonJS({
  "node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/deleted/index.js"(exports, module2) {
    init_shims();
    (function(global, factory) {
      if (typeof define === "function" && define.amd) {
        define(["module", "exports", "../utils"], factory);
      } else if (typeof exports !== "undefined") {
        factory(module2, exports, require_utils());
      } else {
        var mod = {
          exports: {}
        };
        factory(mod, mod.exports, global.utils);
        global.index = mod.exports;
      }
    })(exports, function(module3, exports2, _utils) {
      "use strict";
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
      function _defineProperty(obj, key, value) {
        if (key in obj) {
          Object.defineProperty(obj, key, {
            value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        } else {
          obj[key] = value;
        }
        return obj;
      }
      var _extends = Object.assign || function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
      var deletedDiff = function deletedDiff2(lhs, rhs) {
        if (lhs === rhs || !(0, _utils.isObject)(lhs) || !(0, _utils.isObject)(rhs))
          return {};
        var l = (0, _utils.properObject)(lhs);
        var r = (0, _utils.properObject)(rhs);
        return Object.keys(l).reduce(function(acc, key) {
          if (r.hasOwnProperty(key)) {
            var difference = deletedDiff2(l[key], r[key]);
            if ((0, _utils.isObject)(difference) && (0, _utils.isEmpty)(difference))
              return acc;
            return _extends({}, acc, _defineProperty({}, key, difference));
          }
          return _extends({}, acc, _defineProperty({}, key, void 0));
        }, {});
      };
      exports2.default = deletedDiff;
      module3.exports = exports2["default"];
    });
  }
});

// node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/updated/index.js
var require_updated = __commonJS({
  "node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/updated/index.js"(exports, module2) {
    init_shims();
    (function(global, factory) {
      if (typeof define === "function" && define.amd) {
        define(["module", "exports", "../utils"], factory);
      } else if (typeof exports !== "undefined") {
        factory(module2, exports, require_utils());
      } else {
        var mod = {
          exports: {}
        };
        factory(mod, mod.exports, global.utils);
        global.index = mod.exports;
      }
    })(exports, function(module3, exports2, _utils) {
      "use strict";
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
      function _defineProperty(obj, key, value) {
        if (key in obj) {
          Object.defineProperty(obj, key, {
            value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        } else {
          obj[key] = value;
        }
        return obj;
      }
      var _extends = Object.assign || function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
      var updatedDiff = function updatedDiff2(lhs, rhs) {
        if (lhs === rhs)
          return {};
        if (!(0, _utils.isObject)(lhs) || !(0, _utils.isObject)(rhs))
          return rhs;
        var l = (0, _utils.properObject)(lhs);
        var r = (0, _utils.properObject)(rhs);
        if ((0, _utils.isDate)(l) || (0, _utils.isDate)(r)) {
          if (l.valueOf() == r.valueOf())
            return {};
          return r;
        }
        return Object.keys(r).reduce(function(acc, key) {
          if (l.hasOwnProperty(key)) {
            var difference = updatedDiff2(l[key], r[key]);
            if ((0, _utils.isObject)(difference) && (0, _utils.isEmpty)(difference) && !(0, _utils.isDate)(difference))
              return acc;
            return _extends({}, acc, _defineProperty({}, key, difference));
          }
          return acc;
        }, {});
      };
      exports2.default = updatedDiff;
      module3.exports = exports2["default"];
    });
  }
});

// node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/detailed/index.js
var require_detailed = __commonJS({
  "node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/detailed/index.js"(exports, module2) {
    init_shims();
    (function(global, factory) {
      if (typeof define === "function" && define.amd) {
        define(["module", "exports", "../added", "../deleted", "../updated"], factory);
      } else if (typeof exports !== "undefined") {
        factory(module2, exports, require_added(), require_deleted(), require_updated());
      } else {
        var mod = {
          exports: {}
        };
        factory(mod, mod.exports, global.added, global.deleted, global.updated);
        global.index = mod.exports;
      }
    })(exports, function(module3, exports2, _added, _deleted, _updated) {
      "use strict";
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
      var _added2 = _interopRequireDefault(_added);
      var _deleted2 = _interopRequireDefault(_deleted);
      var _updated2 = _interopRequireDefault(_updated);
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          default: obj
        };
      }
      var detailedDiff = function detailedDiff2(lhs, rhs) {
        return {
          added: (0, _added2.default)(lhs, rhs),
          deleted: (0, _deleted2.default)(lhs, rhs),
          updated: (0, _updated2.default)(lhs, rhs)
        };
      };
      exports2.default = detailedDiff;
      module3.exports = exports2["default"];
    });
  }
});

// node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/deep-object-diff@1.1.0/node_modules/deep-object-diff/dist/index.js"(exports) {
    init_shims();
    (function(global, factory) {
      if (typeof define === "function" && define.amd) {
        define(["exports", "./diff", "./added", "./deleted", "./updated", "./detailed"], factory);
      } else if (typeof exports !== "undefined") {
        factory(exports, require_diff(), require_added(), require_deleted(), require_updated(), require_detailed());
      } else {
        var mod = {
          exports: {}
        };
        factory(mod.exports, global.diff, global.added, global.deleted, global.updated, global.detailed);
        global.index = mod.exports;
      }
    })(exports, function(exports2, _diff, _added, _deleted, _updated, _detailed) {
      "use strict";
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
      exports2.detailedDiff = exports2.updatedDiff = exports2.deletedDiff = exports2.diff = exports2.addedDiff = void 0;
      var _diff2 = _interopRequireDefault(_diff);
      var _added2 = _interopRequireDefault(_added);
      var _deleted2 = _interopRequireDefault(_deleted);
      var _updated2 = _interopRequireDefault(_updated);
      var _detailed2 = _interopRequireDefault(_detailed);
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          default: obj
        };
      }
      exports2.addedDiff = _added2.default;
      exports2.diff = _diff2.default;
      exports2.deletedDiff = _deleted2.default;
      exports2.updatedDiff = _updated2.default;
      exports2.detailedDiff = _detailed2.default;
    });
  }
});

// node_modules/.pnpm/color-name@1.1.4/node_modules/color-name/index.js
var require_color_name = __commonJS({
  "node_modules/.pnpm/color-name@1.1.4/node_modules/color-name/index.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = {
      "aliceblue": [240, 248, 255],
      "antiquewhite": [250, 235, 215],
      "aqua": [0, 255, 255],
      "aquamarine": [127, 255, 212],
      "azure": [240, 255, 255],
      "beige": [245, 245, 220],
      "bisque": [255, 228, 196],
      "black": [0, 0, 0],
      "blanchedalmond": [255, 235, 205],
      "blue": [0, 0, 255],
      "blueviolet": [138, 43, 226],
      "brown": [165, 42, 42],
      "burlywood": [222, 184, 135],
      "cadetblue": [95, 158, 160],
      "chartreuse": [127, 255, 0],
      "chocolate": [210, 105, 30],
      "coral": [255, 127, 80],
      "cornflowerblue": [100, 149, 237],
      "cornsilk": [255, 248, 220],
      "crimson": [220, 20, 60],
      "cyan": [0, 255, 255],
      "darkblue": [0, 0, 139],
      "darkcyan": [0, 139, 139],
      "darkgoldenrod": [184, 134, 11],
      "darkgray": [169, 169, 169],
      "darkgreen": [0, 100, 0],
      "darkgrey": [169, 169, 169],
      "darkkhaki": [189, 183, 107],
      "darkmagenta": [139, 0, 139],
      "darkolivegreen": [85, 107, 47],
      "darkorange": [255, 140, 0],
      "darkorchid": [153, 50, 204],
      "darkred": [139, 0, 0],
      "darksalmon": [233, 150, 122],
      "darkseagreen": [143, 188, 143],
      "darkslateblue": [72, 61, 139],
      "darkslategray": [47, 79, 79],
      "darkslategrey": [47, 79, 79],
      "darkturquoise": [0, 206, 209],
      "darkviolet": [148, 0, 211],
      "deeppink": [255, 20, 147],
      "deepskyblue": [0, 191, 255],
      "dimgray": [105, 105, 105],
      "dimgrey": [105, 105, 105],
      "dodgerblue": [30, 144, 255],
      "firebrick": [178, 34, 34],
      "floralwhite": [255, 250, 240],
      "forestgreen": [34, 139, 34],
      "fuchsia": [255, 0, 255],
      "gainsboro": [220, 220, 220],
      "ghostwhite": [248, 248, 255],
      "gold": [255, 215, 0],
      "goldenrod": [218, 165, 32],
      "gray": [128, 128, 128],
      "green": [0, 128, 0],
      "greenyellow": [173, 255, 47],
      "grey": [128, 128, 128],
      "honeydew": [240, 255, 240],
      "hotpink": [255, 105, 180],
      "indianred": [205, 92, 92],
      "indigo": [75, 0, 130],
      "ivory": [255, 255, 240],
      "khaki": [240, 230, 140],
      "lavender": [230, 230, 250],
      "lavenderblush": [255, 240, 245],
      "lawngreen": [124, 252, 0],
      "lemonchiffon": [255, 250, 205],
      "lightblue": [173, 216, 230],
      "lightcoral": [240, 128, 128],
      "lightcyan": [224, 255, 255],
      "lightgoldenrodyellow": [250, 250, 210],
      "lightgray": [211, 211, 211],
      "lightgreen": [144, 238, 144],
      "lightgrey": [211, 211, 211],
      "lightpink": [255, 182, 193],
      "lightsalmon": [255, 160, 122],
      "lightseagreen": [32, 178, 170],
      "lightskyblue": [135, 206, 250],
      "lightslategray": [119, 136, 153],
      "lightslategrey": [119, 136, 153],
      "lightsteelblue": [176, 196, 222],
      "lightyellow": [255, 255, 224],
      "lime": [0, 255, 0],
      "limegreen": [50, 205, 50],
      "linen": [250, 240, 230],
      "magenta": [255, 0, 255],
      "maroon": [128, 0, 0],
      "mediumaquamarine": [102, 205, 170],
      "mediumblue": [0, 0, 205],
      "mediumorchid": [186, 85, 211],
      "mediumpurple": [147, 112, 219],
      "mediumseagreen": [60, 179, 113],
      "mediumslateblue": [123, 104, 238],
      "mediumspringgreen": [0, 250, 154],
      "mediumturquoise": [72, 209, 204],
      "mediumvioletred": [199, 21, 133],
      "midnightblue": [25, 25, 112],
      "mintcream": [245, 255, 250],
      "mistyrose": [255, 228, 225],
      "moccasin": [255, 228, 181],
      "navajowhite": [255, 222, 173],
      "navy": [0, 0, 128],
      "oldlace": [253, 245, 230],
      "olive": [128, 128, 0],
      "olivedrab": [107, 142, 35],
      "orange": [255, 165, 0],
      "orangered": [255, 69, 0],
      "orchid": [218, 112, 214],
      "palegoldenrod": [238, 232, 170],
      "palegreen": [152, 251, 152],
      "paleturquoise": [175, 238, 238],
      "palevioletred": [219, 112, 147],
      "papayawhip": [255, 239, 213],
      "peachpuff": [255, 218, 185],
      "peru": [205, 133, 63],
      "pink": [255, 192, 203],
      "plum": [221, 160, 221],
      "powderblue": [176, 224, 230],
      "purple": [128, 0, 128],
      "rebeccapurple": [102, 51, 153],
      "red": [255, 0, 0],
      "rosybrown": [188, 143, 143],
      "royalblue": [65, 105, 225],
      "saddlebrown": [139, 69, 19],
      "salmon": [250, 128, 114],
      "sandybrown": [244, 164, 96],
      "seagreen": [46, 139, 87],
      "seashell": [255, 245, 238],
      "sienna": [160, 82, 45],
      "silver": [192, 192, 192],
      "skyblue": [135, 206, 235],
      "slateblue": [106, 90, 205],
      "slategray": [112, 128, 144],
      "slategrey": [112, 128, 144],
      "snow": [255, 250, 250],
      "springgreen": [0, 255, 127],
      "steelblue": [70, 130, 180],
      "tan": [210, 180, 140],
      "teal": [0, 128, 128],
      "thistle": [216, 191, 216],
      "tomato": [255, 99, 71],
      "turquoise": [64, 224, 208],
      "violet": [238, 130, 238],
      "wheat": [245, 222, 179],
      "white": [255, 255, 255],
      "whitesmoke": [245, 245, 245],
      "yellow": [255, 255, 0],
      "yellowgreen": [154, 205, 50]
    };
  }
});

// node_modules/.pnpm/color-convert@2.0.1/node_modules/color-convert/conversions.js
var require_conversions = __commonJS({
  "node_modules/.pnpm/color-convert@2.0.1/node_modules/color-convert/conversions.js"(exports, module2) {
    init_shims();
    var cssKeywords = require_color_name();
    var reverseKeywords = {};
    for (const key of Object.keys(cssKeywords)) {
      reverseKeywords[cssKeywords[key]] = key;
    }
    var convert = {
      rgb: { channels: 3, labels: "rgb" },
      hsl: { channels: 3, labels: "hsl" },
      hsv: { channels: 3, labels: "hsv" },
      hwb: { channels: 3, labels: "hwb" },
      cmyk: { channels: 4, labels: "cmyk" },
      xyz: { channels: 3, labels: "xyz" },
      lab: { channels: 3, labels: "lab" },
      lch: { channels: 3, labels: "lch" },
      hex: { channels: 1, labels: ["hex"] },
      keyword: { channels: 1, labels: ["keyword"] },
      ansi16: { channels: 1, labels: ["ansi16"] },
      ansi256: { channels: 1, labels: ["ansi256"] },
      hcg: { channels: 3, labels: ["h", "c", "g"] },
      apple: { channels: 3, labels: ["r16", "g16", "b16"] },
      gray: { channels: 1, labels: ["gray"] }
    };
    module2.exports = convert;
    for (const model of Object.keys(convert)) {
      if (!("channels" in convert[model])) {
        throw new Error("missing channels property: " + model);
      }
      if (!("labels" in convert[model])) {
        throw new Error("missing channel labels property: " + model);
      }
      if (convert[model].labels.length !== convert[model].channels) {
        throw new Error("channel and label counts mismatch: " + model);
      }
      const { channels, labels } = convert[model];
      delete convert[model].channels;
      delete convert[model].labels;
      Object.defineProperty(convert[model], "channels", { value: channels });
      Object.defineProperty(convert[model], "labels", { value: labels });
    }
    convert.rgb.hsl = function(rgb) {
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const delta = max - min;
      let h;
      let s2;
      if (max === min) {
        h = 0;
      } else if (r === max) {
        h = (g - b) / delta;
      } else if (g === max) {
        h = 2 + (b - r) / delta;
      } else if (b === max) {
        h = 4 + (r - g) / delta;
      }
      h = Math.min(h * 60, 360);
      if (h < 0) {
        h += 360;
      }
      const l = (min + max) / 2;
      if (max === min) {
        s2 = 0;
      } else if (l <= 0.5) {
        s2 = delta / (max + min);
      } else {
        s2 = delta / (2 - max - min);
      }
      return [h, s2 * 100, l * 100];
    };
    convert.rgb.hsv = function(rgb) {
      let rdif;
      let gdif;
      let bdif;
      let h;
      let s2;
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const v = Math.max(r, g, b);
      const diff = v - Math.min(r, g, b);
      const diffc = function(c) {
        return (v - c) / 6 / diff + 1 / 2;
      };
      if (diff === 0) {
        h = 0;
        s2 = 0;
      } else {
        s2 = diff / v;
        rdif = diffc(r);
        gdif = diffc(g);
        bdif = diffc(b);
        if (r === v) {
          h = bdif - gdif;
        } else if (g === v) {
          h = 1 / 3 + rdif - bdif;
        } else if (b === v) {
          h = 2 / 3 + gdif - rdif;
        }
        if (h < 0) {
          h += 1;
        } else if (h > 1) {
          h -= 1;
        }
      }
      return [
        h * 360,
        s2 * 100,
        v * 100
      ];
    };
    convert.rgb.hwb = function(rgb) {
      const r = rgb[0];
      const g = rgb[1];
      let b = rgb[2];
      const h = convert.rgb.hsl(rgb)[0];
      const w = 1 / 255 * Math.min(r, Math.min(g, b));
      b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));
      return [h, w * 100, b * 100];
    };
    convert.rgb.cmyk = function(rgb) {
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const k = Math.min(1 - r, 1 - g, 1 - b);
      const c = (1 - r - k) / (1 - k) || 0;
      const m = (1 - g - k) / (1 - k) || 0;
      const y = (1 - b - k) / (1 - k) || 0;
      return [c * 100, m * 100, y * 100, k * 100];
    };
    function comparativeDistance(x, y) {
      return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
    }
    convert.rgb.keyword = function(rgb) {
      const reversed = reverseKeywords[rgb];
      if (reversed) {
        return reversed;
      }
      let currentClosestDistance = Infinity;
      let currentClosestKeyword;
      for (const keyword of Object.keys(cssKeywords)) {
        const value = cssKeywords[keyword];
        const distance = comparativeDistance(rgb, value);
        if (distance < currentClosestDistance) {
          currentClosestDistance = distance;
          currentClosestKeyword = keyword;
        }
      }
      return currentClosestKeyword;
    };
    convert.keyword.rgb = function(keyword) {
      return cssKeywords[keyword];
    };
    convert.rgb.xyz = function(rgb) {
      let r = rgb[0] / 255;
      let g = rgb[1] / 255;
      let b = rgb[2] / 255;
      r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
      g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
      b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
      const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
      const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
      return [x * 100, y * 100, z * 100];
    };
    convert.rgb.lab = function(rgb) {
      const xyz = convert.rgb.xyz(rgb);
      let x = xyz[0];
      let y = xyz[1];
      let z = xyz[2];
      x /= 95.047;
      y /= 100;
      z /= 108.883;
      x = x > 8856e-6 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
      y = y > 8856e-6 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
      z = z > 8856e-6 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
      const l = 116 * y - 16;
      const a = 500 * (x - y);
      const b = 200 * (y - z);
      return [l, a, b];
    };
    convert.hsl.rgb = function(hsl) {
      const h = hsl[0] / 360;
      const s2 = hsl[1] / 100;
      const l = hsl[2] / 100;
      let t2;
      let t3;
      let val;
      if (s2 === 0) {
        val = l * 255;
        return [val, val, val];
      }
      if (l < 0.5) {
        t2 = l * (1 + s2);
      } else {
        t2 = l + s2 - l * s2;
      }
      const t1 = 2 * l - t2;
      const rgb = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        t3 = h + 1 / 3 * -(i - 1);
        if (t3 < 0) {
          t3++;
        }
        if (t3 > 1) {
          t3--;
        }
        if (6 * t3 < 1) {
          val = t1 + (t2 - t1) * 6 * t3;
        } else if (2 * t3 < 1) {
          val = t2;
        } else if (3 * t3 < 2) {
          val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
        } else {
          val = t1;
        }
        rgb[i] = val * 255;
      }
      return rgb;
    };
    convert.hsl.hsv = function(hsl) {
      const h = hsl[0];
      let s2 = hsl[1] / 100;
      let l = hsl[2] / 100;
      let smin = s2;
      const lmin = Math.max(l, 0.01);
      l *= 2;
      s2 *= l <= 1 ? l : 2 - l;
      smin *= lmin <= 1 ? lmin : 2 - lmin;
      const v = (l + s2) / 2;
      const sv = l === 0 ? 2 * smin / (lmin + smin) : 2 * s2 / (l + s2);
      return [h, sv * 100, v * 100];
    };
    convert.hsv.rgb = function(hsv) {
      const h = hsv[0] / 60;
      const s2 = hsv[1] / 100;
      let v = hsv[2] / 100;
      const hi = Math.floor(h) % 6;
      const f = h - Math.floor(h);
      const p = 255 * v * (1 - s2);
      const q = 255 * v * (1 - s2 * f);
      const t = 255 * v * (1 - s2 * (1 - f));
      v *= 255;
      switch (hi) {
        case 0:
          return [v, t, p];
        case 1:
          return [q, v, p];
        case 2:
          return [p, v, t];
        case 3:
          return [p, q, v];
        case 4:
          return [t, p, v];
        case 5:
          return [v, p, q];
      }
    };
    convert.hsv.hsl = function(hsv) {
      const h = hsv[0];
      const s2 = hsv[1] / 100;
      const v = hsv[2] / 100;
      const vmin = Math.max(v, 0.01);
      let sl;
      let l;
      l = (2 - s2) * v;
      const lmin = (2 - s2) * vmin;
      sl = s2 * vmin;
      sl /= lmin <= 1 ? lmin : 2 - lmin;
      sl = sl || 0;
      l /= 2;
      return [h, sl * 100, l * 100];
    };
    convert.hwb.rgb = function(hwb) {
      const h = hwb[0] / 360;
      let wh = hwb[1] / 100;
      let bl = hwb[2] / 100;
      const ratio = wh + bl;
      let f;
      if (ratio > 1) {
        wh /= ratio;
        bl /= ratio;
      }
      const i = Math.floor(6 * h);
      const v = 1 - bl;
      f = 6 * h - i;
      if ((i & 1) !== 0) {
        f = 1 - f;
      }
      const n = wh + f * (v - wh);
      let r;
      let g;
      let b;
      switch (i) {
        default:
        case 6:
        case 0:
          r = v;
          g = n;
          b = wh;
          break;
        case 1:
          r = n;
          g = v;
          b = wh;
          break;
        case 2:
          r = wh;
          g = v;
          b = n;
          break;
        case 3:
          r = wh;
          g = n;
          b = v;
          break;
        case 4:
          r = n;
          g = wh;
          b = v;
          break;
        case 5:
          r = v;
          g = wh;
          b = n;
          break;
      }
      return [r * 255, g * 255, b * 255];
    };
    convert.cmyk.rgb = function(cmyk) {
      const c = cmyk[0] / 100;
      const m = cmyk[1] / 100;
      const y = cmyk[2] / 100;
      const k = cmyk[3] / 100;
      const r = 1 - Math.min(1, c * (1 - k) + k);
      const g = 1 - Math.min(1, m * (1 - k) + k);
      const b = 1 - Math.min(1, y * (1 - k) + k);
      return [r * 255, g * 255, b * 255];
    };
    convert.xyz.rgb = function(xyz) {
      const x = xyz[0] / 100;
      const y = xyz[1] / 100;
      const z = xyz[2] / 100;
      let r;
      let g;
      let b;
      r = x * 3.2406 + y * -1.5372 + z * -0.4986;
      g = x * -0.9689 + y * 1.8758 + z * 0.0415;
      b = x * 0.0557 + y * -0.204 + z * 1.057;
      r = r > 31308e-7 ? 1.055 * r ** (1 / 2.4) - 0.055 : r * 12.92;
      g = g > 31308e-7 ? 1.055 * g ** (1 / 2.4) - 0.055 : g * 12.92;
      b = b > 31308e-7 ? 1.055 * b ** (1 / 2.4) - 0.055 : b * 12.92;
      r = Math.min(Math.max(0, r), 1);
      g = Math.min(Math.max(0, g), 1);
      b = Math.min(Math.max(0, b), 1);
      return [r * 255, g * 255, b * 255];
    };
    convert.xyz.lab = function(xyz) {
      let x = xyz[0];
      let y = xyz[1];
      let z = xyz[2];
      x /= 95.047;
      y /= 100;
      z /= 108.883;
      x = x > 8856e-6 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
      y = y > 8856e-6 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
      z = z > 8856e-6 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
      const l = 116 * y - 16;
      const a = 500 * (x - y);
      const b = 200 * (y - z);
      return [l, a, b];
    };
    convert.lab.xyz = function(lab) {
      const l = lab[0];
      const a = lab[1];
      const b = lab[2];
      let x;
      let y;
      let z;
      y = (l + 16) / 116;
      x = a / 500 + y;
      z = y - b / 200;
      const y2 = y ** 3;
      const x2 = x ** 3;
      const z2 = z ** 3;
      y = y2 > 8856e-6 ? y2 : (y - 16 / 116) / 7.787;
      x = x2 > 8856e-6 ? x2 : (x - 16 / 116) / 7.787;
      z = z2 > 8856e-6 ? z2 : (z - 16 / 116) / 7.787;
      x *= 95.047;
      y *= 100;
      z *= 108.883;
      return [x, y, z];
    };
    convert.lab.lch = function(lab) {
      const l = lab[0];
      const a = lab[1];
      const b = lab[2];
      let h;
      const hr = Math.atan2(b, a);
      h = hr * 360 / 2 / Math.PI;
      if (h < 0) {
        h += 360;
      }
      const c = Math.sqrt(a * a + b * b);
      return [l, c, h];
    };
    convert.lch.lab = function(lch) {
      const l = lch[0];
      const c = lch[1];
      const h = lch[2];
      const hr = h / 360 * 2 * Math.PI;
      const a = c * Math.cos(hr);
      const b = c * Math.sin(hr);
      return [l, a, b];
    };
    convert.rgb.ansi16 = function(args, saturation = null) {
      const [r, g, b] = args;
      let value = saturation === null ? convert.rgb.hsv(args)[2] : saturation;
      value = Math.round(value / 50);
      if (value === 0) {
        return 30;
      }
      let ansi = 30 + (Math.round(b / 255) << 2 | Math.round(g / 255) << 1 | Math.round(r / 255));
      if (value === 2) {
        ansi += 60;
      }
      return ansi;
    };
    convert.hsv.ansi16 = function(args) {
      return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
    };
    convert.rgb.ansi256 = function(args) {
      const r = args[0];
      const g = args[1];
      const b = args[2];
      if (r === g && g === b) {
        if (r < 8) {
          return 16;
        }
        if (r > 248) {
          return 231;
        }
        return Math.round((r - 8) / 247 * 24) + 232;
      }
      const ansi = 16 + 36 * Math.round(r / 255 * 5) + 6 * Math.round(g / 255 * 5) + Math.round(b / 255 * 5);
      return ansi;
    };
    convert.ansi16.rgb = function(args) {
      let color = args % 10;
      if (color === 0 || color === 7) {
        if (args > 50) {
          color += 3.5;
        }
        color = color / 10.5 * 255;
        return [color, color, color];
      }
      const mult = (~~(args > 50) + 1) * 0.5;
      const r = (color & 1) * mult * 255;
      const g = (color >> 1 & 1) * mult * 255;
      const b = (color >> 2 & 1) * mult * 255;
      return [r, g, b];
    };
    convert.ansi256.rgb = function(args) {
      if (args >= 232) {
        const c = (args - 232) * 10 + 8;
        return [c, c, c];
      }
      args -= 16;
      let rem;
      const r = Math.floor(args / 36) / 5 * 255;
      const g = Math.floor((rem = args % 36) / 6) / 5 * 255;
      const b = rem % 6 / 5 * 255;
      return [r, g, b];
    };
    convert.rgb.hex = function(args) {
      const integer = ((Math.round(args[0]) & 255) << 16) + ((Math.round(args[1]) & 255) << 8) + (Math.round(args[2]) & 255);
      const string = integer.toString(16).toUpperCase();
      return "000000".substring(string.length) + string;
    };
    convert.hex.rgb = function(args) {
      const match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
      if (!match) {
        return [0, 0, 0];
      }
      let colorString = match[0];
      if (match[0].length === 3) {
        colorString = colorString.split("").map((char) => {
          return char + char;
        }).join("");
      }
      const integer = parseInt(colorString, 16);
      const r = integer >> 16 & 255;
      const g = integer >> 8 & 255;
      const b = integer & 255;
      return [r, g, b];
    };
    convert.rgb.hcg = function(rgb) {
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const max = Math.max(Math.max(r, g), b);
      const min = Math.min(Math.min(r, g), b);
      const chroma = max - min;
      let grayscale;
      let hue;
      if (chroma < 1) {
        grayscale = min / (1 - chroma);
      } else {
        grayscale = 0;
      }
      if (chroma <= 0) {
        hue = 0;
      } else if (max === r) {
        hue = (g - b) / chroma % 6;
      } else if (max === g) {
        hue = 2 + (b - r) / chroma;
      } else {
        hue = 4 + (r - g) / chroma;
      }
      hue /= 6;
      hue %= 1;
      return [hue * 360, chroma * 100, grayscale * 100];
    };
    convert.hsl.hcg = function(hsl) {
      const s2 = hsl[1] / 100;
      const l = hsl[2] / 100;
      const c = l < 0.5 ? 2 * s2 * l : 2 * s2 * (1 - l);
      let f = 0;
      if (c < 1) {
        f = (l - 0.5 * c) / (1 - c);
      }
      return [hsl[0], c * 100, f * 100];
    };
    convert.hsv.hcg = function(hsv) {
      const s2 = hsv[1] / 100;
      const v = hsv[2] / 100;
      const c = s2 * v;
      let f = 0;
      if (c < 1) {
        f = (v - c) / (1 - c);
      }
      return [hsv[0], c * 100, f * 100];
    };
    convert.hcg.rgb = function(hcg) {
      const h = hcg[0] / 360;
      const c = hcg[1] / 100;
      const g = hcg[2] / 100;
      if (c === 0) {
        return [g * 255, g * 255, g * 255];
      }
      const pure = [0, 0, 0];
      const hi = h % 1 * 6;
      const v = hi % 1;
      const w = 1 - v;
      let mg = 0;
      switch (Math.floor(hi)) {
        case 0:
          pure[0] = 1;
          pure[1] = v;
          pure[2] = 0;
          break;
        case 1:
          pure[0] = w;
          pure[1] = 1;
          pure[2] = 0;
          break;
        case 2:
          pure[0] = 0;
          pure[1] = 1;
          pure[2] = v;
          break;
        case 3:
          pure[0] = 0;
          pure[1] = w;
          pure[2] = 1;
          break;
        case 4:
          pure[0] = v;
          pure[1] = 0;
          pure[2] = 1;
          break;
        default:
          pure[0] = 1;
          pure[1] = 0;
          pure[2] = w;
      }
      mg = (1 - c) * g;
      return [
        (c * pure[0] + mg) * 255,
        (c * pure[1] + mg) * 255,
        (c * pure[2] + mg) * 255
      ];
    };
    convert.hcg.hsv = function(hcg) {
      const c = hcg[1] / 100;
      const g = hcg[2] / 100;
      const v = c + g * (1 - c);
      let f = 0;
      if (v > 0) {
        f = c / v;
      }
      return [hcg[0], f * 100, v * 100];
    };
    convert.hcg.hsl = function(hcg) {
      const c = hcg[1] / 100;
      const g = hcg[2] / 100;
      const l = g * (1 - c) + 0.5 * c;
      let s2 = 0;
      if (l > 0 && l < 0.5) {
        s2 = c / (2 * l);
      } else if (l >= 0.5 && l < 1) {
        s2 = c / (2 * (1 - l));
      }
      return [hcg[0], s2 * 100, l * 100];
    };
    convert.hcg.hwb = function(hcg) {
      const c = hcg[1] / 100;
      const g = hcg[2] / 100;
      const v = c + g * (1 - c);
      return [hcg[0], (v - c) * 100, (1 - v) * 100];
    };
    convert.hwb.hcg = function(hwb) {
      const w = hwb[1] / 100;
      const b = hwb[2] / 100;
      const v = 1 - b;
      const c = v - w;
      let g = 0;
      if (c < 1) {
        g = (v - c) / (1 - c);
      }
      return [hwb[0], c * 100, g * 100];
    };
    convert.apple.rgb = function(apple) {
      return [apple[0] / 65535 * 255, apple[1] / 65535 * 255, apple[2] / 65535 * 255];
    };
    convert.rgb.apple = function(rgb) {
      return [rgb[0] / 255 * 65535, rgb[1] / 255 * 65535, rgb[2] / 255 * 65535];
    };
    convert.gray.rgb = function(args) {
      return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
    };
    convert.gray.hsl = function(args) {
      return [0, 0, args[0]];
    };
    convert.gray.hsv = convert.gray.hsl;
    convert.gray.hwb = function(gray) {
      return [0, 100, gray[0]];
    };
    convert.gray.cmyk = function(gray) {
      return [0, 0, 0, gray[0]];
    };
    convert.gray.lab = function(gray) {
      return [gray[0], 0, 0];
    };
    convert.gray.hex = function(gray) {
      const val = Math.round(gray[0] / 100 * 255) & 255;
      const integer = (val << 16) + (val << 8) + val;
      const string = integer.toString(16).toUpperCase();
      return "000000".substring(string.length) + string;
    };
    convert.rgb.gray = function(rgb) {
      const val = (rgb[0] + rgb[1] + rgb[2]) / 3;
      return [val / 255 * 100];
    };
  }
});

// node_modules/.pnpm/color-convert@2.0.1/node_modules/color-convert/route.js
var require_route = __commonJS({
  "node_modules/.pnpm/color-convert@2.0.1/node_modules/color-convert/route.js"(exports, module2) {
    init_shims();
    var conversions = require_conversions();
    function buildGraph() {
      const graph = {};
      const models = Object.keys(conversions);
      for (let len = models.length, i = 0; i < len; i++) {
        graph[models[i]] = {
          distance: -1,
          parent: null
        };
      }
      return graph;
    }
    function deriveBFS(fromModel) {
      const graph = buildGraph();
      const queue = [fromModel];
      graph[fromModel].distance = 0;
      while (queue.length) {
        const current = queue.pop();
        const adjacents = Object.keys(conversions[current]);
        for (let len = adjacents.length, i = 0; i < len; i++) {
          const adjacent = adjacents[i];
          const node = graph[adjacent];
          if (node.distance === -1) {
            node.distance = graph[current].distance + 1;
            node.parent = current;
            queue.unshift(adjacent);
          }
        }
      }
      return graph;
    }
    function link(from, to) {
      return function(args) {
        return to(from(args));
      };
    }
    function wrapConversion(toModel, graph) {
      const path = [graph[toModel].parent, toModel];
      let fn = conversions[graph[toModel].parent][toModel];
      let cur = graph[toModel].parent;
      while (graph[cur].parent) {
        path.unshift(graph[cur].parent);
        fn = link(conversions[graph[cur].parent][cur], fn);
        cur = graph[cur].parent;
      }
      fn.conversion = path;
      return fn;
    }
    module2.exports = function(fromModel) {
      const graph = deriveBFS(fromModel);
      const conversion = {};
      const models = Object.keys(graph);
      for (let len = models.length, i = 0; i < len; i++) {
        const toModel = models[i];
        const node = graph[toModel];
        if (node.parent === null) {
          continue;
        }
        conversion[toModel] = wrapConversion(toModel, graph);
      }
      return conversion;
    };
  }
});

// node_modules/.pnpm/color-convert@2.0.1/node_modules/color-convert/index.js
var require_color_convert = __commonJS({
  "node_modules/.pnpm/color-convert@2.0.1/node_modules/color-convert/index.js"(exports, module2) {
    init_shims();
    var conversions = require_conversions();
    var route = require_route();
    var convert = {};
    var models = Object.keys(conversions);
    function wrapRaw(fn) {
      const wrappedFn = function(...args) {
        const arg0 = args[0];
        if (arg0 === void 0 || arg0 === null) {
          return arg0;
        }
        if (arg0.length > 1) {
          args = arg0;
        }
        return fn(args);
      };
      if ("conversion" in fn) {
        wrappedFn.conversion = fn.conversion;
      }
      return wrappedFn;
    }
    function wrapRounded(fn) {
      const wrappedFn = function(...args) {
        const arg0 = args[0];
        if (arg0 === void 0 || arg0 === null) {
          return arg0;
        }
        if (arg0.length > 1) {
          args = arg0;
        }
        const result = fn(args);
        if (typeof result === "object") {
          for (let len = result.length, i = 0; i < len; i++) {
            result[i] = Math.round(result[i]);
          }
        }
        return result;
      };
      if ("conversion" in fn) {
        wrappedFn.conversion = fn.conversion;
      }
      return wrappedFn;
    }
    models.forEach((fromModel) => {
      convert[fromModel] = {};
      Object.defineProperty(convert[fromModel], "channels", { value: conversions[fromModel].channels });
      Object.defineProperty(convert[fromModel], "labels", { value: conversions[fromModel].labels });
      const routes = route(fromModel);
      const routeModels = Object.keys(routes);
      routeModels.forEach((toModel) => {
        const fn = routes[toModel];
        convert[fromModel][toModel] = wrapRounded(fn);
        convert[fromModel][toModel].raw = wrapRaw(fn);
      });
    });
    module2.exports = convert;
  }
});

// node_modules/.pnpm/ansi-styles@4.3.0/node_modules/ansi-styles/index.js
var require_ansi_styles = __commonJS({
  "node_modules/.pnpm/ansi-styles@4.3.0/node_modules/ansi-styles/index.js"(exports, module2) {
    init_shims();
    "use strict";
    var wrapAnsi16 = (fn, offset) => (...args) => {
      const code = fn(...args);
      return `[${code + offset}m`;
    };
    var wrapAnsi256 = (fn, offset) => (...args) => {
      const code = fn(...args);
      return `[${38 + offset};5;${code}m`;
    };
    var wrapAnsi16m = (fn, offset) => (...args) => {
      const rgb = fn(...args);
      return `[${38 + offset};2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
    };
    var ansi2ansi = (n) => n;
    var rgb2rgb = (r, g, b) => [r, g, b];
    var setLazyProperty = (object, property, get) => {
      Object.defineProperty(object, property, {
        get: () => {
          const value = get();
          Object.defineProperty(object, property, {
            value,
            enumerable: true,
            configurable: true
          });
          return value;
        },
        enumerable: true,
        configurable: true
      });
    };
    var colorConvert;
    var makeDynamicStyles = (wrap, targetSpace, identity, isBackground) => {
      if (colorConvert === void 0) {
        colorConvert = require_color_convert();
      }
      const offset = isBackground ? 10 : 0;
      const styles = {};
      for (const [sourceSpace, suite] of Object.entries(colorConvert)) {
        const name = sourceSpace === "ansi16" ? "ansi" : sourceSpace;
        if (sourceSpace === targetSpace) {
          styles[name] = wrap(identity, offset);
        } else if (typeof suite === "object") {
          styles[name] = wrap(suite[targetSpace], offset);
        }
      }
      return styles;
    };
    function assembleStyles() {
      const codes = new Map();
      const styles = {
        modifier: {
          reset: [0, 0],
          bold: [1, 22],
          dim: [2, 22],
          italic: [3, 23],
          underline: [4, 24],
          inverse: [7, 27],
          hidden: [8, 28],
          strikethrough: [9, 29]
        },
        color: {
          black: [30, 39],
          red: [31, 39],
          green: [32, 39],
          yellow: [33, 39],
          blue: [34, 39],
          magenta: [35, 39],
          cyan: [36, 39],
          white: [37, 39],
          blackBright: [90, 39],
          redBright: [91, 39],
          greenBright: [92, 39],
          yellowBright: [93, 39],
          blueBright: [94, 39],
          magentaBright: [95, 39],
          cyanBright: [96, 39],
          whiteBright: [97, 39]
        },
        bgColor: {
          bgBlack: [40, 49],
          bgRed: [41, 49],
          bgGreen: [42, 49],
          bgYellow: [43, 49],
          bgBlue: [44, 49],
          bgMagenta: [45, 49],
          bgCyan: [46, 49],
          bgWhite: [47, 49],
          bgBlackBright: [100, 49],
          bgRedBright: [101, 49],
          bgGreenBright: [102, 49],
          bgYellowBright: [103, 49],
          bgBlueBright: [104, 49],
          bgMagentaBright: [105, 49],
          bgCyanBright: [106, 49],
          bgWhiteBright: [107, 49]
        }
      };
      styles.color.gray = styles.color.blackBright;
      styles.bgColor.bgGray = styles.bgColor.bgBlackBright;
      styles.color.grey = styles.color.blackBright;
      styles.bgColor.bgGrey = styles.bgColor.bgBlackBright;
      for (const [groupName, group] of Object.entries(styles)) {
        for (const [styleName, style] of Object.entries(group)) {
          styles[styleName] = {
            open: `[${style[0]}m`,
            close: `[${style[1]}m`
          };
          group[styleName] = styles[styleName];
          codes.set(style[0], style[1]);
        }
        Object.defineProperty(styles, groupName, {
          value: group,
          enumerable: false
        });
      }
      Object.defineProperty(styles, "codes", {
        value: codes,
        enumerable: false
      });
      styles.color.close = "[39m";
      styles.bgColor.close = "[49m";
      setLazyProperty(styles.color, "ansi", () => makeDynamicStyles(wrapAnsi16, "ansi16", ansi2ansi, false));
      setLazyProperty(styles.color, "ansi256", () => makeDynamicStyles(wrapAnsi256, "ansi256", ansi2ansi, false));
      setLazyProperty(styles.color, "ansi16m", () => makeDynamicStyles(wrapAnsi16m, "rgb", rgb2rgb, false));
      setLazyProperty(styles.bgColor, "ansi", () => makeDynamicStyles(wrapAnsi16, "ansi16", ansi2ansi, true));
      setLazyProperty(styles.bgColor, "ansi256", () => makeDynamicStyles(wrapAnsi256, "ansi256", ansi2ansi, true));
      setLazyProperty(styles.bgColor, "ansi16m", () => makeDynamicStyles(wrapAnsi16m, "rgb", rgb2rgb, true));
      return styles;
    }
    Object.defineProperty(module2, "exports", {
      enumerable: true,
      get: assembleStyles
    });
  }
});

// node_modules/.pnpm/has-flag@4.0.0/node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "node_modules/.pnpm/has-flag@4.0.0/node_modules/has-flag/index.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = (flag, argv = process.argv) => {
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const position = argv.indexOf(prefix + flag);
      const terminatorPosition = argv.indexOf("--");
      return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
    };
  }
});

// node_modules/.pnpm/supports-color@7.2.0/node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "node_modules/.pnpm/supports-color@7.2.0/node_modules/supports-color/index.js"(exports, module2) {
    init_shims();
    "use strict";
    var os = require("os");
    var tty = require("tty");
    var hasFlag = require_has_flag();
    var { env } = process;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      forceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = 1;
    }
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") {
        forceColor = 1;
      } else if (env.FORCE_COLOR === "false") {
        forceColor = 0;
      } else {
        forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
      }
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(haveStream, streamIsTTY) {
      if (forceColor === 0) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (haveStream && !streamIsTTY && forceColor === void 0) {
        return 0;
      }
      const min = forceColor || 0;
      if (env.TERM === "dumb") {
        return min;
      }
      if (process.platform === "win32") {
        const osRelease = os.release().split(".");
        if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      return min;
    }
    function getSupportLevel(stream) {
      const level = supportsColor(stream, stream && stream.isTTY);
      return translateLevel(level);
    }
    module2.exports = {
      supportsColor: getSupportLevel,
      stdout: translateLevel(supportsColor(true, tty.isatty(1))),
      stderr: translateLevel(supportsColor(true, tty.isatty(2)))
    };
  }
});

// node_modules/.pnpm/chalk@4.1.2/node_modules/chalk/source/util.js
var require_util = __commonJS({
  "node_modules/.pnpm/chalk@4.1.2/node_modules/chalk/source/util.js"(exports, module2) {
    init_shims();
    "use strict";
    var stringReplaceAll = (string, substring, replacer) => {
      let index2 = string.indexOf(substring);
      if (index2 === -1) {
        return string;
      }
      const substringLength = substring.length;
      let endIndex = 0;
      let returnValue = "";
      do {
        returnValue += string.substr(endIndex, index2 - endIndex) + substring + replacer;
        endIndex = index2 + substringLength;
        index2 = string.indexOf(substring, endIndex);
      } while (index2 !== -1);
      returnValue += string.substr(endIndex);
      return returnValue;
    };
    var stringEncaseCRLFWithFirstIndex = (string, prefix, postfix, index2) => {
      let endIndex = 0;
      let returnValue = "";
      do {
        const gotCR = string[index2 - 1] === "\r";
        returnValue += string.substr(endIndex, (gotCR ? index2 - 1 : index2) - endIndex) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
        endIndex = index2 + 1;
        index2 = string.indexOf("\n", endIndex);
      } while (index2 !== -1);
      returnValue += string.substr(endIndex);
      return returnValue;
    };
    module2.exports = {
      stringReplaceAll,
      stringEncaseCRLFWithFirstIndex
    };
  }
});

// node_modules/.pnpm/chalk@4.1.2/node_modules/chalk/source/templates.js
var require_templates = __commonJS({
  "node_modules/.pnpm/chalk@4.1.2/node_modules/chalk/source/templates.js"(exports, module2) {
    init_shims();
    "use strict";
    var TEMPLATE_REGEX = /(?:\\(u(?:[a-f\d]{4}|\{[a-f\d]{1,6}\})|x[a-f\d]{2}|.))|(?:\{(~)?(\w+(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?)*)(?:[ \t]|(?=\r?\n)))|(\})|((?:.|[\r\n\f])+?)/gi;
    var STYLE_REGEX = /(?:^|\.)(\w+)(?:\(([^)]*)\))?/g;
    var STRING_REGEX = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/;
    var ESCAPE_REGEX = /\\(u(?:[a-f\d]{4}|{[a-f\d]{1,6}})|x[a-f\d]{2}|.)|([^\\])/gi;
    var ESCAPES = new Map([
      ["n", "\n"],
      ["r", "\r"],
      ["t", "	"],
      ["b", "\b"],
      ["f", "\f"],
      ["v", "\v"],
      ["0", "\0"],
      ["\\", "\\"],
      ["e", ""],
      ["a", "\x07"]
    ]);
    function unescape2(c) {
      const u = c[0] === "u";
      const bracket = c[1] === "{";
      if (u && !bracket && c.length === 5 || c[0] === "x" && c.length === 3) {
        return String.fromCharCode(parseInt(c.slice(1), 16));
      }
      if (u && bracket) {
        return String.fromCodePoint(parseInt(c.slice(2, -1), 16));
      }
      return ESCAPES.get(c) || c;
    }
    function parseArguments(name, arguments_) {
      const results = [];
      const chunks = arguments_.trim().split(/\s*,\s*/g);
      let matches;
      for (const chunk of chunks) {
        const number = Number(chunk);
        if (!Number.isNaN(number)) {
          results.push(number);
        } else if (matches = chunk.match(STRING_REGEX)) {
          results.push(matches[2].replace(ESCAPE_REGEX, (m, escape2, character) => escape2 ? unescape2(escape2) : character));
        } else {
          throw new Error(`Invalid Chalk template style argument: ${chunk} (in style '${name}')`);
        }
      }
      return results;
    }
    function parseStyle(style) {
      STYLE_REGEX.lastIndex = 0;
      const results = [];
      let matches;
      while ((matches = STYLE_REGEX.exec(style)) !== null) {
        const name = matches[1];
        if (matches[2]) {
          const args = parseArguments(name, matches[2]);
          results.push([name].concat(args));
        } else {
          results.push([name]);
        }
      }
      return results;
    }
    function buildStyle(chalk, styles) {
      const enabled = {};
      for (const layer of styles) {
        for (const style of layer.styles) {
          enabled[style[0]] = layer.inverse ? null : style.slice(1);
        }
      }
      let current = chalk;
      for (const [styleName, styles2] of Object.entries(enabled)) {
        if (!Array.isArray(styles2)) {
          continue;
        }
        if (!(styleName in current)) {
          throw new Error(`Unknown Chalk style: ${styleName}`);
        }
        current = styles2.length > 0 ? current[styleName](...styles2) : current[styleName];
      }
      return current;
    }
    module2.exports = (chalk, temporary) => {
      const styles = [];
      const chunks = [];
      let chunk = [];
      temporary.replace(TEMPLATE_REGEX, (m, escapeCharacter, inverse, style, close, character) => {
        if (escapeCharacter) {
          chunk.push(unescape2(escapeCharacter));
        } else if (style) {
          const string = chunk.join("");
          chunk = [];
          chunks.push(styles.length === 0 ? string : buildStyle(chalk, styles)(string));
          styles.push({ inverse, styles: parseStyle(style) });
        } else if (close) {
          if (styles.length === 0) {
            throw new Error("Found extraneous } in Chalk template literal");
          }
          chunks.push(buildStyle(chalk, styles)(chunk.join("")));
          chunk = [];
          styles.pop();
        } else {
          chunk.push(character);
        }
      });
      chunks.push(chunk.join(""));
      if (styles.length > 0) {
        const errMessage = `Chalk template literal is missing ${styles.length} closing bracket${styles.length === 1 ? "" : "s"} (\`}\`)`;
        throw new Error(errMessage);
      }
      return chunks.join("");
    };
  }
});

// node_modules/.pnpm/chalk@4.1.2/node_modules/chalk/source/index.js
var require_source = __commonJS({
  "node_modules/.pnpm/chalk@4.1.2/node_modules/chalk/source/index.js"(exports, module2) {
    init_shims();
    "use strict";
    var ansiStyles = require_ansi_styles();
    var { stdout: stdoutColor, stderr: stderrColor } = require_supports_color();
    var {
      stringReplaceAll,
      stringEncaseCRLFWithFirstIndex
    } = require_util();
    var { isArray } = Array;
    var levelMapping = [
      "ansi",
      "ansi",
      "ansi256",
      "ansi16m"
    ];
    var styles = Object.create(null);
    var applyOptions = (object, options2 = {}) => {
      if (options2.level && !(Number.isInteger(options2.level) && options2.level >= 0 && options2.level <= 3)) {
        throw new Error("The `level` option should be an integer from 0 to 3");
      }
      const colorLevel = stdoutColor ? stdoutColor.level : 0;
      object.level = options2.level === void 0 ? colorLevel : options2.level;
    };
    var ChalkClass = class {
      constructor(options2) {
        return chalkFactory(options2);
      }
    };
    var chalkFactory = (options2) => {
      const chalk2 = {};
      applyOptions(chalk2, options2);
      chalk2.template = (...arguments_) => chalkTag(chalk2.template, ...arguments_);
      Object.setPrototypeOf(chalk2, Chalk.prototype);
      Object.setPrototypeOf(chalk2.template, chalk2);
      chalk2.template.constructor = () => {
        throw new Error("`chalk.constructor()` is deprecated. Use `new chalk.Instance()` instead.");
      };
      chalk2.template.Instance = ChalkClass;
      return chalk2.template;
    };
    function Chalk(options2) {
      return chalkFactory(options2);
    }
    for (const [styleName, style] of Object.entries(ansiStyles)) {
      styles[styleName] = {
        get() {
          const builder = createBuilder(this, createStyler(style.open, style.close, this._styler), this._isEmpty);
          Object.defineProperty(this, styleName, { value: builder });
          return builder;
        }
      };
    }
    styles.visible = {
      get() {
        const builder = createBuilder(this, this._styler, true);
        Object.defineProperty(this, "visible", { value: builder });
        return builder;
      }
    };
    var usedModels = ["rgb", "hex", "keyword", "hsl", "hsv", "hwb", "ansi", "ansi256"];
    for (const model of usedModels) {
      styles[model] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(ansiStyles.color[levelMapping[level]][model](...arguments_), ansiStyles.color.close, this._styler);
            return createBuilder(this, styler, this._isEmpty);
          };
        }
      };
    }
    for (const model of usedModels) {
      const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
      styles[bgModel] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(ansiStyles.bgColor[levelMapping[level]][model](...arguments_), ansiStyles.bgColor.close, this._styler);
            return createBuilder(this, styler, this._isEmpty);
          };
        }
      };
    }
    var proto = Object.defineProperties(() => {
    }, {
      ...styles,
      level: {
        enumerable: true,
        get() {
          return this._generator.level;
        },
        set(level) {
          this._generator.level = level;
        }
      }
    });
    var createStyler = (open, close, parent) => {
      let openAll;
      let closeAll;
      if (parent === void 0) {
        openAll = open;
        closeAll = close;
      } else {
        openAll = parent.openAll + open;
        closeAll = close + parent.closeAll;
      }
      return {
        open,
        close,
        openAll,
        closeAll,
        parent
      };
    };
    var createBuilder = (self, _styler, _isEmpty) => {
      const builder = (...arguments_) => {
        if (isArray(arguments_[0]) && isArray(arguments_[0].raw)) {
          return applyStyle(builder, chalkTag(builder, ...arguments_));
        }
        return applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
      };
      Object.setPrototypeOf(builder, proto);
      builder._generator = self;
      builder._styler = _styler;
      builder._isEmpty = _isEmpty;
      return builder;
    };
    var applyStyle = (self, string) => {
      if (self.level <= 0 || !string) {
        return self._isEmpty ? "" : string;
      }
      let styler = self._styler;
      if (styler === void 0) {
        return string;
      }
      const { openAll, closeAll } = styler;
      if (string.indexOf("") !== -1) {
        while (styler !== void 0) {
          string = stringReplaceAll(string, styler.close, styler.open);
          styler = styler.parent;
        }
      }
      const lfIndex = string.indexOf("\n");
      if (lfIndex !== -1) {
        string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
      }
      return openAll + string + closeAll;
    };
    var template2;
    var chalkTag = (chalk2, ...strings) => {
      const [firstString] = strings;
      if (!isArray(firstString) || !isArray(firstString.raw)) {
        return strings.join(" ");
      }
      const arguments_ = strings.slice(1);
      const parts = [firstString.raw[0]];
      for (let i = 1; i < firstString.length; i++) {
        parts.push(String(arguments_[i - 1]).replace(/[{}\\]/g, "\\$&"), String(firstString.raw[i]));
      }
      if (template2 === void 0) {
        template2 = require_templates();
      }
      return template2(chalk2, parts.join(""));
    };
    Object.defineProperties(Chalk.prototype, styles);
    var chalk = Chalk();
    chalk.supportsColor = stdoutColor;
    chalk.stderr = Chalk({ level: stderrColor ? stderrColor.level : 0 });
    chalk.stderr.supportsColor = stderrColor;
    module2.exports = chalk;
  }
});

// node_modules/.pnpm/deepmerge@4.2.2/node_modules/deepmerge/dist/cjs.js
var require_cjs = __commonJS({
  "node_modules/.pnpm/deepmerge@4.2.2/node_modules/deepmerge/dist/cjs.js"(exports, module2) {
    init_shims();
    "use strict";
    var isMergeableObject = function isMergeableObject2(value) {
      return isNonNullObject(value) && !isSpecial(value);
    };
    function isNonNullObject(value) {
      return !!value && typeof value === "object";
    }
    function isSpecial(value) {
      var stringValue = Object.prototype.toString.call(value);
      return stringValue === "[object RegExp]" || stringValue === "[object Date]" || isReactElement(value);
    }
    var canUseSymbol = typeof Symbol === "function" && Symbol.for;
    var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for("react.element") : 60103;
    function isReactElement(value) {
      return value.$$typeof === REACT_ELEMENT_TYPE;
    }
    function emptyTarget(val) {
      return Array.isArray(val) ? [] : {};
    }
    function cloneUnlessOtherwiseSpecified(value, options2) {
      return options2.clone !== false && options2.isMergeableObject(value) ? deepmerge(emptyTarget(value), value, options2) : value;
    }
    function defaultArrayMerge(target, source, options2) {
      return target.concat(source).map(function(element) {
        return cloneUnlessOtherwiseSpecified(element, options2);
      });
    }
    function getMergeFunction(key, options2) {
      if (!options2.customMerge) {
        return deepmerge;
      }
      var customMerge = options2.customMerge(key);
      return typeof customMerge === "function" ? customMerge : deepmerge;
    }
    function getEnumerableOwnPropertySymbols(target) {
      return Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(target).filter(function(symbol) {
        return target.propertyIsEnumerable(symbol);
      }) : [];
    }
    function getKeys(target) {
      return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
    }
    function propertyIsOnObject(object, property) {
      try {
        return property in object;
      } catch (_) {
        return false;
      }
    }
    function propertyIsUnsafe(target, key) {
      return propertyIsOnObject(target, key) && !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key));
    }
    function mergeObject(target, source, options2) {
      var destination = {};
      if (options2.isMergeableObject(target)) {
        getKeys(target).forEach(function(key) {
          destination[key] = cloneUnlessOtherwiseSpecified(target[key], options2);
        });
      }
      getKeys(source).forEach(function(key) {
        if (propertyIsUnsafe(target, key)) {
          return;
        }
        if (propertyIsOnObject(target, key) && options2.isMergeableObject(source[key])) {
          destination[key] = getMergeFunction(key, options2)(target[key], source[key], options2);
        } else {
          destination[key] = cloneUnlessOtherwiseSpecified(source[key], options2);
        }
      });
      return destination;
    }
    function deepmerge(target, source, options2) {
      options2 = options2 || {};
      options2.arrayMerge = options2.arrayMerge || defaultArrayMerge;
      options2.isMergeableObject = options2.isMergeableObject || isMergeableObject;
      options2.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
      var sourceIsArray = Array.isArray(source);
      var targetIsArray = Array.isArray(target);
      var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
      if (!sourceAndTargetTypesMatch) {
        return cloneUnlessOtherwiseSpecified(source, options2);
      } else if (sourceIsArray) {
        return options2.arrayMerge(target, source, options2);
      } else {
        return mergeObject(target, source, options2);
      }
    }
    deepmerge.all = function deepmergeAll(array, options2) {
      if (!Array.isArray(array)) {
        throw new Error("first argument should be an array");
      }
      return array.reduce(function(prev, next) {
        return deepmerge(prev, next, options2);
      }, {});
    };
    var deepmerge_1 = deepmerge;
    module2.exports = deepmerge_1;
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/vanilla-extract-css.cjs.prod.js
var require_vanilla_extract_css_cjs_prod = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/vanilla-extract-css.cjs.prod.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var transformCss_dist_vanillaExtractCssTransformCss = require_transformCss_c7f35400_cjs_prod();
    var adapter_dist_vanillaExtractCssAdapter = require_vanilla_extract_css_adapter_cjs_prod();
    var hash2 = require_hash_cjs();
    var fileScope_dist_vanillaExtractCssFileScope = require_vanilla_extract_css_fileScope_cjs_prod();
    var _private = require_vanilla_extract_private_cjs();
    var cssesc = require_cssesc();
    var deepObjectDiff = require_dist();
    var chalk = require_source();
    var dedent = require_dedent();
    var deepmerge = require_cjs();
    require_lib();
    function _interopDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    var hash__default = /* @__PURE__ */ _interopDefault(hash2);
    var cssesc__default = /* @__PURE__ */ _interopDefault(cssesc);
    var chalk__default = /* @__PURE__ */ _interopDefault(chalk);
    var dedent__default = /* @__PURE__ */ _interopDefault(dedent);
    var deepmerge__default = /* @__PURE__ */ _interopDefault(deepmerge);
    var stylesheets = {};
    var localClassNames = new Set();
    var composedClassLists = [];
    var bufferedCSSObjs = [];
    function getStylesheet({
      packageName,
      filePath
    }) {
      const fileScopeId = packageName ? `${packageName}${filePath}` : filePath;
      if (stylesheets[fileScopeId]) {
        return stylesheets[fileScopeId];
      }
      const styleEl = document.createElement("style");
      document.head.appendChild(styleEl);
      if (!styleEl.sheet) {
        throw new Error(`Couldn't create stylesheet`);
      }
      stylesheets[fileScopeId] = styleEl.sheet;
      return styleEl.sheet;
    }
    var browserRuntimeAdapter = {
      appendCss: (cssObj) => {
        bufferedCSSObjs.push(cssObj);
      },
      registerClassName: (className) => {
        localClassNames.add(className);
      },
      registerComposition: (composition) => {
        composedClassLists.push(composition);
      },
      markCompositionUsed: () => {
      },
      onEndFileScope: (fileScope) => {
        const css2 = transformCss_dist_vanillaExtractCssTransformCss.transformCss({
          localClassNames: Array.from(localClassNames),
          composedClassLists,
          cssObjs: bufferedCSSObjs
        });
        const stylesheet = getStylesheet(fileScope);
        const existingRuleCount = stylesheet.cssRules.length;
        let ruleIndex = 0;
        for (const rule of css2) {
          try {
            if (ruleIndex < existingRuleCount) {
              stylesheet.deleteRule(ruleIndex);
            }
            stylesheet.insertRule(rule, ruleIndex++);
          } catch (e) {
            console.warn(`Failed to insert rule
${rule}`);
            stylesheet.insertRule(".--placeholder-rule--{}", ruleIndex - 1);
          }
        }
        while (ruleIndex < existingRuleCount) {
          stylesheet.deleteRule(ruleIndex++);
        }
        bufferedCSSObjs = [];
      },
      getIdentOption: () => "short"
    };
    if (typeof window !== "undefined") {
      adapter_dist_vanillaExtractCssAdapter.setAdapterIfNotSet(browserRuntimeAdapter);
    }
    function getDevPrefix(debugId) {
      const parts = debugId ? [debugId] : [];
      const {
        filePath
      } = fileScope_dist_vanillaExtractCssFileScope.getFileScope();
      const matches = filePath.match(/(?<dir>[^\/\\]*)?[\/\\]?(?<file>[^\/\\]*)\.css\.(ts|js|tsx|jsx)$/);
      if (matches && matches.groups) {
        const {
          dir,
          file
        } = matches.groups;
        parts.unshift(file && file !== "index" ? file : dir);
      }
      return parts.join("_");
    }
    function generateIdentifier(debugId) {
      const refCount = fileScope_dist_vanillaExtractCssFileScope.getAndIncrementRefCounter().toString(36);
      const {
        filePath,
        packageName
      } = fileScope_dist_vanillaExtractCssFileScope.getFileScope();
      const fileScopeHash = hash__default["default"](packageName ? `${packageName}${filePath}` : filePath);
      let identifier = `${fileScopeHash}${refCount}`;
      if (adapter_dist_vanillaExtractCssAdapter.getIdentOption() === "debug") {
        const devPrefix = getDevPrefix(debugId);
        if (devPrefix) {
          identifier = `${devPrefix}__${identifier}`;
        }
      }
      return identifier.match(/^[0-9]/) ? `_${identifier}` : identifier;
    }
    var normaliseObject = (obj) => _private.walkObject(obj, () => "");
    function validateContract(contract, tokens) {
      const theDiff = deepObjectDiff.diff(normaliseObject(contract), normaliseObject(tokens));
      const valid = Object.keys(theDiff).length === 0;
      return {
        valid,
        diffString: valid ? "" : renderDiff(contract, theDiff)
      };
    }
    function diffLine(value, nesting, type) {
      const whitespace = [...Array(nesting).keys()].map(() => "  ").join("");
      const line = `${type ? type : " "}${whitespace}${value}`;
      {
        if (type === "-") {
          return chalk__default["default"].red(line);
        }
        if (type === "+") {
          return chalk__default["default"].green(line);
        }
      }
      return line;
    }
    function renderDiff(orig, diff, nesting = 0) {
      const lines = [];
      if (nesting === 0) {
        lines.push(diffLine("{", 0));
      }
      const innerNesting = nesting + 1;
      const keys = Object.keys(diff).sort();
      for (const key of keys) {
        const value = diff[key];
        if (!(key in orig)) {
          lines.push(diffLine(`${key}: ...,`, innerNesting, "+"));
        } else if (typeof value === "object") {
          lines.push(diffLine(`${key}: {`, innerNesting));
          lines.push(renderDiff(orig[key], diff[key], innerNesting));
          lines.push(diffLine("}", innerNesting));
        } else {
          lines.push(diffLine(`${key}: ...,`, innerNesting, "-"));
        }
      }
      if (nesting === 0) {
        lines.push(diffLine("}", 0));
      }
      return lines.join("\n");
    }
    function createVar(debugId) {
      const refCount = fileScope_dist_vanillaExtractCssFileScope.getAndIncrementRefCounter().toString(36);
      const {
        filePath,
        packageName
      } = fileScope_dist_vanillaExtractCssFileScope.getFileScope();
      const fileScopeHash = hash__default["default"](packageName ? `${packageName}${filePath}` : filePath);
      const varName = adapter_dist_vanillaExtractCssAdapter.getIdentOption() === "debug" && debugId ? `${debugId}__${fileScopeHash}${refCount}` : `${fileScopeHash}${refCount}`;
      const cssVarName = cssesc__default["default"](varName.match(/^[0-9]/) ? `_${varName}` : varName, {
        isIdentifier: true
      });
      return `var(--${cssVarName})`;
    }
    function fallbackVar(...values) {
      let finalValue = "";
      values.reverse().forEach((value) => {
        if (finalValue === "") {
          finalValue = String(value);
        } else {
          if (typeof value !== "string" || !/^var\(--.*\)$/.test(value)) {
            throw new Error(`Invalid variable name: ${value}`);
          }
          finalValue = value.replace(/\)$/, `, ${finalValue})`);
        }
      });
      return finalValue;
    }
    function assignVars(varContract, tokens) {
      const varSetters = {};
      const {
        valid,
        diffString
      } = validateContract(varContract, tokens);
      if (!valid) {
        throw new Error(`Tokens don't match contract.
${diffString}`);
      }
      _private.walkObject(tokens, (value, path) => {
        varSetters[_private.get(varContract, path)] = String(value);
      });
      return varSetters;
    }
    function createThemeContract(tokens) {
      return _private.walkObject(tokens, (_value, path) => {
        return createVar(path.join("-"));
      });
    }
    function createGlobalThemeContract(tokens, mapFn) {
      return _private.walkObject(tokens, (value, path) => {
        const rawVarName = typeof mapFn === "function" ? mapFn(value, path) : value;
        const varName = typeof rawVarName === "string" ? rawVarName.replace(/^\-\-/, "") : null;
        if (typeof varName !== "string" || varName !== cssesc__default["default"](varName, {
          isIdentifier: true
        })) {
          throw new Error(`Invalid variable name for "${path.join(".")}": ${varName}`);
        }
        return `var(--${varName})`;
      });
    }
    function createGlobalTheme(selector, arg2, arg3) {
      const shouldCreateVars = Boolean(!arg3);
      const themeVars = shouldCreateVars ? createThemeContract(arg2) : arg2;
      const tokens = shouldCreateVars ? arg2 : arg3;
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "global",
        selector,
        rule: {
          vars: assignVars(themeVars, tokens)
        }
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      if (shouldCreateVars) {
        return themeVars;
      }
    }
    function createTheme(arg1, arg2, arg3) {
      const themeClassName = generateIdentifier(typeof arg2 === "object" ? arg3 : arg2);
      adapter_dist_vanillaExtractCssAdapter.registerClassName(themeClassName);
      const vars = typeof arg2 === "object" ? createGlobalTheme(themeClassName, arg1, arg2) : createGlobalTheme(themeClassName, arg1);
      return vars ? [themeClassName, vars] : themeClassName;
    }
    function composedStyle(rules, debugId) {
      const className = generateIdentifier(debugId);
      adapter_dist_vanillaExtractCssAdapter.registerClassName(className);
      const classList = [];
      const styleRules = [];
      for (const rule of rules) {
        if (typeof rule === "string") {
          classList.push(rule);
        } else {
          styleRules.push(rule);
        }
      }
      let result = className;
      if (classList.length > 0) {
        result = `${className} ${transformCss_dist_vanillaExtractCssTransformCss.dudupeAndJoinClassList(classList)}`;
        adapter_dist_vanillaExtractCssAdapter.registerComposition({
          identifier: className,
          classList: result
        });
        if (styleRules.length > 0) {
          adapter_dist_vanillaExtractCssAdapter.markCompositionUsed(className);
        }
      }
      if (styleRules.length > 0) {
        const rule = deepmerge__default["default"].all(styleRules, {
          arrayMerge: (_, sourceArray) => sourceArray
        });
        adapter_dist_vanillaExtractCssAdapter.appendCss({
          type: "local",
          selector: className,
          rule
        }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      }
      return result;
    }
    function style(rule, debugId) {
      if (Array.isArray(rule)) {
        return composedStyle(rule, debugId);
      }
      const className = generateIdentifier(debugId);
      adapter_dist_vanillaExtractCssAdapter.registerClassName(className);
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "local",
        selector: className,
        rule
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      return className;
    }
    function composeStyles(...classNames) {
      const compose = fileScope_dist_vanillaExtractCssFileScope.hasFileScope() ? composedStyle : transformCss_dist_vanillaExtractCssTransformCss.dudupeAndJoinClassList;
      return compose(classNames);
    }
    function globalStyle2(selector, rule) {
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "global",
        selector,
        rule
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
    }
    function fontFace(rule, debugId) {
      const fontFamily = `"${cssesc__default["default"](generateIdentifier(debugId), {
        quotes: "double"
      })}"`;
      if ("fontFamily" in rule) {
        throw new Error(dedent__default["default"]`
          This function creates and returns a hashed font-family name, so the "fontFamily" property should not be provided.
  
          If you'd like to define a globally scoped custom font, you can use the "globalFontFace" function instead.
        `);
      }
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "fontFace",
        rule: {
          ...rule,
          fontFamily
        }
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      return fontFamily;
    }
    function globalFontFace(fontFamily, rule) {
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "fontFace",
        rule: {
          ...rule,
          fontFamily
        }
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
    }
    function keyframes(rule, debugId) {
      const name = cssesc__default["default"](generateIdentifier(debugId), {
        isIdentifier: true
      });
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "keyframes",
        name,
        rule
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      return name;
    }
    function globalKeyframes(name, rule) {
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "keyframes",
        name,
        rule
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
    }
    function styleVariants(...args) {
      if (typeof args[1] === "function") {
        const data = args[0];
        const mapData = args[1];
        const debugId2 = args[2];
        const classMap2 = {};
        for (const key in data) {
          classMap2[key] = style(mapData(data[key], key), debugId2 ? `${debugId2}_${key}` : key);
        }
        return classMap2;
      }
      const styleMap = args[0];
      const debugId = args[1];
      const classMap = {};
      for (const key in styleMap) {
        classMap[key] = style(styleMap[key], debugId ? `${debugId}_${key}` : key);
      }
      return classMap;
    }
    exports.assignVars = assignVars;
    exports.composeStyles = composeStyles;
    exports.createGlobalTheme = createGlobalTheme;
    exports.createGlobalThemeContract = createGlobalThemeContract;
    exports.createTheme = createTheme;
    exports.createThemeContract = createThemeContract;
    exports.createVar = createVar;
    exports.fallbackVar = fallbackVar;
    exports.fontFace = fontFace;
    exports.generateIdentifier = generateIdentifier;
    exports.globalFontFace = globalFontFace;
    exports.globalKeyframes = globalKeyframes;
    exports.globalStyle = globalStyle2;
    exports.keyframes = keyframes;
    exports.style = style;
    exports.styleVariants = styleVariants;
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/transformCss-e20be974.cjs.dev.js
var require_transformCss_e20be974_cjs_dev = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/transformCss-e20be974.cjs.dev.js"(exports) {
    init_shims();
    "use strict";
    var _private = require_vanilla_extract_private_cjs();
    var cssesc = require_cssesc();
    var adapter_dist_vanillaExtractCssAdapter = require_vanilla_extract_css_adapter_cjs_dev();
    var cssWhat = require_lib();
    var dedent = require_dedent();
    function _interopDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    var cssesc__default = /* @__PURE__ */ _interopDefault(cssesc);
    var dedent__default = /* @__PURE__ */ _interopDefault(dedent);
    function forEach(obj, fn) {
      for (const key in obj) {
        fn(obj[key], key);
      }
    }
    function omit(obj, omitKeys) {
      let result = {};
      for (const key in obj) {
        if (omitKeys.indexOf(key) === -1) {
          result[key] = obj[key];
        }
      }
      return result;
    }
    function mapKeys(obj, fn) {
      let result = {};
      for (const key in obj) {
        result[fn(obj[key], key)] = obj[key];
      }
      return result;
    }
    function composeStylesIntoSet(set, ...classNames) {
      for (const className of classNames) {
        if (className.length === 0) {
          continue;
        }
        if (typeof className === "string") {
          if (className.includes(" ")) {
            composeStylesIntoSet(set, ...className.trim().split(" "));
          } else {
            set.add(className);
          }
        } else if (Array.isArray(className)) {
          composeStylesIntoSet(set, ...className);
        }
      }
    }
    function dudupeAndJoinClassList(classNames) {
      const set = new Set();
      composeStylesIntoSet(set, ...classNames);
      return Array.from(set).join(" ");
    }
    function escapeRegex(string) {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }
    var validateSelector = (selector, targetClassName) => {
      const replaceTarget = () => {
        const targetRegex = new RegExp(`.${escapeRegex(cssesc__default["default"](targetClassName, {
          isIdentifier: true
        }))}`, "g");
        return selector.replace(targetRegex, "&");
      };
      let selectorParts;
      try {
        selectorParts = cssWhat.parse(selector);
      } catch (err) {
        throw new Error(`Invalid selector: ${replaceTarget()}`);
      }
      selectorParts.forEach((tokens) => {
        try {
          for (let i = tokens.length - 1; i >= -1; i--) {
            if (!tokens[i]) {
              throw new Error();
            }
            const token = tokens[i];
            if (token.type === "child" || token.type === "parent" || token.type === "sibling" || token.type === "adjacent" || token.type === "descendant") {
              throw new Error();
            }
            if (token.type === "attribute" && token.name === "class" && token.value === targetClassName) {
              return;
            }
          }
        } catch (err) {
          throw new Error(dedent__default["default"]`
        Invalid selector: ${replaceTarget()}
    
        Style selectors must target the '&' character (along with any modifiers), e.g. ${"`${parent} &`"} or ${"`${parent} &:hover`"}.
        
        This is to ensure that each style block only affects the styling of a single class.
        
        If your selector is targeting another class, you should move it to the style definition for that class, e.g. given we have styles for 'parent' and 'child' elements, instead of adding a selector of ${"`& ${child}`"}) to 'parent', you should add ${"`${parent} &`"} to 'child').
        
        If your selector is targeting something global, use the 'globalStyle' function instead, e.g. if you wanted to write ${"`& h1`"}, you should instead write 'globalStyle(${"`${parent} h1`"}, { ... })'
      `);
        }
      });
    };
    var ConditionalRuleset = class {
      constructor() {
        this.ruleset = [];
        this.precedenceLookup = new Map();
      }
      findOrCreateCondition(conditionQuery) {
        let targetCondition = this.ruleset.find((cond) => cond.query === conditionQuery);
        if (!targetCondition) {
          targetCondition = {
            query: conditionQuery,
            rules: [],
            children: new ConditionalRuleset()
          };
          this.ruleset.push(targetCondition);
        }
        return targetCondition;
      }
      getConditionalRulesetByPath(conditionPath) {
        let currRuleset = this;
        for (const query of conditionPath) {
          const condition = currRuleset.findOrCreateCondition(query);
          currRuleset = condition.children;
        }
        return currRuleset;
      }
      addRule(rule, conditionQuery, conditionPath) {
        const ruleset = this.getConditionalRulesetByPath(conditionPath);
        const targetCondition = ruleset.findOrCreateCondition(conditionQuery);
        if (!targetCondition) {
          throw new Error("Failed to add conditional rule");
        }
        targetCondition.rules.push(rule);
      }
      addConditionPrecedence(conditionPath, conditionOrder) {
        const ruleset = this.getConditionalRulesetByPath(conditionPath);
        for (let i = 0; i < conditionOrder.length; i++) {
          var _ruleset$precedenceLo;
          const condition = conditionOrder[i];
          const conditionPrecedence = (_ruleset$precedenceLo = ruleset.precedenceLookup.get(condition)) !== null && _ruleset$precedenceLo !== void 0 ? _ruleset$precedenceLo : new Set();
          for (const lowerPrecedenceCondition of conditionOrder.slice(i + 1)) {
            conditionPrecedence.add(lowerPrecedenceCondition);
          }
          ruleset.precedenceLookup.set(condition, conditionPrecedence);
        }
      }
      isCompatible(incomingRuleset) {
        for (const [condition, orderPrecedence] of this.precedenceLookup.entries()) {
          for (const lowerPrecedenceCondition of orderPrecedence) {
            var _incomingRuleset$prec;
            if ((_incomingRuleset$prec = incomingRuleset.precedenceLookup.get(lowerPrecedenceCondition)) !== null && _incomingRuleset$prec !== void 0 && _incomingRuleset$prec.has(condition)) {
              return false;
            }
          }
        }
        for (const {
          query,
          children
        } of incomingRuleset.ruleset) {
          const matchingCondition = this.ruleset.find((cond) => cond.query === query);
          if (matchingCondition && !matchingCondition.children.isCompatible(children)) {
            return false;
          }
        }
        return true;
      }
      merge(incomingRuleset) {
        for (const {
          query,
          rules,
          children
        } of incomingRuleset.ruleset) {
          const matchingCondition = this.ruleset.find((cond) => cond.query === query);
          if (matchingCondition) {
            matchingCondition.rules.push(...rules);
            matchingCondition.children.merge(children);
          } else {
            this.ruleset.push({
              query,
              rules,
              children
            });
          }
        }
        for (const [condition, incomingOrderPrecedence] of incomingRuleset.precedenceLookup.entries()) {
          var _this$precedenceLooku;
          const orderPrecedence = (_this$precedenceLooku = this.precedenceLookup.get(condition)) !== null && _this$precedenceLooku !== void 0 ? _this$precedenceLooku : new Set();
          this.precedenceLookup.set(condition, new Set([...orderPrecedence, ...incomingOrderPrecedence]));
        }
      }
      mergeIfCompatible(incomingRuleset) {
        if (!this.isCompatible(incomingRuleset)) {
          return false;
        }
        this.merge(incomingRuleset);
        return true;
      }
      sort() {
        this.ruleset.sort((a, b) => {
          const aWeights = this.precedenceLookup.get(a.query);
          if (aWeights !== null && aWeights !== void 0 && aWeights.has(b.query)) {
            return -1;
          }
          const bWeights = this.precedenceLookup.get(b.query);
          if (bWeights !== null && bWeights !== void 0 && bWeights.has(a.query)) {
            return 1;
          }
          return 0;
        });
      }
      renderToArray() {
        this.sort();
        const arr = [];
        for (const {
          query,
          rules,
          children
        } of this.ruleset) {
          const selectors = {};
          for (const rule of rules) {
            selectors[rule.selector] = rule.rule;
          }
          Object.assign(selectors, ...children.renderToArray());
          arr.push({
            [query]: selectors
          });
        }
        return arr;
      }
    };
    var simplePseudoMap = {
      ":-moz-any-link": true,
      ":-moz-full-screen": true,
      ":-moz-placeholder": true,
      ":-moz-read-only": true,
      ":-moz-read-write": true,
      ":-ms-fullscreen": true,
      ":-ms-input-placeholder": true,
      ":-webkit-any-link": true,
      ":-webkit-full-screen": true,
      "::-moz-placeholder": true,
      "::-moz-progress-bar": true,
      "::-moz-range-progress": true,
      "::-moz-range-thumb": true,
      "::-moz-range-track": true,
      "::-moz-selection": true,
      "::-ms-backdrop": true,
      "::-ms-browse": true,
      "::-ms-check": true,
      "::-ms-clear": true,
      "::-ms-fill": true,
      "::-ms-fill-lower": true,
      "::-ms-fill-upper": true,
      "::-ms-reveal": true,
      "::-ms-thumb": true,
      "::-ms-ticks-after": true,
      "::-ms-ticks-before": true,
      "::-ms-tooltip": true,
      "::-ms-track": true,
      "::-ms-value": true,
      "::-webkit-backdrop": true,
      "::-webkit-input-placeholder": true,
      "::-webkit-progress-bar": true,
      "::-webkit-progress-inner-value": true,
      "::-webkit-progress-value": true,
      "::-webkit-resizer": true,
      "::-webkit-scrollbar-button": true,
      "::-webkit-scrollbar-corner": true,
      "::-webkit-scrollbar-thumb": true,
      "::-webkit-scrollbar-track-piece": true,
      "::-webkit-scrollbar-track": true,
      "::-webkit-scrollbar": true,
      "::-webkit-slider-runnable-track": true,
      "::-webkit-slider-thumb": true,
      "::after": true,
      "::backdrop": true,
      "::before": true,
      "::cue": true,
      "::first-letter": true,
      "::first-line": true,
      "::grammar-error": true,
      "::placeholder": true,
      "::selection": true,
      "::spelling-error": true,
      ":active": true,
      ":after": true,
      ":any-link": true,
      ":before": true,
      ":blank": true,
      ":checked": true,
      ":default": true,
      ":defined": true,
      ":disabled": true,
      ":empty": true,
      ":enabled": true,
      ":first": true,
      ":first-child": true,
      ":first-letter": true,
      ":first-line": true,
      ":first-of-type": true,
      ":focus": true,
      ":focus-visible": true,
      ":focus-within": true,
      ":fullscreen": true,
      ":hover": true,
      ":in-range": true,
      ":indeterminate": true,
      ":invalid": true,
      ":last-child": true,
      ":last-of-type": true,
      ":left": true,
      ":link": true,
      ":only-child": true,
      ":only-of-type": true,
      ":optional": true,
      ":out-of-range": true,
      ":placeholder-shown": true,
      ":read-only": true,
      ":read-write": true,
      ":required": true,
      ":right": true,
      ":root": true,
      ":scope": true,
      ":target": true,
      ":valid": true,
      ":visited": true
    };
    var simplePseudos = Object.keys(simplePseudoMap);
    var simplePseudoLookup = simplePseudoMap;
    var UNITLESS = {
      animationIterationCount: true,
      borderImage: true,
      borderImageOutset: true,
      borderImageSlice: true,
      borderImageWidth: true,
      boxFlex: true,
      boxFlexGroup: true,
      columnCount: true,
      columns: true,
      flex: true,
      flexGrow: true,
      flexShrink: true,
      fontWeight: true,
      gridArea: true,
      gridColumn: true,
      gridColumnEnd: true,
      gridColumnStart: true,
      gridRow: true,
      gridRowEnd: true,
      gridRowStart: true,
      initialLetter: true,
      lineClamp: true,
      lineHeight: true,
      maxLines: true,
      opacity: true,
      order: true,
      orphans: true,
      tabSize: true,
      WebkitLineClamp: true,
      widows: true,
      zIndex: true,
      zoom: true,
      fillOpacity: true,
      floodOpacity: true,
      maskBorder: true,
      maskBorderOutset: true,
      maskBorderSlice: true,
      maskBorderWidth: true,
      shapeImageThreshold: true,
      stopOpacity: true,
      strokeDashoffset: true,
      strokeMiterlimit: true,
      strokeOpacity: true,
      strokeWidth: true
    };
    function dashify(str) {
      return str.replace(/([A-Z])/g, "-$1").replace(/^ms-/, "-ms-").toLowerCase();
    }
    var DOUBLE_SPACE = "  ";
    var specialKeys = [...simplePseudos, "@media", "@supports", "selectors"];
    var Stylesheet = class {
      constructor(localClassNames, composedClassLists) {
        this.rules = [];
        this.conditionalRulesets = [new ConditionalRuleset()];
        this.fontFaceRules = [];
        this.keyframesRules = [];
        this.localClassNameRegex = localClassNames.length > 0 ? RegExp(`(${localClassNames.join("|")})`, "g") : null;
        this.composedClassLists = composedClassLists.map(({
          identifier,
          classList
        }) => ({
          identifier,
          regex: RegExp(`(${classList})`, "g")
        })).reverse();
      }
      processCssObj(root) {
        if (root.type === "fontFace") {
          this.fontFaceRules.push(root.rule);
          return;
        }
        if (root.type === "keyframes") {
          this.keyframesRules.push(root);
          return;
        }
        const mainRule = omit(root.rule, specialKeys);
        this.addRule({
          selector: root.selector,
          rule: mainRule
        });
        this.currConditionalRuleset = new ConditionalRuleset();
        this.transformMedia(root, root.rule["@media"]);
        this.transformSupports(root, root.rule["@supports"]);
        this.transformSimplePseudos(root, root.rule);
        this.transformSelectors(root, root.rule);
        const activeConditionalRuleset = this.conditionalRulesets[this.conditionalRulesets.length - 1];
        if (!activeConditionalRuleset.mergeIfCompatible(this.currConditionalRuleset)) {
          this.conditionalRulesets.push(this.currConditionalRuleset);
        }
      }
      addConditionalRule(cssRule, conditions) {
        const rule = this.transformVars(this.pixelifyProperties(cssRule.rule));
        const selector = this.transformSelector(cssRule.selector);
        if (!this.currConditionalRuleset) {
          throw new Error(`Couldn't add conditional rule`);
        }
        const conditionQuery = conditions[conditions.length - 1];
        const parentConditions = conditions.slice(0, conditions.length - 1);
        this.currConditionalRuleset.addRule({
          selector,
          rule
        }, conditionQuery, parentConditions);
      }
      addRule(cssRule) {
        const rule = this.transformVars(this.pixelifyProperties(cssRule.rule));
        const selector = this.transformSelector(cssRule.selector);
        this.rules.push({
          selector,
          rule
        });
      }
      pixelifyProperties(cssRule) {
        forEach(cssRule, (value, key) => {
          if (typeof value === "number" && value !== 0 && !UNITLESS[key]) {
            cssRule[key] = `${value}px`;
          }
        });
        return cssRule;
      }
      transformVars({
        vars,
        ...rest
      }) {
        if (!vars) {
          return rest;
        }
        return {
          ...mapKeys(vars, (_value, key) => _private.getVarName(key)),
          ...rest
        };
      }
      transformSelector(selector) {
        let transformedSelector = selector;
        for (const {
          identifier,
          regex
        } of this.composedClassLists) {
          transformedSelector = transformedSelector.replace(regex, () => {
            adapter_dist_vanillaExtractCssAdapter.markCompositionUsed(identifier);
            return identifier;
          });
        }
        return this.localClassNameRegex ? transformedSelector.replace(this.localClassNameRegex, (_, className, index2) => {
          if (index2 > 0 && transformedSelector[index2 - 1] === ".") {
            return className;
          }
          return `.${cssesc__default["default"](className, {
            isIdentifier: true
          })}`;
        }) : transformedSelector;
      }
      transformSelectors(root, rule, conditions) {
        forEach(rule.selectors, (selectorRule, selector) => {
          if (root.type !== "local") {
            throw new Error(`Selectors are not allowed within ${root.type === "global" ? '"globalStyle"' : '"selectors"'}`);
          }
          const transformedSelector = this.transformSelector(selector.replace(RegExp("&", "g"), root.selector));
          validateSelector(transformedSelector, root.selector);
          const rule2 = {
            selector: transformedSelector,
            rule: omit(selectorRule, specialKeys)
          };
          if (conditions) {
            this.addConditionalRule(rule2, conditions);
          } else {
            this.addRule(rule2);
          }
          const selectorRoot = {
            type: "selector",
            selector: transformedSelector,
            rule: selectorRule
          };
          this.transformSupports(selectorRoot, selectorRule["@supports"], conditions);
          this.transformMedia(selectorRoot, selectorRule["@media"], conditions);
        });
      }
      transformMedia(root, rules, parentConditions = []) {
        if (rules) {
          var _this$currConditional;
          (_this$currConditional = this.currConditionalRuleset) === null || _this$currConditional === void 0 ? void 0 : _this$currConditional.addConditionPrecedence(parentConditions, Object.keys(rules).map((query) => `@media ${query}`));
          forEach(rules, (mediaRule, query) => {
            const conditions = [...parentConditions, `@media ${query}`];
            this.addConditionalRule({
              selector: root.selector,
              rule: omit(mediaRule, specialKeys)
            }, conditions);
            if (root.type === "local") {
              this.transformSimplePseudos(root, mediaRule, conditions);
              this.transformSelectors(root, mediaRule, conditions);
            }
            this.transformSupports(root, mediaRule["@supports"], conditions);
          });
        }
      }
      transformSupports(root, rules, parentConditions = []) {
        if (rules) {
          var _this$currConditional2;
          (_this$currConditional2 = this.currConditionalRuleset) === null || _this$currConditional2 === void 0 ? void 0 : _this$currConditional2.addConditionPrecedence(parentConditions, Object.keys(rules).map((query) => `@supports ${query}`));
          forEach(rules, (supportsRule, query) => {
            const conditions = [...parentConditions, `@supports ${query}`];
            this.addConditionalRule({
              selector: root.selector,
              rule: omit(supportsRule, specialKeys)
            }, conditions);
            if (root.type === "local") {
              this.transformSimplePseudos(root, supportsRule, conditions);
              this.transformSelectors(root, supportsRule, conditions);
            }
            this.transformMedia(root, supportsRule["@media"], conditions);
          });
        }
      }
      transformSimplePseudos(root, rule, conditions) {
        for (const key of Object.keys(rule)) {
          if (simplePseudoLookup[key]) {
            if (root.type !== "local") {
              throw new Error(`Simple pseudos are not valid in ${root.type === "global" ? '"globalStyle"' : '"selectors"'}`);
            }
            if (conditions) {
              this.addConditionalRule({
                selector: `${root.selector}${key}`,
                rule: rule[key]
              }, conditions);
            } else {
              this.addRule({
                conditions,
                selector: `${root.selector}${key}`,
                rule: rule[key]
              });
            }
          }
        }
      }
      toCss() {
        const css2 = [];
        for (const fontFaceRule of this.fontFaceRules) {
          css2.push(renderCss({
            "@font-face": fontFaceRule
          }));
        }
        for (const keyframe of this.keyframesRules) {
          css2.push(renderCss({
            [`@keyframes ${keyframe.name}`]: keyframe.rule
          }));
        }
        for (const rule of this.rules) {
          css2.push(renderCss({
            [rule.selector]: rule.rule
          }));
        }
        for (const conditionalRuleset of this.conditionalRulesets) {
          for (const conditionalRule of conditionalRuleset.renderToArray()) {
            css2.push(renderCss(conditionalRule));
          }
        }
        return css2.filter(Boolean);
      }
    };
    function renderCss(v, indent = "") {
      const rules = [];
      for (const key of Object.keys(v)) {
        const value = v[key];
        if (value && Array.isArray(value)) {
          rules.push(...value.map((v2) => renderCss({
            [key]: v2
          }, indent)));
        } else if (value && typeof value === "object") {
          const isEmpty = Object.keys(value).length === 0;
          if (!isEmpty) {
            rules.push(`${indent}${key} {
${renderCss(value, indent + DOUBLE_SPACE)}
${indent}}`);
          }
        } else {
          rules.push(`${indent}${key.startsWith("--") ? key : dashify(key)}: ${value};`);
        }
      }
      return rules.join("\n");
    }
    function transformCss({
      localClassNames,
      cssObjs,
      composedClassLists
    }) {
      const stylesheet = new Stylesheet(localClassNames, composedClassLists);
      for (const root of cssObjs) {
        stylesheet.processCssObj(root);
      }
      return stylesheet.toCss();
    }
    exports.dudupeAndJoinClassList = dudupeAndJoinClassList;
    exports.transformCss = transformCss;
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/vanilla-extract-css.cjs.dev.js
var require_vanilla_extract_css_cjs_dev = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/vanilla-extract-css.cjs.dev.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var transformCss_dist_vanillaExtractCssTransformCss = require_transformCss_e20be974_cjs_dev();
    var adapter_dist_vanillaExtractCssAdapter = require_vanilla_extract_css_adapter_cjs_dev();
    var hash2 = require_hash_cjs();
    var fileScope_dist_vanillaExtractCssFileScope = require_vanilla_extract_css_fileScope_cjs_dev();
    var _private = require_vanilla_extract_private_cjs();
    var cssesc = require_cssesc();
    var deepObjectDiff = require_dist();
    var chalk = require_source();
    var dedent = require_dedent();
    var deepmerge = require_cjs();
    require_lib();
    function _interopDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    var hash__default = /* @__PURE__ */ _interopDefault(hash2);
    var cssesc__default = /* @__PURE__ */ _interopDefault(cssesc);
    var chalk__default = /* @__PURE__ */ _interopDefault(chalk);
    var dedent__default = /* @__PURE__ */ _interopDefault(dedent);
    var deepmerge__default = /* @__PURE__ */ _interopDefault(deepmerge);
    var stylesheets = {};
    var localClassNames = new Set();
    var composedClassLists = [];
    var bufferedCSSObjs = [];
    function getStylesheet({
      packageName,
      filePath
    }) {
      const fileScopeId = packageName ? `${packageName}${filePath}` : filePath;
      if (stylesheets[fileScopeId]) {
        return stylesheets[fileScopeId];
      }
      const styleEl = document.createElement("style");
      document.head.appendChild(styleEl);
      if (!styleEl.sheet) {
        throw new Error(`Couldn't create stylesheet`);
      }
      stylesheets[fileScopeId] = styleEl.sheet;
      return styleEl.sheet;
    }
    var browserRuntimeAdapter = {
      appendCss: (cssObj) => {
        bufferedCSSObjs.push(cssObj);
      },
      registerClassName: (className) => {
        localClassNames.add(className);
      },
      registerComposition: (composition) => {
        composedClassLists.push(composition);
      },
      markCompositionUsed: () => {
      },
      onEndFileScope: (fileScope) => {
        const css2 = transformCss_dist_vanillaExtractCssTransformCss.transformCss({
          localClassNames: Array.from(localClassNames),
          composedClassLists,
          cssObjs: bufferedCSSObjs
        });
        const stylesheet = getStylesheet(fileScope);
        const existingRuleCount = stylesheet.cssRules.length;
        let ruleIndex = 0;
        for (const rule of css2) {
          try {
            if (ruleIndex < existingRuleCount) {
              stylesheet.deleteRule(ruleIndex);
            }
            stylesheet.insertRule(rule, ruleIndex++);
          } catch (e) {
            console.warn(`Failed to insert rule
${rule}`);
            stylesheet.insertRule(".--placeholder-rule--{}", ruleIndex - 1);
          }
        }
        while (ruleIndex < existingRuleCount) {
          stylesheet.deleteRule(ruleIndex++);
        }
        bufferedCSSObjs = [];
      },
      getIdentOption: () => process.env.NODE_ENV === "production" ? "short" : "debug"
    };
    if (typeof window !== "undefined") {
      adapter_dist_vanillaExtractCssAdapter.setAdapterIfNotSet(browserRuntimeAdapter);
    }
    function getDevPrefix(debugId) {
      const parts = debugId ? [debugId] : [];
      const {
        filePath
      } = fileScope_dist_vanillaExtractCssFileScope.getFileScope();
      const matches = filePath.match(/(?<dir>[^\/\\]*)?[\/\\]?(?<file>[^\/\\]*)\.css\.(ts|js|tsx|jsx)$/);
      if (matches && matches.groups) {
        const {
          dir,
          file
        } = matches.groups;
        parts.unshift(file && file !== "index" ? file : dir);
      }
      return parts.join("_");
    }
    function generateIdentifier(debugId) {
      const refCount = fileScope_dist_vanillaExtractCssFileScope.getAndIncrementRefCounter().toString(36);
      const {
        filePath,
        packageName
      } = fileScope_dist_vanillaExtractCssFileScope.getFileScope();
      const fileScopeHash = hash__default["default"](packageName ? `${packageName}${filePath}` : filePath);
      let identifier = `${fileScopeHash}${refCount}`;
      if (adapter_dist_vanillaExtractCssAdapter.getIdentOption() === "debug") {
        const devPrefix = getDevPrefix(debugId);
        if (devPrefix) {
          identifier = `${devPrefix}__${identifier}`;
        }
      }
      return identifier.match(/^[0-9]/) ? `_${identifier}` : identifier;
    }
    var normaliseObject = (obj) => _private.walkObject(obj, () => "");
    function validateContract(contract, tokens) {
      const theDiff = deepObjectDiff.diff(normaliseObject(contract), normaliseObject(tokens));
      const valid = Object.keys(theDiff).length === 0;
      return {
        valid,
        diffString: valid ? "" : renderDiff(contract, theDiff)
      };
    }
    function diffLine(value, nesting, type) {
      const whitespace = [...Array(nesting).keys()].map(() => "  ").join("");
      const line = `${type ? type : " "}${whitespace}${value}`;
      if (process.env.NODE_ENV !== "test") {
        if (type === "-") {
          return chalk__default["default"].red(line);
        }
        if (type === "+") {
          return chalk__default["default"].green(line);
        }
      }
      return line;
    }
    function renderDiff(orig, diff, nesting = 0) {
      const lines = [];
      if (nesting === 0) {
        lines.push(diffLine("{", 0));
      }
      const innerNesting = nesting + 1;
      const keys = Object.keys(diff).sort();
      for (const key of keys) {
        const value = diff[key];
        if (!(key in orig)) {
          lines.push(diffLine(`${key}: ...,`, innerNesting, "+"));
        } else if (typeof value === "object") {
          lines.push(diffLine(`${key}: {`, innerNesting));
          lines.push(renderDiff(orig[key], diff[key], innerNesting));
          lines.push(diffLine("}", innerNesting));
        } else {
          lines.push(diffLine(`${key}: ...,`, innerNesting, "-"));
        }
      }
      if (nesting === 0) {
        lines.push(diffLine("}", 0));
      }
      return lines.join("\n");
    }
    function createVar(debugId) {
      const refCount = fileScope_dist_vanillaExtractCssFileScope.getAndIncrementRefCounter().toString(36);
      const {
        filePath,
        packageName
      } = fileScope_dist_vanillaExtractCssFileScope.getFileScope();
      const fileScopeHash = hash__default["default"](packageName ? `${packageName}${filePath}` : filePath);
      const varName = adapter_dist_vanillaExtractCssAdapter.getIdentOption() === "debug" && debugId ? `${debugId}__${fileScopeHash}${refCount}` : `${fileScopeHash}${refCount}`;
      const cssVarName = cssesc__default["default"](varName.match(/^[0-9]/) ? `_${varName}` : varName, {
        isIdentifier: true
      });
      return `var(--${cssVarName})`;
    }
    function fallbackVar(...values) {
      let finalValue = "";
      values.reverse().forEach((value) => {
        if (finalValue === "") {
          finalValue = String(value);
        } else {
          if (typeof value !== "string" || !/^var\(--.*\)$/.test(value)) {
            throw new Error(`Invalid variable name: ${value}`);
          }
          finalValue = value.replace(/\)$/, `, ${finalValue})`);
        }
      });
      return finalValue;
    }
    function assignVars(varContract, tokens) {
      const varSetters = {};
      const {
        valid,
        diffString
      } = validateContract(varContract, tokens);
      if (!valid) {
        throw new Error(`Tokens don't match contract.
${diffString}`);
      }
      _private.walkObject(tokens, (value, path) => {
        varSetters[_private.get(varContract, path)] = String(value);
      });
      return varSetters;
    }
    function createThemeContract(tokens) {
      return _private.walkObject(tokens, (_value, path) => {
        return createVar(path.join("-"));
      });
    }
    function createGlobalThemeContract(tokens, mapFn) {
      return _private.walkObject(tokens, (value, path) => {
        const rawVarName = typeof mapFn === "function" ? mapFn(value, path) : value;
        const varName = typeof rawVarName === "string" ? rawVarName.replace(/^\-\-/, "") : null;
        if (typeof varName !== "string" || varName !== cssesc__default["default"](varName, {
          isIdentifier: true
        })) {
          throw new Error(`Invalid variable name for "${path.join(".")}": ${varName}`);
        }
        return `var(--${varName})`;
      });
    }
    function createGlobalTheme(selector, arg2, arg3) {
      const shouldCreateVars = Boolean(!arg3);
      const themeVars = shouldCreateVars ? createThemeContract(arg2) : arg2;
      const tokens = shouldCreateVars ? arg2 : arg3;
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "global",
        selector,
        rule: {
          vars: assignVars(themeVars, tokens)
        }
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      if (shouldCreateVars) {
        return themeVars;
      }
    }
    function createTheme(arg1, arg2, arg3) {
      const themeClassName = generateIdentifier(typeof arg2 === "object" ? arg3 : arg2);
      adapter_dist_vanillaExtractCssAdapter.registerClassName(themeClassName);
      const vars = typeof arg2 === "object" ? createGlobalTheme(themeClassName, arg1, arg2) : createGlobalTheme(themeClassName, arg1);
      return vars ? [themeClassName, vars] : themeClassName;
    }
    function composedStyle(rules, debugId) {
      const className = generateIdentifier(debugId);
      adapter_dist_vanillaExtractCssAdapter.registerClassName(className);
      const classList = [];
      const styleRules = [];
      for (const rule of rules) {
        if (typeof rule === "string") {
          classList.push(rule);
        } else {
          styleRules.push(rule);
        }
      }
      let result = className;
      if (classList.length > 0) {
        result = `${className} ${transformCss_dist_vanillaExtractCssTransformCss.dudupeAndJoinClassList(classList)}`;
        adapter_dist_vanillaExtractCssAdapter.registerComposition({
          identifier: className,
          classList: result
        });
        if (styleRules.length > 0) {
          adapter_dist_vanillaExtractCssAdapter.markCompositionUsed(className);
        }
      }
      if (styleRules.length > 0) {
        const rule = deepmerge__default["default"].all(styleRules, {
          arrayMerge: (_, sourceArray) => sourceArray
        });
        adapter_dist_vanillaExtractCssAdapter.appendCss({
          type: "local",
          selector: className,
          rule
        }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      }
      return result;
    }
    function style(rule, debugId) {
      if (Array.isArray(rule)) {
        return composedStyle(rule, debugId);
      }
      const className = generateIdentifier(debugId);
      adapter_dist_vanillaExtractCssAdapter.registerClassName(className);
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "local",
        selector: className,
        rule
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      return className;
    }
    function composeStyles(...classNames) {
      const compose = fileScope_dist_vanillaExtractCssFileScope.hasFileScope() ? composedStyle : transformCss_dist_vanillaExtractCssTransformCss.dudupeAndJoinClassList;
      return compose(classNames);
    }
    function globalStyle2(selector, rule) {
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "global",
        selector,
        rule
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
    }
    function fontFace(rule, debugId) {
      const fontFamily = `"${cssesc__default["default"](generateIdentifier(debugId), {
        quotes: "double"
      })}"`;
      if ("fontFamily" in rule) {
        throw new Error(dedent__default["default"]`
          This function creates and returns a hashed font-family name, so the "fontFamily" property should not be provided.
  
          If you'd like to define a globally scoped custom font, you can use the "globalFontFace" function instead.
        `);
      }
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "fontFace",
        rule: {
          ...rule,
          fontFamily
        }
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      return fontFamily;
    }
    function globalFontFace(fontFamily, rule) {
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "fontFace",
        rule: {
          ...rule,
          fontFamily
        }
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
    }
    function keyframes(rule, debugId) {
      const name = cssesc__default["default"](generateIdentifier(debugId), {
        isIdentifier: true
      });
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "keyframes",
        name,
        rule
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
      return name;
    }
    function globalKeyframes(name, rule) {
      adapter_dist_vanillaExtractCssAdapter.appendCss({
        type: "keyframes",
        name,
        rule
      }, fileScope_dist_vanillaExtractCssFileScope.getFileScope());
    }
    function styleVariants(...args) {
      if (typeof args[1] === "function") {
        const data = args[0];
        const mapData = args[1];
        const debugId2 = args[2];
        const classMap2 = {};
        for (const key in data) {
          classMap2[key] = style(mapData(data[key], key), debugId2 ? `${debugId2}_${key}` : key);
        }
        return classMap2;
      }
      const styleMap = args[0];
      const debugId = args[1];
      const classMap = {};
      for (const key in styleMap) {
        classMap[key] = style(styleMap[key], debugId ? `${debugId}_${key}` : key);
      }
      return classMap;
    }
    exports.assignVars = assignVars;
    exports.composeStyles = composeStyles;
    exports.createGlobalTheme = createGlobalTheme;
    exports.createGlobalThemeContract = createGlobalThemeContract;
    exports.createTheme = createTheme;
    exports.createThemeContract = createThemeContract;
    exports.createVar = createVar;
    exports.fallbackVar = fallbackVar;
    exports.fontFace = fontFace;
    exports.generateIdentifier = generateIdentifier;
    exports.globalFontFace = globalFontFace;
    exports.globalKeyframes = globalKeyframes;
    exports.globalStyle = globalStyle2;
    exports.keyframes = keyframes;
    exports.style = style;
    exports.styleVariants = styleVariants;
  }
});

// node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/vanilla-extract-css.cjs.js
var require_vanilla_extract_css_cjs = __commonJS({
  "node_modules/.pnpm/@vanilla-extract+css@1.5.1/node_modules/@vanilla-extract/css/dist/vanilla-extract-css.cjs.js"(exports, module2) {
    init_shims();
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_vanilla_extract_css_cjs_prod();
    } else {
      module2.exports = require_vanilla_extract_css_cjs_dev();
    }
  }
});

// .svelte-kit/netlify/entry.js
__export(exports, {
  handler: () => handler
});
init_shims();

// .svelte-kit/output/server/app.js
init_shims();
var import_fileScope = __toModule(require_vanilla_extract_css_fileScope_cjs());
var import_css = __toModule(require_vanilla_extract_css_cjs());
var __require2 = typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _map;
function get_single_valued_header(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function error$1(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler2 = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler2) {
    return;
  }
  const params = route.params(match);
  const response = await handler2({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error$1(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error$1(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
Promise.resolve();
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
var s$1 = JSON.stringify;
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  page
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page && page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page && page.path)},
						query: new URLSearchParams(${page ? s$1(page.query.toString()) : ""}),
						params: ${page && s$1(page.params)}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url="${url}"`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(err);
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ ...error2, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  return loaded;
}
var s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  context,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module2.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const filename = resolved.replace(options2.paths.assets, "").slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d) => d.file === filename || d.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = {
            ...opts.headers
          };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key2 !== "etag") {
                    headers[key2] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":${escape$1(body)}}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      context: { ...context }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    context: loaded.context || context,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
var escaped$2 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape$1(str) {
  let result = '"';
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$2) {
      result += escaped$2[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += `\\u${code.toString(16).toUpperCase()}`;
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
var absolute = /^([a-z]+:)?\/?\//;
function resolve(base2, path) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
function coalesce_to_error(err) {
  return err instanceof Error ? err : new Error(JSON.stringify(err));
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    context: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      context: loaded ? loaded.context : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: ""
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let context = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              context,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options2.handle_error(e, request);
            status = 500;
            error2 = e;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    context: node_loaded.context,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options2.handle_error(e, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.context) {
          context = {
            ...context,
            ...loaded.loaded.context
          };
        }
      }
    }
  try {
    return with_cookies(await render_response({
      ...opts,
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    }), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return with_cookies(await respond_with_error({
      ...opts,
      status: 500,
      error: error3
    }), set_cookie_headers);
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
var ReadOnlyFormData = class {
  constructor(map) {
    __privateAdd(this, _map, void 0);
    __privateSet(this, _map, map);
  }
  get(key) {
    const value = __privateGet(this, _map).get(key);
    return value && value[0];
  }
  getAll(key) {
    return __privateGet(this, _map).get(key);
  }
  has(key) {
    return __privateGet(this, _map).has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key] of __privateGet(this, _map))
      yield key;
  }
  *values() {
    for (const [, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield value[i];
      }
    }
  }
};
_map = new WeakMap();
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        for (const route of options2.manifest.routes) {
          const match = route.pattern.exec(request2.path);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options2, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: ""
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options2.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
var current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
Promise.resolve();
var escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
var missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
var on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : context || []),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function afterUpdate() {
}
var css = {
  code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n<\/script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}/>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\t{title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t#svelte-announcer {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\tclip: rect(0 0 0 0);\\n\\t\\tclip-path: inset(50%);\\n\\t\\toverflow: hidden;\\n\\t\\twhite-space: nowrap;\\n\\t\\twidth: 1px;\\n\\t\\theight: 1px;\\n\\t}\\n</style>"],"names":[],"mappings":"AAsDC,iBAAiB,eAAC,CAAC,AAClB,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnB,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACZ,CAAC"}`
};
var Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page !== void 0)
    $$bindings.page(page);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css);
  {
    stores.page.set(page);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${``}`;
});
var base = "";
var assets = "";
function set_paths(paths) {
  base = paths.base;
  assets = paths.assets || base;
}
function set_prerendering(value) {
}
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
var template = ({ head, body }) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.png" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
var options = null;
var default_settings = { paths: { "base": "", "assets": "" } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-4e5f5f83.js",
      css: [assets + "/_app/assets/start-61d1577b.css"],
      js: [assets + "/_app/start-4e5f5f83.js", assets + "/_app/chunks/vendor-fec8eb36.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
var empty = () => ({});
var manifest = {
  assets: [{ "file": "favicon.png", "size": 1571, "type": "image/png" }],
  layout: ".svelte-kit/build/components/layout.svelte",
  error: ".svelte-kit/build/components/error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: [".svelte-kit/build/components/layout.svelte", "src/routes/index.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    }
  ]
};
var get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
  externalFetch: hooks.externalFetch || fetch
});
var module_lookup = {
  ".svelte-kit/build/components/layout.svelte": () => Promise.resolve().then(function() {
    return layout;
  }),
  ".svelte-kit/build/components/error.svelte": () => Promise.resolve().then(function() {
    return error;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index;
  })
};
var metadata_lookup = { ".svelte-kit/build/components/layout.svelte": { "entry": "layout.svelte-42dfbed3.js", "css": [], "js": ["layout.svelte-42dfbed3.js", "chunks/vendor-fec8eb36.js"], "styles": [] }, ".svelte-kit/build/components/error.svelte": { "entry": "error.svelte-7f7034c6.js", "css": [], "js": ["error.svelte-7f7034c6.js", "chunks/vendor-fec8eb36.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-3d3dda6a.js", "css": ["assets/pages/index.svelte-fcb4a637.css"], "js": ["pages/index.svelte-3d3dda6a.js", "chunks/vendor-fec8eb36.js"], "styles": [] } };
async function load_component(file) {
  const { entry, css: css2, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css2.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender });
}
var Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${slots.default ? slots.default({}) : ``}`;
});
var layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Layout
});
function load({ error: error2, status }) {
  return { props: { error: error2, status } };
}
var Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status } = $$props;
  let { error: error2 } = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  return `<h1>${escape(status)}</h1>

<pre>${escape(error2.message)}</pre>



${error2.frame ? `<pre>${escape(error2.frame)}</pre>` : ``}
${error2.stack ? `<pre>${escape(error2.stack)}</pre>` : ``}`;
});
var error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Error$1,
  load
});
(0, import_fileScope.setFileScope)("src/lib/styles.css.ts", "~TODO~");
(0, import_css.globalStyle)("html, body", {
  background: "red"
});
(0, import_fileScope.endFileScope)();
var Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="${"https://kit.svelte.dev"}">kit.svelte.dev</a> to read the documentation</p>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Routes
});

// .svelte-kit/netlify/entry.js
init();
async function handler(event) {
  const { path, httpMethod, headers, rawQuery, body, isBase64Encoded } = event;
  const query = new URLSearchParams(rawQuery);
  const encoding = isBase64Encoded ? "base64" : headers["content-encoding"] || "utf-8";
  const rawBody = typeof body === "string" ? Buffer.from(body, encoding) : body;
  const rendered = await render({
    method: httpMethod,
    headers,
    path,
    query,
    rawBody
  });
  if (rendered) {
    return {
      isBase64Encoded: false,
      statusCode: rendered.status,
      ...splitHeaders(rendered.headers),
      body: rendered.body
    };
  }
  return {
    statusCode: 404,
    body: "Not found"
  };
}
function splitHeaders(headers) {
  const h = {};
  const m = {};
  for (const key in headers) {
    const value = headers[key];
    const target = Array.isArray(value) ? m : h;
    target[key] = value;
  }
  return {
    headers: h,
    multiValueHeaders: m
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
/*! https://mths.be/cssesc v3.0.0 by @mathias */
