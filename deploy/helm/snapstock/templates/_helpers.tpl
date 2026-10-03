{{/* Environment for the event-driven analysis pipeline (backend and AI worker). */}}
{{- define "snapstock.eventsEnv" -}}
{{- if .Values.events.enabled }}
- name: AWS_REGION
  value: {{ required "events.region is required" .Values.events.region | quote }}
- name: S3_UPLOAD_BUCKET
  value: {{ required "events.bucket is required" .Values.events.bucket | quote }}
- name: SQS_ANALYSIS_JOB_QUEUE_URL
  value: {{ required "events.jobQueueUrl is required" .Values.events.jobQueueUrl | quote }}
- name: SQS_ANALYSIS_RESULT_QUEUE_URL
  value: {{ required "events.resultQueueUrl is required" .Values.events.resultQueueUrl | quote }}
{{- end }}
{{- end }}
