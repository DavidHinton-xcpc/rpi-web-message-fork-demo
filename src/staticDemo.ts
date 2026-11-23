// Static demo backend. The rest of the UI is the current rpi-web frontend,
// unchanged except for the message action placement documented in README.md.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Json = Record<string, any>;

const NOW = 1_760_000_000_000;

const projects = [
  { id: "project-a", name: "pi-rust", path: "/workspace/pi-rust", archived: false },
  { id: "project-b", name: "rpi-package", path: "/workspace/rpi-package", archived: false },
];

const demoMessages = [
  {
    entryId: "entry-user-1",
    role: "user",
    content: [{ type: "text", text: "帮我分析一下当前 fork 和 clone 的区别。" }],
    timestamp: NOW - 120000,
  },
  {
    entryId: "entry-assistant-1",
    role: "assistant",
    content: [
      {
        type: "text",
        text: [
          "当前 Web 端的 fork 与 clone 在底层走的是同一条 fork 路径：",
          "",
          "- `clone` 不带 `entryId`，复制当前会话；",
          "- `fork` 带 `entryId` 时，会先复制完整历史，再把新会话的 main leaf 移动到指定消息。",
          "",
          "因此用户可以更自然地在某条回复下分叉，而不必从顶部工具栏寻找入口。",
        ].join("\n"),
      },
    ],
    timestamp: NOW - 119000,
  },
  {
    entryId: "entry-user-2",
    role: "user",
    content: [{ type: "text", text: "那在 UI 上怎么表达更清楚？" }],
    timestamp: NOW - 60000,
  },
  {
    entryId: "entry-assistant-2",
    role: "assistant",
    content: [
      {
        type: "text",
        text: [
          "把 **fork** 放到每条模型回复下面，与复制、朗读并列：",
          "",
          "1. 从左到右保持 `复制 → fork → 朗读`；",
          "2. 三个操作只显示图标，去掉文字标签，降低视觉噪音；",
          "3. 从顶部栏移除 fork，保留 clone 作为独立的整会话复制入口。",
          "",
          "这样 fork 的作用域就是当前这条回复，语义更直接。",
        ].join("\n"),
      },
    ],
    timestamp: NOW - 59000,
  },
];

type DemoSession = Json & {
  sessionId: string;
  title: string | null;
  projectId: string;
  parentSessionId?: string | null;
  relation?: string | null;
  forkEntryId?: string | null;
};

const sessions: DemoSession[] = [
  {
    sessionId: "session-1",
    title: "Fork placement demo",
    projectId: "project-a",
    status: "ready",
    pinned: false,
    archived: false,
    deleting: false,
    tags: ["ui-demo"],
    createdAt: NOW - 180000,
    updatedAt: NOW,
    lastSeq: 4,
    error: null,
    parentSessionId: null,
    relation: null,
    forkEntryId: null,
    latestSettlement: { outcome: "completed" },
  },
];

function stateData(sessionId: string): Json {
  return {
    sessionId,
    status: "ready",
    modelId: "gpt-5.1-codex",
    provider: "openai",
    thinkingLevel: "medium",
    leafId: "entry-assistant-2",
    activeTools: ["bash", "read", "write"],
    queue: { steeringCount: 0, followUpCount: 0 },
    stats: {
      messageCount: 4,
      cachedTokens: 1280,
      uncachedTokens: 320,
      totalTokens: 1600,
      input: 1280,
      output: 320,
      cost: 0.012,
      costTotal: 0.012,
      provider: "openai",
      modelId: "gpt-5.1-codex",
    },
  };
}

