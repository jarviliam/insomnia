import { K8sPluginConfig } from '../types/kubernetes-config';
import { XKongPluginKeyAuth, XKongPluginUnknown } from '../types/openapi3';

export const pluginKeyAuth: XKongPluginKeyAuth = {
  'x-kong-plugin-key-auth': {
    name: 'key-auth',
    config: {
      key_names: ['api_key', 'apikey'],
      key_in_body: false,
      hide_credentials: true,
    },
  },
};

export const pluginDummy: XKongPluginUnknown<{ foo: 'bar' }> = {
  'x-kong-plugin-dummy-thing': {
    name: 'dummy-thing',
    config: {
      foo: 'bar',
    },
  },
};

export const pluginDocWithName = (name: string, pluginType: string): K8sPluginConfig => ({
  apiVersion: 'configuration.konghq.com/v1',
  kind: 'KongPlugin',
  metadata: {
    name,
  },
  plugin: pluginType,
});

export const keyAuthPluginDoc = (suffix: string) => ({
  apiVersion: 'configuration.konghq.com/v1',
  config: {
    hide_credentials: true,
    key_in_body: false,
    key_names: ['api_key', 'apikey'],
  },
  kind: 'KongPlugin',
  metadata: {
    name: keyAuthName(suffix),
  },
  plugin: 'key-auth',
});

export const dummyPluginDoc = (suffix: string): K8sPluginConfig => ({
  apiVersion: 'configuration.konghq.com/v1',
  config: {
    foo: 'bar',
  },
  kind: 'KongPlugin',
  metadata: {
    name: dummyName(suffix),
  },
  plugin: 'dummy-thing',
});

export const methodDoc = (method: string) => ({
  apiVersion: 'configuration.konghq.com/v1',
  kind: 'KongIngress',
  metadata: {
    name: `${method}-method`,
  },
  route: {
    methods: [method.toUpperCase()],
  },
});

export const keyAuthName = (suffix: string) => `add-key-auth-${suffix}`;

export const dummyName = (suffix: string) => `add-dummy-thing-${suffix}`;

export const ingressDoc = (
  index: number,
  plugins: string[],
  host: string,
  serviceName: string,
  path?: string | null,
) => {
  const backend = {
    serviceName,
    servicePort: 80,
  };
  const paths = path
    ? {
        path,
        backend,
      }
    : {
        backend,
      };
  return {
    apiVersion: 'extensions/v1beta1',
    kind: 'Ingress',
    metadata: {
      annotations: {
        'kubernetes.io/ingress.class': 'kong',
        'konghq.com/plugins': plugins.join(', '),
      },
      name: `my-api-${index}`,
    },
    spec: {
      rules: [
        {
          host,
          http: {
            paths: [paths],
          },
        },
      ],
    },
  };
};

export const ingressDocWithOverride = (
  index: number,
  plugins: string[],
  override: string,
  host: string,
  serviceName: string,
  path?: string | null,
) => ({
  apiVersion: 'extensions/v1beta1',
  kind: 'Ingress',
  metadata: {
    annotations: {
      'kubernetes.io/ingress.class': 'kong',
      'konghq.com/plugins': plugins.join(', '),
      'konghq.com/override': override,
    },
    name: `my-api-${index}`,
  },
  spec: {
    rules: [
      {
        host,
        http: {
          paths: [
            {
              backend: {
                serviceName,
                servicePort: 80,
              },
              path,
            },
          ],
        },
      },
    ],
  },
});
