# Prometheus Integration

## Scrape target
- Backend metrics endpoint: `GET /metrics`

## Rule files
- `monitoring/prometheus-alerts.yml`
- `monitoring/prometheus-recording-rules.yml`

## Example scrape config
```yaml
scrape_configs:
  - job_name: admitflow-backend
    metrics_path: /metrics
    static_configs:
      - targets: ["localhost:8000"]
```

## Key alerts
- `AdmitFlowWorkflowExecutionP95High`
- `AdmitFlowBlueprintValidationFailuresSpike`
- `AdmitFlowRedisEventAppendFailures`
- `AdmitFlowEventEmissionDrop`
