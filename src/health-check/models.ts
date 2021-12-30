// See https://inadarei.github.io/rfc-healthcheck/

export type HealthResponse = {
  status: HealthStatus
  version?: string
  releaseID?: string
  notes?: string[]
  output?: string
  serviceID?: string
  description?: string
  checks?: HealthMeasurements
  links?: HealthLinks
}

export type HealthMeasurements = Record<string, HealthComponent[]>

export type HealthComponent = {
  componentId?: string
  componentType?: "component" | "datastore" | "system"
  observedValue?: unknown
  observedUnit?: string
  status?: HealthStatus
  affectedEndpoints?: string[]
  time?: Date
  output?: string
  links?: HealthLinks
}

export type HealthStatus = "pass" | "fail" | "warn"

export type HealthLinks = Record<string, string>
