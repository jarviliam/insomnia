import { HttpMethodType } from '../common';

export interface K8sIngressClassAnnotation {
  'kubernetes.io/ingress.class'?: 'kong';
}

export interface K8sPluginsAnnotation {
  'konghq.com/plugins'?: string;
}

export interface K8sOverrideAnnotation {
  'konghq.com/override'?: string;
}

export type K8sAnnotations =
  & K8sIngressClassAnnotation
  & K8sOverrideAnnotation
  & K8sPluginsAnnotation
  & Record<string, string>
  ;

export interface K8sMetadata {
  name: string;
  annotations: K8sAnnotations;
}

export interface K8sBackend {
  serviceName: string;
  servicePort: number;
}

export interface K8sPath {
  path?: string;
  backend: K8sBackend;
}

export interface K8sIngressRule {
  host: string;
  tls?: {
    paths: K8sPath[];
    tls?: {
      secretName: string;
    };
  };
  http?: {
    paths: K8sPath[];
  };
}

export interface K8sSpec {
  rules: K8sIngressRule[];
}

export interface K8sMethodConfig {
  apiVersion: 'configuration.konghq.com/v1';
  kind: 'KongIngress';
  metadata: {
    name: string;
  };
  route: {
    methods: HttpMethodType[];
  };
}

export interface K8sPluginConfig {
  apiVersion: 'configuration.konghq.com/v1';
  kind: 'KongPlugin';
  metadata: {
    name: string;
    global?: boolean;
  };
  config?: Record<string, any>;
  plugin: string;
}

export interface K8sConfig {
  apiVersion: 'extensions/v1beta1';
  kind: 'Ingress';
  metadata: K8sMetadata;
  spec: K8sSpec;
}

export type K8sManifest =
  | K8sConfig
  | K8sMethodConfig
  | K8sPluginConfig
  ;
