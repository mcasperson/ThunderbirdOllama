A Thunderbird addon that summarises new emails with Ollama and then forwards the summary to Slack.

Using Ollama means email contents is not sent to an external LLM.

Ollama must be configured to accept HTTP requests from Thunderbird with the following environment variable:

```
OLLAMA_ORIGINS=moz-extension://*
```