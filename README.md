A Thunderbird addon that summarises new emails with Ollama and then forwards the summary to Slack.

Using Ollama means email contents is not sent to an external LLM.

Ollama must be configured to accept HTTP requests from Thunderbird with the following environment variable:

```
OLLAMA_ORIGINS=moz-extension://*
```

## Installing the model

This code uses the `llama3` model by default. This needs to be downloaded with the command:

```
ollama run llama3
```

## Ollama systemd

This is an example systemd service file that sets the required environment variables to support Thunderbird. This was taken from my WSL instance which includes a lot of WSL specific elements in the `PATH` environment variable:

```
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/usr/lib/wsl/lib:/mnt/c/Program Files/Python312/Scripts/:/mnt/c/Program Files/Python312/:/mnt/c/Windows/system32:/mnt/c/Windows:/mnt/c/Windows/System32/Wbem:/mnt/c/Windows/System32/WindowsPowerShell/v1.0/:/mnt/c/Windows/System32/OpenSSH/:/mnt/c/Program Files/dotnet/:/mnt/c/Program Files/Git/cmd:/mnt/c/Program Files/Go/bin:/mnt/c/ProgramData/chocolatey/bin:/mnt/c/Program Files (x86)/Microsoft SQL Server/160/Tools/Binn/:/mnt/c/Program Files/Microsoft SQL Server/160/Tools/Binn/:/mnt/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/:/mnt/c/Program Files/Microsoft SQL Server/160/DTS/Binn/:/Docker/host/bin:/mnt/c/Program Files/PowerShell/7/:/mnt/c/Users/matth/AppData/Local/Microsoft/WindowsApps:/mnt/c/Users/matth/.dotnet/tools:/mnt/c/Users/matth/AppData/Local/Programs/Microsoft VS Code/bin:/snap/bin"
Environment="OLLAMA_ORIGINS=moz-extension://*"

[Install]
WantedBy=default.target
```
