import {
  distinctByProperty,
  getPaths,
  getPluginNameFromKey,
  getServers,
  isHttpMethodKey,
  isPluginKey,
} from '../common';
import { generateSecurityPlugins } from '../declarative-config/security-plugins';
import { DCPlugin } from '../types/declarative-config';
import { Plugins, IndexIncrement, ServerPlugin, PathPlugin, OperationPlugin } from '../types/k8splugins';
import { K8sPluginConfig } from '../types/kubernetes-config';
import { OpenApi3Spec, OA3Server, OA3Paths, OA3PathItem } from '../types/openapi3';
import { ValueOf } from 'type-fest';

export function flattenPluginDocuments(plugins: Plugins): K8sPluginConfig[] {
  const all: K8sPluginConfig[] = [];
  const { global, servers, paths } = plugins;
  all.push(...global);
  servers.forEach(s => {
    all.push(...s.plugins);
  });
  paths.forEach(s => {
    all.push(...s.plugins);
    s.operations.forEach(o => {
      all.push(...o.plugins);
    });
  });
  return all;
}

export function getPlugins(api: OpenApi3Spec): Plugins {
  let _iterator = 0;

  const increment = (): number => _iterator++;

  const servers = getServers(api);

  // if no global servers
  if (servers.length === 0) {
    throw new Error('Failed to generate spec: no servers defined in spec.');
  }

  const paths = getPaths(api);
  return {
    global: getGlobalPlugins(api, increment),
    servers: getServerPlugins(servers, increment),
    paths: getPathPlugins(paths, increment, api),
  };
}

// NOTE: It isn't great that we're relying on declarative-config stuff here but there's
// not much we can do about it. If we end up needing this again, it should be factored
// out to a higher-level.
export function mapDcPluginsToK8sPlugins(
  dcPlugins: DCPlugin[],
  suffix: string,
  increment: IndexIncrement,
) {
  return dcPlugins.map(dcPlugin => {
    const k8sPlugin: K8sPluginConfig = {
      apiVersion: 'configuration.konghq.com/v1',
      kind: 'KongPlugin',
      metadata: {
        name: `add-${dcPlugin.name}-${suffix}${increment()}`,
      },
      plugin: dcPlugin.name,
    };

    if (dcPlugin.config) {
      k8sPlugin.config = dcPlugin.config;
    }

    return k8sPlugin;
  });
}

export function getGlobalPlugins(api: OpenApi3Spec, increment: IndexIncrement) {
  const pluginNameSuffix = PluginNameSuffix.global;
  const globalK8sPlugins = generateK8sPluginConfig(api, pluginNameSuffix, increment);
  const securityPlugins = mapDcPluginsToK8sPlugins(
    generateSecurityPlugins(null, api, []),
    pluginNameSuffix,
    increment,
  );
  return [...globalK8sPlugins, ...securityPlugins];
}

export function getServerPlugins(
  servers: OA3Server[],
  increment: IndexIncrement,
) {
  return servers.map<ServerPlugin>(server => ({
    server,
    plugins: generateK8sPluginConfig(server, PluginNameSuffix.server, increment),
  }));
}

export function getPathPlugins(paths: OA3Paths, increment: IndexIncrement, api: OpenApi3Spec) {
  const pathPlugins: PathPlugin[] = Object.keys(paths).map(path => {
    const pathItem = paths[path];
    return {
      path,
      plugins: generateK8sPluginConfig(pathItem, PluginNameSuffix.path, increment),
      operations: normalizeOperationPlugins(getOperationPlugins(pathItem, increment, api)),
    };
  });
  return normalizePathPlugins(pathPlugins);
}

export function getOperationPlugins(
  pathItem: OA3PathItem,
  increment: IndexIncrement,
  api: OpenApi3Spec,
) {
  const operationPlugins: OperationPlugin[] = Object.keys(pathItem)
    .filter(isHttpMethodKey)
    .map(key => {
      // We know this will always, only be OA3Operation (because of the filter above), but Flow doesn't know that...
      const operation: Record<string, any> = pathItem[key];
      const pluginNameSuffix = PluginNameSuffix.operation;
      const opPlugins = generateK8sPluginConfig(operation, pluginNameSuffix, increment);
      const securityPlugins = mapDcPluginsToK8sPlugins(
        generateSecurityPlugins(operation, api, []),
        pluginNameSuffix,
        increment,
      );
      return {
        method: key,
        plugins: [...opPlugins, ...securityPlugins],
      };
    });
  return normalizeOperationPlugins(operationPlugins);
}

// When a plugin name is generated during parsing, we suffix it with where it was sourced from and an index.
// For example, the third plugin parsed may be on the path, so it would have the (zero-indexed) name add-key-auth-p2
const PluginNameSuffix = {
  global: 'g',
  server: 's',
  path: 'p',
  operation: 'm',
} as const;

type PluginNameSuffixKeys = ValueOf<typeof PluginNameSuffix>;

export function generateK8sPluginConfig(
  obj: Record<string, any>,
  pluginNameSuffix: PluginNameSuffixKeys,
  increment: IndexIncrement,
) {
  const plugins: K8sPluginConfig[] = [];

  for (const key of Object.keys(obj).filter(isPluginKey)) {
    const pData = obj[key];
    const name = pData.name || getPluginNameFromKey(key);
    const p: K8sPluginConfig = {
      apiVersion: 'configuration.konghq.com/v1',
      kind: 'KongPlugin',
      metadata: {
        name: `add-${name}-${pluginNameSuffix}${increment()}`,
      },
      plugin: name,
    };

    if (pData.config) {
      p.config = pData.config;
    }

    plugins.push(p);
  }

  return plugins;
}

const blankOperation: OperationPlugin = {
  method: null,
  plugins: [],
};

const blankPath: PathPlugin = {
  path: '',
  plugins: [],
  operations: [blankOperation],
};

export function normalizePathPlugins(pathPlugins: PathPlugin[]) {
  const pluginsExist = pathPlugins.some(p => (
    p.plugins.length || p.operations.some(o => o.plugins.length)
  ));
  return pluginsExist ? pathPlugins : [blankPath];
}

export function normalizeOperationPlugins(operationPlugins: OperationPlugin[]) {
  const pluginsExist = operationPlugins.some(o => o.plugins.length);
  return pluginsExist ? operationPlugins : [blankOperation];
}

export function prioritizePlugins(
  global: K8sPluginConfig[],
  server: K8sPluginConfig[],
  path: K8sPluginConfig[],
  operation: K8sPluginConfig[],
) {
  // Order in priority: operation > path > server > global
  const plugins: K8sPluginConfig[] = [...operation, ...path, ...server, ...global];
  // Select first of each type of plugin
  return distinctByProperty(plugins, p => p.plugin);
}
