A Thunderbird addon that summarises new emails with Ollama and then forwards the summary to Slack (or whatever you code the extension to do).

Using Ollama means email contents is not sent to an external LLM.

## Installation

1. Windows users install WSL2 using the instructions [here](https://learn.microsoft.com/en-us/windows/wsl/install)
2. Install Ollama using the instructions [here](https://ollama.com/download/linux)
3. Create a systemd service using the instructions [here](https://github.com/ollama/ollama/blob/main/docs/linux.md#adding-ollama-as-a-startup-service-recommended)
4. Modify the systemd service file at `/etc/systemd/system/ollama.service` to include `Environment="OLLAMA_ORIGINS=moz-extension://*"`. This allows Ollama to receive network requests from Thunderbird.
5. Enable the service with `sudo systemctl enable ollama`
6. Start the service with `sudo systemctl start ollama`
7. Install `llama3` with the command `ollama run llama3.1`
8. Install the extension from [here](https://addons.thunderbird.net/en-US/thunderbird/addon/ollama-summarizer/)
9. Set your email and alias that the summary will be sent to in the extension preferences

## MacOs

Run this command to allow Thunderbird to access Ollama:

```bash
launchctl setenv OLLAMA_ORIGINS "moz-extension://*"
```

## Extension

Get the extension from the [Thunderbird AddOns](https://addons.thunderbird.net/en-US/thunderbird/addon/ollama-summarizer/) website.
