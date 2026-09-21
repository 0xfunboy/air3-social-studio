# Deployment e nuovo repository

Guida principale: [INSTALLATION](INSTALLATION.md). Backup, upgrade da 0.1 e recovery: [OPERATIONS](OPERATIONS.md). Gate per servizi reali: [RELEASE-GATE](RELEASE-GATE.md).

## Importare la storia Git inclusa

Dalla directory estratta:

```bash
git clone REPOSITORY.bundle ../air3-social-studio-git
cd ../air3-social-studio-git
```

Il bundle contiene sorgenti, compilato e documentazione, ma non se stesso o segreti/runtime data. I file dello ZIP sono utilizzabili anche senza Git. L’applicazione non modifica i repository originali.

## Creare il remoto

Solo dopo aver controllato `.gitignore`, licenze e visibilità:

```bash
git remote remove origin
gh repo create 0xfunboy/air3-social-studio --public --source=. --remote=origin --push
```

## Ingress HTTPS & Reverse Proxy

Il traffico HTTPS sicuro verso il servizio in ascolto su `http://127.0.0.1:3100` può essere terminato tramite un reverse proxy (ad esempio Caddy o NGINX) o ingress gateway protetto:

```caddy
# Esempio Caddyfile per terminazione automatica TLS
studio.yourdomain.com {
    reverse_proxy 127.0.0.1:3100
}
```

Oppure con NGINX:
```nginx
server {
    server_name studio.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

La CI inclusa esegue compilazione e test su Node 22 con dipendenze npm offline e verifica zero-leakage dei secret.
