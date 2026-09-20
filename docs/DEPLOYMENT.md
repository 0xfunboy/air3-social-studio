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

## Cloudflare Zero Trust Tunnel (`smair.eeess.cyou`)

Il tunnel Cloudflare instrada il traffico HTTPS sicuro dal sottodominio `smair.eeess.cyou` al servizio locale in ascolto su `http://127.0.0.1:3100` senza aprire porte sul firewall perimetrale:

```bash
# Creazione e routing del tunnel con certificato origine
cloudflared tunnel --origincert /home/funboy/.cloudflared/cert-eeess.pem create smair
cloudflared tunnel --origincert /home/funboy/.cloudflared/cert-eeess.pem route dns --overwrite-dns smair smair.eeess.cyou

# Avvio del tunnel in background con configurazione dedicata
cloudflared tunnel --config /home/funboy/.cloudflared/config-smair.yml run smair
```

La CI inclusa esegue compilazione e test su Node 22 con dipendenze npm offline e verifica zero-leakage dei secret.

