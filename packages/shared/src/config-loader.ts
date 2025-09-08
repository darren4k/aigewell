import { load as yaml } from "js-yaml";
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import deepmerge from "deepmerge";
import dotenv from "dotenv";

dotenv.config();

export type ConfigSchema = {
  app: {
    name: string;
    env: string;
    region?: string;
    logLevel: "debug" | "info" | "warn" | "error";
    redact?: string[];
    piiFields?: string[];
  };
  tenancy?: {
    defaultTenant: string;
    allowCrossTenant: boolean;
    tenants: string[];
  };
  llm: {
    defaultProvider: string;
    defaultModel: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    parallelToolCalls?: boolean;
    adapters: Record<string, {
      endpoint: string;
      apiKey: string;
    }>;
  };
  routing: {
    rules: Array<{
      name: string;
      match: string;
      provider?: string;
      model?: string;
      temperature?: number;
      strategy?: "default" | "fallback";
      budget?: {
        maxCostUSD?: number;
        maxLatencyMs?: number;
      };
      candidates?: Array<{
        provider: string;
        model: string;
        temperature?: number;
      }>;
    }>;
  };
  agents: Record<string, {
    systemPrompt: string;
    outputSchema?: string;
    tools?: string[];
    retry?: {
      max: number;
      backoffMs: number;
    };
    cacheKey?: string;
    sandbox?: string;
    idempotent?: boolean;
    specialization?: string;
    requiredPolicies?: string[];
  }>;
  security: {
    sanitizeInputs: boolean;
    outputValidation: boolean;
    allowlistDomains?: string[];
    toolScopes?: Record<string, string[]>;
    dataResidency?: string;
    retentionDays?: number;
    hipaaCompliant?: boolean;
    encryptAtRest?: boolean;
  };
  observability: {
    tracing?: string;
    sampleRate?: number;
    metrics?: any;
    logs?: any;
  };
  cost?: {
    currency: string;
    tokenPrices: Record<string, { input: number; output: number }>;
    hardLimits?: {
      daily?: number;
      monthly?: number;
      perTenant?: number;
    };
  };
  flags?: any;
  cache?: any;
  evals?: any;
  rateLimit?: any;
  privacy?: any;
};

type Any = Record<string, any>;

function readYaml(p: string): Any {
  return yaml(fs.readFileSync(p, "utf8")) as Any;
}

function exists(p: string) { 
  try { 
    fs.accessSync(p); 
    return true; 
  } catch { 
    return false; 
  } 
}

export function loadConfig(opts?: {
  base?: string;
  overlay?: "dev" | "staging" | "prod";
  tenant?: string;
  configRoot?: string;
}): ConfigSchema {
  const configRoot = opts?.configRoot ?? "config";
  const basePath = opts?.base ?? path.join(configRoot, "base.yml");
  
  if (!exists(basePath)) {
    throw new Error(`Base config not found: ${basePath}`);
  }
  
  const base = readYaml(basePath);

  // Load overlay (environment-specific)
  const overlayPath = opts?.overlay ? path.join(configRoot, `${opts.overlay}.yml`) : null;
  const overlay = overlayPath && exists(overlayPath) ? readYaml(overlayPath) : {};

  // Load tenant-specific config
  const tenantPath = opts?.tenant ? path.join(configRoot, "tenants", `${opts.tenant}.yml`) : null;
  const tenant = tenantPath && exists(tenantPath) ? readYaml(tenantPath) : {};

  // Load feature flags
  const flagsPath = path.join(configRoot, "flags.yml");
  const flags = exists(flagsPath) ? readYaml(flagsPath) : {};

  // Merge configurations with precedence: base < overlay < tenant < flags
  const merged = deepmerge.all([base, overlay, tenant, { flags }]);

  // Environment variable interpolation like ${VAR:default}
  const interpolate = (v: any): any => {
    if (typeof v === "string") {
      return v.replace(/\$\{([^}:]+)(?::([^}]+))?\}/g, (_, key, def) => 
        process.env[key] ?? def ?? ""
      );
    } else if (Array.isArray(v)) {
      return v.map(interpolate);
    } else if (v && typeof v === "object") {
      const result: any = {};
      for (const k of Object.keys(v)) {
        result[k] = interpolate(v[k]);
      }
      return result;
    }
    return v;
  };

  const finalCfg = interpolate(merged);

  // Validate against JSON Schema (after interpolation)
  const schemaPath = path.join(configRoot, "schemas", "config-schema.json");
  if (exists(schemaPath)) {
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const ajv = new Ajv({ 
      allErrors: true, 
      strict: false,
      validateSchema: false // Skip meta-schema validation to avoid Draft 2020-12 issues
    });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    
    if (!validate(finalCfg)) {
      const errors = (validate.errors ?? [])
        .map(e => `${e.instancePath} ${e.message}`)
        .join("\\n");
      throw new Error("Invalid config:\\n" + errors);
    }
  }

  // Deep freeze to prevent runtime mutations
  return deepFreeze(finalCfg) as ConfigSchema;
}

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj as any);
  Object.getOwnPropertyNames(obj as any).forEach((prop) => {
    const val = (obj as any)[prop];
    if (val && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });
  return obj;
}

// Feature flag utilities
export class FeatureFlags {
  constructor(private config: ConfigSchema) {}

  isEnabled(flag: string, defaultValue: boolean = false): boolean {
    const flags = this.config.flags?.flags || {};
    return flags[flag] ?? defaultValue;
  }

  getRolloutPercent(feature: string): number {
    const rollout = this.config.flags?.rollout || {};
    return rollout[feature] ?? 0;
  }

  shouldRollout(feature: string, userId?: string): boolean {
    const percent = this.getRolloutPercent(feature);
    if (percent >= 100) return true;
    if (percent <= 0) return false;
    
    // Simple hash-based rollout using user ID
    if (userId) {
      const hash = simpleHash(userId);
      return (hash % 100) < percent;
    }
    
    return Math.random() * 100 < percent;
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}