function snapshot(sessionId: string, includeHistory = false): Json {
  const session = sessions.find((item) => item.sessionId === sessionId) ?? sessions[0];
  const messages = session.relation === "fork" && session.forkEntryId
    ? demoMessages.slice(0, Math.max(1, demoMessages.findIndex((m) => m.entryId === session.forkEntryId) + 1))
    : demoMessages;
  return {
    sessionId,
    status: "ready",
    supportedCommands: undefined,
    messages,
    total: messages.length,
    truncated: false,
    lastSeq: 8,
    firstId: messages[0]?.entryId ?? null,
    lastId: messages[messages.length - 1]?.entryId ?? null,
    leafId: messages[messages.length - 1]?.entryId ?? null,
    pendingResume: false,
    pendingDialog: null,
    pendingDialogs: [],
    latestSettlement: { outcome: "completed" },
    hasMore: false,
    events: [],
    ...(includeHistory
      ? {
          history: {
            records: [
              {
                id: "record-1",
                type: "operation_finished",
                seq: 6,
                runId: "run-demo",
                outcome: "completed",
                timestamp: NOW - 59000,
              },
            ],
            total: 1,
            limit: 100,
            afterSeq: 0,
            beforeSeq: null,
            firstSeq: 6,
            lastSeq: 6,
            hasMore: false,
            openOperations: [],
          },
        }
      : {}),
  };
}

function reply(data: unknown, command = "mock"): Json {
  return { type: "response", command, success: true, data };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function bodyJson(init?: RequestInit): Json {
  if (!init?.body) return {};
  try {
    return JSON.parse(String(init.body)) as Json;
  } catch {
    return {};
  }
}

function sessionIdFrom(path: string): string {
  return path.split("/")[4] ?? "session-1";
}

function commandResponse(id: string, body: Json): Json {
  const type = String(body.type ?? "unknown");
  switch (type) {
    case "get_state":
      return reply(stateData(id), type);
    case "get_messages":
      return reply({ messages: snapshot(id).messages, total: demoMessages.length, hasMore: false }, type);
    case "get_history":
      return reply(snapshot(id, true).history, type);
    case "get_queue":
      return reply({ items: [], count: 0 }, type);
    case "get_stats":
      return reply(stateData(id).stats, type);
    case "get_auth_status":
      return reply({ providers: [] }, type);
    case "get_available_models":
      return reply({ models: [{ id: "gpt-5.1-codex", name: "GPT-5.1 Codex", provider: "openai", contextWindow: 256000 }] }, type);
    case "get_available_thinking_levels":
      return reply({ levels: ["minimal", "low", "medium", "high", "xhigh"] }, type);
    case "get_available_tools":
      return reply({ tools: ["bash", "read", "write"], activeTools: ["bash", "read", "write"] }, type);
    case "get_commands":
      return reply({ commands: [] }, type);
    default:
      return reply({}, type);
  }
}

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input), window.location.origin);
  const path = url.pathname;
  if (!path.startsWith("/api/v1/")) return fetch(input, init);

  const method = (init?.method ?? "GET").toUpperCase();
  const body = bodyJson(init);

  if (path === "/api/v1/auth") return json({ required: false, authenticated: true });
  if (path === "/api/v1/capabilities") {
    return json({
      protocol: "rpi",
      piCompatibilityTarget: "1.2.0",
      supportedCommands: [
        "get_state",
        "get_messages",
        "get_history",
        "get_stats",
        "get_queue",
        "navigate",
        "prompt",
        "abort",
        "get_auth_status",
        "get_available_models",
        "get_available_thinking_levels",
        "get_available_tools",
      ],
      supportedActions: [
        "history",
        "queue",
        "queue_status",
        "fork",
        "clone",
        "stats",
        "history_mutation",
        "provider_auth",
        "session_metadata",
        "projects",
        "session_organization",
        "files",
        "git_diff",
      ],
      parityComplete: false,
    });
  }
  if (path === "/api/v1/projects") {
    return json({ projects, defaultProjectId: "project-a", projectsRoot: "/workspace/projects" });
  }
  if (path === "/api/v1/project-folders") {
    return json({ root: "/workspace/projects", folders: [{ name: "pi-rust", path: "pi-rust" }] });
  }
  if (/\/projects\/[^/]+\/files$/.test(path)) {
    return json({ path: "", entries: [{ name: "README.md", path: "README.md", kind: "file", size: 128 }] });
  }
  if (/\/projects\/[^/]+\/file$/.test(path)) {
    return json({ path: url.searchParams.get("path"), content: "# rpi-web fork placement demo\n" });
  }
  if (/\/projects\/[^/]+\/git\/status$/.test(path)) {
    return json({ isRepository: true, branch: "main", files: [] });
  }

  if (path === "/api/v1/sessions" && method === "GET") return json({ sessions });
  if (path === "/api/v1/sessions" && method === "POST") {
    return json({ sessionId: "session-1", projectId: "project-a", status: "ready" }, 201);
  }
  if (/\/sessions\/[^/]+\/open$/.test(path)) {
    return json(sessions.find((item) => item.sessionId === sessionIdFrom(path)) ?? sessions[0]);
  }
  if (/\/sessions\/[^/]+\/snapshot$/.test(path)) {
    return json(snapshot(sessionIdFrom(path), url.searchParams.get("includeHistory") === "true"));
  }
  if (/\/sessions\/[^/]+\/events$/.test(path)) {
    return new Response('event: ready\ndata: {"type":"ready"}\n\n', {
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" },
    });
  }
  if (/\/sessions\/[^/]+\/commands$/.test(path) && method === "POST") {
    return json(commandResponse(sessionIdFrom(path), body));
  }
  if (/\/sessions\/[^/]+\/message-summaries$/.test(path)) {
    return json({ filtered: true, role: "user", messages: [], firstId: null, lastId: null, nextBeforeId: null, hasMore: false, leafId: "entry-assistant-2" });
  }
  if (/\/sessions\/[^/]+\/message-window$/.test(path)) {
    return json({ messages: [], firstId: null, lastId: null, nextBeforeId: null, nextAfterId: null, hasMoreBefore: false, hasMoreAfter: false, leafId: "entry-assistant-2" });
  }
  if (/\/sessions\/[^/]+\/(fork|clone)$/.test(path) && method === "POST") {
    const relation = path.endsWith("/fork") ? "fork" : "clone";
    const id = relation === "fork" ? "session-fork-demo" : "session-clone-demo";
    const existing = sessions.find((item) => item.sessionId === id);
    const created: DemoSession = existing ?? {
      sessionId: id,
      title: String(body.title ?? (relation === "fork" ? "Fork of Fork placement demo" : "Clone of Fork placement demo")),
      projectId: "project-a",
      status: "ready",
      pinned: false,
      archived: false,
      deleting: false,
      tags: [relation],
      createdAt: NOW,
      updatedAt: NOW,
      lastSeq: 8,
      error: null,
      parentSessionId: "session-1",
      relation,
      forkEntryId: relation === "fork" ? String(body.entryId ?? "entry-assistant-2") : null,
      latestSettlement: { outcome: "completed" },
    };
    if (!existing) sessions.push(created);
    if (window.location.search.includes("session=")) {
      const next = new URL(window.location.href);
      next.searchParams.set("session", created.sessionId);
      window.history.replaceState({}, "", next);
    }
    setTimeout(() => window.dispatchEvent(new PopStateEvent("popstate")), 0);
    return json({ sessionId: created.sessionId, sourceSessionId: "session-1", status: "ready" }, 201);
  }
  if (/\/sessions\/[^/]+\/metadata$/.test(path)) {
    const session = sessions.find((item) => item.sessionId === sessionIdFrom(path));
    return json(session ?? sessions[0]);
  }
  if (/\/sessions\/[^/]+\/rename$/.test(path)) {
    const session = sessions.find((item) => item.sessionId === sessionIdFrom(path));
    if (session) session.title = String(body.title ?? session.title);
    return json(session ?? sessions[0]);
  }

  return json(reply({}));
}

(window as Window & { __rpiStaticDemoFetch?: typeof window.fetch }).__rpiStaticDemoFetch = window.fetch.bind(window);
window.fetch = mockFetch;

// The demo has no live event stream. A never-opening EventSource keeps the
// workspace in its ordinary `connected` paint without a fake reconnect state.
class DemoEventSource extends EventSource {
  constructor(url: string | URL, init?: EventSourceInit) {
    super(url, init);
    this.close();
  }
}
window.EventSource = DemoEventSource;
